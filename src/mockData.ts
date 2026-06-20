import { 
  CashAdvanceRequest, 
  CashAdvanceRetirement, 
  AuditLogEntry, 
  NotificationEntry,
  RequestStatus, 
  RetirementStatus, 
  UserRole,
  PaymentMethod,
  EmailTemplate,
  SentEmail,
  STAFF_MEMBERS as INITIAL_STAFF_MEMBERS
} from './types';
import { DEFAULT_TEMPLATES } from './defaultTemplates';

// Let's seed with high-fidelity realistic data set at June 12, 2026
export const INITIAL_CASH_ADVANCES: CashAdvanceRequest[] = [
  {
    id: 'CA-2026-001',
    referenceNumber: 'CA-2026-001',
    requestDate: '2026-05-10',
    staffName: 'Ovat Daniel',
    department: 'Administration',
    purpose: 'Procurement of office stationeries and high-density printing paper for Admin Department annual audit.',
    amountRequested: 450,
    expectedRetirementDate: '2026-05-24',
    attachmentName: 'quote_stationery_express.pdf',
    attachmentUrl: '/quote_stationery_express.pdf',
    comment: 'Need this urgently so the audit materials are printed on time.',
    currentStatus: RequestStatus.PAID,
    initiator: 'Ovat Daniel',
    approvalHistory: [
      { userId: '1', userRole: UserRole.ADMIN_OFFICER, userName: 'Ovat Daniel', action: 'Submit', date: '2026-05-10 09:15', comment: 'Initiated request' },
      { userId: '2', userRole: UserRole.HEAD_OF_ADMIN, userName: 'Tina Ofeno', action: 'Approve', date: '2026-05-11 10:30', comment: 'Recommended for approval. Essential items.' },
      { userId: '3', userRole: UserRole.INTERNAL_CONTROL, userName: 'Jelili Lamidi', action: 'Approve', date: '2026-05-11 14:45', comment: 'Verified against budget limit. Complies.' },
      { userId: '4', userRole: UserRole.EXECUTIVE_DIRECTOR, userName: 'Oyelaide Eigbe', action: 'Approve', date: '2026-05-12 11:00', comment: 'Exe Office Approved.' },
      { userId: '2', userRole: UserRole.HEAD_OF_ADMIN, userName: 'Tina', action: 'Send to Finance', date: '2026-05-12 12:15', comment: 'Sending to Finance for payment.' },
      { userId: '5', userRole: UserRole.FINANCE_OFFICER, userName: 'Finance & Account', action: 'Pay', date: '2026-05-13 15:30', comment: 'Paid successfully via bank transfer.' }
    ],
    paymentDetails: {
      paymentDate: '2026-05-13',
      paymentMethod: 'Bank Transfer',
      paymentReference: 'TXN-908127391',
      amountPaid: 450,
      beneficiaryName: 'Ovat Daniel'
    }
  },
  {
    id: 'CA-2026-002',
    referenceNumber: 'CA-2026-002',
    requestDate: '2026-05-20',
    staffName: 'Ovat Daniel',
    department: 'Administration',
    purpose: 'Local travel expenses for site inspection and inventory check at our warehouse branch.',
    amountRequested: 800,
    expectedRetirementDate: '2026-06-05', // Past current date of June 12, 2026 - Outstanding & OVERDUE!
    attachmentName: 'warehouse_itinerary.pdf',
    attachmentUrl: '/warehouse_itinerary.pdf',
    comment: 'Covers transport, accommodation for 3 nights, and meal allowances.',
    currentStatus: RequestStatus.PAID,
    initiator: 'Ovat Daniel',
    approvalHistory: [
      { userId: '1', userRole: UserRole.ADMIN_OFFICER, userName: 'Ovat Daniel', action: 'Submit', date: '2026-05-20 10:00', comment: 'Travel approved by supervisor.' },
      { userId: '2', userRole: UserRole.HEAD_OF_ADMIN, userName: 'Tina Ofeno', action: 'Approve', date: '2026-05-21 09:00', comment: 'Standard travel rate applied.' },
      { userId: '3', userRole: UserRole.INTERNAL_CONTROL, userName: 'Jelili Lamidi', action: 'Approve', date: '2026-05-21 15:30', comment: 'Checked travel ledger. Budget available.' },
      { userId: '4', userRole: UserRole.EXECUTIVE_DIRECTOR, userName: 'Oyelaide Eigbe', action: 'Approve', date: '2026-05-22 10:45', comment: 'Approved.' },
      { userId: '2', userRole: UserRole.HEAD_OF_ADMIN, userName: 'Tina Ofeno', action: 'Send to Finance', date: '2026-05-22 11:30', comment: 'Released.' },
      { userId: '5', userRole: UserRole.FINANCE_OFFICER, userName: 'Finance & Account', action: 'Pay', date: '2026-05-23 16:00', comment: 'Disbursed.' }
    ],
    paymentDetails: {
      paymentDate: '2026-05-23',
      paymentMethod: 'Bank Transfer',
      paymentReference: 'TXN-908127402',
      amountPaid: 800,
      beneficiaryName: 'Ovat Daniel'
    }
  },
  {
    id: 'CA-2026-003',
    referenceNumber: 'CA-2026-003',
    requestDate: '2026-06-09', // June 9, 2026 (awaiting payment since June 9, 2026. 3 days passed -> triggers reminder!)
    staffName: 'Ovat Daniel',
    department: 'Administration',
    purpose: 'Purchase of catering items and refreshments for the regional staff conference.',
    amountRequested: 1200,
    expectedRetirementDate: '2026-06-18',
    attachmentName: 'catering_invoice_draft.pdf',
    attachmentUrl: '/catering_invoice_draft.pdf',
    comment: 'Need to make payment deposit to vendor by week end.',
    currentStatus: RequestStatus.AWAITING_FINANCE_PAYMENT,
    initiator: 'Ovat Daniel',
    daysAwaitingPaymentSince: '2026-06-09',
    approvalHistory: [
      { userId: '1', userRole: UserRole.ADMIN_OFFICER, userName: 'Ovat Daniel', action: 'Submit', date: '2026-06-09 08:30', comment: 'Conference refreshments deposit.' },
      { userId: '2', userRole: UserRole.HEAD_OF_ADMIN, userName: 'Tina Ofeno', action: 'Approve', date: '2026-06-09 10:15', comment: 'Approved for budget routing.' },
      { userId: '3', userRole: UserRole.INTERNAL_CONTROL, userName: 'Jelili Lamidi', action: 'Approve', date: '2026-06-09 13:40', comment: 'Budget code ADM-CONF-2026 verified.' },
      { userId: '4', userRole: UserRole.EXECUTIVE_DIRECTOR, userName: 'Oyelaide Eigbe', action: 'Approve', date: '2026-06-09 15:50', comment: 'Approved for disbursement.' },
      { userId: '2', userRole: UserRole.HEAD_OF_ADMIN, userName: 'Tina Ofeno', action: 'Approve', date: '2026-06-09 10:15', comment: 'Forwarded to Finance.' },
      { userId: '2', userRole: UserRole.HEAD_OF_ADMIN, userName: 'Finance & Account', action: 'Send to Finance', date: '2026-06-09 16:30', comment: 'Released to finance.' }
    ]
  },
  {
    id: 'CA-2026-004',
    referenceNumber: 'CA-2026-004',
    requestDate: '2026-06-06', // June 6, 2026 (awaiting payment since June 6, 2026. 6 days passed -> triggers system escalation!)
    staffName: 'Ovat Daniel',
    department: 'Operations',
    purpose: 'Sewerage repairs and plumbing overhaul at the operations compound.',
    amountRequested: 2500,
    expectedRetirementDate: '2026-06-25',
    attachmentName: 'plumber_quote.pdf',
    attachmentUrl: '/plumber_quote.pdf',
    comment: 'Plumbing leak is causing health hazard. Extremely critical repair.',
    currentStatus: RequestStatus.AWAITING_FINANCE_PAYMENT,
    initiator: 'Ovat Daniel',
    daysAwaitingPaymentSince: '2026-06-06',
    approvalHistory: [
      { userId: '1', userRole: UserRole.ADMIN_OFFICER, userName: 'Ovat Daniel', action: 'Submit', date: '2026-06-06 09:00', comment: 'Emergency plumber hire.' },
      { userId: '2', userRole: UserRole.HEAD_OF_ADMIN, userName: 'Tina Ofeno', action: 'Approve', date: '2026-06-06 09:30', comment: 'Highly urgent.' },
      { userId: '3', userRole: UserRole.INTERNAL_CONTROL, userName: 'Jelili Lamidi', action: 'Approve', date: '2026-06-06 10:00', comment: 'Special budget earmark.' },
      { userId: '4', userRole: UserRole.EXECUTIVE_DIRECTOR, userName: 'Oyelaide Eigbe', action: 'Approve', date: '2026-06-06 11:00', comment: 'Approved immediately.' },
      { userId: '2', userRole: UserRole.HEAD_OF_ADMIN, userName: 'Tina Ofeno', action: 'Send to Finance', date: '2026-06-06 11:15', comment: 'Forwarded to Finance with high-priority flag.' }
    ]
  },
  {
    id: 'CA-2026-005',
    referenceNumber: 'CA-2026-005',
    requestDate: '2026-06-11',
    staffName: 'Tina Ofeno',
    department: 'Administration',
    purpose: 'Internet subscription renewal (Fibre backhaul link for office buildings A & B).',
    amountRequested: 1500,
    expectedRetirementDate: '2026-06-25',
    attachmentName: 'isp_invoice_june.pdf',
    attachmentUrl: '/isp_invoice_june.pdf',
    comment: 'To avoid service cutoff on June 15.',
    currentStatus: RequestStatus.PENDING_INTERNAL_CONTROL,
    initiator: 'Tina Ofeno',
    approvalHistory: [
      { userId: '2', userRole: UserRole.HEAD_OF_ADMIN, userName: 'Tina Ofeno', action: 'Submit', date: '2026-06-11 11:00', comment: 'Initiated as Line Manager & user.' },
      { userId: '2', userRole: UserRole.HEAD_OF_ADMIN, userName: 'Tina Ofeno', action: 'Approve', date: '2026-06-11 11:01', comment: 'Self-approved at initial level.' }
    ]
  },
  {
    id: 'CA-2026-006',
    referenceNumber: 'CA-2026-006',
    requestDate: '2026-06-10',
    staffName: 'Ovat Daniel',
    department: 'Operations',
    purpose: 'Provision of generic corporate gifts and custom branded mugs for visitors.',
    amountRequested: 350,
    expectedRetirementDate: '2026-06-30',
    comment: 'Requested for upcoming vendor visitation meeting.',
    currentStatus: RequestStatus.REJECTED,
    initiator: 'Ovat Daniel',
    approvalHistory: [
      { userId: '1', userRole: UserRole.ADMIN_OFFICER, userName: 'Ovat Daniel', action: 'Submit', date: '2026-06-10 14:00', comment: 'Submitted.' },
      { userId: '2', userRole: UserRole.HEAD_OF_ADMIN, userName: 'Tina Ofeno', action: 'Approve', date: '2026-06-10 15:10', comment: 'Forwarded.' },
      { userId: '3', userRole: UserRole.INTERNAL_CONTROL, userName: 'Jelili Lamidi', action: 'Reject', date: '2026-06-10 16:45', comment: 'Prior unretired cash advances exist (CA-2026-002 is outstanding). No new advance can be approved for general items until outstanding limits are resolved or retired.' }
    ]
  }
];

