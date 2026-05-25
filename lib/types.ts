export type TransactionType = 'Income' | 'Need' | 'Want';

export type PaymentMode = 'Cash' | 'UPI' | 'Debit Card' | 'Net Banking';

export type UpiApp = 'PhonePe' | 'Paytm' | 'SuperMoney';

export type Category = 
  | 'PG Rent & Bill'
  | 'Food & Dining'
  | 'Transport'
  | 'Online Order'
  | 'Shopping'
  | 'Groceries'
  | 'Miscellaneous';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  category: Category;
  amount: number;
  date: Date | string; 
  description: string;
  paymentMode: PaymentMode;
  upiApp?: UpiApp;
  notes?: string;
}
