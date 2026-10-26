import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { ObjectUtils } from 'primeng/utils';
import { Observable, of } from 'rxjs';
import { catchError, finalize, shareReplay, take } from 'rxjs/operators';
import { OrderHeaderDto } from '@/models/erpdb';
import { OrderHeaderService } from '@/app/services/order-header-service';

// Dias hacia atras que se consultan desde hoy.
const DIAS = 270;

const toIsoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface expandedRows {
    [key: string]: boolean;
}

@Component({
    selector: 'app-order-detail',
    standalone: true,
    imports: [TableModule, InputIconModule, TagModule, InputTextModule, CommonModule, FormsModule, ButtonModule, RippleModule, IconFieldModule, ToastModule],
    templateUrl: './order.detail.component.html',
    providers: [MessageService]
})
export class OrderDetailComponent implements OnInit {
    private readonly orderHeaderService = inject(OrderHeaderService);
    private readonly messageService = inject(MessageService);

    orders$: Observable<OrderHeaderDto[]> = of([]);

    expandedRows: expandedRows = {};

    isExpanded: boolean = false;

    loading: boolean = true;

    @ViewChild('filter') filter!: ElementRef;

    ngOnInit() {
        const hoy = new Date();
        const desde = new Date(hoy);
        desde.setDate(hoy.getDate() - DIAS);

        this.orders$ = this.orderHeaderService.getOrderHeaders(toIsoDate(desde), toIsoDate(hoy)).pipe(
            catchError((error: HttpErrorResponse) => {
                console.error('Error cargando pedidos', error);
                this.messageService.add({ severity: 'error', summary: `Error ${error.status}`, detail: 'No se pudieron cargar los pedidos.', life: 6000 });
                return of([]);
            }),
            finalize(() => {
                this.loading = false;
            }),
            shareReplay(1)
        );
    }

    expandAll() {
        if (ObjectUtils.isEmpty(this.expandedRows)) {
            this.orders$.pipe(take(1)).subscribe((orders) => {
                this.expandedRows = orders.reduce(
                    (acc, o) => {
                        if (o.orderHeaderId != null) {
                            acc[o.orderHeaderId] = true;
                        }
                        return acc;
                    },
                    {} as { [key: string]: boolean }
                );
                this.isExpanded = true;
            });
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

    // Estados: 1 Cancelado, 2 Aprobado, 3 Detenido, 4 En Revision, 5 Anulado
    getSeverity(statusId: number | null | undefined) {
        switch (statusId) {
            case 2:
                return 'success';
            case 3:
                return 'warn';
            case 1:
            case 5:
                return 'danger';
            default:
                return 'info';
        }
    }
}