export const INITIAL_RETIREMENTS: CashAdvanceRetirement[] = [
  {
    id: 'RET-2026-001',
    cashAdvanceRef: 'CA-2026-001',
    amountAdvanced: 450,
    amountUtilized: 435,
    balanceReturned: 15,
    retirementDate: '2026-05-22',
    comment: 'Printed audit booklets at a discounted rate. Returned the balance of $15 directly to the main cashier vault.',
    currentStatus: RetirementStatus.APPROVED,
    approvedDate: '2026-05-23',
    receiptName: 'stationery_receipt_435.pdf',
    receiptUrl: '/stationery_receipt_435.pdf',
    expenseDetails: [
      { id: 'exp-1', description: 'Double A4 Printing Paper x10 Reams', category: 'Stationery', amount: 150, receiptName: 'stationery_receipt_435.pdf' },
      { id: 'exp-2', description: 'Laser Jet Ink Cartridges x2', category: 'Stationery', amount: 285, receiptName: 'stationery_receipt_435.pdf' }
    ],
    approvalHistory: [
      { userId: '1', userRole: UserRole.ADMIN_OFFICER, userName: 'Ovat Daniel', action: 'Submit', date: '2026-05-22 14:00', comment: 'All receipts attached.' },
      { userId: '2', userRole: UserRole.HEAD_OF_ADMIN, userName: 'Tina Ofeno', action: 'Verify', date: '2026-05-22 15:30', comment: 'Receipts match values. Highly diligent.' },
      { userId: '3', userRole: UserRole.INTERNAL_CONTROL, userName: 'Jelili Lamidi', action: 'Verify', date: '2026-05-23 10:15', comment: 'Certified. Returned balance verified.' },
      { userId: '5', userRole: UserRole.FINANCE_OFFICER, userName: 'Finance & Account', action: 'Verify', date: '2026-05-23 14:00', comment: 'Finance verified. Cashier received $15 return. Retirement Closed.' }
    ]
  }
];

