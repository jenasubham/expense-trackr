import { Category, PaymentMode, TransactionType, UpiApp } from './types';

export const TRANSACTION_TYPES: TransactionType[] = ['Income', 'Need', 'Want'];

export const CATEGORIES: Category[] = [
  'PG Rent & Bill',
  'Food & Dining',
  'Transport',
  'Online Order',
  'Shopping',
  'Groceries',
  'Miscellaneous',
];

export const PAYMENT_MODES: PaymentMode[] = [
  'Cash',
  'UPI',
  'Debit Card',
  'Net Banking',
];

export const UPI_APPS: UpiApp[] = ['PhonePe', 'Paytm', 'SuperMoney'];
