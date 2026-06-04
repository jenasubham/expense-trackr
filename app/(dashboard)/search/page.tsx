'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/context/AuthContext';
import { Transaction, Category, PaymentMode, TransactionType } from '@/lib/types';
import { CATEGORIES, PAYMENT_MODES, UPI_APPS, TRANSACTION_TYPES } from '@/lib/constants';
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

const getPresetDateRange = (preset: string) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed month (0 = Jan, 11 = Dec)
  
  let fromDate = '';
  let toDate = '';
  
  if (preset === 'This Month') {
    const from = new Date(y, m, 1);
    const to = new Date(y, m + 1, 0); // last day of current month
    fromDate = from.toLocaleDateString('en-CA');
    toDate = to.toLocaleDateString('en-CA');
  } else if (preset === 'Last Month') {
    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 0); // last day of last month
    fromDate = from.toLocaleDateString('en-CA');
    toDate = to.toLocaleDateString('en-CA');
  } else if (preset === '2 Months Ago') {
    const from = new Date(y, m - 2, 1);
    const to = new Date(y, m - 1, 0); // last day of 2 months ago
    fromDate = from.toLocaleDateString('en-CA');
    toDate = to.toLocaleDateString('en-CA');
  } else if (preset === 'Last 3 Months') {
    const from = new Date(y, m - 2, 1);
    const to = new Date(y, m + 1, 0); // last day of current month
    fromDate = from.toLocaleDateString('en-CA');
    toDate = to.toLocaleDateString('en-CA');
  }
  
  return { from: fromDate, to: toDate };
};

