'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Forgot Password Modal states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetEmailError, setResetEmailError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (user && !authLoading) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const validateEmail = (val: string) => {
    if (!val) {
      setEmailError('');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleEmailBlur = () => {
    validateEmail(email);
  };

  const handlePasswordBlur = () => {
    if (!password) {
      setPasswordError('Password is required');
    } else {
      setPasswordError('');
    }
  };

  const isFormValid = email && password && !emailError && !passwordError;

  const handleLogin = async () => {
    setError('');
    
    if (!isFormValid) return;

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      document.cookie = `auth_token=${userCredential.user.uid}; path=/; max-age=${60 * 60 * 24 * 30}`;
      router.push('/');
    } catch (err: any) {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      document.cookie = `auth_token=${userCredential.user.uid}; path=/; max-age=${60 * 60 * 24 * 30}`;
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError('Google sign in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendResetLink = async () => {
    setResetSuccess(false);
    setResetError('');
    setResetEmailError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setResetEmailError('Please enter a valid email');
      return;
    }
    if (!emailRegex.test(email)) {
      setResetEmailError('Please enter a valid email');
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSuccess(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setResetError('Email address not found.');
      } else if (err.code === 'auth/invalid-email') {
        setResetEmailError('Please enter a valid email.');
      } else {
        setResetError('Failed to send reset link. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center px-[24px] pt-[80px] max-w-[400px] mx-auto relative z-10 w-full bg-[#121414]">
      {/* Top Wallet Icon */}
      <div className="mb-[24px] flex flex-col items-center">
        <div className="w-[60px] h-[60px] bg-[#b8f600] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(184,246,0,0.4)]">
          <span className="material-symbols-outlined text-[#141f00] text-[32px] font-bold">
            account_balance_wallet
          </span>
        </div>
      </div>

      {/* Header Section */}
      <header className="mb-[40px] flex flex-col items-center text-center">
        <h1 className="font-extrabold text-[28px] leading-[36px] tracking-[-0.04em] text-[#ffffff] mb-1 font-[family-name:var(--font-geist-sans)]">
          Hey, Welcome Back
        </h1>
        <p className="text-[14px] leading-[20px] text-[#c3caac] font-[family-name:var(--font-inter)] font-medium">
          Track your spending. Own your money.
        </p>
      </header>

      {/* Form Section */}
      <section className="flex flex-col gap-[20px] w-full">
        {/* Email Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) validateEmail(e.target.value);
            }}
            onBlur={handleEmailBlur}
            className={`w-full bg-[#1a1c1c] border ${emailError ? 'border-red-500 focus:border-red-500' : 'border-[#333535] focus:border-[#a1d800]'} rounded-xl px-4 py-[14px] text-[#ffffff] text-[15px] placeholder:text-[#474746] transition-colors duration-200 outline-none font-[family-name:var(--font-inter)]`}
            placeholder="name@example.com"
          />
          {emailError && <span className="text-red-500 text-[12px] font-medium font-[family-name:var(--font-inter)]">{emailError}</span>}
        </div>

        {/* Password Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError && e.target.value) setPasswordError('');
              }}
              onBlur={handlePasswordBlur}
              className={`w-full bg-[#1a1c1c] border ${passwordError ? 'border-red-500 focus:border-red-500' : 'border-[#333535] focus:border-[#a1d800]'} rounded-xl pl-4 pr-12 py-[14px] text-[#ffffff] text-[15px] placeholder:text-[#474746] transition-colors duration-200 outline-none font-[family-name:var(--font-inter)]`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8d9479] hover:text-[#b8f600] transition-colors cursor-pointer flex items-center justify-center"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {passwordError && <span className="text-red-500 text-[12px] font-medium font-[family-name:var(--font-inter)]">{passwordError}</span>}
        </div>

        {/* Forgot Password */}
        <div className="flex justify-end mt-1">
          <button
            onClick={() => {
              setIsForgotPassword(true);
              setResetSuccess(false);
              setResetError('');
              setResetEmailError('');
            }}
            className="text-[13px] leading-[16px] tracking-tight font-bold text-[#b8f600] font-[family-name:var(--font-geist-sans)] hover:underline cursor-pointer"
          >
            Forgot Password?
          </button>
        </div>

        {/* Error Message Toast */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-[13px] font-medium text-center font-[family-name:var(--font-inter)] py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Login Action */}
        <div className="mt-2">
          <button
            onClick={handleLogin}
            disabled={!isFormValid || loading || authLoading || googleLoading}
            className="w-full bg-[#b8f600] text-[#141f00] py-[14px] rounded-full text-[16px] font-bold font-[family-name:var(--font-geist-sans)] tracking-[-0.01em] active:scale-[0.98] transition-all duration-150 flex justify-center items-center disabled:opacity-50 disabled:bg-[#434933] disabled:text-[#8d9479] disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Login'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 h-px bg-[#333535]"></div>
          <span className="px-4 text-[13px] text-[#474746] font-medium font-[family-name:var(--font-inter)]">Or continue with</span>
          <div className="flex-1 h-px bg-[#333535]"></div>
        </div>

        {/* Google Sign-In */}
        <div>
          <button
            onClick={handleGoogleLogin}
            disabled={loading || authLoading || googleLoading}
            className="w-full bg-[#1a1c1c] border border-[#333535] hover:bg-[#252828] text-[#ffffff] py-[14px] rounded-full text-[15px] font-bold font-[family-name:var(--font-geist-sans)] tracking-[-0.01em] active:scale-[0.98] transition-all duration-150 flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {googleLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>
        </div>
      </section>

      {/* Forgot Password Modal */}
      {isForgotPassword && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-[24px]">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-fade-in cursor-pointer"
            onClick={() => {
              setIsForgotPassword(false);
              setResetSuccess(false);
              setResetError('');
              setResetEmailError('');
            }}
          />
          
          {/* Modal Card */}
          <div className="bg-[#1a1c1c] border border-[#333535] rounded-2xl p-6 w-full max-w-[340px] z-10 shadow-2xl relative animate-scale-in flex flex-col">
            {/* Close Cross Icon */}
            <button
              onClick={() => {
                setIsForgotPassword(false);
                setResetSuccess(false);
                setResetError('');
                setResetEmailError('');
              }}
              className="absolute top-4 right-4 text-[#c3caac] hover:text-white transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#252828]"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            {/* Title & Subtext */}
            <div className="mb-6 flex flex-col items-center text-center">
              <h2 className="font-bold text-[20px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] mb-2">
                Reset Password
              </h2>
              <p className="text-[13px] text-[#c3caac] font-[family-name:var(--font-inter)] leading-relaxed">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            {resetSuccess ? (
              <div className="flex flex-col items-center text-center py-4 animate-scale-in">
                <span className="material-symbols-outlined text-[#b8f600] text-[48px] mb-4">
                  check_circle
                </span>
                <p className="text-[14px] leading-[22px] text-[#ffffff] font-semibold font-[family-name:var(--font-inter)]">
                  Reset link sent! Check your inbox and spam folder.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Email Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] leading-[16px] tracking-[0.05em] font-bold text-[#c3caac] uppercase font-[family-name:var(--font-geist-sans)]">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (resetEmailError) setResetEmailError('');
                      if (resetError) setResetError('');
                    }}
                    className={`w-full bg-[#121414] border ${resetEmailError || resetError ? 'border-red-500 focus:border-red-500' : 'border-[#333535] focus:border-[#a1d800]'} rounded-xl px-4 py-[12px] text-[#ffffff] text-[15px] placeholder:text-[#474746] transition-colors duration-200 outline-none font-[family-name:var(--font-inter)]`}
                    placeholder="name@example.com"
                  />
                  {(resetEmailError || resetError) && (
                    <span className="text-red-500 text-[12px] font-medium font-[family-name:var(--font-inter)]">
                      {resetEmailError || resetError}
                    </span>
                  )}
                </div>

                {/* Send Button */}
                <div className="mt-2">
                  <button
                    onClick={handleSendResetLink}
                    disabled={resetLoading}
                    className="w-full bg-[#b8f600] text-[#141f00] py-[12px] rounded-full text-[15px] font-bold font-[family-name:var(--font-geist-sans)] tracking-[-0.01em] active:scale-[0.98] transition-all duration-150 flex justify-center items-center cursor-pointer disabled:opacity-50 disabled:bg-[#434933] disabled:text-[#8d9479] disabled:cursor-not-allowed"
                  >
                    {resetLoading ? (
                      <svg className="animate-spin h-5 w-5 text-[#141f00]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : 'Send Reset Link'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
