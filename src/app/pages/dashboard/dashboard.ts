import { Component, computed, inject } from '@angular/core';
import Keycloak from 'keycloak-js';
import { KEYCLOAK_EVENT_SIGNAL } from 'keycloak-angular';
import { NotificationsWidget } from './components/notificationswidget';
import { StatsWidget } from './components/statswidget';
import { RecentSalesWidget } from './components/recentsaleswidget';
import { BestSellingWidget } from './components/bestsellingwidget';
import { RevenueStreamWidget } from './components/revenuestreamwidget';
import { ChatbotComponent } from '@/app/components/chatbot.component/chatbot.component';

// Rol de Keycloak que el backend exige en /api/chatbot (ROLE_CHATBOT)
const CHATBOT_ROLE = 'chatbot';

@Component({
    selector: 'app-dashboard',
    imports: [StatsWidget, RecentSalesWidget, BestSellingWidget, RevenueStreamWidget, NotificationsWidget, ChatbotComponent],
    template: `
        <div class="grid grid-cols-12 gap-8">
            @if (puedeUsarChatbot()) {
                <div class="col-span-12">
                    <app-chatbot />
                </div>
            }
            <app-stats-widget class="contents" />
            <div class="col-span-12 xl:col-span-6">
                <app-recent-sales-widget />
                <app-best-selling-widget />
            </div>
            <div class="col-span-12 xl:col-span-6">
                <app-revenue-stream-widget />
                <app-notifications-widget />
            </div>
        </div>
    `
})
export class Dashboard {
    private readonly keycloak = inject(Keycloak);
    private readonly keycloakSignal = inject(KEYCLOAK_EVENT_SIGNAL);

    // Se recalcula con cada evento de Keycloak (login, logout, refresco de token)
    readonly puedeUsarChatbot = computed(() => {
        this.keycloakSignal();
        if (!this.keycloak.authenticated) {
            return false;
        }
        const realmRoles = this.keycloak.realmAccess?.roles ?? [];
        const resourceRoles = Object.values(this.keycloak.resourceAccess ?? {}).flatMap((access) => access.roles ?? []);
        return [...realmRoles, ...resourceRoles].some((role) => role.toLowerCase() === CHATBOT_ROLE);
    });
}
