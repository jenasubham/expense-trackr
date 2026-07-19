'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updatePassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  interface SavingsRecord {
    id: string;
    userId: string;
    month: string;
    amount: number;
    notes?: string;
  }

  const monthScrollRef = useRef<HTMLDivElement>(null);

  const [showSavingsVault, setShowSavingsVault] = useState(false);
  const [savingsList, setSavingsList] = useState<SavingsRecord[]>([]);
  const [vaultAmount, setVaultAmount] = useState('');
  const [vaultMonth, setVaultMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
  const [notesPreset, setNotesPreset] = useState('From salary');
  const [customNotes, setCustomNotes] = useState('');
  const [showCustomNotesInput, setShowCustomNotesInput] = useState(false);
  const [isSubmittingSavings, setIsSubmittingSavings] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeletingSavings, setIsDeletingSavings] = useState(false);

  const isPremiumUser = user?.uid === '8GM1OOIkAWWBKEiKbtlRWgSZQgE3';

  // Fetch savings from API
  const fetchSavings = async () => {
    try {
      const res = await fetch('/api/savings');
      if (res.ok) {
        const data = await res.json();
        setSavingsList(data as SavingsRecord[]);
      } else {
        console.error("Failed to load savings from API");
      }
    } catch (error) {
      console.error("Error loading savings:", error);
    }
  };

  // Load savings data on mount / user change
  useEffect(() => {
    if (user && isPremiumUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchSavings();
    } else {
      setSavingsList([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isPremiumUser]);

  // Scroll month picker to far-right (newest month) when sheet opens
  useEffect(() => {
    if (showSavingsVault) {
      setTimeout(() => {
        if (monthScrollRef.current) {
          monthScrollRef.current.scrollLeft = monthScrollRef.current.scrollWidth;
        }
      }, 100);
    }
  }, [showSavingsVault]);

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    // 11 down to 0: chronological order (oldest on left, newest on right)
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const val = `${year}-${month}`;
      const shortMonth = d.toLocaleString('default', { month: 'short' });
      options.push({ val, shortMonth, year });
    }
    return options;
  };

  const handleAddSavings = async () => {
    if (!user || !vaultAmount || Number(vaultAmount) <= 0) return;
    
    setIsSubmittingSavings(true);
    const finalNotes = showCustomNotesInput ? customNotes.trim() : notesPreset;
    try {
      const res = await fetch('/api/savings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: vaultMonth,
          amount: Number(vaultAmount),
          notes: finalNotes || 'From salary',
        }),
      });

      if (res.ok) {
        setVaultAmount('');
        setNotesPreset('From salary');
        setCustomNotes('');
        setShowCustomNotesInput(false);
        showToast('Savings added to vault!', 'success');
        fetchSavings(); // Refresh the list
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Error saving data', 'error');
      }
    } catch (error) {
      console.error("Error adding savings:", error);
      showToast('Error saving data. Please check connections.', 'error');
    } finally {
      setIsSubmittingSavings(false);
    }
  };

  const handleDeleteSavings = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDeleteSavings = async () => {
    if (!deleteTargetId) return;
    setIsDeletingSavings(true);
    try {
      const res = await fetch(`/api/savings?id=${deleteTargetId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('Savings record deleted', 'success');
        setDeleteTargetId(null);
        fetchSavings(); // Refresh the list
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Error deleting data', 'error');
      }
    } catch (error) {
      console.error("Error deleting savings:", error);
      showToast('Error deleting data. Please check connections.', 'error');
    } finally {
      setIsDeletingSavings(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      const err = error as { message?: string };
      showToast(err.message || 'Error signing out', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(user, newPassword);
      showToast('Password updated successfully', 'success');
      setIsChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error) {
      console.error(error);
      const err = error as { code?: string; message?: string };
      if (err.code === 'auth/requires-recent-login') {
        showToast('Security required: Please log out and log back in to change your password', 'error');
      } else {
        showToast(err.message || 'Error changing password', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="px-[20px] pt-6 max-w-[390px] mx-auto w-full relative flex flex-col h-[calc(100dvh-96px)] overflow-y-auto custom-scrollbar [&::-webkit-scrollbar]:hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-12 left-1/2 transform -translate-x-1/2 z-[100] px-4 py-2 rounded-full font-semibold text-sm shadow-lg animate-fade-in-down font-[family-name:var(--font-inter)] ${
          toast.type === 'success' ? 'bg-[#a1d800] text-[#141f00]' : 'bg-[#ffb4ab] text-[#690005]'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="flex justify-between items-center w-full mb-6 shrink-0">
        <h1 className="font-semibold text-[24px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">
          Profile
        </h1>
        <div className="flex items-center gap-3">
          <Link href="/search" className="w-10 h-10 flex items-center justify-center text-[#c3caac] hover:text-[#a1d800] transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[24px]">search</span>
          </Link>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-[#434933] bg-[#1A1A1A] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#a1d800] text-[18px]">person</span>
          </div>
        </div>
      </header>

      {/* Profile Info */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-28 h-28 rounded-full bg-[#121414] border border-[#a1d800]/30 flex items-center justify-center mb-3 before:absolute before:inset-[-3px] before:rounded-full before:bg-gradient-to-b before:from-[#a1d800]/70 before:to-transparent before:-z-10 animate-glow-pulse">
          <span className="text-[48px] font-bold text-[#a1d800] font-[family-name:var(--font-geist-sans)]">S</span>
        </div>
        <h2 className="text-[24px] font-bold text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">
          Subham
        </h2>
        <p className="text-[12px] font-bold tracking-widest text-[#a1d800] mt-1 font-[family-name:var(--font-geist-sans)]">
          {user?.email || 'subham@example.com'}
        </p>
      </div>

      {/* Action Cards */}
      <div className="flex flex-col gap-4 flex-1">
        
        {/* Savings Vault Card (Premium User Only) */}
        {isPremiumUser && (
          <div className="relative bg-gradient-to-r from-[#1a1c1c] via-[#242626] to-[#1a1c1c] border border-[#a1d800]/25 rounded-xl overflow-hidden transition-all duration-300 shadow-[0_4px_20px_rgba(161,216,0,0.05)] hover:shadow-[0_4px_25px_rgba(161,216,0,0.08)] hover:scale-[1.01]">
            {/* Glowing neon green accent bar on the left edge */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#a1d800] shadow-[0_0_10px_rgba(161,216,0,0.8)]" />
            
            <button 
              type="button"
              onClick={() => setShowSavingsVault(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-[#252828]/40 transition-colors cursor-pointer pl-5"
            >
              <div className="flex items-center gap-4">
                {/* Premium Glowing Icon Badge */}
                <div className="w-10 h-10 min-w-10 min-h-10 rounded-xl bg-gradient-to-br from-[#a1d800]/25 to-[#a1d800]/5 flex items-center justify-center border border-[#a1d800]/30 shadow-[0_0_12px_rgba(161,216,0,0.2)] text-[#a1d800] shrink-0">
                  <span className="material-symbols-outlined text-[22px] animate-pulse">savings</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-[16px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">
                    Savings Vault
                  </span>
                  <span className="text-[10px] font-extrabold text-[#a1d800] uppercase tracking-[0.08em] mt-0.5 font-[family-name:var(--font-geist-sans)]">
                    Premium Feature
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#a1d800]">
                chevron_right
              </span>
            </button>
          </div>
        )}

        {/* Change Password Card */}
        <div className="bg-[#1a1c1c] border border-[#2C2C2E] rounded-xl overflow-hidden transition-all duration-300">
          <button 
            onClick={() => {
              setIsChangingPassword(!isChangingPassword);
              setShowNewPassword(false);
              setShowConfirmPassword(false);
            }}
            className="w-full flex items-center justify-between p-4 hover:bg-[#252828] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#333535] flex items-center justify-center text-[#e2e2e2]">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <span className="font-bold text-[16px] text-[#ffffff] font-[family-name:var(--font-geist-sans)]">
                Change Password
              </span>
            </div>
            <span className={`material-symbols-outlined text-[#8d9479] transition-transform duration-300 ${isChangingPassword ? 'rotate-90' : ''}`}>
              chevron_right
            </span>
          </button>

          {/* Inline Form */}
          {isChangingPassword && (
            <div className="px-4 pb-4 pt-2 border-t border-[#333535]/50 animate-fade-in">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password" 
                    className="w-full bg-[#121414] border border-[#434933] focus:border-[#a1d800] focus:ring-0 text-[#ffffff] font-[family-name:var(--font-inter)] text-[14px] rounded-lg pl-4 pr-12 py-3 outline-none placeholder:text-[#474646]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8d9479] hover:text-[#a1d800] transition-colors cursor-pointer flex items-center justify-center"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm New Password" 
                    className="w-full bg-[#121414] border border-[#434933] focus:border-[#a1d800] focus:ring-0 text-[#ffffff] font-[family-name:var(--font-inter)] text-[14px] rounded-lg pl-4 pr-12 py-3 outline-none placeholder:text-[#474646]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8d9479] hover:text-[#a1d800] transition-colors cursor-pointer flex items-center justify-center"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button 
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="w-full mt-2 bg-[#a1d800] hover:bg-[#b8f600] text-[#141f00] font-bold text-[14px] py-3 rounded-lg transition-colors flex items-center justify-center font-[family-name:var(--font-geist-sans)] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-[#141f00]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : 'Confirm Change'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Spacer to push logout to bottom */}
        <div className="flex-1"></div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 bg-transparent border border-[#ffb4ab]/30 hover:bg-[#ffb4ab]/5 rounded-xl transition-colors mt-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[#ffb4ab] text-[20px]">logout</span>
          <span className="font-bold text-[16px] text-[#ffb4ab] font-[family-name:var(--font-geist-sans)] tracking-wide">
            Logout
          </span>
        </button>

      </div>

      {/* Savings Vault Drawer Overlay */}
      {showSavingsVault && (
        <div 
          className="fixed inset-0 bg-black/60 z-[60] transition-opacity animate-fade-in backdrop-blur-sm"
          onClick={() => setShowSavingsVault(false)}
        ></div>
      )}

      {/* Slide-up Savings Vault Drawer */}
      {showSavingsVault && (
        <div className="fixed bottom-0 left-0 right-0 z-[70] flex flex-col bg-[#121414] rounded-t-[24px] border-t border-[#434933] h-[85vh] max-h-[85vh] overflow-hidden animate-slide-up max-w-[500px] mx-auto shadow-[0_-8px_30px_rgb(0,0,0,0.5)] font-[family-name:var(--font-inter)]">
          {/* Drag Handle */}
          <div className="w-full flex justify-center py-3 shrink-0">
            <div className="w-12 h-1.5 bg-[#333535] rounded-full"></div>
          </div>

          {/* Drawer Header */}
          <div className="px-[20px] pb-4 border-b border-[#333535] shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#a1d800] text-2xl">savings</span>
                <h2 className="font-bold text-[22px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">
                  Savings Vault
                </h2>
              </div>
              <button 
                type="button"
                onClick={() => setShowSavingsVault(false)}
                className="w-8 h-8 rounded-full bg-[#1a1c1c] border border-[#333535] flex items-center justify-center text-[#c3caac] hover:text-[#ffffff] transition-colors cursor-pointer hover:border-[#a1d800]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-[20px] flex flex-col gap-6">
            
            {/* Total Balance Panel (Revamped Vault Card) */}
            <div className="relative bg-gradient-to-br from-[#1e2020] to-[#121414] border border-[#434933]/40 border-l-4 border-l-[#a1d800] rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden shrink-0 flex items-center justify-between">
              {/* Soft radial background glow */}
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#a1d800]/10 blur-[40px] rounded-full pointer-events-none" />
              
              <div className="flex flex-col min-w-0">
                <p className="text-[11px] font-extrabold tracking-[0.1em] text-[#8d9479] uppercase font-[family-name:var(--font-geist-sans)]">
                  Lifetime Savings
                </p>
                <h3 className="text-[36px] font-black text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight leading-none mt-1 select-all truncate">
                  ₹{savingsList.reduce((acc, item) => acc + Number(item.amount || 0), 0).toLocaleString('en-IN')}
                </h3>
                
                {/* Subtle current year savings subtext */}
                <p className="text-[12px] text-[#8d9479] font-medium font-[family-name:var(--font-geist-sans)] mt-2.5 flex items-center gap-1.5 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a1d800]/50 shrink-0" />
                  <span>Saved in {new Date().getFullYear()}:</span>
                  <span className="text-[#a1d800] font-semibold">
                    ₹{savingsList
                      .filter((item) => item.month.startsWith(String(new Date().getFullYear())))
                      .reduce((acc, item) => acc + Number(item.amount || 0), 0)
                      .toLocaleString('en-IN')}
                  </span>
                </p>
              </div>
              
              {/* Premium Icon Badge */}
              <div className="w-14 h-14 min-w-[56px] rounded-2xl bg-gradient-to-br from-[#a1d800]/25 to-[#a1d800]/5 flex items-center justify-center border border-[#a1d800]/30 shadow-[0_0_15px_rgba(161,216,0,0.15)] text-[#a1d800] shrink-0">
                <span className="material-symbols-outlined text-[28px] animate-pulse">savings</span>
              </div>
            </div>

            {/* Quick Add Savings Form */}
            <div className="bg-[#1a1c1c] border border-[#2C2C2E] rounded-2xl p-5 flex flex-col gap-6">
              <h4 className="font-bold text-[15px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-wide flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#a1d800]">add_circle</span>
                Add Month Savings
              </h4>

              {/* Amount Input (Large styled matching product) */}
              <div className="space-y-2">
                <label className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#a1d800] uppercase font-[family-name:var(--font-geist-sans)]">AMOUNT</label>
                <div className="flex items-center space-x-2 border-b-2 border-[#a1d800] pb-2 pt-1">
                  <span className="font-bold text-[32px] text-[#a1d800] font-[family-name:var(--font-geist-sans)] select-none">₹</span>
                  <input 
                    type="number"
                    min="0"
                    value={vaultAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || (Number(val) >= 0 && !val.includes('-'))) {
                        setVaultAmount(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault();
                      }
                    }}
                    onFocus={(e) => {
                      e.target.addEventListener('wheel', function(event) {
                        event.preventDefault();
                      }, { passive: false });
                    }}
                    placeholder="0.00"
                    className="bg-transparent border-none focus:ring-0 w-full font-bold text-[36px] text-[#ffffff] placeholder:text-[#333535] outline-none font-[family-name:var(--font-geist-sans)] [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Select Month (Horizontal Picker) */}
              <div className="flex flex-col gap-2 shrink-0">
                <label className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">
                  Select Month
                </label>
                <div 
                  ref={monthScrollRef}
                  className="flex gap-2.5 pb-1 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-smooth w-full"
                >
                  {getMonthOptions().map((opt) => {
                    const isSelected = vaultMonth === opt.val;
                    const hasSavings = savingsList.some((item) => item.month === opt.val);
                    
                    let cardStyle = 'bg-[#121414] border-[#333535] text-[#ffffff] hover:border-[#434933]';
                    let yearStyle = 'text-[#8d9479]';
                    let monthStyle = 'text-[#ffffff]';
                    
                    if (isSelected) {
                      cardStyle = 'bg-[#a1d800] border-[#a1d800] text-[#141f00] font-bold shadow-[0_0_12px_rgba(161,216,0,0.35)] scale-[1.02]';
                      yearStyle = 'text-[#141f00]/70';
                      monthStyle = 'text-[#141f00]';
                    } else if (hasSavings) {
                      cardStyle = 'bg-[#a1d800]/5 border-[#a1d800]/25 text-[#a1d800] hover:bg-[#a1d800]/10 hover:border-[#a1d800]/45 shadow-[0_0_10px_rgba(161,216,0,0.03)]';
                      yearStyle = 'text-[#a1d800]/60';
                      monthStyle = 'text-[#a1d800] font-semibold';
                    }

                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setVaultMonth(opt.val)}
                        className={`flex flex-col items-center justify-center min-w-[76px] h-[72px] rounded-2xl border transition-all snap-start cursor-pointer shrink-0 relative ${cardStyle}`}
                      >
                        {/* Dot indicator if month has savings */}
                        {hasSavings && (
                          <span className={`absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-[#141f00]' : 'bg-[#a1d800]'
                          } shadow-[0_0_6px_rgba(161,216,0,0.8)]`} />
                        )}
                        
                        <span className={`text-[10px] uppercase tracking-wider font-semibold font-[family-name:var(--font-geist-sans)] ${yearStyle}`}>
                          {opt.year}
                        </span>
                        <span className={`text-[16px] font-bold font-[family-name:var(--font-geist-sans)] mt-0.5 ${monthStyle}`}>
                          {opt.shortMonth}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes / Remarks */}
              <div className="flex flex-col gap-2">
                <label className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">
                  Notes / Remarks
                </label>
                
                {!showCustomNotesInput ? (
                  <div className="flex flex-wrap gap-2 animate-fade-in">
                    {['From salary', 'Investments'].map((preset) => {
                      const isSelected = notesPreset === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setNotesPreset(preset);
                            setCustomNotes('');
                          }}
                          className={`px-3.5 py-2 rounded-xl border text-[13px] font-semibold tracking-wide transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#a1d800] border-[#a1d800] text-[#141f00]'
                              : 'bg-[#121414] border-[#333535] text-[#c3caac] hover:border-[#434933]'
                          }`}
                        >
                          {preset}
                        </button>
                      );
                    })}
                    
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomNotesInput(true);
                        setNotesPreset('Custom');
                        setCustomNotes('');
                      }}
                      className="px-3.5 py-2 rounded-xl border border-[#333535] bg-[#121414] text-[#c3caac] hover:border-[#434933] text-[13px] font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                      Custom
                    </button>
                  </div>
                ) : (
                  <div className="relative flex items-center w-full animate-scale-in">
                    <input
                      type="text"
                      value={customNotes}
                      onChange={(e) => setCustomNotes(e.target.value)}
                      placeholder="Type custom remarks..."
                      className="w-full bg-[#121414] border border-[#333535] focus:border-[#a1d800] text-[#ffffff] font-[family-name:var(--font-inter)] text-[14px] rounded-xl pl-4 pr-10 py-3.5 outline-none placeholder:text-[#474646]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomNotesInput(false);
                        setNotesPreset('From salary');
                        setCustomNotes('');
                      }}
                      className="absolute right-3 text-[#ffb4ab]/85 hover:text-[#ffb4ab] p-1 cursor-pointer flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button 
                type="button"
                onClick={handleAddSavings}
                disabled={isSubmittingSavings || !vaultAmount || Number(vaultAmount) <= 0}
                className="w-full bg-[#a1d800] hover:bg-[#b8f600] text-[#141f00] font-bold text-[16px] py-3.5 rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:bg-[#434933] disabled:text-[#8d9479]"
              >
                {isSubmittingSavings ? (
                  <div className="w-5 h-5 border-2 border-[#141f00] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">lock_open</span>
                    Deposit to Vault
                  </>
                )}
              </button>
            </div>

            {/* Savings History List */}
            <div className="flex flex-col gap-3">
              <h4 className="font-bold text-[15px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-wide flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[18px] text-[#a1d800]">history</span>
                Savings History
              </h4>

              {savingsList.length === 0 ? (
                <div className="bg-[#1a1c1c] border border-[#2C2C2E] rounded-xl p-8 text-center flex flex-col items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#8d9479] text-3xl mb-2">account_balance</span>
                  <p className="text-[13px] text-[#8d9479] font-medium leading-relaxed">
                    No savings recorded yet. Add your first month savings above!
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {savingsList.map((item) => {
                    const dateObj = new Date(item.month + '-02');
                    const formattedMonth = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
                    return (
                      <div 
                        key={item.id}
                        className="w-full flex items-center justify-between p-[16px] bg-[#1e2020] border border-[#434933] rounded-2xl transition-colors hover:bg-[#252828] text-left"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div className="w-12 h-12 min-w-12 rounded-full bg-[#a1d800]/10 flex items-center justify-center border border-[#a1d800]/30 shrink-0 text-[#a1d800]">
                            <span className="material-symbols-outlined text-[22px]">savings</span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <p className="text-[16px] text-[#ffffff] font-medium leading-tight font-[family-name:var(--font-inter)] line-clamp-1 mb-1">
                              {formattedMonth}
                            </p>
                            <p className="text-[13px] text-[#8d9479] font-[family-name:var(--font-inter)] font-medium line-clamp-1">
                              {item.notes || 'From salary'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className="font-bold text-[18px] text-[#a1d800] font-[family-name:var(--font-geist-sans)] tracking-tight whitespace-nowrap">
                            +₹{Number(item.amount).toLocaleString('en-IN')}
                          </span>
                          <button 
                            type="button"
                            onClick={() => handleDeleteSavings(item.id)}
                            className="text-[#ffb4ab]/80 hover:text-[#ffb4ab] hover:bg-[#ffb4ab]/10 p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setDeleteTargetId(null)}></div>
          
          <div className="bg-[#1a1c1c] border border-[#434933] rounded-[24px] p-6 w-full max-w-[340px] z-10 animate-scale-in shadow-2xl flex flex-col items-center text-center font-[family-name:var(--font-inter)]">
            <div className="w-16 h-16 rounded-full bg-[#991b1b]/20 flex items-center justify-center mb-4 text-[#ef4444]">
              <span className="material-symbols-outlined text-[32px]">warning</span>
            </div>
            <h3 className="text-[#ffffff] text-[20px] font-bold font-[family-name:var(--font-geist-sans)] mb-2">Delete Savings?</h3>
            <p className="text-[#8d9479] text-[14px] leading-relaxed mb-6">
              This action cannot be undone. This savings record will be permanently deleted from the vault.
            </p>
            
            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={confirmDeleteSavings}
                disabled={isDeletingSavings}
                className="w-full bg-[#991b1b] text-[#ffffff] font-bold py-3.5 rounded-xl transition-colors active:scale-95 font-[family-name:var(--font-geist-sans)] disabled:opacity-50 flex justify-center items-center cursor-pointer"
              >
                {isDeletingSavings ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Yes, Delete'}
              </button>
              <button 
                onClick={() => setDeleteTargetId(null)}
                disabled={isDeletingSavings}
                className="w-full bg-[#2a2d2d] text-[#ffffff] hover:bg-[#333535] font-bold py-3.5 rounded-xl transition-colors active:scale-95 font-[family-name:var(--font-geist-sans)] disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
