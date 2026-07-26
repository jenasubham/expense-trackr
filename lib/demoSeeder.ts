import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Category, PaymentMode, TransactionType, UpiApp } from '@/lib/types';

interface DemoSeedItem {
  description: string;
  amount: number;
  category: Category;
  type: TransactionType;
  monthsAgo: number;
  day: number;
  paymentMode: PaymentMode;
  upiApp?: UpiApp;
  notes: string;
}

function getRelativeDateStr(monthsAgo: number, day: number): string {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() - monthsAgo;
  while (month < 0) {
    month += 12;
    year -= 1;
  }
  const mStr = String(month + 1).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');
  return `${year}-${mStr}-${dStr}`;
}

export async function ensureDemoDataSeeded(userId: string) {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);

    // If exact 20 deterministic demo transactions already exist, skip
    if (snapshot.size === 20) {
      let isExact = true;
      snapshot.forEach((d) => {
        if (!d.id.startsWith(`demo_${userId}_`)) {
          isExact = false;
        }
      });
      if (isExact) return;
    }

    const batch = writeBatch(db);

    // Clean up any old duplicate demo transactions for this user
    snapshot.forEach((d) => {
      batch.delete(d.ref);
    });

    const demoTransactions: DemoSeedItem[] = [
      // --- CURRENT MONTH (0 months ago) ---
      {
        description: 'Monthly Salary Credit',
        amount: 78500,
        category: 'Miscellaneous',
        type: 'Income',
        monthsAgo: 0,
        day: 1,
        paymentMode: 'Net Banking',
        notes: 'Monthly salary credited to HDFC savings account',
      },
      {
        description: 'PG Rent & Wi-Fi Bill',
        amount: 13500,
        category: 'PG Rent & Bill',
        type: 'Need',
        monthsAgo: 0,
        day: 3,
        paymentMode: 'UPI',
        upiApp: 'PhonePe',
        notes: 'Rent paid to landlord Mr. Sharma including high-speed Wi-Fi',
      },
      {
        description: 'Reliance Fresh Groceries',
        amount: 3420,
        category: 'Groceries',
        type: 'Need',
        monthsAgo: 0,
        day: 7,
        paymentMode: 'UPI',
        upiApp: 'PhonePe',
        notes: 'Weekly vegetables, fruits, and kitchen essentials',
      },
      {
        description: 'Weekend Team Dinner',
        amount: 1850,
        category: 'Food & Dining',
        type: 'Want',
        monthsAgo: 0,
        day: 12,
        paymentMode: 'UPI',
        upiApp: 'Paytm',
        notes: 'Dinner at Socials with office colleagues',
      },
      {
        description: 'Uber Airport Cab',
        amount: 720,
        category: 'Transport',
        type: 'Need',
        monthsAgo: 0,
        day: 18,
        paymentMode: 'UPI',
        upiApp: 'SuperMoney',
        notes: 'Cab fare for weekend trip flight',
      },
      {
        description: 'Amazon Headphones',
        amount: 2499,
        category: 'Online Order',
        type: 'Want',
        monthsAgo: 0,
        day: 22,
        paymentMode: 'Debit Card',
        notes: 'Noise cancelling wireless earphones for work',
      },

      // --- 1 MONTH AGO ---
      {
        description: 'Monthly Salary Credit',
        amount: 78500,
        category: 'Miscellaneous',
        type: 'Income',
        monthsAgo: 1,
        day: 1,
        paymentMode: 'Net Banking',
        notes: 'Monthly salary credited to HDFC savings account',
      },
      {
        description: 'PG Rent & Electricity',
        amount: 14200,
        category: 'PG Rent & Bill',
        type: 'Need',
        monthsAgo: 1,
        day: 2,
        paymentMode: 'UPI',
        upiApp: 'PhonePe',
        notes: 'Includes summer AC electricity usage bill',
      },
      {
        description: 'D-Mart Monthly Stockup',
        amount: 5800,
        category: 'Groceries',
        type: 'Need',
        monthsAgo: 1,
        day: 5,
        paymentMode: 'UPI',
        upiApp: 'PhonePe',
        notes: 'Bulk monthly groceries and household cleaning supplies',
      },
      {
        description: 'Zomato Gourmet Pizza',
        amount: 980,
        category: 'Food & Dining',
        type: 'Want',
        monthsAgo: 1,
        day: 14,
        paymentMode: 'UPI',
        upiApp: 'Paytm',
        notes: 'Late night pizza order with roomies',
      },
      {
        description: 'New Running Shoes',
        amount: 4500,
        category: 'Shopping',
        type: 'Want',
        monthsAgo: 1,
        day: 20,
        paymentMode: 'Debit Card',
        notes: 'Puma running shoes from factory outlet',
      },

      // --- 2 MONTHS AGO ---
      {
        description: 'Monthly Salary Credit',
        amount: 78500,
        category: 'Miscellaneous',
        type: 'Income',
        monthsAgo: 2,
        day: 1,
        paymentMode: 'Net Banking',
        notes: 'Monthly salary credited to HDFC savings account',
      },
      {
        description: 'PG Rent & Maintenance',
        amount: 13500,
        category: 'PG Rent & Bill',
        type: 'Need',
        monthsAgo: 2,
        day: 3,
        paymentMode: 'UPI',
        upiApp: 'PhonePe',
        notes: 'Monthly accommodation rent',
      },
      {
        description: 'Weekly Supermarket',
        amount: 2950,
        category: 'Groceries',
        type: 'Need',
        monthsAgo: 2,
        day: 9,
        paymentMode: 'UPI',
        upiApp: 'PhonePe',
        notes: 'Dairy, snacks, and fresh produce',
      },
      {
        description: 'Myntra Clothing Sale',
        amount: 3200,
        category: 'Shopping',
        type: 'Want',
        monthsAgo: 2,
        day: 16,
        paymentMode: 'UPI',
        upiApp: 'SuperMoney',
        notes: 'Casual shirts and jeans from summer sale',
      },
      {
        description: 'Auto & Metro Recharge',
        amount: 500,
        category: 'Transport',
        type: 'Need',
        monthsAgo: 2,
        day: 24,
        paymentMode: 'Cash',
        notes: 'Metro card recharge & daily auto commute',
      },

      // --- 3 MONTHS AGO ---
      {
        description: 'Monthly Salary Credit',
        amount: 78500,
        category: 'Miscellaneous',
        type: 'Income',
        monthsAgo: 3,
        day: 1,
        paymentMode: 'Net Banking',
        notes: 'Monthly salary credited to HDFC savings account',
      },
      {
        description: 'PG Rent Payment',
        amount: 13500,
        category: 'PG Rent & Bill',
        type: 'Need',
        monthsAgo: 3,
        day: 2,
        paymentMode: 'UPI',
        upiApp: 'PhonePe',
        notes: 'Rent paid for accommodation',
      },
      {
        description: 'Blinkit Quick Delivery',
        amount: 1250,
        category: 'Groceries',
        type: 'Need',
        monthsAgo: 3,
        day: 10,
        paymentMode: 'UPI',
        upiApp: 'Paytm',
        notes: 'Quick grocery topup and snacks',
      },
      {
        description: 'Weekend Cafe Brunch',
        amount: 1120,
        category: 'Food & Dining',
        type: 'Want',
        monthsAgo: 3,
        day: 19,
        paymentMode: 'UPI',
        upiApp: 'PhonePe',
        notes: 'Sunday brunch with friends',
      },
    ];

    demoTransactions.forEach((tx, index) => {
      const dateStr = getRelativeDateStr(tx.monthsAgo, tx.day);
      const docId = `demo_${userId}_${index}`;
      const docRef = doc(db, 'transactions', docId);
      batch.set(docRef, {
        userId,
        description: tx.description,
        amount: tx.amount,
        category: tx.category,
        type: tx.type,
        date: dateStr,
        paymentMode: tx.paymentMode,
        ...(tx.paymentMode === 'UPI' && tx.upiApp ? { upiApp: tx.upiApp } : {}),
        notes: tx.notes,
        createdAt: new Date(dateStr).toISOString(),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error seeding demo data:', error);
  }
}
