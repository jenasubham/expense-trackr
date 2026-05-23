import React, { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Transaction } from '@/lib/types';

interface TransactionDetailSheetProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteSuccess: () => void;
}

const getCategoryIcon = (category: string) => {
  const map: Record<string, string> = {
    'PG Rent & Bill': 'home_work',
    'Food & Dining': 'restaurant',
    'Transport': 'directions_car',
    'Health': 'medical_services',
    'Online Order': 'shopping_bag',
    'Entertainment': 'movie',
    'Groceries': 'local_grocery_store',
    'Travel': 'flight',
  };
  return map[category] || 'payments';
};

export default function TransactionDetailSheet({ transaction, isOpen, onClose, onDeleteSuccess }: TransactionDetailSheetProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !transaction) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'transactions', transaction.id));
      onDeleteSuccess();
      onClose();
    } catch (error) {
      console.error("Error deleting document: ", error);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleClose = () => {
    setShowConfirm(false);
    onClose();
  };

  const dateStr = typeof transaction.date === 'string' ? transaction.date : (transaction.date as Date).toISOString();
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [yr, mo, dy] = cleanDate.split('-');
  const formattedDate = new Date(Number(yr), Number(mo) - 1, Number(dy)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const isIncome = transaction.type === 'Income';
  const amountColor = isIncome ? 'text-[#a1d800]' : 'text-[#ffffff]';
  const sign = isIncome ? '+' : '';

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-[60] transition-opacity animate-fade-in backdrop-blur-sm"
        onClick={handleClose}
      ></div>

      {/* Slide-up Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] flex flex-col bg-[#121414] rounded-t-[24px] border-t border-[#434933] max-h-[85vh] animate-slide-up max-w-[500px] mx-auto shadow-[0_-8px_30px_rgb(0,0,0,0.5)]">
        {/* Drag Handle */}
        <div className="w-full flex justify-center py-3">
          <div className="w-12 h-1.5 bg-[#333535] rounded-full"></div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-[24px] pb-[100px] custom-scrollbar [&::-webkit-scrollbar]:hidden">
          
          {/* Header - Type Pill & Amount */}
          <div className="flex flex-col items-center pt-2 pb-6 border-b border-[#333535]/50">
            <div className="px-3 py-1 mb-4 rounded-full border border-[#8d9479]/50 flex items-center justify-center">
              <span className="text-[10px] tracking-widest font-bold text-[#8d9479] uppercase font-[family-name:var(--font-geist-sans)]">
                {transaction.type}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="font-bold text-[24px] text-[#a1d800] font-[family-name:var(--font-geist-sans)]">{sign}₹</span>
              <span className={`font-bold text-[40px] ${amountColor} font-[family-name:var(--font-geist-sans)] tracking-tight`}>
                {transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Details List */}
          <div className="py-4 space-y-5">
            {/* Category */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 min-w-10 rounded-full bg-[#1a1c1c] border border-[#434933] flex items-center justify-center mt-1">
                <span className="material-symbols-outlined text-[#a1d800] text-[20px]">{getCategoryIcon(transaction.category)}</span>
              </div>
              <div className="flex flex-col flex-1 pb-4 border-b border-[#333535]/50">
                <span className="text-[11px] font-bold tracking-[0.05em] text-[#c3caac] uppercase mb-1 font-[family-name:var(--font-geist-sans)]">Category</span>
                <span className="text-[15px] text-[#ffffff] font-medium font-[family-name:var(--font-inter)]">{transaction.category}</span>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 min-w-10 rounded-full bg-[#1a1c1c] border border-[#434933] flex items-center justify-center mt-1">
                <span className="material-symbols-outlined text-[#e2e2e2] text-[20px]">event</span>
              </div>
              <div className="flex flex-col flex-1 pb-4 border-b border-[#333535]/50">
                <span className="text-[11px] font-bold tracking-[0.05em] text-[#c3caac] uppercase mb-1 font-[family-name:var(--font-geist-sans)]">Date</span>
                <span className="text-[15px] text-[#ffffff] font-medium font-[family-name:var(--font-inter)]">{formattedDate}</span>
              </div>
            </div>

            {/* Description */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 min-w-10 rounded-full bg-[#1a1c1c] border border-[#434933] flex items-center justify-center mt-1">
                <span className="material-symbols-outlined text-[#e2e2e2] text-[20px]">description</span>
              </div>
              <div className="flex flex-col flex-1 pb-4 border-b border-[#333535]/50">
                <span className="text-[11px] font-bold tracking-[0.05em] text-[#c3caac] uppercase mb-1 font-[family-name:var(--font-geist-sans)]">Description</span>
                <span className="text-[15px] text-[#ffffff] font-medium font-[family-name:var(--font-inter)] leading-relaxed">
                  {transaction.description || "—"}
                </span>
              </div>
            </div>

            {/* Payment Mode */}
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 min-w-10 rounded-full bg-[#1a1c1c] border border-[#434933] flex items-center justify-center mt-1">
                <span className="material-symbols-outlined text-[#e2e2e2] text-[20px]">payments</span>
              </div>
              <div className="flex flex-col flex-1 pb-4 border-b border-[#333535]/50">
                <span className="text-[11px] font-bold tracking-[0.05em] text-[#c3caac] uppercase mb-1 font-[family-name:var(--font-geist-sans)]">Payment Mode</span>
                <span className="text-[15px] text-[#ffffff] font-medium font-[family-name:var(--font-inter)]">{transaction.paymentMode}</span>
                
                {transaction.paymentMode === 'UPI' && transaction.upiApp && (
                  <div className="mt-3">
                    <span className="text-[11px] font-bold tracking-[0.05em] text-[#c3caac] uppercase mb-1 block font-[family-name:var(--font-geist-sans)]">UPI App</span>
                    <div className="flex items-center text-[#ffffff] text-[15px] font-medium font-[family-name:var(--font-inter)]">
                      <span className="material-symbols-outlined text-[#a1d800] text-[16px] mr-2">check_circle</span>
                      {transaction.upiApp}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {transaction.notes && (
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 min-w-10 rounded-full bg-[#1a1c1c] border border-[#434933] flex items-center justify-center mt-1">
                  <span className="material-symbols-outlined text-[#e2e2e2] text-[20px]">notes</span>
                </div>
                <div className="flex flex-col flex-1 pb-4 border-b border-[#333535]/50">
                  <span className="text-[11px] font-bold tracking-[0.05em] text-[#c3caac] uppercase mb-1 font-[family-name:var(--font-geist-sans)]">Notes</span>
                  <span className="text-[14px] text-[#8d9479] italic font-[family-name:var(--font-inter)] leading-relaxed">
                    "{transaction.notes}"
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Button Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#121414] p-[20px] pt-4 border-t border-[#333535]">
          <button 
            onClick={() => setShowConfirm(true)}
            className="w-full bg-[#991b1b] hover:bg-[#b91c1c] text-[#ffffff] font-bold text-[18px] leading-[28px] tracking-tight py-4 rounded-full shadow-[0_4px_20px_rgb(153,27,27,0.3)] transition-all active:scale-95 flex items-center justify-center font-[family-name:var(--font-geist-sans)] gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
            Delete Transaction
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setShowConfirm(false)}></div>
          
          <div className="bg-[#1a1c1c] border border-[#434933] rounded-[24px] p-6 w-full max-w-[340px] z-10 animate-scale-in shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#991b1b]/20 flex items-center justify-center mb-4 text-[#ef4444]">
              <span className="material-symbols-outlined text-[32px]">warning</span>
            </div>
            <h3 className="text-[#ffffff] text-[20px] font-bold font-[family-name:var(--font-geist-sans)] mb-2">Are you sure?</h3>
            <p className="text-[#8d9479] text-[14px] font-[family-name:var(--font-inter)] mb-8">
              This action cannot be undone. This transaction will be permanently deleted.
            </p>
            
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full bg-[#991b1b] text-[#ffffff] font-bold py-3.5 rounded-xl transition-colors active:scale-95 font-[family-name:var(--font-geist-sans)] disabled:opacity-50 flex justify-center items-center"
              >
                {isDeleting ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Yes, Delete'}
              </button>
              <button 
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="w-full bg-[#2a2d2d] text-[#ffffff] hover:bg-[#333535] font-bold py-3.5 rounded-xl transition-colors active:scale-95 font-[family-name:var(--font-geist-sans)] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
