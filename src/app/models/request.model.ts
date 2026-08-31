import { ApiResponse } from './auth.model';
import { PaginatedPayload } from './equipment.model';
import { IctChecklist, ReturnCondition } from './transaction.model';

export type RequestType = 'ISSUE' | 'RETURN' | 'EXCHANGE';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';

export interface EquipmentRequest {
  id: number;
  requestCode: string;
  staffId: number;
  staffName: string;
  employeeSignature: string | null;
  requestType: RequestType;
  reason: string;
  returnAssetNumber: string | null;
  issueAssetNumber: string | null;
  preferredEquipmentType: string | null;
  status: RequestStatus;
  rejectionReason: string | null;
  approvedBy: number | null;
  approvedByName: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  transactionId: number | null;
}

export interface CreateEquipmentRequestDto {
  requestType: RequestType;
  reason: string;
  returnAssetNumber?: string;
  issueAssetNumber?: string;
  preferredEquipmentType?: string;
  employeeSignature?: string;
}

export interface ApproveRequestDto {
  requestId: number;
  issueAssetNumber?: string;
  returnAssetNumber?: string;
  checklist: IctChecklist;
  accessoriesProvided?: string;
  returnCondition?: ReturnCondition;
  returnRemarks?: string;
}

export interface RejectRequestDto {
  rejectionReason: string;
}

export type PaginatedRequestResponse = ApiResponse<
  PaginatedPayload<EquipmentRequest>
>;
