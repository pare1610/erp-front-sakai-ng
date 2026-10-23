import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { finalize } from 'rxjs/operators';
import { OrderHeaderDto } from '@/models/erpdb';
import { OrderHeaderService } from '@/app/services/order-header-service';
import { LayoutService } from '@/app/layout/service/layout.service';

// Una fila por linea de pedido, con los datos de cabecera repetidos.
interface LineRow {
    orderId: number;
    orderNumber: number;
    date: string; // yyyy-MM-dd
    clientKey: string;
    clientName: string;
    zone: string;
    vendorName: string;
    businessLine: string;
    refCod: string;
    refName: string;
    qty: number;
    total: number;
    statusId: number;
    statusName: string;
    delivDate: string | null;
}

interface Period {
    from: string;
    to: string;
    prevFrom: string;
    prevTo: string;
}

interface Option {
    label: string;
    value: string;
}

// Estados de linea (OrderReferStatus): 1 Cancelado, 2 Aprobado, 3 Detenido, 4 En Revision, 5 Anulado.
// Misma regla que el chatbot del back: la venta excluye 1 y 5; lo abierto es 2 y 4.
const LOST = [1, 5];
const OPEN = [2, 4];
const HELD = 3;
const isValid = (r: LineRow) => !LOST.includes(r.statusId);
const isOpen = (r: LineRow) => OPEN.includes(r.statusId);
const isLost = (r: LineRow) => LOST.includes(r.statusId);

const NO_LINE = 'Sin clasificar';
const NO_ZONE = 'Sin zona';
const OTHER_LINES = 'Otras líneas';
const MAX_LINE_SLOTS = 7;
const DAY_MS = 86_400_000;

// Paleta categorica validada (claro / oscuro); el orden de los slots es fijo.
const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'];
const SERIES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9'];
const STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' };

const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseIso = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
};
const addDays = (iso: string, days: number) => toIso(new Date(parseIso(iso).getTime() + days * DAY_MS));
const daysBetween = (fromIso: string, toIsoDate: string) => Math.round((parseIso(toIsoDate).getTime() - parseIso(fromIso).getTime()) / DAY_MS);
const sum = (rows: LineRow[]) => rows.reduce((acc, r) => acc + r.total, 0);
const pctChange = (cur: number, prev: number) => (prev ? (cur - prev) / prev : null);

const groupSum = (rows: LineRow[], key: (r: LineRow) => string) => {
    const map = new Map<string, number>();
    for (const r of rows) {
        map.set(key(r), (map.get(key(r)) ?? 0) + r.total);
    }
    return map;
};

@Component({
    selector: 'app-order-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, ChartModule, DatePickerModule, MultiSelectModule, TableModule, TagModule, ButtonModule, MessageModule],
    templateUrl: './order.dashboard.component.html'
})
export class OrderDashboardComponent implements OnInit {
    private readonly orderHeaderService = inject(OrderHeaderService);
    private readonly layoutService = inject(LayoutService);

    readonly today = toIso(new Date());
    readonly maxDate = new Date();

    range: Date[] | null = null;
    loading = signal(false);
    error = signal<string | null>(null);
    period = signal<Period | null>(null);
    rows = signal<LineRow[]>([]);

    selectedClients = signal<string[]>([]);
    selectedZones = signal<string[]>([]);
    selectedVendors = signal<string[]>([]);
    selectedLines = signal<string[]>([]);

    // Colores de texto/rejilla del tema; se releen cuando cambia claro/oscuro.
    private theme = signal({ text: '#334155', muted: '#64748b', border: '#e2e8f0', surface: '#ffffff', dark: false });

    constructor() {
        effect(() => {
            const dark = !!this.layoutService.layoutConfig().darkTheme;
            setTimeout(() => {
                const style = getComputedStyle(document.documentElement);
                this.theme.set({
                    text: style.getPropertyValue('--text-color').trim(),
                    muted: style.getPropertyValue('--text-color-secondary').trim(),
                    border: style.getPropertyValue('--surface-border').trim(),
                    surface: style.getPropertyValue('--surface-card').trim() || (dark ? '#18181b' : '#ffffff'),
                    dark
                });
            }, 150);
        });
    }

    ngOnInit() {
        const to = new Date();
        const from = new Date(to.getFullYear(), to.getMonth() - 2, 1);
        this.range = [from, to];
        this.load();
    }

