import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { ObjectUtils } from 'primeng/utils';
import { of, Subscription } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { OrderHeaderDto } from '@/models/erpdb';
import { OrderDetailService } from '@/app/services/order-detail-service';

// Proyectos de las lineas unidos en un texto: el filtro global de p-table no busca dentro de arreglos.
type OrderRow = OrderHeaderDto & { orderReferProjects: string };

interface expandedRows {
    [key: string]: boolean;
}

// Estados de OrderReferStatus. El backend no expone sus ids, por eso se filtra por nombre en el cliente.
const ORDER_REFER_STATUSES = ['Aprobado', 'En Revisión', 'Detenido', 'Cancelado', 'Anulado'];
const DEFAULT_STATUSES = ['Aprobado', 'En Revisión'];
const DEFAULT_MONTHS = 6;

const STATUS_COLORS: { [status: string]: { background: string; color: string } } = {
    Aprobado: { background: '#22c55e', color: '#ffffff' },
    Cancelado: { background: '#ef4444', color: '#ffffff' },
    Anulado: { background: '#9ca3af', color: '#ffffff' },
    Detenido: { background: '#f97316', color: '#ffffff' },
    'En Revisión': { background: '#facc15', color: '#000000' }
};
const DEFAULT_STATUS_COLOR = { background: '#000000', color: '#ffffff' };

@Component({
    selector: 'app-order-detail',
    standalone: true,
    imports: [TableModule, InputIconModule, TagModule, InputTextModule, CommonModule, FormsModule, ButtonModule, RippleModule, IconFieldModule, DatePickerModule, MultiSelectModule],
    templateUrl: './order.detail.component.html'
})
export class OrderDetailComponent implements OnInit {
    private readonly orderDetailService = inject(OrderDetailService);
    private loadSubscription?: Subscription;

    readonly statusOptions = ORDER_REFER_STATUSES.map((name) => ({ label: name, value: name }));

    readonly dateRange = signal<Date[]>(this.defaultDateRange());

    readonly selectedStatuses = signal<string[]>([...DEFAULT_STATUSES]);

    private readonly allOrders = signal<OrderHeaderDto[]>([]);

    // Igual que el filtro "estados" del backend: solo pedidos con lineas en los estados elegidos y solo esas lineas.
    readonly orders = computed<OrderRow[]>(() => {
        const statuses = new Set(this.selectedStatuses());
        return this.allOrders()
            .map((order) => {
                const orderReference = (order.orderReference ?? []).filter((ref) => statuses.size === 0 || statuses.has(ref.orderReferStatus?.orderReferStatusName ?? ''));
                const projects = new Set(orderReference.map((ref) => ref.orderReferProject?.projeName).filter((name): name is string => !!name));
                return { ...order, orderReference, orderReferProjects: [...projects].join(' ') };
            })
            .filter((order) => statuses.size === 0 || order.orderReference.length > 0);
    });

    readonly loading = signal(true);

    expandedRows: expandedRows = {};

    isExpanded: boolean = false;

    @ViewChild('filter') filter!: ElementRef;

    ngOnInit() {
        this.loadOrders();
    }

    onDateRangeChange(range: Date[] | null) {
        this.dateRange.set(range ?? []);
        // El rango solo esta completo cuando se eligen ambas fechas.
        if (range?.[0] && range?.[1]) {
            this.loadOrders();
        }
    }

    private loadOrders() {
        const [fechaInicial, fechaFinal] = this.dateRange();
        if (!fechaInicial || !fechaFinal) {
            return;
        }
        this.loadSubscription?.unsubscribe();
        this.loading.set(true);
        this.collapseAll();
        this.loadSubscription = this.orderDetailService
            .getOrderHeaders(this.toIsoDate(fechaInicial), this.toIsoDate(fechaFinal))
            .pipe(
                catchError(() => of([])),
                finalize(() => this.loading.set(false))
            )
            .subscribe((orders) => this.allOrders.set(orders));
    }

    private defaultDateRange(): Date[] {
        const fechaFinal = new Date();
        const fechaInicial = new Date();
        fechaInicial.setMonth(fechaInicial.getMonth() - DEFAULT_MONTHS);
        return [fechaInicial, fechaFinal];
    }

    // yyyy-MM-dd en hora local (toISOString usaria UTC y podria correr el dia).
    private toIsoDate(date: Date): string {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${date.getFullYear()}-${month}-${day}`;
    }

    expandAll() {
        if (ObjectUtils.isEmpty(this.expandedRows)) {
            this.expandedRows = this.orders().reduce(
                (acc, o) => {
                    if (o.orderHeaderId != null) {
                        acc[o.orderHeaderId] = true;
                    }
                    return acc;
                },
                {} as { [key: string]: boolean }
            );
            this.isExpanded = true;
        } else {
            this.collapseAll();
        }
    }

    collapseAll() {
        this.expandedRows = {};
        this.isExpanded = false;
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    clear(table: Table) {
        table.clear();
        this.filter.nativeElement.value = '';
    }

    getStatusColor(status: string | null | undefined) {
        return STATUS_COLORS[status ?? ''] ?? DEFAULT_STATUS_COLOR;
    }
}
