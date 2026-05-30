'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/context/AuthContext';
import { Transaction } from '@/lib/types';
import AddTransactionSheet from '@/components/AddTransactionSheet';
import TransactionDetailSheet from '@/components/TransactionDetailSheet';

const getCategoryIcon = (category: string) => {
  const map: Record<string, string> = {
    'PG Rent & Bill': 'home_work',
    'Food & Dining': 'restaurant',
    'Transport': 'directions_car',
    'Online Order': 'shopping_bag',
    'Shopping': 'shopping_cart',
    'Groceries': 'local_grocery_store',
    'Miscellaneous': 'payments',
  };
  return map[category] || 'payments';
};

const formatLocalDate = (dateVal: string | Date) => {
  const dateStr = typeof dateVal === 'string' ? dateVal : dateVal.toISOString();
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [yr, mo, dy] = cleanDate.split('-');
  return new Date(Number(yr), Number(mo) - 1, Number(dy)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default function Dashboard() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthTotal, setMonthTotal] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sheetMode, setSheetMode] = useState<'add' | 'edit'>('add');
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | undefined>(undefined);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        const allTxs: Transaction[] = [];
        snapshot.forEach((doc) => {
          allTxs.push({ id: doc.id, ...doc.data() } as Transaction);
        });

        // Normalize dates and sort by date descending
        allTxs.sort((a, b) => {
          const strA = typeof a.date === 'string' ? a.date : (a.date as Date).toISOString();
          const strB = typeof b.date === 'string' ? b.date : (b.date as Date).toISOString();
          const dateA = strA.includes('T') ? strA.split('T')[0] : strA;
          const dateB = strB.includes('T') ? strB.split('T')[0] : strB;
          return dateB.localeCompare(dateA);
        });

        // Set recent 10 transactions
        setTransactions(allTxs.slice(0, 10));

        // Month total & Today total
        const now = new Date();
        const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const todayStr = now.toLocaleDateString('en-CA');

        let total = 0;
        let todayExpense = 0;

        allTxs.forEach((data) => {
          const strDate = typeof data.date === 'string' ? data.date : (data.date as Date).toISOString();
          const cleanDate = strDate.includes('T') ? strDate.split('T')[0] : strDate;
          
          // Check if transaction is in current month
          if (cleanDate.startsWith(currentYearMonth)) {
            if (data.type === 'Need' || data.type === 'Want') {
              total += data.amount;
              if (cleanDate === todayStr) {
                todayExpense += data.amount;
              }
            }
          }
        });
        
        setMonthTotal(total);
        setTodayTotal(todayExpense);

      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, refreshTrigger]);

  const currentMonthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).replace(' ', ', ').toUpperCase();

  const handleTransactionAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <main className="px-[20px] pt-8 max-w-[390px] mx-auto w-full relative">
      {/* Header */}
      <header className="flex justify-between items-center w-full mb-8">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="w-12 h-12 rounded-full overflow-hidden border border-[#434933] bg-[#1A1A1A] flex items-center justify-center hover:border-[#a1d800] transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[#a1d800] text-2xl">person</span>
          </Link>
          <h1 className="font-semibold text-[24px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">
            Hello, Subham
          </h1>
        </div>
        <Link href="/search" className="w-12 h-12 flex items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2C2C2E] hover:border-[#a1d800] transition-colors cursor-pointer">
          <span className="material-symbols-outlined text-[#a1d800]">search</span>
        </Link>
      </header>

      {/* Hero / Summary Section */}
      <div className="bg-[#1a1c1c] border border-[#434933] rounded-2xl p-[20px] mb-8 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#a1d800]/10 blur-[50px] rounded-full pointer-events-none"></div>
        
        <p className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase mb-2 font-[family-name:var(--font-geist-sans)] z-10 relative">
          TOTAL EXPENSE {currentMonthYear}
        </p>
        <div className="flex items-baseline gap-1 z-10 relative">
          <span className="font-bold text-[32px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">₹</span>
          {loading ? (
            <div className="h-10 w-32 bg-[#2C2C2E] animate-pulse rounded-md ml-1 mt-1"></div>
          ) : (
            <span className="font-bold text-[48px] leading-[1.1] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">
              {monthTotal.toLocaleString('en-IN')}
            </span>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-[#434933]/50 z-10 relative">
          <p className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase mb-1 font-[family-name:var(--font-geist-sans)]">
            TODAY
          </p>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-[18px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">₹</span>
            {loading ? (
              <div className="h-6 w-16 bg-[#2C2C2E] animate-pulse rounded-md ml-1"></div>
            ) : (
              <span className="font-bold text-[24px] leading-tight text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">
                {todayTotal.toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex justify-between items-end mb-5">
        <h2 className="font-semibold text-[20px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">
          Recent Transactions
        </h2>
        <Link href="/search" className="text-[12px] tracking-[0.05em] font-semibold text-[#a1d800] uppercase hover:underline font-[family-name:var(--font-geist-sans)] pb-0.5 cursor-pointer">
          VIEW ALL
        </Link>
      </div>

      {/* Transactions List */}
      <div className="flex flex-col gap-[12px]">
        {loading ? (
          // Skeleton Loading
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-[16px] bg-[#1e2020] border border-[#434933] rounded-2xl animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#333535]"></div>
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-24 bg-[#333535] rounded"></div>
                  <div className="h-3 w-16 bg-[#333535] rounded"></div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="h-5 w-16 bg-[#333535] rounded"></div>
                <div className="h-4 w-12 bg-[#333535] rounded-full"></div>
              </div>
            </div>
          ))
        ) : transactions.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-[#1e2020] border border-[#434933] rounded-2xl border-dashed">
            <div className="w-16 h-16 bg-[#333535] rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[32px] text-[#8d9479]">receipt_long</span>
            </div>
            <h3 className="text-[16px] text-[#ffffff] font-semibold mb-2 font-[family-name:var(--font-geist-sans)]">No transactions yet</h3>
            <p className="text-[14px] text-[#c3caac] font-[family-name:var(--font-inter)]">Tap the + button to add your first expense.</p>
          </div>
        ) : (
          transactions.map((tx) => {
            const isIncome = tx.type === 'Income';
            const amountColor = isIncome ? 'text-[#a1d800]' : 'text-[#ffb4ab]';
            const sign = isIncome ? '+' : '-';
            
            // Badge styling
            let badgeBg = 'bg-transparent';
            let badgeBorder = 'border-[#434933]';
            let badgeText = 'text-[#c3caac]';
            
            if (tx.type === 'Income') {
              badgeBg = 'bg-[#a1d800]/10';
              badgeBorder = 'border-[#a1d800]/30';
              badgeText = 'text-[#a1d800]';
            } else if (tx.type === 'Need') {
              badgeBg = 'bg-[#ffffff]/10';
              badgeBorder = 'border-[#ffffff]/30';
              badgeText = 'text-[#ffffff]';
            } else if (tx.type === 'Want') {
              badgeBg = 'bg-[#c8c6c5]/10';
              badgeBorder = 'border-[#c8c6c5]/30';
              badgeText = 'text-[#c8c6c5]';
            }

            return (
              <button 
                key={tx.id} 
                onClick={() => setSelectedTransaction(tx)}
                className="w-full flex items-center justify-between p-[16px] bg-[#1e2020] border border-[#434933] rounded-2xl transition-colors hover:bg-[#252828] text-left cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 min-w-12 rounded-full bg-[#333535] flex items-center justify-center border border-[#434933] shrink-0">
                    <span className="material-symbols-outlined text-[#e2e2e2] text-[22px]">{getCategoryIcon(tx.category)}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p 
                      title={tx.description}
                      className="text-[16px] text-[#ffffff] font-medium leading-tight font-[family-name:var(--font-inter)] line-clamp-1 mb-1 cursor-help"
                    >
                      {tx.description}
                    </p>
                    <p className="text-[13px] text-[#8d9479] font-[family-name:var(--font-inter)] font-medium">
                      {formatLocalDate(tx.date as string)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 ml-2 shrink-0">
                  <span className={`font-bold text-[18px] ${amountColor} font-[family-name:var(--font-geist-sans)] tracking-tight whitespace-nowrap`}>
                    {sign}₹{tx.amount.toLocaleString('en-IN')}
                  </span>
                  <span className={`px-2.5 py-0.5 border ${badgeBorder} ${badgeBg} text-[9px] tracking-[0.05em] font-bold rounded-full ${badgeText} uppercase font-[family-name:var(--font-geist-sans)]`}>
                    {tx.type}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-[96px] right-[24px] z-40">
        <button 
          onClick={() => {
            setSheetMode('add');
            setTransactionToEdit(undefined);
            setIsSheetOpen(true);
          }}
          className="w-14 h-14 bg-[#a1d800] text-[#263500] rounded-full shadow-[0_8px_30px_rgb(161,216,0,0.3)] flex items-center justify-center active:scale-95 transition-all duration-200 hover:scale-105 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[32px] font-bold">add</span>
        </button>
      </div>

      {/* Add Transaction Sheet */}
      <AddTransactionSheet 
        isOpen={isSheetOpen} 
        onClose={() => {
          setIsSheetOpen(false);
          setTransactionToEdit(undefined);
        }} 
        onSuccess={handleTransactionAdded} 
        mode={sheetMode}
        transaction={transactionToEdit}
      />
      
      <TransactionDetailSheet 
        transaction={selectedTransaction}
        isOpen={selectedTransaction !== null}
        onClose={() => setSelectedTransaction(null)}
        onDeleteSuccess={() => {
          setSelectedTransaction(null);
          handleTransactionAdded();
        }}
        onEditClick={(tx) => {
          setSelectedTransaction(null);
          setSheetMode('edit');
          setTransactionToEdit(tx);
          setIsSheetOpen(true);
        }}
      />
    </main>
  );
}
