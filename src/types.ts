/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN_OFFICER = 'Admin Officer',
  HEAD_OF_ADMIN = 'Head of Administration',
  INTERNAL_CONTROL = 'Internal Control Officer',
  EXECUTIVE_OFFICE = 'Executive Office',
  FINANCE_OFFICER = 'Finance Officer',
  SYSTEM_ADMIN = 'System Administrator'
}

export enum RequestStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  PENDING_HEAD_OF_ADMIN = 'Pending Head of Admin Approval',
  PENDING_INTERNAL_CONTROL = 'Pending Internal Control Approval',
  PENDING_EXECUTIVE_OFFICE = 'Pending Executive Office Approval',
  PENDING_HEAD_OF_ADMIN_RELEASE = 'Pending Head of Admin Release to Finance',
  AWAITING_FINANCE_PAYMENT = 'Awaiting Finance Payment',
  PAID = 'Paid',
  REJECTED = 'Rejected',
  CLOSED = 'Closed'
}

export enum RetirementStatus {
  DRAFT = 'Draft',
  SUBMITTED = 'Submitted',
  PENDING_HEAD_OF_ADMIN = 'Pending Head of Admin Audit',
  PENDING_INTERNAL_CONTROL = 'Pending Internal Control Compliance',
  PENDING_EXECUTIVE_OFFICE = 'Pending Executive Office Clearance',
  PENDING_HEAD_OF_ADMIN_RELEASE = 'Pending Release to Finance',
  PENDING_FINANCE = 'Pending Finance Reconciliation',
  APPROVED = 'Approved & Closed',
  REJECTED = 'Retirement Rejected'
}

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Cheque';

export interface PaymentDetails {
  paymentDate: string;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  amountPaid: number;
  beneficiaryName: string;
  proofOfPaymentName?: string;
  proofOfPaymentUrl?: string;
}

export interface ExpenseItem {
  id: string;
  description: string;
  category: string;
  amount: number;
  receiptName?: string;
}

export interface ApprovalHistoryEntry {
  userId: string;
  userRole: UserRole;
  userName: string;
  action: string;
  date: string;
  comment?: string;
  signatureSvg?: string;
}

export interface CashAdvanceRequest {
  id: string; // referenceNumber
  referenceNumber: string;
  requestDate: string;
  staffName: string;
  department: string;
  purpose: string;
  amountRequested: number;
  expectedRetirementDate: string;
  attachmentName?: string;
  comment?: string;
  signatureSvg?: string;
  currentStatus: RequestStatus;
  initiator: string;
  approvalHistory: ApprovalHistoryEntry[];
  paymentDetails?: PaymentDetails;
  daysAwaitingPaymentSince?: string; // used for testing / simulation of 2 and 5 days reminders
}

export interface CashAdvanceRetirement {
  id: string; // unique retirement ID or same as reference
  cashAdvanceRef: string;
  amountAdvanced: number;
  amountUtilized: number;
  balanceReturned: number;
  retirementDate: string;
  expenseDetails: ExpenseItem[];
  receiptName?: string;
  comment?: string;
  currentStatus: RetirementStatus;
  approvedDate?: string;
  approvalHistory: ApprovalHistoryEntry[];
}

export interface AuditLogEntry {
  id: string;
  requestReference: string;
  type: 'Cash Advance' | 'Retirement' | 'System';
  user: string;
  role: UserRole;
  action: string;
  date: string;
  comment?: string;
}

export interface NotificationEntry {
  id: string;
  recipientRole: UserRole | 'All';
  text: string;
  date: string;
  isRead: boolean;
  requestId: string;
  type: 'reminder' | 'approval_required' | 'status_change' | 'escalation';
}

export const DEPARTMENTS = [
  'Administration',
  'Finance & Accounts',
  'Operations',
  'Human Resources',
  'Internal Audit & Control',
  'Executive Office',
  'Legal & Compliance',
  'IT & Systems'
];

export const STAFF_MEMBERS: { name: string; role: UserRole; department: string }[] = [
  { name: 'John Doe', role: UserRole.ADMIN_OFFICER, department: 'Administration' },
  { name: 'Sarah Jenkins', role: UserRole.HEAD_OF_ADMIN, department: 'Administration' },
  { name: 'Marcus Vance', role: UserRole.INTERNAL_CONTROL, department: 'Internal Audit & Control' },
  { name: 'Elizabeth Stone', role: UserRole.EXECUTIVE_OFFICE, department: 'Executive Office' },
  { name: 'Robert Finch', role: UserRole.FINANCE_OFFICER, department: 'Finance & Accounts' },
  { name: 'Alex Mercer', role: UserRole.SYSTEM_ADMIN, department: 'IT & Systems' }
];

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  bannerColor: string;
}

export interface SentEmail {
  id: string;
  templateId: string;
  templateName: string;
  recipientEmail: string;
  recipientRole: string;
  recipientName: string;
  subject: string;
  body: string;
  date: string;
  referenceNumber: string;
}

export interface SystemCustomSettings {
  maxCashAdvance: number;
  retirementWindowDays: number;
  requiresExecutiveApprovalAbove: number;
  customLogoText: string;
  themeAccent: 'default' | 'blue' | 'purple' | 'emerald' | 'crimson' | 'orange';
  borderStyle: 'default' | 'rounded' | 'sharp';
  supportEmail: string;
  supportPhone: string;
  debugBarEnabled: boolean;
}


