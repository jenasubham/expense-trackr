'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/context/AuthContext';
import { Transaction } from '@/lib/types';
import TransactionDetailSheet from '@/components/TransactionDetailSheet';
import DateRangePicker from '@/components/DateRangePicker';
import AddTransactionSheet from '@/components/AddTransactionSheet';

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

export default function SearchPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'add' | 'edit'>('add');
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | undefined>(undefined);

  const isFilterActive = selectedType !== 'All' || !!fromDate || !!toDate;

  const formatDateRangeForChip = (fromDateStr: string, toDateStr: string) => {
    if (!fromDateStr) return '';
    const formatSingle = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-');
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    if (fromDateStr && toDateStr) {
      if (fromDateStr === toDateStr) {
        return formatSingle(fromDateStr);
      }
      return `${formatSingle(fromDateStr)} - ${formatSingle(toDateStr)}`;
    }
    return formatSingle(fromDateStr);
  };

  useEffect(() => {
    if (!user) return;

    const fetchAllTransactions = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        const txs: Transaction[] = [];
        snapshot.forEach((doc) => {
          txs.push({ id: doc.id, ...doc.data() } as Transaction);
        });
        
        // Sorting in-memory by date (descending), timezone-safely
        txs.sort((a, b) => {
          const strA = typeof a.date === 'string' ? a.date : (a.date as Date).toISOString();
          const strB = typeof b.date === 'string' ? b.date : (b.date as Date).toISOString();
          const dateA = strA.includes('T') ? strA.split('T')[0] : strA;
          const dateB = strB.includes('T') ? strB.split('T')[0] : strB;
          return dateB.localeCompare(dateA);
        });
        
        setTransactions(txs);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllTransactions();
  }, [user, refreshTrigger]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // 1. Search term matching
      const term = searchTerm.toLowerCase();
      const amountStr = tx.amount.toString();
      const matchesSearch = 
        !term || 
        (tx.description || '').toLowerCase().includes(term) ||
        (tx.notes || '').toLowerCase().includes(term) ||
        (tx.category || '').toLowerCase().includes(term) ||
        amountStr.includes(term);

      // 2. Type matching (Need, Want, Income)
      let matchesType = true;
      if (selectedType !== 'All') {
        matchesType = tx.type === selectedType;
      }

      // 3. Date range matching
      let matchesDateRange = true;
      const strTxDate = typeof tx.date === 'string' ? tx.date : (tx.date as Date).toISOString();
      const cleanTxDate = strTxDate.includes('T') ? strTxDate.split('T')[0] : strTxDate;
      if (fromDate && cleanTxDate < fromDate) matchesDateRange = false;
      if (toDate && cleanTxDate > toDate) matchesDateRange = false;

      return matchesSearch && matchesType && matchesDateRange;
    });
  }, [transactions, searchTerm, selectedType, fromDate, toDate]);

  return (
    <main className="px-[20px] pt-8 max-w-[390px] mx-auto w-full relative flex flex-col h-[calc(100dvh-96px)] overflow-hidden">
      {/* Header */}
      <header className="flex mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="w-12 h-12 rounded-full overflow-hidden border border-[#434933] bg-[#1A1A1A] flex items-center justify-center hover:border-[#a1d800] transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[#a1d800] text-2xl">person</span>
          </Link>
          <h1 className="font-semibold text-[24px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">
            Transactions
          </h1>
        </div>
      </header>

      {/* Prominent Search Bar */}
      <div className="mb-[24px] shrink-0">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#8d9479] group-focus-within:text-[#a1d800] transition-colors duration-200">
            <span className="material-symbols-outlined">search</span>
          </div>
          <input 
            autoFocus
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1a1c1c] border border-[#434933] focus:border-[#a1d800] focus:ring-0 text-[#ffffff] font-[family-name:var(--font-inter)] text-[16px] rounded-xl pl-12 pr-4 py-4 transition-all duration-200 placeholder:text-[#474646] outline-none"
            placeholder="Search by name, amount, or note…" 
          />
        </div>
      </div>

      {/* Inline scrollable chips row */}
      <div className="flex gap-[12px] overflow-x-auto pb-4 mb-4 shrink-0 custom-scrollbar [&::-webkit-scrollbar]:hidden">
        {/* All Type Chip */}
        <button 
          type="button"
          onClick={() => setSelectedType('All')}
          className={`whitespace-nowrap px-4 py-2 rounded-full border font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase transition-colors cursor-pointer ${
            selectedType === 'All' 
              ? 'border-[#a1d800] bg-[#b8f600] text-[#506e00]' 
              : 'border-[#2C2C2E] bg-[#1e2020] text-[#c3caac] hover:border-[#8d9479]'
          }`}
        >
          All
        </button>

        {/* Date Range Chip (Second Position) */}
        <div className="flex-shrink-0">
          {fromDate || toDate ? (
            <div 
              onClick={() => setIsRangePickerOpen(true)}
              className="whitespace-nowrap px-4 py-2 rounded-full bg-[#b8f600] border border-[#a1d800] text-[#506e00] font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase flex items-center gap-2 cursor-pointer hover:bg-[#a5df00] transition-colors"
            >
              <span className="animate-fade-in">
                {formatDateRangeForChip(fromDate, toDate)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFromDate('');
                  setToDate('');
                }}
                className="flex items-center justify-center w-4 h-4 rounded-full text-[#506e00]/60 hover:bg-[#506e00]/15 hover:text-[#506e00] font-bold transition-colors text-[14px] cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsRangePickerOpen(true)}
              className="whitespace-nowrap px-4 py-2 rounded-full border border-[#2C2C2E] bg-[#1e2020] text-[#c3caac] hover:border-[#8d9479] font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Date Range</span>
            </button>
          )}
        </div>

        {/* Other Type Chips (Need, Want, Income) */}
        {['Need', 'Want', 'Income'].map((type) => {
          const isSelected = selectedType === type;
          return (
            <button 
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className={`whitespace-nowrap px-4 py-2 rounded-full border font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase transition-colors cursor-pointer ${
                isSelected 
                  ? 'border-[#a1d800] bg-[#b8f600] text-[#506e00]' 
                  : 'border-[#2C2C2E] bg-[#1e2020] text-[#c3caac] hover:border-[#8d9479]'
              }`}
            >
              {type}
            </button>
          );
        })}
      </div>

      {/* Live Results Section */}
      <section className="flex flex-col gap-[12px] flex-1 overflow-y-auto pb-[100px] custom-scrollbar [&::-webkit-scrollbar]:hidden">
        <div className="flex justify-between items-center mb-2 shrink-0">
          <h2 className="font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#474646] uppercase">
            {searchTerm ? `Results for "${searchTerm}"` : "Transactions"}
          </h2>
          <div className="flex items-center gap-1.5">
            <span className="font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#8d9479] uppercase">
              {loading ? '...' : `${filteredTransactions.length} Found`}
            </span>
          </div>
        </div>

        {loading ? (
          // Loading Skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-[16px] bg-[#1e2020] border border-[#434933] rounded-2xl animate-pulse shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#333535]"></div>
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-32 bg-[#333535] rounded"></div>
                  <div className="h-3 w-20 bg-[#333535] rounded"></div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="h-6 w-20 bg-[#333535] rounded"></div>
                <div className="h-4 w-12 bg-[#333535] rounded-full"></div>
              </div>
            </div>
          ))
        ) : filteredTransactions.length === 0 ? (
          // Empty State
          <div className="mt-8 text-center py-8 flex flex-col items-center">
            <div className="material-symbols-outlined text-[#434933] text-4xl mb-2">find_in_page</div>
            <p className="font-[family-name:var(--font-inter)] text-[14px] text-[#474646] mb-4">
              {searchTerm 
                ? "No matches found. Try a different search term." 
                : isFilterActive 
                  ? "No results matching these filters."
                  : "Searching across your history, notes, and categories."}
            </p>
            {isFilterActive && (
              <button
                onClick={() => {
                  setSelectedType('All');
                  setFromDate('');
                  setToDate('');
                }}
                className="bg-[#2a2d2d] hover:bg-[#333535] text-[#ffffff] font-bold text-[12px] px-4 py-2 rounded-xl transition-colors font-[family-name:var(--font-geist-sans)] uppercase tracking-wider cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          filteredTransactions.map((tx, index) => {
            const isIncome = tx.type === 'Income';
            const amountColor = isIncome ? 'text-[#a1d800]' : 'text-[#ffb4ab]';
            const sign = isIncome ? '+' : '-';
            
            // Badge styling exactly like Dashboard
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
                className="w-full flex items-center justify-between p-[16px] bg-[#1e2020] border border-[#434933] rounded-2xl transition-colors hover:bg-[#252828] shrink-0 animate-slide-in-right text-left cursor-pointer active:scale-[0.98]"
                style={{ animationDelay: `${index * 50}ms` }}
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
      </section>
      
      <TransactionDetailSheet 
        transaction={selectedTransaction}
        isOpen={selectedTransaction !== null}
        onClose={() => setSelectedTransaction(null)}
        onDeleteSuccess={() => {
          setSelectedTransaction(null);
          setRefreshTrigger(prev => prev + 1);
        }}
        onEditClick={(tx) => {
          setSelectedTransaction(null);
          setSheetMode('edit');
          setTransactionToEdit(tx);
          setIsSheetOpen(true);
        }}
      />

      <AddTransactionSheet 
        isOpen={isSheetOpen} 
        onClose={() => {
          setIsSheetOpen(false);
          setTransactionToEdit(undefined);
        }} 
        onSuccess={() => setRefreshTrigger(prev => prev + 1)} 
        mode={sheetMode}
        transaction={transactionToEdit}
      />

      <DateRangePicker
        isOpen={isRangePickerOpen}
        onClose={() => setIsRangePickerOpen(false)}
        onConfirm={(from, to) => {
          setFromDate(from);
          setToDate(to);
          setIsRangePickerOpen(false);
        }}
        onCancel={() => {
          setFromDate('');
          setToDate('');
          setIsRangePickerOpen(false);
        }}
        initialFromDate={fromDate}
        initialToDate={toDate}
      />
    </main>
  );
}
