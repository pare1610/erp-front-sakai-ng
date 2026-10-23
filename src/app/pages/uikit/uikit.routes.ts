import { Routes } from '@angular/router';
import { ButtonDemo } from './buttondemo';
import { ChartDemo } from './chartdemo';
import { FileDemo } from './filedemo';
import { FormLayoutDemo } from './formlayoutdemo';
import { InputDemo } from './inputdemo';
import { ListDemo } from './listdemo';
import { MediaDemo } from './mediademo';
import { MessagesDemo } from './messagesdemo';
import { MiscDemo } from './miscdemo';
import { PanelsDemo } from './panelsdemo';
import { TimelineDemo } from './timelinedemo';
import { TableDemo } from './tabledemo';
import { OverlayDemo } from './overlaydemo';
import { TreeDemo } from './treedemo';
import { MenuDemo } from './menudemo';
import { AppPedidoComponent } from '../../components/app.pedido.component/app.pedido.component';
import { PedidoTableComponent } from '../../components/pedido.table.component/pedido.table.component';
import { OrderDetailComponent } from '../../components/order.detail.component/order.detail.component';
import { OrderDashboardComponent } from '../../components/order.dashboard.component/order.dashboard.component';

export default [
    { path: 'button', data: { breadcrumb: 'Button' }, component: ButtonDemo },
    { path: 'charts', data: { breadcrumb: 'Charts' }, component: ChartDemo },
    { path: 'file', data: { breadcrumb: 'File' }, component: FileDemo },
    { path: 'formlayout', data: { breadcrumb: 'Form Layout' }, component: FormLayoutDemo },
    { path: 'input', data: { breadcrumb: 'Input' }, component: InputDemo },
    { path: 'list', data: { breadcrumb: 'List' }, component: ListDemo },
    { path: 'media', data: { breadcrumb: 'Media' }, component: MediaDemo },
    { path: 'message', data: { breadcrumb: 'Message' }, component: MessagesDemo },
    { path: 'misc', data: { breadcrumb: 'Misc' }, component: MiscDemo },
    { path: 'panel', data: { breadcrumb: 'Panel' }, component: PanelsDemo },
    { path: 'timeline', data: { breadcrumb: 'Timeline' }, component: TimelineDemo },
    { path: 'table', data: { breadcrumb: 'Table' }, component: TableDemo },
    { path: 'pedido', data: { breadcrumb: 'Pedido' }, component: AppPedidoComponent },
    { path: 'pedido2', data: { breadcrumb: 'Pedido2' }, component: AppPedidoComponent },
    { path: 'pedidotabla', data: { breadcrumb: 'PedidoTabla' }, component: PedidoTableComponent },
    { path: 'orderdetail', data: { breadcrumb: 'Detalle Pedidos' }, component: OrderDetailComponent },
    { path: 'informepedidos', data: { breadcrumb: 'Informe Pedidos' }, component: OrderDashboardComponent },
    { path: 'overlay', data: { breadcrumb: 'Overlay' }, component: OverlayDemo },
    { path: 'tree', data: { breadcrumb: 'Tree' }, component: TreeDemo },
    { path: 'menu', data: { breadcrumb: 'Menu' }, component: MenuDemo },
    { path: '**', redirectTo: '/notfound' }
] as Routes;
