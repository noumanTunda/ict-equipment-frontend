import { ApiResponse } from './auth.model';

export type EquipmentStatus =
  | 'AVAILABLE'
  | 'ISSUED'
  | 'RETURNED'
  | 'MAINTENANCE';

export interface Equipment {
  id: number;
  assetNumber: string;
  serialNumber: string;
  equipmentType: string;
  brandModel: string;
  supplierDetails: string;
  description: string;
  status: EquipmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEquipmentDto {
  assetNumber: string;
  serialNumber: string;
  equipmentType: string;
  brandModel: string;
  supplierDetails: string;
  description: string;
  status: EquipmentStatus;
}

export interface UpdateEquipmentDto {
  assetNumber: string;
  serialNumber: string;
  equipmentType: string;
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
