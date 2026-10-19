import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { APP_SETTINGS } from '../../app.settings';

@Injectable({
    providedIn: 'root'
})
export class ChatbotService {
    private http = inject(HttpClient);
    private settings = inject(APP_SETTINGS);
    private apiUrl = `${this.settings.apiUrl}/api/chatbot`;

    // Mismo bot que Telegram; el backend guarda una conversacion por usuario de Keycloak.
    enviarMensaje(texto: string): Observable<string> {
        return this.http.post<{ respuesta: string }>(`${this.apiUrl}/mensaje`, { texto }).pipe(map((r) => r.respuesta));
    }

    reiniciar(): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/reiniciar`, null);
    }
}
