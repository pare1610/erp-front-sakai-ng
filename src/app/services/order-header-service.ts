import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_SETTINGS } from '../../app.settings';
import { OrderHeaderDto } from '../../models/erpdb';

@Injectable({
    providedIn: 'root'
})
export class OrderHeaderService {
    private http = inject(HttpClient);
    private settings = inject(APP_SETTINGS);
    private apiUrl = `${this.settings.apiUrl}/api/orderheader`;

    // Pedidos con fecha entre fechaInicial y fechaFinal (yyyy-MM-dd, ambas incluidas). Sin paginacion.
    // estados: ids de OrderReferStatus; si viene, solo pedidos con lineas en esos estados y solo esas lineas.
    getOrderHeaders(fechaInicial: string, fechaFinal: string, estados?: number[]): Observable<OrderHeaderDto[]> {
        let params = new HttpParams().set('fechaInicial', fechaInicial).set('fechaFinal', fechaFinal);
        if (estados?.length) {
            params = params.set('estados', estados.join(','));
        }
        return this.http.get<OrderHeaderDto[]>(this.apiUrl, { params });
    }

    getOrderHeaderByNumber(num: number): Observable<OrderHeaderDto> {
        return this.http.get<OrderHeaderDto>(`${this.apiUrl}/${num}`);
    }
}
