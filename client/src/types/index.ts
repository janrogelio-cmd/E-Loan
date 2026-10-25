export interface User {
  id: number;
  username: string;
  fullName: string;
  role: 'admin' | 'staff';
}

export interface Borrower {
  id: number;
  borrower_id: string;
  full_name: string;
  contact_number: string;
  address: string;
  email?: string;
  id_type?: string;
  id_number?: string;
  status: 'active' | 'inactive' | 'archived';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type LoanStatus = 'draft' | 'active' | 'partially_paid' | 'paid' | 'overdue' | 'redeemed' | 'cancelled';
export type InterestMethod = 'flat' | 'monthly' | 'simple';

export interface Loan {
  id: number;
  loan_id: string;
  borrower_id: number;
  borrower_name?: string;
  borrower_ref?: string;
  contact_number?: string;
  principal_amount: number;
  interest_rate: number;
  interest_method: InterestMethod;
  interest_amount: number;
  fees: number;
  fee_description?: string;
  total_amount_due: number;
  amount_paid: number;
  outstanding_balance: number;
  loan_term_days: number;
  release_date: string;
  due_date: string;
  current_due_date?: string;
  payment_schedule: string;
  status: LoanStatus;
  assigned_staff?: number;
  remarks?: string;
  approved_by?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  collateral?: CollateralItem[];
  payments?: Payment[];
  extensions?: LoanExtension[];
}

export type CollateralStatus = 'received' | 'held' | 'eligible_for_redemption' | 'returned' | 'under_review' | 'disputed';

export interface CollateralItem {
  id: number;
  pawn_ticket_number: string;
  loan_id: number;
  borrower_id: number;
  borrower_name?: string;
  loan_ref?: string;
  loan_status?: string;
  outstanding_balance?: number;
  total_amount_due?: number;
  item_category: string;
  jewelry_type?: string;
  metal_type?: string;
  karat?: string;
  weight_grams?: number;
  description: string;
  identifying_marks?: string;
  appraised_value: number;
  loan_amount_secured: number;
  condition_at_intake?: string;
  date_received: string;
  storage_location?: string;
  photo_paths?: string;
  accepted_by?: number;
  status: CollateralStatus;
  created_at: string;
}

export interface Payment {
  id: number;
  payment_reference: string;
  loan_id: number;
  borrower_id: number;
  borrower_name?: string;
  loan_ref?: string;
  payment_date: string;
  amount: number;
  principal_applied: number;
  interest_applied: number;
  fees_applied: number;
  payment_method: string;
  remaining_balance: number;
  cashier_id?: number;
  cashier_name?: string;
  remarks?: string;
  is_reversed: number;
  reversed_by?: number;
  reversal_reason?: string;
  reversed_at?: string;
  created_at: string;
}

export interface Receipt {
  id: number;
  receipt_number: string;
  payment_id: number;
  loan_id: number;
  borrower_id: number;
  business_name: string;
  transaction_date: string;
  borrower_name: string;
  loan_ref: string;
  pawn_ticket_number?: string;
  original_principal: number;
  interest_and_fees: number;
  amount_paid: number;
  total_paid_to_date: number;
  remaining_balance: number;
  payment_method: string;
  cashier_name: string;
  remarks?: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  type: 'due_tomorrow' | 'due_today' | 'overdue' | 'payment_received' | 'fully_paid' | 'awaiting_redemption' | 'general';
  loan_id?: number;
  borrower_id?: number;
  borrower_name?: string;
  loan_ref?: string;
  title: string;
  message: string;
  is_read: number;
  scheduled_date: string;
  created_at: string;
}

export interface LoanExtension {
  id: number;
  extension_ref: string;
  loan_id: number;
  original_due_date: string;
  new_due_date: string;
  reason?: string;
  charges: number;
  approved_by: number;
  approved_by_name?: string;
  customer_agreed: number;
  created_at: string;
}

export interface RedemptionItem {
  id: number;
  redemption_ref: string;
  loan_id: number;
  borrower_id: number;
  collateral_id: number;
  pawn_ticket_number: string;
  redemption_date: string;
  verified_by: number;
  released_by: number;
  released_by_name?: string;
  borrower_name?: string;
  loan_ref?: string;
  item_description?: string;
  borrower_acknowledged: number;
  notes?: string;
  created_at: string;
}

export interface DashboardStats {
  activeLoans: number;
  totalPrincipal: number;
  totalOutstanding: number;
  totalPayments: number;
  totalInterestEarned: number;
  dueToday: number;
  dueTomorrow: number;
  overdueLoans: number;
  pawnedItems: number;
  awaitingRedemption: number;
}
