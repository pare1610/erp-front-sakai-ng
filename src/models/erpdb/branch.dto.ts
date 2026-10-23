import { ClientDto } from './client.dto';

export interface BranchDto {
  branchId?: number | null;
  branchCode?: string | null;
  branchCity?: string | null;
  branchAddress?: string | null;
  branchClient?: ClientDto | null;
  branchZone?: string | null; // zona comercial (EMP001_FACT.CLIENTES.ZONA); null si no cruza con el sistema anterior
}
