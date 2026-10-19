import { BranchDto } from './branch.dto';
import { OrderReferStatusDto } from './order-refer-status.dto';
import { ProjectDto } from './project.dto';
import { ReferenceDto } from './reference.dto';
import { VendorDto } from './vendor.dto';

// Linea de negocio: segundo nivel del arbol de clasificacion de la referencia
export interface OrderBusinessLineDto {
  referClassId?: number | null;
  referClassName?: string | null;
}

export interface OrderDetailNoteDto {
  orderNoteId?: number | null;
  orderNotePosition?: number | null;
  orderNoteText?: string | null;
}

export interface OrderDetailReferenceDto {
  orderReferId?: number | null;
  orderReferPosition?: number | null;
  orderReferReference?: ReferenceDto | null;
  orderReferBusinessLine?: OrderBusinessLineDto | null; // null si la referencia no esta clasificada
  orderReferQuantity?: number | null;
  orderReferUnitPrice?: number | null; // Java BigDecimal
  valorTotal?: number | null; // cantidad * valor unitario (sin impuestos); no existe en la base
  orderReferDelivDate?: string | null; // ISO date (yyyy-MM-dd) from LocalDate
  orderReferProject?: ProjectDto | null; // proyecto de la linea; null si no tiene
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
  orderHeaderBusinessLine?: OrderBusinessLineDto[] | null; // lineas de negocio distintas de las lineas del pedido
  orderReference?: OrderDetailReferenceDto[] | null;
  orderNote?: OrderDetailNoteDto[] | null;
}