export const INITIAL_NOTIFICATIONS: NotificationEntry[] = [
  {
    id: 'nt-1',
    recipientRole: UserRole.FINANCE_OFFICER,
    text: 'Payment request CA-2026-003 has been awaiting processing for more than 2 days. Kindly update payment status.',
    date: '2026-06-11 08:00',
    isRead: false,
    requestId: 'CA-2026-003',
    type: 'reminder'
  },
  {
    id: 'nt-2',
    recipientRole: UserRole.HEAD_OF_ADMIN,
    text: 'ESCALATION: Payment request CA-2026-004 has remained unpaid for 6 days. Highly critical plumber works repair.',
    date: '2026-06-11 08:01',
    isRead: false,
    requestId: 'CA-2026-004',
    type: 'escalation'
  },
  {
    id: 'nt-3',
    recipientRole: UserRole.EXECUTIVE_DIRECTOR,
    text: 'ESCALATION: Payment request CA-2026-004 has remained unpaid for 6 days. Highly critical plumber works repair.',
    date: '2026-06-11 08:01',
    isRead: false,
    requestId: 'CA-2026-004',
    type: 'escalation'
  },
  {
    id: 'nt-4',
    recipientRole: UserRole.INTERNAL_CONTROL,
    text: 'New Cash Advance request CA-2026-005 awaiting your review and compliance check.',
    date: '2026-06-11 11:02',
    isRead: false,
    requestId: 'CA-2026-005',
    type: 'approval_required'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'g-1',
    requestReference: 'CA-2026-001',
    type: 'Cash Advance',
    user: 'Ovat Daniel',
    role: UserRole.ADMIN_OFFICER,
    action: 'Created & Submitted Request',
    date: '2026-05-10 09:15',
    comment: 'Need this urgently so the audit materials are printed on time.'
  },
  {
    id: 'g-2',
    requestReference: 'CA-2026-001',
    type: 'Cash Advance',
    user: 'Finance & Account',
    role: UserRole.FINANCE_OFFICER,
    action: 'Processed Payment',
    date: '2026-05-13 15:30',
    comment: 'Payment reference TXN-908127391. Amount $450.00'
  },
  {
    id: 'g-3',
    requestReference: 'CA-2026-001',
    type: 'Retirement',
    user: 'Ovat Daniel',
    role: UserRole.ADMIN_OFFICER,
    action: 'Submitted Retirement Claim',
    date: '2026-05-22 14:00',
    comment: 'Spent $435, refunding $15.'
  },
  {
    id: 'g-4',
    requestReference: 'CA-2026-001',
    type: 'Retirement',
    user: 'Finance & Account',
    role: UserRole.FINANCE_OFFICER,
    action: 'Final Verification & Close Retirement',
    date: '2026-05-23 14:00',
    comment: 'Confirmed $15 returned balance. Verified vouchers.'
  },
  {
    id: 'g-5',
    requestReference: 'CA-2026-002',
    type: 'Cash Advance',
    user: 'Finance & Account',
    role: UserRole.FINANCE_OFFICER,
    action: 'Processed Payment',
    date: '2026-05-23 16:00',
    comment: 'Payment reference TXN-908127402'
  },
  {
    id: 'g-6',
    requestReference: 'CA-2026-003',
    type: 'Cash Advance',
    user: 'Tina Ofeno',
    role: UserRole.HEAD_OF_ADMIN,
    action: 'Approved & Released To Finance',
    date: '2026-06-09 16:30',
    comment: 'Released to finance.'
  }
];

