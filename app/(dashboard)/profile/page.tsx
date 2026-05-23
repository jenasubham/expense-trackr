'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updatePassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error: any) {
      showToast(error.message || 'Error signing out', 'error');
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
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        showToast('Security required: Please log out and log back in to change your password', 'error');
      } else {
        showToast(error.message || 'Error changing password', 'error');
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
          <Link href="/search" className="w-10 h-10 flex items-center justify-center text-[#c3caac] hover:text-[#a1d800] transition-colors">
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
        
        {/* Change Password Card */}
        <div className="bg-[#1a1c1c] border border-[#2C2C2E] rounded-xl overflow-hidden transition-all duration-300">
          <button 
            onClick={() => setIsChangingPassword(!isChangingPassword)}
            className="w-full flex items-center justify-between p-4 hover:bg-[#252828] transition-colors"
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
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password" 
                  className="w-full bg-[#121414] border border-[#434933] focus:border-[#a1d800] focus:ring-0 text-[#ffffff] font-[family-name:var(--font-inter)] text-[14px] rounded-lg px-4 py-3 outline-none placeholder:text-[#474646]"
                />
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password" 
                  className="w-full bg-[#121414] border border-[#434933] focus:border-[#a1d800] focus:ring-0 text-[#ffffff] font-[family-name:var(--font-inter)] text-[14px] rounded-lg px-4 py-3 outline-none placeholder:text-[#474646]"
                />
                <button 
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="w-full mt-2 bg-[#a1d800] hover:bg-[#b8f600] text-[#141f00] font-bold text-[14px] py-3 rounded-lg transition-colors flex items-center justify-center font-[family-name:var(--font-geist-sans)] disabled:opacity-70 disabled:cursor-not-allowed"
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
          className="w-full flex items-center justify-center gap-2 py-4 bg-transparent border border-[#ffb4ab]/30 hover:bg-[#ffb4ab]/5 rounded-xl transition-colors mt-auto"
        >
          <span className="material-symbols-outlined text-[#ffb4ab] text-[20px]">logout</span>
          <span className="font-bold text-[16px] text-[#ffb4ab] font-[family-name:var(--font-geist-sans)] tracking-wide">
            Logout
          </span>
        </button>

      </div>
    </main>
  );
}
