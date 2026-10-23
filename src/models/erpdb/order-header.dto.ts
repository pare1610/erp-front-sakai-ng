import { BranchDto } from './branch.dto';
import { OrderDetailNoteDto } from './order-detail.dto';
import { ReferenceDto } from './reference.dto';
import { VendorDto } from './vendor.dto';

// Contrato de GET /api/orderheader (OrderHeaderDto del backend).

export interface ProjectDto {
  projeId?: number | null;
  projeName?: string | null;
}

// Estados: 1 Cancelado, 2 Aprobado, 3 Detenido, 4 En Revision, 5 Anulado (lista en /api/orderreferstatus)
export interface OrderReferStatusDto {
  orderReferStatusId?: number | null;
  orderReferStatusName?: string | null;
}

// Linea de negocio: hijo directo de la raiz del arbol de clasificacion de referencias
export interface OrderBusinessLineDto {
  referClassId?: number | null;
  referClassName?: string | null;
}

export interface OrderHeaderLineDto {
  orderReferId?: number | null;
  orderReferPosition?: number | null;
  orderReferReference?: ReferenceDto | null;
  orderReferBusinessLine?: OrderBusinessLineDto | null; // null si la referencia no esta clasificada
  orderReferQuantity?: number | null;
  orderReferUnitPrice?: number | null; // Java BigDecimal
  valorTotal?: number | null; // cantidad * valor unitario (sin impuestos); no existe en la base
  orderReferDelivDate?: string | null; // ISO date (yyyy-MM-dd) from LocalDate
  orderReferProject?: ProjectDto | null;
  orderReferStatus?: OrderReferStatusDto | null;
}

export interface OrderHeaderDto {
  orderHeaderId?: number | null;
  orderHeaderNumber?: number | null;
  orderHeaderDate?: string | null; // ISO date (yyyy-MM-dd) from LocalDate
  orderHeaderPaymeConditions?: string | null;
  orderHeaderDescription?: string | null;
  orderHeaderBranch?: BranchDto | null;
  orderHeaderVendor?: VendorDto | null; // vendedor del pedido; si no tiene, el de la sede
  orderHeaderBusinessLine?: OrderBusinessLineDto[] | null;
  orderReference?: OrderHeaderLineDto[] | null;
  orderNote?: OrderDetailNoteDto[] | null;
}
