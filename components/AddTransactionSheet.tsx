'use client';

import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/context/AuthContext';
import { CATEGORIES, PAYMENT_MODES, UPI_APPS, TRANSACTION_TYPES } from '@/lib/constants';
import { TransactionType, Category, PaymentMode, UpiApp, Transaction } from '@/lib/types';
import CustomDatePicker from './CustomDatePicker';

interface AddTransactionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'add' | 'edit';
  transaction?: Transaction;
}

export default function AddTransactionSheet({ 
  isOpen, 
  onClose, 
  onSuccess,
  mode = 'add',
  transaction
}: AddTransactionSheetProps) {
  const { user } = useAuth();
  const [type, setType] = useState<TransactionType>('Need');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Miscellaneous');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [description, setDescription] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [upiApp, setUpiApp] = useState<UpiApp>('PhonePe');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [descriptionError, setDescriptionError] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Reset form or pre-fill when opened
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && transaction) {
        setType(transaction.type);
        setAmount(transaction.amount.toString());
        setCategory(transaction.category);
        
        // Date parsing timezone-safely
        const dateStr = typeof transaction.date === 'string' ? transaction.date : (transaction.date as Date).toISOString();
        const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
        setDate(cleanDate);
        
        setDescription(transaction.description);
        setPaymentMode(transaction.paymentMode);
        setUpiApp(transaction.upiApp || 'PhonePe');
        setNotes(transaction.notes || '');
      } else {
        setType('Need');
        setAmount('');
        setCategory('Miscellaneous');
        setDate(new Date().toLocaleDateString('en-CA'));
        setDescription('');
        setPaymentMode('UPI');
        setUpiApp('PhonePe');
        setNotes('');
      }
      setToast('');
      setDescriptionError(false);
      setIsCategoryDropdownOpen(false);
    }
  }, [isOpen, mode, transaction]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setToast('Please enter a valid amount');
      setTimeout(() => setToast(''), 3000);
      return;
    }

    if (!description.trim()) {
      setDescriptionError(true);
      return;
    }
    setDescriptionError(false);

    setLoading(true);
    try {
      const transactionData = {
        userId: user.uid,
        type,
        amount: Number(amount),
        category,
        date,
        description,
        paymentMode,
        ...(paymentMode === 'UPI' ? { upiApp } : {}),
        notes,
      };

      if (mode === 'edit' && transaction) {
        const docRef = doc(db, 'transactions', transaction.id);
        await updateDoc(docRef, transactionData);
        setToast('Transaction updated successfully!');
      } else {
        await addDoc(collection(db, 'transactions'), {
          ...transactionData,
          createdAt: new Date().toISOString()
        });
        setToast('Transaction added successfully!');
      }

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Error saving document: ", error);
      setToast(mode === 'edit' ? 'Error updating transaction' : 'Error adding transaction');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentIcon = (mode: PaymentMode) => {
    switch (mode) {
      case 'UPI': return 'account_balance_wallet';
      case 'Cash': return 'payments';
      case 'Debit Card': return 'credit_card';
      case 'Net Banking': return 'account_balance';
      default: return 'payments';
    }
  };

  const getUpiIcon = (app: UpiApp) => {
    switch (app) {
      case 'PhonePe': return 'bolt';
      case 'Paytm': return 'qr_code_2';
      case 'SuperMoney': return 'savings';
      default: return 'more_horiz';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-12 left-1/2 transform -translate-x-1/2 z-[100] bg-[#a1d800] text-[#141f00] px-4 py-2 rounded-full font-semibold text-sm shadow-lg animate-fade-in-down font-[family-name:var(--font-inter)]">
          {toast}
        </div>
      )}

      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-[60] transition-opacity animate-fade-in backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Slide-up Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] flex flex-col bg-[#121414] rounded-t-[24px] border-t border-[#434933] max-h-[85vh] overflow-hidden animate-slide-up max-w-[500px] mx-auto shadow-[0_-8px_30px_rgb(0,0,0,0.5)]">
        {/* Drag Handle */}
        <div className="w-full flex justify-center py-3">
          <div className="w-12 h-1.5 bg-[#333535] rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-[20px] pb-4 border-b border-[#333535]">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-[24px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">
              {mode === 'edit' ? 'Edit Transaction' : 'Add Transaction'}
            </h1>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-[#c3caac] hover:bg-[#1a1c1c] rounded-full transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-[20px] pt-6 pb-[100px] space-y-6 custom-scrollbar [&::-webkit-scrollbar]:hidden">
          
          {/* Type Segmented Toggle */}
          <div className="space-y-2">
            <label className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">TRANSACTION TYPE</label>
            <div className="flex bg-[#1a1c1c] p-1 rounded-xl border border-[#434933]">
              {TRANSACTION_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 text-center rounded-lg text-[12px] leading-[16px] tracking-[0.05em] font-bold uppercase transition-colors font-[family-name:var(--font-geist-sans)] cursor-pointer ${
                    type === t ? 'bg-[#434933] text-[#ffffff]' : 'text-[#8d9479]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#a1d800] uppercase font-[family-name:var(--font-geist-sans)]">AMOUNT</label>
            <div className="flex items-center space-x-2 border-b-2 border-[#a1d800] pb-2 pt-1">
              <span className="font-bold text-[32px] text-[#a1d800] font-[family-name:var(--font-geist-sans)]">₹</span>
              <input 
                type="number"
                min="0"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || (Number(val) >= 0 && !val.includes('-'))) {
                    setAmount(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                  }
                }}
                onWheel={(e) => e.currentTarget.blur()}
                className="bg-transparent border-none focus:ring-0 w-full font-bold text-[40px] text-[#ffffff] placeholder:text-[#333535] outline-none font-[family-name:var(--font-geist-sans)] [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>

          {/* Category & Date Grid */}
          <div className="grid grid-cols-2 gap-[12px]">
            <div className="space-y-2 relative">
              <label className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">CATEGORY</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="w-full bg-[#1a1c1c] border border-[#434933] rounded-xl py-3 pl-4 pr-10 text-left text-[14px] text-[#ffffff] focus:border-[#a1d800] outline-none font-[family-name:var(--font-inter)] relative cursor-pointer transition-colors"
                >
                  <span className="block truncate">{category}</span>
                  <span className={`material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#c3caac] transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>

                {/* Custom Dropdown Menu */}
                {isCategoryDropdownOpen && (
                  <>
                    {/* Backdrop to close when clicking outside */}
                    <div 
                      className="fixed inset-0 z-[75]" 
                      onClick={() => setIsCategoryDropdownOpen(false)}
                    />
                    
                    <div className="absolute left-0 right-0 mt-2 bg-[#1a1c1c] border border-[#434933] rounded-xl py-1 shadow-2xl z-[80] max-h-[220px] overflow-y-auto custom-scrollbar animate-scale-in">
                      {CATEGORIES.map((c) => {
                        const isSelected = category === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setCategory(c);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full text-left py-2.5 px-4 text-[14px] font-[family-name:var(--font-inter)] transition-colors cursor-pointer ${
                              isSelected 
                                ? 'bg-[#434933]/50 text-[#a1d800] font-semibold' 
                                : 'text-[#ffffff] hover:bg-[#252828]'
                            }`}
                          >
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">DATE</label>
              <CustomDatePicker 
                date={date} 
                onChange={setDate} 
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">DESCRIPTION</label>
            <input 
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (descriptionError && e.target.value.trim()) setDescriptionError(false);
              }}
              className={`w-full bg-[#1a1c1c] border ${descriptionError ? 'border-red-500 focus:border-red-500' : 'border-[#434933] focus:border-[#a1d800]'} rounded-xl py-3 px-4 text-[14px] text-[#ffffff] placeholder:text-[#8d9479] focus:ring-0 outline-none font-[family-name:var(--font-inter)]`}
              placeholder="What's this for?"
            />
            {descriptionError && (
              <p className="text-red-500 text-xs font-semibold mt-1 font-[family-name:var(--font-inter)]">
                Description is required
              </p>
            )}
          </div>

          {/* Payment Mode */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">PAYMENT MODE</label>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_MODES.map((mode) => (
                  <button 
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`flex flex-col items-center justify-center h-[66px] rounded-xl border space-y-0.5 transition-colors cursor-pointer ${
                      paymentMode === mode 
                        ? 'border-[#a1d800] bg-[#a1d800]/10' 
                        : 'border-[#434933] bg-[#1a1c1c] hover:border-[#8d9479]'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[20px] ${paymentMode === mode ? 'text-[#a1d800]' : 'text-[#c3caac]'}`}>
                      {getPaymentIcon(mode)}
                    </span>
                    <span className={`text-[9px] font-bold tracking-wide uppercase font-[family-name:var(--font-geist-sans)] text-center px-0.5 ${paymentMode === mode ? 'text-[#a1d800]' : 'text-[#c3caac]'}`}>
                      {mode === 'Net Banking' ? 'NET BNK' : mode}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* UPI App Selector */}
            {paymentMode === 'UPI' && (
              <div className="bg-[#1a1c1c]/50 p-4 rounded-xl border border-[#434933]/50 space-y-4">
                <div className="text-[11px] font-semibold text-[#8d9479] tracking-wider uppercase font-[family-name:var(--font-geist-sans)] block">
                  Select UPI App
                </div>
                <div className="flex justify-between items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden pt-1">
                  {UPI_APPS.map((app) => (
                    <button 
                      key={app}
                      type="button"
                      onClick={() => setUpiApp(app)}
                      className="flex flex-col items-center space-y-1 group min-w-[56px] flex-shrink-0 cursor-pointer"
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                        upiApp === app 
                          ? 'bg-[#333535] ring-2 ring-[#a1d800] ring-offset-2 ring-offset-[#121414]' 
                          : 'bg-[#1a1c1c] border border-[#434933] group-hover:border-[#8d9479]'
                      }`}>
                        <span className={`material-symbols-outlined ${upiApp === app ? 'text-[#a1d800]' : 'text-[#8d9479]'}`}>
                          {getUpiIcon(app)}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold tracking-wider uppercase font-[family-name:var(--font-geist-sans)] mt-1 ${upiApp === app ? 'text-[#a1d800]' : 'text-[#8d9479]'}`}>
                        {app}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">NOTES (OPTIONAL)</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#1a1c1c] border border-[#434933] rounded-xl py-3 px-4 text-[14px] text-[#ffffff] placeholder:text-[#8d9479] focus:border-[#a1d800] focus:ring-0 outline-none resize-none font-[family-name:var(--font-inter)]"
              placeholder="Add additional details..." 
              rows={3}
            ></textarea>
          </div>
        </div>

        {/* Action Button Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#121414] p-[20px] pt-4 border-t border-[#333535]">
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#a1d800] hover:bg-[#b8f600] text-[#141f00] font-bold text-[20px] leading-[28px] tracking-tight py-[14px] rounded-full shadow-[0_4px_20px_rgb(161,216,0,0.2)] transition-all active:scale-95 flex items-center justify-center font-[family-name:var(--font-geist-sans)] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <svg className="animate-spin h-6 w-6 text-[#141f00]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : mode === 'edit' ? 'Save Changes' : 'Add Transaction'}
          </button>
        </div>
      </div>
    </>
  );
}