function getUserKey(baseKey: string, userId?: string): string {
  if (!userId) return baseKey;
  return `${baseKey}_user_${userId}`;
}

export function getStoredData(userId?: string) {
  const advances = localStorage.getItem(getUserKey('ca_advances', userId));
  const retirements = localStorage.getItem(getUserKey('ca_retirements', userId));
  const logs = localStorage.getItem(getUserKey('ca_audit_logs', userId));
  const notifications = localStorage.getItem(getUserKey('ca_notifications', userId));

  return {
    advances: advances ? JSON.parse(advances) : [],
    retirements: retirements ? JSON.parse(retirements) : [],
    logs: logs ? JSON.parse(logs) : [],
    notifications: notifications ? JSON.parse(notifications) : []
  };
}

export function saveStoredData(data: {
  advances?: CashAdvanceRequest[];
  retirements?: CashAdvanceRetirement[];
  logs?: AuditLogEntry[];
  notifications?: NotificationEntry[];
}, userId?: string) {
  if ('advances' in data) {
    localStorage.setItem(getUserKey('ca_advances', userId), JSON.stringify(data.advances || []));
  }
  if ('retirements' in data) {
    localStorage.setItem(getUserKey('ca_retirements', userId), JSON.stringify(data.retirements || []));
  }
  if ('logs' in data) {
    localStorage.setItem(getUserKey('ca_audit_logs', userId), JSON.stringify(data.logs || []));
  }
  if ('notifications' in data) {
    localStorage.setItem(getUserKey('ca_notifications', userId), JSON.stringify(data.notifications || []));
  }
}

