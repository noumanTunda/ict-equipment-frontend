import { ApiResponse } from './auth.model';

export type EquipmentStatus =
  | 'AVAILABLE'
  | 'ISSUED'
  | 'RETURNED'
  | 'MAINTENANCE'
  | 'DISPOSED';

  export type EquipmentDepartment =
    | 'ICT'
    | 'FINANCE_AND_ACCOUNTS'
    | 'LEGAL_SERVICES'
    | 'HUMAN_RESOURCE_AND_ADMINISTRATION'
    | 'PLANNING_AND_COORDINATION';

export type ItemCondition = 'GOOD' | 'FAIR' | 'DAMAGED' | 'OBSOLETE';

export interface Equipment {
  id: number;
  assetNumber: string;
  serialNumber: string;
  equipmentType: string;
  department: EquipmentDepartment;
  brandModel: string;
  supplierDetails: string;
  description: string;
  status: EquipmentStatus;
  hasWarranty: boolean;
  warrantyDurationMonths?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEquipmentDto {
  assetNumber: string;
  serialNumber: string;
  equipmentType: string;
  department: EquipmentDepartment;
  brandModel: string;
  supplierDetails: string;
  description: string;
  status: EquipmentStatus;
}

export interface UpdateEquipmentDto {
  assetNumber: string;
  serialNumber: string;
  equipmentType: string;
  department: EquipmentDepartment;
  brandModel: string;
  supplierDetails: string;
  description: string;
  status: EquipmentStatus;
}

export interface PageableInfo {
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export interface PaginatedPayload<T> {
  content: T[];
  pageable: PageableInfo;
}

export type PaginatedEquipmentResponse = ApiResponse<
  PaginatedPayload<Equipment>
>;

export interface ReInspectionDto {
  targetStatus: 'AVAILABLE' | 'MAINTENANCE';
  itemCondition: ItemCondition;
  remarks?: string;
  maintenanceNotes?: string;
  estimatedMaintenanceCost?: number;
}
