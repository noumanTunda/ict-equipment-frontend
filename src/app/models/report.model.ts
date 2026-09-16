import { PaginatedPayload } from './equipment.model';
import { Equipment, EquipmentDepartment, EquipmentStatus } from './equipment.model';
import { EquipmentTransaction, TransactionStatus } from './transaction.model';
import { ItemCondition } from './equipment.model';

export interface EquipmentReportFilter {
  startDate?: string;
  endDate?: string;
  department?: EquipmentDepartment;
  equipmentCategory?: string;
  equipmentStatus?: EquipmentStatus;
  hasWarranty?: boolean;
  searchQuery?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface EquipmentReportResponse {
  content: Equipment[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface TransactionReportFilter {
  startDate?: string;
  endDate?: string;
  transactionStatus?: TransactionStatus;
  staffIds?: number[];
  itemCondition?: ItemCondition;
  overdueThresholdDays?: number;
  page?: number;
  size?: number;
  sort?: string;
}

export interface TransactionReportResponse {
  content: EquipmentTransaction[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface StaffAssetReportItem {
  id: number;
  assetNumber: string;
  serialNumber: string;
  equipmentType: string;
  status: EquipmentStatus;
  issuedAt: string;
  returnedAt: string | null;
  transactionStatus: TransactionStatus;
  transactionCode: string;
  staffId: number;
}

export interface StaffAssetReportResponse {
  data: StaffAssetReportItem[];
}

export interface OverdueTransactionReportResponse {
  content: EquipmentTransaction[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
  };
}
