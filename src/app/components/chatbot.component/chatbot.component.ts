import { afterRenderEffect, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { marked } from 'marked';
import { ChatbotService } from '@/app/services/chatbot-service';

interface Mensaje {
    autor: 'usuario' | 'bot';
    // HTML ya convertido desde Markdown; Angular lo sanitiza al asignarlo con [innerHTML]
    html: string;
    error?: boolean;
}

const MAX_CARACTERES = 4000;

@Component({
    selector: 'app-chatbot',
    standalone: true,
    imports: [FormsModule, ButtonModule, TextareaModule],
    templateUrl: './chatbot.component.html',
    styleUrl: './chatbot.component.scss'
})
export class ChatbotComponent {
    private readonly chatbotService = inject(ChatbotService);
    private readonly mensajesContainer = viewChild<ElementRef<HTMLElement>>('mensajesContainer');

    readonly maxCaracteres = MAX_CARACTERES;
    readonly mensajes = signal<Mensaje[]>([]);
    readonly texto = signal('');
    readonly enviando = signal(false);

    constructor() {
        // Mantiene visible el ultimo mensaje
        afterRenderEffect(() => {
            this.mensajes();
            this.enviando();
            const container = this.mensajesContainer()?.nativeElement;
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        });
    }

    enviar() {
        const texto = this.texto().trim();
        if (!texto || this.enviando()) {
            return;
        }
        this.agregar({ autor: 'usuario', html: this.escapar(texto) });
        this.texto.set('');
        this.enviando.set(true);
        this.chatbotService.enviarMensaje(texto).subscribe({
            next: (respuesta) => {
                this.agregar({ autor: 'bot', html: marked.parse(respuesta, { async: false }) });
                this.enviando.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.agregar({ autor: 'bot', html: this.escapar(this.mensajeDeError(error)), error: true });
                this.enviando.set(false);
            }
        });
    }

    // Enter envia; Shift+Enter agrega un salto de linea
    onKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.enviar();
        }
    }

    reiniciar() {
        this.chatbotService.reiniciar().subscribe({
            next: () => this.mensajes.set([]),
            error: (error: HttpErrorResponse) => this.agregar({ autor: 'bot', html: this.escapar(this.mensajeDeError(error)), error: true })
        });
    }

    private agregar(mensaje: Mensaje) {
        this.mensajes.update((mensajes) => [...mensajes, mensaje]);
    }

    private mensajeDeError(error: HttpErrorResponse): string {
        switch (error.status) {
            case 0:
                return 'No se pudo conectar con el servidor.';
            case 401:
                return 'Tu sesión expiró. Vuelve a iniciar sesión.';
            case 403:
                return 'No tienes permiso para usar el asistente.';
            case 404:
                return 'El asistente no está habilitado en el servidor.';
            default:
                return 'Hubo un error al procesar tu solicitud. Intenta de nuevo.';
        }
    }

    private escapar(texto: string): string {
        return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    }
}