export function clearUserData(userId: string) {
  localStorage.removeItem(getUserKey('ca_advances', userId));
  localStorage.removeItem(getUserKey('ca_retirements', userId));
  localStorage.removeItem(getUserKey('ca_audit_logs', userId));
  localStorage.removeItem(getUserKey('ca_notifications', userId));
}

export function generateRefId(existing: string[]): string {
  const currentYear = new Date().getFullYear();
  let maxNum = 0;
  existing.forEach(ref => {
    // format: CA-YYYY-XXX
    const match = ref.match(/CA-\d{4}-(\d{3})/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maxNum) maxNum = num;
    }
  });
  const nextNum = String(maxNum + 1).padStart(3, '0');
  return `CA-${currentYear}-${nextNum}`;
}

export function generateRetId(existing: string[]): string {
  const currentYear = new Date().getFullYear();
  let maxNum = 0;
  existing.forEach(ref => {
    const match = ref.match(/RET-\d{4}-(\d{3})/);
    if (match) {
      const num = parseInt(match[1]);
      if (num > maxNum) maxNum = num;
    }
  });
  const nextNum = String(maxNum + 1).padStart(3, '0');
  return `RET-${currentYear}-${nextNum}`;
}

export function getStoredTemplates(): EmailTemplate[] {
  const tmps = localStorage.getItem('ca_email_templates');
  return tmps ? JSON.parse(tmps) : DEFAULT_TEMPLATES;
}

export function saveStoredTemplates(tmps: EmailTemplate[]) {
  localStorage.setItem('ca_email_templates', JSON.stringify(tmps));
}

export function getStoredSentEmails(): SentEmail[] {
  const sent = localStorage.getItem('ca_sent_emails');
  return sent ? JSON.parse(sent) : [];
}

export function saveStoredSentEmails(sent: SentEmail[]) {
  localStorage.setItem('ca_sent_emails', JSON.stringify(sent));
}

export function getStoredStaffMembers() {
  const staff = localStorage.getItem('ca_staff_members');
  return staff ? JSON.parse(staff) : INITIAL_STAFF_MEMBERS;
}

export function saveStoredStaffMembers(staff: any[]) {
  localStorage.setItem('ca_staff_members', JSON.stringify(staff));
}