export default function SearchPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'add' | 'edit'>('add');
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | undefined>(undefined);

  // Applied states (used in list filtering)
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');
  const [appliedTypes, setAppliedTypes] = useState<TransactionType[]>([]);
  const [appliedCategories, setAppliedCategories] = useState<Category[]>([]);
  const [appliedPaymentModes, setAppliedPaymentModes] = useState<PaymentMode[]>([]);
  const [appliedUpiApps, setAppliedUpiApps] = useState<string[]>([]);
  const [appliedMinAmount, setAppliedMinAmount] = useState('');
  const [appliedMaxAmount, setAppliedMaxAmount] = useState('');
  const [appliedPreset, setAppliedPreset] = useState('');

  // Draft states (used inside the filter drawer)
  const [draftFromDate, setDraftFromDate] = useState('');
  const [draftToDate, setDraftToDate] = useState('');
  const [draftTypes, setDraftTypes] = useState<TransactionType[]>([]);
  const [draftCategories, setDraftCategories] = useState<Category[]>([]);
  const [draftPaymentModes, setDraftPaymentModes] = useState<PaymentMode[]>([]);
  const [draftUpiApps, setDraftUpiApps] = useState<string[]>([]);
  const [draftMinAmount, setDraftMinAmount] = useState('');
  const [draftMaxAmount, setDraftMaxAmount] = useState('');
  const [draftPreset, setDraftPreset] = useState('');

  // Drawer control
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFromDate || appliedToDate) count++;
    if (appliedTypes.length > 0) count++;
    if (appliedCategories.length > 0) count++;
    if (appliedPaymentModes.length > 0 || appliedUpiApps.length > 0) count++;
    if (appliedMinAmount || appliedMaxAmount) count++;
    return count;
  }, [appliedFromDate, appliedToDate, appliedTypes, appliedCategories, appliedPaymentModes, appliedUpiApps, appliedMinAmount, appliedMaxAmount]);

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

  const openDrawer = () => {
    setDraftFromDate(appliedFromDate);
    setDraftToDate(appliedToDate);
    setDraftTypes(appliedTypes);
    setDraftCategories(appliedCategories);
    setDraftPaymentModes(appliedPaymentModes);
    setDraftUpiApps(appliedUpiApps);
    setDraftMinAmount(appliedMinAmount);
    setDraftMaxAmount(appliedMaxAmount);
    setDraftPreset(appliedPreset);
    setIsDrawerOpen(true);
  };

  const handleApplyFilters = () => {
    setAppliedFromDate(draftFromDate);
    setAppliedToDate(draftToDate);
    setAppliedTypes(draftTypes);
    setAppliedCategories(draftCategories);
    setAppliedPaymentModes(draftPaymentModes);
    setAppliedUpiApps(draftUpiApps);
    setAppliedMinAmount(draftMinAmount);
    setAppliedMaxAmount(draftMaxAmount);
    setAppliedPreset(draftPreset);
    setIsDrawerOpen(false);
  };

  const handleResetAll = () => {
    setAppliedFromDate('');
    setAppliedToDate('');
    setAppliedTypes([]);
    setAppliedCategories([]);
    setAppliedPaymentModes([]);
    setAppliedUpiApps([]);
    setAppliedMinAmount('');
    setAppliedMaxAmount('');
    setAppliedPreset('');

    setDraftFromDate('');
    setDraftToDate('');
    setDraftTypes([]);
    setDraftCategories([]);
    setDraftPaymentModes([]);
    setDraftUpiApps([]);
    setDraftMinAmount('');
    setDraftMaxAmount('');
    setDraftPreset('');
    setIsDrawerOpen(false);
  };

  const handleClearAllFilters = () => {
    setAppliedFromDate('');
    setAppliedToDate('');
    setAppliedTypes([]);
    setAppliedCategories([]);
    setAppliedPaymentModes([]);
    setAppliedUpiApps([]);
    setAppliedMinAmount('');
    setAppliedMaxAmount('');
    setAppliedPreset('');

    setDraftFromDate('');
    setDraftToDate('');
    setDraftTypes([]);
    setDraftCategories([]);
    setDraftPaymentModes([]);
    setDraftUpiApps([]);
    setDraftMinAmount('');
    setDraftMaxAmount('');
    setDraftPreset('');
  };

  const handlePresetClick = (preset: string) => {
    if (preset === 'Date Range') {
      setIsRangePickerOpen(true);
    } else {
      const { from, to } = getPresetDateRange(preset);
      setDraftFromDate(from);
      setDraftToDate(to);
      setDraftPreset(preset);
      setAppliedFromDate(from);
      setAppliedToDate(to);
      setAppliedPreset(preset);
    }
  };

  const toggleDraftType = (type: TransactionType) => {
    setDraftTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleDraftCategory = (cat: Category) => {
    setDraftCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleDraftPaymentMode = (mode: PaymentMode) => {
    setDraftPaymentModes(prev => {
      const isIncluded = prev.includes(mode);
      const newModes = isIncluded ? prev.filter(m => m !== mode) : [...prev, mode];
      if (mode === 'UPI' && isIncluded) {
        setDraftUpiApps([]);
      }
      return newModes;
    });
  };

  const toggleDraftUpiApp = (app: string) => {
    setDraftUpiApps(prev => 
      prev.includes(app) ? prev.filter(a => a !== app) : [...prev, app]
    );
  };

  const removeAppliedType = (type: TransactionType) => {
    setAppliedTypes(prev => prev.filter(t => t !== type));
    setDraftTypes(prev => prev.filter(t => t !== type));
  };

  const removeAppliedCategory = (cat: Category) => {
    setAppliedCategories(prev => prev.filter(c => c !== cat));
    setDraftCategories(prev => prev.filter(c => c !== cat));
  };

  const removeAppliedPaymentMode = (mode: PaymentMode) => {
    setAppliedPaymentModes(prev => prev.filter(m => m !== mode));
    setDraftPaymentModes(prev => prev.filter(m => m !== mode));
    if (mode === 'UPI') {
      setAppliedUpiApps([]);
      setDraftUpiApps([]);
    }
  };

  const removeAppliedUpiApp = (app: string) => {
    setAppliedUpiApps(prev => {
      const next = prev.filter(a => a !== app);
      if (next.length === 0) {
        setAppliedPaymentModes(modes => modes.filter(m => m !== 'UPI'));
      }
      return next;
    });
    setDraftUpiApps(prev => {
      const next = prev.filter(a => a !== app);
      if (next.length === 0) {
        setDraftPaymentModes(modes => modes.filter(m => m !== 'UPI'));
      }
      return next;
    });
  };

  const removeAppliedAmountRange = () => {
    setAppliedMinAmount('');
    setAppliedMaxAmount('');
    setDraftMinAmount('');
    setDraftMaxAmount('');
  };

  const togglePhonePeFilter = () => {
    const isSelected = appliedUpiApps.includes('PhonePe');
    if (isSelected) {
      removeAppliedUpiApp('PhonePe');
    } else {
      setAppliedUpiApps(prev => [...prev, 'PhonePe']);
      setDraftUpiApps(prev => [...prev, 'PhonePe']);
      if (!appliedPaymentModes.includes('UPI')) {
        setAppliedPaymentModes(prev => [...prev, 'UPI']);
        setDraftPaymentModes(prev => [...prev, 'UPI']);
      }
    }
  };

  const togglePaytmFilter = () => {
    const isSelected = appliedUpiApps.includes('Paytm');
    if (isSelected) {
      removeAppliedUpiApp('Paytm');
    } else {
      setAppliedUpiApps(prev => [...prev, 'Paytm']);
      setDraftUpiApps(prev => [...prev, 'Paytm']);
      if (!appliedPaymentModes.includes('UPI')) {
        setAppliedPaymentModes(prev => [...prev, 'UPI']);
        setDraftPaymentModes(prev => [...prev, 'UPI']);
      }
    }
  };

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

      // 2. Type matching (multi-select)
      let matchesType = true;
      if (appliedTypes.length > 0) {
        matchesType = appliedTypes.includes(tx.type);
      }

      // 3. Category matching (multi-select)
      let matchesCategory = true;
      if (appliedCategories.length > 0) {
        matchesCategory = appliedCategories.includes(tx.category);
      }

      // 4. Payment mode matching (includes UPI sub-apps checking)
      let matchesPaymentMode = true;
      if (appliedPaymentModes.length > 0 || appliedUpiApps.length > 0) {
        if (tx.paymentMode === 'UPI') {
          if (appliedUpiApps.length > 0) {
            matchesPaymentMode = appliedUpiApps.includes(tx.upiApp || '');
          } else {
            matchesPaymentMode = appliedPaymentModes.includes('UPI');
          }
        } else {
          matchesPaymentMode = appliedPaymentModes.includes(tx.paymentMode);
        }
      }

      // 5. Date range matching
      let matchesDateRange = true;
      const strTxDate = typeof tx.date === 'string' ? tx.date : (tx.date as Date).toISOString();
      const cleanTxDate = strTxDate.includes('T') ? strTxDate.split('T')[0] : strTxDate;
      if (appliedFromDate && cleanTxDate < appliedFromDate) matchesDateRange = false;
      if (appliedToDate && cleanTxDate > appliedToDate) matchesDateRange = false;

      // 6. Amount range matching
      let matchesAmountRange = true;
      if (appliedMinAmount && tx.amount < Number(appliedMinAmount)) matchesAmountRange = false;
      if (appliedMaxAmount && tx.amount > Number(appliedMaxAmount)) matchesAmountRange = false;

      return matchesSearch && matchesType && matchesCategory && matchesPaymentMode && matchesDateRange && matchesAmountRange;
    });
  }, [
    transactions,
    searchTerm,
    appliedTypes,
    appliedCategories,
    appliedPaymentModes,
    appliedUpiApps,
    appliedFromDate,
    appliedToDate,
    appliedMinAmount,
    appliedMaxAmount
  ]);

  return (
    <main className="px-[20px] pt-8 max-w-[390px] mx-auto w-full relative flex flex-col h-[calc(100dvh-96px)] overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center w-full mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="w-12 h-12 rounded-full overflow-hidden border border-[#434933] bg-[#1A1A1A] flex items-center justify-center hover:border-[#a1d800] transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[#a1d800] text-2xl">person</span>
          </Link>
          <h1 className="font-semibold text-[24px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">
            Transactions
          </h1>
        </div>
        <button
          type="button"
          onClick={openDrawer}
          className="relative w-12 h-12 flex items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2C2C2E] hover:border-[#a1d800] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[#a1d800] text-2xl">filter_list</span>
          {activeFilterCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#a1d800] text-[#141f00] font-bold text-[10px] rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(161,216,0,0.5)] animate-fade-in">
              {activeFilterCount}
            </span>
          )}
        </button>
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
        {/* 1. All Chip */}
        <button 
          type="button"
          onClick={handleClearAllFilters}
          className={`whitespace-nowrap px-4 py-2 rounded-full border font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase transition-colors cursor-pointer ${
            activeFilterCount === 0
              ? 'border-[#a1d800] bg-[#b8f600] text-[#506e00]' 
              : 'border-[#2C2C2E] bg-[#1e2020] text-[#c3caac] hover:border-[#8d9479]'
          }`}
        >
          All
        </button>

        {/* 2. Date Range Chip */}
        <div className="flex-shrink-0">
          {appliedFromDate || appliedToDate ? (
            <div 
              onClick={() => setIsRangePickerOpen(true)}
              className="whitespace-nowrap px-4 py-2 rounded-full bg-[#b8f600] border border-[#a1d800] text-[#506e00] font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase flex items-center gap-2 cursor-pointer hover:bg-[#a5df00] transition-colors"
            >
              <span className="animate-fade-in">
                {formatDateRangeForChip(appliedFromDate, appliedToDate)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAppliedFromDate('');
                  setAppliedToDate('');
                  setAppliedPreset('');
                  
                  setDraftFromDate('');
                  setDraftToDate('');
                  setDraftPreset('');
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

        {/* 3. PhonePe Chip */}
        <div className="flex-shrink-0">
          {appliedUpiApps.includes('PhonePe') ? (
            <div 
              onClick={togglePhonePeFilter}
              className="whitespace-nowrap px-4 py-2 rounded-full bg-[#b8f600] border border-[#a1d800] text-[#506e00] font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase flex items-center gap-2 cursor-pointer hover:bg-[#a5df00] transition-colors"
            >
              <span>PhonePe</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAppliedUpiApp('PhonePe');
                }}
                className="flex items-center justify-center w-4 h-4 rounded-full text-[#506e00]/60 hover:bg-[#506e00]/15 hover:text-[#506e00] font-bold transition-colors text-[14px] cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={togglePhonePeFilter}
              className="whitespace-nowrap px-4 py-2 rounded-full border border-[#2C2C2E] bg-[#1e2020] text-[#c3caac] hover:border-[#8d9479] font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>PhonePe</span>
            </button>
          )}
        </div>

        {/* 4. Paytm Chip */}
        <div className="flex-shrink-0">
          {appliedUpiApps.includes('Paytm') ? (
            <div 
              onClick={togglePaytmFilter}
              className="whitespace-nowrap px-4 py-2 rounded-full bg-[#b8f600] border border-[#a1d800] text-[#506e00] font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase flex items-center gap-2 cursor-pointer hover:bg-[#a5df00] transition-colors"
            >
              <span>Paytm</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAppliedUpiApp('Paytm');
                }}
                className="flex items-center justify-center w-4 h-4 rounded-full text-[#506e00]/60 hover:bg-[#506e00]/15 hover:text-[#506e00] font-bold transition-colors text-[14px] cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={togglePaytmFilter}
              className="whitespace-nowrap px-4 py-2 rounded-full border border-[#2C2C2E] bg-[#1e2020] text-[#c3caac] hover:border-[#8d9479] font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Paytm</span>
            </button>
          )}
        </div>

        {/* 5. Dynamic Active Filter Chips */}
        {/* Transaction Types */}
        {appliedTypes.map(type => (
          <div 
            key={`chip-type-${type}`}
            className="flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full bg-[#b8f600] border border-[#a1d800] text-[#506e00] font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase flex items-center gap-2"
          >
            <span>{type}</span>
            <button
              type="button"
              onClick={() => removeAppliedType(type)}
              className="flex items-center justify-center w-4 h-4 rounded-full text-[#506e00]/60 hover:bg-[#506e00]/15 hover:text-[#506e00] font-bold transition-colors text-[14px] cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Categories */}
        {appliedCategories.map(cat => (
          <div 
            key={`chip-cat-${cat}`}
            className="flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full bg-[#b8f600] border border-[#a1d800] text-[#506e00] font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase flex items-center gap-2"
          >
            <span>{cat}</span>
            <button
              type="button"
              onClick={() => removeAppliedCategory(cat)}
              className="flex items-center justify-center w-4 h-4 rounded-full text-[#506e00]/60 hover:bg-[#506e00]/15 hover:text-[#506e00] font-bold transition-colors text-[14px] cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Payment Modes */}
        {appliedPaymentModes.filter(mode => mode !== 'UPI' || appliedUpiApps.length === 0).map(mode => (
          <div 
            key={`chip-mode-${mode}`}
            className="flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full bg-[#b8f600] border border-[#a1d800] text-[#506e00] font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase flex items-center gap-2"
          >
            <span>{mode}</span>
            <button
              type="button"
              onClick={() => removeAppliedPaymentMode(mode)}
              className="flex items-center justify-center w-4 h-4 rounded-full text-[#506e00]/60 hover:bg-[#506e00]/15 hover:text-[#506e00] font-bold transition-colors text-[14px] cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}

        {/* UPI Apps (except PhonePe and Paytm which have static chips) */}
        {appliedUpiApps.filter(app => app !== 'PhonePe' && app !== 'Paytm').map(app => (
          <div 
            key={`chip-app-${app}`}
            className="flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full bg-[#b8f600] border border-[#a1d800] text-[#506e00] font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase flex items-center gap-2"
          >
            <span>{app}</span>
            <button
              type="button"
              onClick={() => removeAppliedUpiApp(app)}
              className="flex items-center justify-center w-4 h-4 rounded-full text-[#506e00]/60 hover:bg-[#506e00]/15 hover:text-[#506e00] font-bold transition-colors text-[14px] cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Amount Range */}
        {(appliedMinAmount || appliedMaxAmount) && (
          <div className="flex-shrink-0 whitespace-nowrap px-4 py-2 rounded-full bg-[#b8f600] border border-[#a1d800] text-[#506e00] font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase flex items-center gap-2">
            <span>
              {appliedMinAmount && appliedMaxAmount 
                ? `₹${appliedMinAmount} - ₹${appliedMaxAmount}`
                : appliedMinAmount 
                  ? `₹${appliedMinAmount}+`
                  : `≤ ₹${appliedMaxAmount}`
              }
            </span>
            <button
              type="button"
              onClick={removeAppliedAmountRange}
              className="flex items-center justify-center w-4 h-4 rounded-full text-[#506e00]/60 hover:bg-[#506e00]/15 hover:text-[#506e00] font-bold transition-colors text-[14px] cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
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
              {activeFilterCount > 0 && <span className="text-[#a1d800] font-bold"> · Filtered</span>}
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
                : activeFilterCount > 0 
                  ? "No results matching these filters."
                  : "Searching across your history, notes, and categories."}
            </p>
            {activeFilterCount > 0 && (
              <button
                onClick={handleClearAllFilters}
                className="bg-[#2a2d2d] hover:bg-[#333535] text-[#ffffff] font-bold text-[12px] px-4 py-2 rounded-xl transition-colors font-[family-name:var(--font-geist-sans)] uppercase tracking-wider cursor-pointer"
              >
                Clear All Filters
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
                      className="text-[16px] text-[#ffffff] font-medium leading-tight font-[family-name:var(--font-inter)] line-clamp-1 mb-1"
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
          setAppliedFromDate(from);
          setAppliedToDate(to);
          setAppliedPreset('Date Range');
          
          setDraftFromDate(from);
          setDraftToDate(to);
          setDraftPreset('Date Range');
          setIsRangePickerOpen(false);
        }}
        onCancel={() => {
          setAppliedFromDate('');
          setAppliedToDate('');
          setAppliedPreset('');
          
          setDraftFromDate('');
          setDraftToDate('');
          setDraftPreset('');
          setIsRangePickerOpen(false);
        }}
        initialFromDate={draftFromDate || appliedFromDate}
        initialToDate={draftToDate || appliedToDate}
      />

      {/* Filter Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[60] transition-opacity animate-fade-in backdrop-blur-sm"
          onClick={() => setIsDrawerOpen(false)}
        ></div>
      )}

      {/* Slide-up Filter Drawer */}
      {isDrawerOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-[70] flex flex-col bg-[#121414] rounded-t-[24px] border-t border-[#434933] max-h-[85vh] overflow-hidden animate-slide-up max-w-[500px] mx-auto shadow-[0_-8px_30px_rgb(0,0,0,0.5)]">
          {/* Drag Handle */}
          <div className="w-full flex justify-center py-3 shrink-0">
            <div className="w-12 h-1.5 bg-[#333535] rounded-full"></div>
          </div>

          {/* Drawer Header */}
          <div className="px-[20px] pb-4 border-b border-[#333535] shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[24px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">
                Filters
              </h2>
              <button 
                type="button"
                onClick={handleResetAll}
                className="text-[13px] leading-[16px] tracking-tight font-bold text-[#a1d800] font-[family-name:var(--font-geist-sans)] hover:underline cursor-pointer"
              >
                Reset All
              </button>
            </div>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-[20px] pt-6 pb-[100px] space-y-6 custom-scrollbar [&::-webkit-scrollbar]:hidden">
            
            {/* 1. Date Range Section */}
            <div className="space-y-2">
              <label className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">
                Date Range
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar [&::-webkit-scrollbar]:hidden">
                {['This Month', 'Last Month', 'Last 3 Months', 'Date Range'].map(preset => {
                  const isSelected = draftPreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      className={`whitespace-nowrap px-4 py-2 rounded-full border font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase transition-colors cursor-pointer ${
                        isSelected 
                          ? 'border-[#a1d800] bg-[#b8f600] text-[#506e00]' 
                          : 'border-[#2C2C2E] bg-[#1e2020] text-[#c3caac] hover:border-[#8d9479]'
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
              {draftFromDate && draftToDate && (
                <p className="text-[12px] text-[#a1d800] font-semibold font-[family-name:var(--font-inter)] mt-1">
                  Selected: {formatLocalDate(draftFromDate)} - {formatLocalDate(draftToDate)}
                </p>
              )}
            </div>

            {/* 2. Transaction Type Section */}
            <div className="space-y-2">
              <label className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">
                Transaction Type
              </label>
              <div className="flex flex-wrap gap-2">
                {TRANSACTION_TYPES.map(type => {
                  const isSelected = draftTypes.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleDraftType(type)}
                      className={`px-4 py-2 rounded-full border font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase transition-colors cursor-pointer ${
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
            </div>

            {/* 3. Category Section */}
            <div className="space-y-2">
              <label className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                  const isSelected = draftCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleDraftCategory(cat)}
                      className={`px-4 py-2 rounded-full border font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase transition-colors cursor-pointer ${
                        isSelected 
                          ? 'border-[#a1d800] bg-[#b8f600] text-[#506e00]' 
                          : 'border-[#2C2C2E] bg-[#1e2020] text-[#c3caac] hover:border-[#8d9479]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Payment Mode & UPI App Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">
                  Payment Mode
                </label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_MODES.map(mode => {
                    const isSelected = draftPaymentModes.includes(mode);
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => toggleDraftPaymentMode(mode)}
                        className={`px-4 py-2 rounded-full border font-[family-name:var(--font-geist-sans)] text-[12px] leading-[16px] tracking-[0.05em] font-semibold uppercase transition-colors cursor-pointer ${
                          isSelected 
                            ? 'border-[#a1d800] bg-[#b8f600] text-[#506e00]' 
                            : 'border-[#2C2C2E] bg-[#1e2020] text-[#c3caac] hover:border-[#8d9479]'
                        }`}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* UPI Sub-Apps Row */}
              {draftPaymentModes.includes('UPI') && (
                <div className="bg-[#1a1c1c]/50 p-4 rounded-xl border border-[#434933]/50 space-y-3 animate-fade-in">
                  <div className="text-[11px] font-semibold text-[#8d9479] tracking-wider uppercase font-[family-name:var(--font-geist-sans)] block">
                    Select UPI Apps
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {UPI_APPS.map(app => {
                      const isSelected = draftUpiApps.includes(app);
                      return (
                        <button
                          key={app}
                          type="button"
                          onClick={() => toggleDraftUpiApp(app)}
                          className={`px-3 py-1.5 rounded-lg border font-[family-name:var(--font-geist-sans)] text-[11px] leading-[14px] tracking-[0.05em] font-bold uppercase transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-[#a1d800] bg-[#b8f600]/20 text-[#a1d800]'
                              : 'border-[#333535] bg-[#121414] text-[#8d9479] hover:border-[#8d9479]'
                          }`}
                        >
                          {app}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 5. Amount Range Section */}
            <div className="space-y-2">
              <label className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">
                Amount Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={draftMinAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || (Number(val) >= 0 && !val.includes('-'))) {
                        setDraftMinAmount(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                      }
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full bg-[#1a1c1c] border border-[#434933] focus:border-[#a1d800] focus:ring-0 text-[#ffffff] font-[family-name:var(--font-inter)] text-[14px] rounded-xl pl-8 pr-4 py-3 placeholder:text-[#474646] outline-none [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Min"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8d9479] font-medium text-[14px]">
                    ₹
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={draftMaxAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || (Number(val) >= 0 && !val.includes('-'))) {
                        setDraftMaxAmount(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                      }
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full bg-[#1a1c1c] border border-[#434933] focus:border-[#a1d800] focus:ring-0 text-[#ffffff] font-[family-name:var(--font-inter)] text-[14px] rounded-xl pl-8 pr-4 py-3 placeholder:text-[#474646] outline-none [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Max"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8d9479] font-medium text-[14px]">
                    ₹
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="absolute bottom-0 left-0 right-0 bg-[#121414] p-[20px] pt-4 border-t border-[#333535] shrink-0">
            <button 
              type="button"
              onClick={handleApplyFilters}
              className="w-full bg-[#a1d800] hover:bg-[#b8f600] text-[#141f00] font-bold text-[20px] leading-[28px] tracking-tight py-[14px] rounded-full shadow-[0_4px_20px_rgb(161,216,0,0.2)] transition-all active:scale-95 flex items-center justify-center font-[family-name:var(--font-geist-sans)] cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