    // Trae el periodo elegido y el periodo anterior de igual duracion en una sola llamada.
    load() {
        if (!this.range?.[0] || !this.range?.[1]) {
            return;
        }
        const from = toIso(this.range[0]);
        const to = toIso(this.range[1]);
        const days = daysBetween(from, to) + 1;
        const period: Period = { from, to, prevFrom: addDays(from, -days), prevTo: addDays(from, -1) };

        this.loading.set(true);
        this.error.set(null);
        this.orderHeaderService
            .getOrderHeaders(period.prevFrom, period.to)
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (orders) => {
                    this.period.set(period);
                    this.rows.set(this.flatten(orders));
                },
                error: (err) => {
                    this.rows.set([]);
                    this.error.set(err?.status === 0 ? 'No hay conexión con el servidor.' : `No se pudieron cargar los pedidos (HTTP ${err?.status ?? '?'}).`);
                }
            });
    }

    clearFilters() {
        this.selectedClients.set([]);
        this.selectedZones.set([]);
        this.selectedVendors.set([]);
        this.selectedLines.set([]);
    }

    private flatten(orders: OrderHeaderDto[]): LineRow[] {
        const rows: LineRow[] = [];
        for (const o of orders) {
            const branch = o.orderHeaderBranch;
            const client = branch?.branchClient?.clientThirdParty;
            for (const l of o.orderReference ?? []) {
                rows.push({
                    orderId: o.orderHeaderId ?? 0,
                    orderNumber: o.orderHeaderNumber ?? 0,
                    date: o.orderHeaderDate ?? '',
                    clientKey: String(branch?.branchClient?.clientId ?? client?.thirdPartyName ?? ''),
                    clientName: client?.thirdPartyName?.trim() || 'Sin cliente',
                    zone: branch?.branchZone?.trim() || NO_ZONE,
                    vendorName: o.orderHeaderVendor?.vendorThirdParty?.thirdPartyName ?? 'Sin vendedor',
                    businessLine: l.orderReferBusinessLine?.referClassName ?? NO_LINE,
                    refCod: l.orderReferReference?.referCod ?? '',
                    refName: l.orderReferReference?.referName ?? '',
                    qty: l.orderReferQuantity ?? 0,
                    total: Number(l.valorTotal ?? (l.orderReferQuantity ?? 0) * (l.orderReferUnitPrice ?? 0)),
                    statusId: l.orderReferStatus?.orderReferStatusId ?? 0,
                    statusName: l.orderReferStatus?.orderReferStatusName ?? 'Sin estado',
                    delivDate: l.orderReferDelivDate ?? null
                });
            }
        }
        return rows;
    }

    // ---------- Filtros ----------

    clientOptions = computed(() => this.options(this.rows(), (r) => r.clientKey, (r) => r.clientName));
    zoneOptions = computed(() => this.options(this.rows(), (r) => r.zone, (r) => r.zone));
    vendorOptions = computed(() => this.options(this.rows(), (r) => r.vendorName, (r) => r.vendorName));
    lineOptions = computed(() => this.options(this.rows(), (r) => r.businessLine, (r) => r.businessLine));

    private options(rows: LineRow[], value: (r: LineRow) => string, label: (r: LineRow) => string): Option[] {
        const map = new Map<string, string>();
        rows.forEach((r) => map.set(value(r), label(r)));
        return [...map].map(([v, l]) => ({ value: v, label: l })).sort((a, b) => a.label.localeCompare(b.label));
    }

    // Filas de ambos periodos con los filtros de cliente, zona, vendedor y linea aplicados.
    private filtered = computed(() => {
        const clients = this.selectedClients();
        const zones = this.selectedZones();
        const vendors = this.selectedVendors();
        const lines = this.selectedLines();
        return this.rows().filter(
            (r) =>
                (!clients.length || clients.includes(r.clientKey)) &&
                (!zones.length || zones.includes(r.zone)) &&
                (!vendors.length || vendors.includes(r.vendorName)) &&
                (!lines.length || lines.includes(r.businessLine))
        );
    });

    private current = computed(() => {
        const p = this.period();
        return p ? this.filtered().filter((r) => r.date >= p.from && r.date <= p.to) : [];
    });

    private previous = computed(() => {
        const p = this.period();
        return p ? this.filtered().filter((r) => r.date >= p.prevFrom && r.date <= p.prevTo) : [];
    });

    // ---------- KPIs ----------

    kpis = computed(() => {
        const cur = this.current();
        const prev = this.previous();
        const sales = sum(cur.filter(isValid));
        const prevSales = sum(prev.filter(isValid));
        const orders = new Set(cur.filter(isValid).map((r) => r.orderId)).size;
        const prevOrders = new Set(prev.filter(isValid).map((r) => r.orderId)).size;
        const ticket = orders ? sales / orders : 0;
        const prevTicket = prevOrders ? prevSales / prevOrders : 0;
        const lost = sum(cur.filter(isLost));
        const prevLost = sum(prev.filter(isLost));
        const lossRate = sales + lost ? lost / (sales + lost) : 0;
        const prevLossRate = prevSales + prevLost ? prevLost / (prevSales + prevLost) : 0;

        // Lo abierto y lo vencido se miden sobre todo lo cargado (periodo actual + anterior).
        const open = this.filtered().filter(isOpen);
        const overdue = open.filter((r) => r.delivDate != null && r.delivDate < this.today);

        return {
            sales,
            salesDelta: pctChange(sales, prevSales),
            orders,
            ordersDelta: pctChange(orders, prevOrders),
            ticket,
            ticketDelta: pctChange(ticket, prevTicket),
            open: sum(open),
            openOrders: new Set(open.map((r) => r.orderId)).size,
            lossRate,
            lossRateDelta: lossRate - prevLossRate, // en puntos porcentuales
            lost,
            overdue: sum(overdue),
            overdueOrders: new Set(overdue.map((r) => r.orderId)).size
        };
    });

    // ---------- Colores por linea de negocio ----------

    // El color sigue a la linea, no a su posicion filtrada: se asigna con el total sin filtros.
    private lineSlots = computed(() => {
        const totals = groupSum(this.rows().filter(isValid), (r) => r.businessLine);
        const ordered = [...totals].sort((a, b) => b[1] - a[1]).map(([name]) => name);
        const slots = new Map<string, number>();
        ordered.slice(0, MAX_LINE_SLOTS).forEach((name, i) => slots.set(name, i));
        return slots;
    });

    private lineGroup(name: string) {
        return this.lineSlots().has(name) ? name : OTHER_LINES;
    }

    private lineColor(group: string) {
        const slot = this.lineSlots().get(group);
        const palette = this.theme().dark ? SERIES_DARK : SERIES_LIGHT;
        return slot == null ? (this.theme().dark ? '#6d6c68' : '#a3a29d') : palette[slot];
    }

    private seriesColor() {
        return this.theme().dark ? SERIES_DARK[0] : SERIES_LIGHT[0];
    }

    // ---------- Graficas ----------

    granularity = computed(() => {
        const p = this.period();
        return p && daysBetween(p.from, p.to) > 120 ? 'month' : 'week';
    });

    trendData = computed(() => {
        const p = this.period();
        if (!p) {
            return null;
        }
        const monthly = this.granularity() === 'month';
        const bucketOf = (iso: string) => {
            if (monthly) {
                return iso.slice(0, 7);
            }
            const d = parseIso(iso);
            d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lunes de la semana
            return toIso(d);
        };

        const buckets: string[] = [];
        for (let iso = p.from; iso <= p.to; iso = addDays(iso, 1)) {
            const b = bucketOf(iso);
            if (buckets[buckets.length - 1] !== b) {
                buckets.push(b);
            }
        }

        const valid = this.current().filter(isValid);
        const groups = [...new Set(valid.map((r) => this.lineGroup(r.businessLine)))].sort(
            (a, b) => (this.lineSlots().get(a) ?? 99) - (this.lineSlots().get(b) ?? 99)
        );
        const surface = this.theme().surface;

        return {
            labels: buckets.map((b) =>
                monthly ? parseIso(`${b}-01`).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }) : parseIso(b).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
            ),
            datasets: groups.map((g) => {
                const byBucket = groupSum(
                    valid.filter((r) => this.lineGroup(r.businessLine) === g),
                    (r) => bucketOf(r.date)
                );
                return {
                    type: 'bar',
                    label: g,
                    data: buckets.map((b) => byBucket.get(b) ?? 0),
                    backgroundColor: this.lineColor(g),
                    borderColor: surface,
                    borderWidth: { top: 2 },
                    borderSkipped: 'bottom',
                    maxBarThickness: 40
                };
            })
        };
    });

    topClients = computed(() => {
        const valid = this.current().filter(isValid);
        const total = sum(valid);
        const byClient = new Map<string, { name: string; total: number }>();
        for (const r of valid) {
            const c = byClient.get(r.clientKey) ?? { name: r.clientName, total: 0 };
            c.total += r.total;
            byClient.set(r.clientKey, c);
        }
        const ranked = [...byClient.values()].sort((a, b) => b.total - a.total);
        const top5 = ranked.slice(0, 5).reduce((acc, c) => acc + c.total, 0);
        return { ranked, clients: ranked.length, top5Share: total ? top5 / total : 0 };
    });

    clientsData = computed(() => this.hBar(this.topClients().ranked.slice(0, 10).map((c) => [c.name, c.total])));

    zoneData = computed(() => {
        const byZone = groupSum(this.current().filter(isValid), (r) => r.zone);
        return this.hBar([...byZone].sort((a, b) => b[1] - a[1]));
    });

    lineMixData = computed(() => {
        const byLine = groupSum(this.current().filter(isValid), (r) => this.lineGroup(r.businessLine));
        const sorted = [...byLine].sort((a, b) => b[1] - a[1]);
        return this.hBar(
            sorted,
            sorted.map(([g]) => this.lineColor(g))
        );
    });

    statusData = computed(() => {
        const order: [number[], string, string][] = [
            [[4], 'En Revisión', STATUS.warning],
            [[2], 'Aprobado', STATUS.good],
            [[3], 'Detenido', STATUS.serious],
            [LOST, 'Cancelado / Anulado', STATUS.critical]
        ];
        const cur = this.current();
        return this.hBar(
            order.map(([ids, label]) => [label, sum(cur.filter((r) => ids.includes(r.statusId)))]),
            order.map(([, , color]) => color)
        );
    });

    agingData = computed(() => {
        const dark = this.theme().dark;
        const buckets: [string, (d: number) => boolean, string][] = [
            ['Vencido > 30 d', (d) => d < -30, STATUS.critical],
            ['Vencido 1–30 d', (d) => d < 0 && d >= -30, STATUS.serious],
            ['Vence en 0–7 d', (d) => d >= 0 && d <= 7, STATUS.warning],
            ['Vence en 8–30 d', (d) => d > 7 && d <= 30, dark ? '#3987e5' : '#2a78d6'],
            ['Vence en > 30 d', (d) => d > 30, dark ? '#184f95' : '#86b6ef']
        ];
        const open = this.filtered().filter((r) => isOpen(r) && r.delivDate);
        return this.hBar(
            buckets.map(([label, test]) => [label, sum(open.filter((r) => test(daysBetween(this.today, r.delivDate!))))]),
            buckets.map(([, , color]) => color)
        );
    });

    // Barras de una sola serie (un color, o uno por barra cuando la barra es una entidad con color propio).
    private hBar(entries: [string, number][], colors?: string[]) {
        return {
            labels: entries.map(([label]) => label),
            datasets: [
                {
                    data: entries.map(([, v]) => v),
                    backgroundColor: colors ?? this.seriesColor(),
                    borderRadius: 4,
                    borderSkipped: 'start',
                    maxBarThickness: 28
                }
            ]
        };
    }

    stackedOptions = computed(() => this.chartOptions(false, true, true));
    hBarOptions = computed(() => this.chartOptions(true, false, false));
    vBarOptions = computed(() => this.chartOptions(false, false, false));

    private chartOptions(horizontal: boolean, stacked: boolean, legend: boolean) {
        const t = this.theme();
        const valueAxis = {
            stacked,
            ticks: { color: t.muted, callback: (v: number) => this.copShort(v) },
            grid: { color: t.border, drawTicks: false },
            border: { display: false }
        };
        const categoryAxis = {
            stacked,
            ticks: { color: t.muted, autoSkip: !horizontal },
            grid: { display: false },
            border: { display: false }
        };
        return {
            indexAxis: horizontal ? 'y' : 'x',
            maintainAspectRatio: false,
            interaction: { mode: stacked ? 'index' : 'nearest', intersect: !stacked, axis: horizontal ? 'y' : 'x' },
            plugins: {
                legend: { display: legend, position: 'bottom', labels: { color: t.text, usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 10 } },
                tooltip: {
                    callbacks: {
                        label: (ctx: any) => `${ctx.dataset.label ? ctx.dataset.label + ': ' : ''}${this.cop(horizontal ? ctx.parsed.x : ctx.parsed.y)}`,
                        footer: stacked ? (items: any[]) => `Total: ${this.cop(items.reduce((acc, i) => acc + i.parsed.y, 0))}` : undefined
                    }
                }
            },
            scales: horizontal ? { x: valueAxis, y: categoryAxis } : { x: categoryAxis, y: valueAxis }
        };
    }

    // ---------- Tablas ----------

    vendors = computed(() => {
        const cur = this.current();
        const prevByVendor = groupSum(this.previous().filter(isValid), (r) => r.vendorName);
        const byVendor = new Map<string, LineRow[]>();
        cur.forEach((r) => byVendor.set(r.vendorName, [...(byVendor.get(r.vendorName) ?? []), r]));
        return [...byVendor].map(([name, rows]) => {
            const sales = sum(rows.filter(isValid));
            const lost = sum(rows.filter(isLost));
            const orders = new Set(rows.filter(isValid).map((r) => r.orderId)).size;
            return {
                name,
                sales,
                orders,
                ticket: orders ? sales / orders : 0,
                lossRate: sales + lost ? lost / (sales + lost) : 0,
                delta: pctChange(sales, prevByVendor.get(name) ?? 0)
            };
        });
    });

    topReferences = computed(() => {
        const byRef = new Map<string, { cod: string; name: string; line: string; qty: number; total: number; orders: Set<number> }>();
        for (const r of this.current().filter(isValid)) {
            const ref = byRef.get(r.refCod) ?? { cod: r.refCod, name: r.refName, line: r.businessLine, qty: 0, total: 0, orders: new Set<number>() };
            ref.qty += r.qty;
            ref.total += r.total;
            ref.orders.add(r.orderId);
            byRef.set(r.refCod, ref);
        }
        return [...byRef.values()]
            .sort((a, b) => b.total - a.total)
            .slice(0, 15)
            .map((r) => ({ ...r, orders: r.orders.size }));
    });

    // Pedidos con lineas detenidas o con entrega vencida, mas valiosos primero.
    attentionOrders = computed(() => {
        const byOrder = new Map<number, { number: number; date: string; client: string; vendor: string; pending: number; held: boolean; oldestDeliv: string | null }>();
        for (const r of this.filtered()) {
            const overdue = isOpen(r) && r.delivDate != null && r.delivDate < this.today;
            const held = r.statusId === HELD;
            if (!overdue && !held) {
                continue;
            }
            const o = byOrder.get(r.orderId) ?? { number: r.orderNumber, date: r.date, client: r.clientName, vendor: r.vendorName, pending: 0, held: false, oldestDeliv: null };
            o.pending += r.total;
            o.held ||= held;
            if (overdue && (!o.oldestDeliv || r.delivDate! < o.oldestDeliv)) {
                o.oldestDeliv = r.delivDate;
            }
            byOrder.set(r.orderId, o);
        }
        return [...byOrder.values()]
            .map((o) => ({ ...o, daysLate: o.oldestDeliv ? daysBetween(o.oldestDeliv, this.today) : null }))
            .sort((a, b) => b.pending - a.pending);
    });

    // Clientes que compraron en el periodo anterior y no en el actual.
    atRiskClients = computed(() => {
        const curClients = new Set(this.current().filter(isValid).map((r) => r.clientKey));
        const byClient = new Map<string, { name: string; prevSales: number; lastPurchase: string }>();
        for (const r of this.previous().filter(isValid)) {
            if (curClients.has(r.clientKey)) {
                continue;
            }
            const c = byClient.get(r.clientKey) ?? { name: r.clientName, prevSales: 0, lastPurchase: r.date };
            c.prevSales += r.total;
            if (r.date > c.lastPurchase) {
                c.lastPurchase = r.date;
            }
            byClient.set(r.clientKey, c);
        }
        return [...byClient.values()]
            .map((c) => ({ ...c, daysSince: daysBetween(c.lastPurchase, this.today) }))
            .sort((a, b) => b.prevSales - a.prevSales);
    });

    // ---------- Formato ----------

    cop(v: number | null | undefined) {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v ?? 0);
    }

    copShort(v: number) {
        const abs = Math.abs(v);
        const fmt = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 1 });
        if (abs >= 1e9) return `$${fmt(v / 1e9)} mil M`;
        if (abs >= 1e6) return `$${fmt(v / 1e6)} M`;
        if (abs >= 1e3) return `$${fmt(v / 1e3)} mil`;
        return `$${fmt(v)}`;
    }

    pct(v: number | null | undefined) {
        return v == null ? '—' : `${(v * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;
    }

    // Variacion frente al periodo anterior; para la tasa de perdida, subir es malo.
    delta(v: number | null, points = false, higherIsBetter = true) {
        if (v == null) {
            return { text: 'sin periodo anterior', cls: 'text-muted-color', icon: '' };
        }
        const value = (v * 100).toLocaleString('es-CO', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });
        const good = v === 0 ? null : v > 0 === higherIsBetter;
        return {
            text: `${value}${points ? ' pp' : ' %'} vs. anterior`,
            cls: good == null ? 'text-muted-color' : good ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
            icon: v > 0 ? 'pi pi-arrow-up' : v < 0 ? 'pi pi-arrow-down' : ''
        };
    }

    formatDate(iso: string | null) {
        return iso ? parseIso(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    }
}
