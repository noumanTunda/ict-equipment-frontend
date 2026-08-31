import { ApiResponse } from './auth.model';
import { PaginatedPayload } from './equipment.model';

export type TransactionStatus = 'PENDING_SIGNATURE' | 'COMPLETED' | 'CANCELLED';
export type ReturnCondition = 'GOOD' | 'FAIR' | 'DAMAGED' | 'OBSOLETE';

export interface IssuedItem {
  id?: number;
  assetNumber: string;
  serialNumber?: string;
  equipmentType?: string;
  accessoriesProvided?: string;
}

export interface ReturnedItem {
  id?: number;
  assetNumber: string;
  serialNumber?: string;
  equipmentType?: string;
  itemCondition?: ReturnCondition;
  remarks?: string;
}

export interface IctChecklist {
  id?: number;
  osInstalled: string;
  appSystemInstalled: string;
  antiVirusInstalled: string;
  pdfReaderInstalled: string;
  isJoinedToDomain: boolean;
  isInstalledVpn: boolean;
  isInstalledPrinter: boolean;
  additionalNotes?: string;
}

export interface EquipmentTransaction {
  id: number;
  transactionCode: string;
  staffId: number;
  staffName: string;
  issuingOfficerId: number;
  issuingOfficerName: string;
  status: TransactionStatus;
  employeeSignature: string | null;
  officerSignature: string | null;
  employeeSignedAt: string | null;
  officerSignedAt: string | null;
  createdAt: string;
  updatedAt: string;
  issuedItems: IssuedItem[];
  returnedItems: ReturnedItem[];
  checklist: IctChecklist | null;
}

export interface CreateTransactionDto {
  staffId: number;
  issuingOfficerId: number;
  issuedItems?: Array<{
    assetNumber: string;
    accessoriesProvided?: string;
  }>;
  returnedItems?: Array<{
    assetNumber: string;
    itemCondition?: string;
    remarks?: string;
  }>;
  checklist?: IctChecklist;
}

export interface DirectIssueDto {
  staffId: number;
  issuingOfficerId: number;
  issuedItems: Array<{
    assetNumber: string;
    accessoriesProvided?: string;
  }>;
  checklist: IctChecklist;
}

export interface SignTransactionDto {
  employeeSignature?: string;
  officerSignature?: string;
}

export interface TransactionFilterParams {
  staffId?: number;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export type PaginatedTransactionResponse = ApiResponse<
  PaginatedPayload<EquipmentTransaction>
>;
