'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/context/AuthContext';
import { Transaction } from '@/lib/types';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

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

const parseToLocalDate = (dateVal: string | Date) => {
  const dateStr = typeof dateVal === 'string' ? dateVal : dateVal.toISOString();
  const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [yr, mo, dy] = cleanDate.split('-');
  return new Date(Number(yr), Number(mo) - 1, Number(dy));
};

type TabType = 'Weekly' | 'Monthly' | 'Yearly';

export default function StatsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('Weekly');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
        setTransactions(txs);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllTransactions();
  }, [user]);

  // Compute stats based on selected tab
  const stats = useMemo(() => {
    const expenses = transactions.filter(t => t.type !== 'Income');
    const now = new Date();
    
    // Determine the current period boundaries
    let currentStart = new Date();
    let currentEnd = new Date();
    let prevStart = new Date();
    let prevEnd = new Date();

    if (activeTab === 'Weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      
      currentStart = new Date(now.getFullYear(), now.getMonth(), diff);
      currentStart.setHours(0, 0, 0, 0);
      
      currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 6);
      currentEnd.setHours(23, 59, 59, 999);
      
      prevEnd = new Date(currentStart);
      prevEnd.setMilliseconds(-1);
      
      prevStart = new Date(currentStart);
      prevStart.setDate(prevStart.getDate() - 7);
    } else if (activeTab === 'Monthly') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentStart.setHours(0, 0, 0, 0);
      
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      currentEnd.setHours(23, 59, 59, 999);
      
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevStart.setHours(0, 0, 0, 0);
      
      prevEnd = new Date(currentStart);
      prevEnd.setMilliseconds(-1);
    } else if (activeTab === 'Yearly') {
      currentStart = new Date(now.getFullYear(), 0, 1);
      currentStart.setHours(0, 0, 0, 0);
      
      currentEnd = new Date(now.getFullYear(), 11, 31);
      currentEnd.setHours(23, 59, 59, 999);
      
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevStart.setHours(0, 0, 0, 0);
      
      prevEnd = new Date(currentStart);
      prevEnd.setMilliseconds(-1);
    }

    // Filter current and previous period expenses
    const currentExpenses = expenses.filter(t => {
      const d = parseToLocalDate(t.date);
      return d >= currentStart && d <= currentEnd;
    });

    const prevExpenses = expenses.filter(t => {
      const d = parseToLocalDate(t.date);
      return d >= prevStart && d < prevEnd;
    });

    const totalSpend = currentExpenses.reduce((acc, t) => acc + t.amount, 0);
    const prevSpend = prevExpenses.reduce((acc, t) => acc + t.amount, 0);

    const percentChange = prevSpend === 0 ? 0 : ((totalSpend - prevSpend) / prevSpend) * 100;

    // Generate Chart Data
    let chartData: any[] = [];
    if (activeTab === 'Weekly') {
      chartData = [
        { name: 'Mon', Need: 0, Want: 0 }, { name: 'Tue', Need: 0, Want: 0 },
        { name: 'Wed', Need: 0, Want: 0 }, { name: 'Thu', Need: 0, Want: 0 },
        { name: 'Fri', Need: 0, Want: 0 }, { name: 'Sat', Need: 0, Want: 0 },
        { name: 'Sun', Need: 0, Want: 0 },
      ];
      currentExpenses.forEach(t => {
        let dayIdx = parseToLocalDate(t.date).getDay() - 1;
        if (dayIdx === -1) dayIdx = 6;
        if (dayIdx >= 0 && dayIdx <= 6) {
          chartData[dayIdx][t.type] += t.amount;
        }
      });
    } else if (activeTab === 'Monthly') {
      chartData = [
        { name: 'Week 1', Need: 0, Want: 0 }, { name: 'Week 2', Need: 0, Want: 0 },
        { name: 'Week 3', Need: 0, Want: 0 }, { name: 'Week 4', Need: 0, Want: 0 },
      ];
      currentExpenses.forEach(t => {
        const d = parseToLocalDate(t.date);
        let weekIdx = Math.floor((d.getDate() - 1) / 7);
        if (weekIdx > 3) weekIdx = 3;
        chartData[weekIdx][t.type] += t.amount;
      });
    } else if (activeTab === 'Yearly') {
      chartData = [
        { name: 'Jan', Need: 0, Want: 0 }, { name: 'Feb', Need: 0, Want: 0 },
        { name: 'Mar', Need: 0, Want: 0 }, { name: 'Apr', Need: 0, Want: 0 },
        { name: 'May', Need: 0, Want: 0 }, { name: 'Jun', Need: 0, Want: 0 },
        { name: 'Jul', Need: 0, Want: 0 }, { name: 'Aug', Need: 0, Want: 0 },
        { name: 'Sep', Need: 0, Want: 0 }, { name: 'Oct', Need: 0, Want: 0 },
        { name: 'Nov', Need: 0, Want: 0 }, { name: 'Dec', Need: 0, Want: 0 },
      ];
      currentExpenses.forEach(t => {
        chartData[parseToLocalDate(t.date).getMonth()][t.type] += t.amount;
      });
    }

    // Generate Category Breakdown
    const categoryTotals: Record<string, { amount: number, type: string }> = {};
    currentExpenses.forEach(t => {
      if (!categoryTotals[t.category]) categoryTotals[t.category] = { amount: 0, type: t.type };
      categoryTotals[t.category].amount += t.amount;
    });

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([cat, { amount, type }]) => ({ 
        category: cat, 
        amount, 
        type, 
        percent: totalSpend ? (amount / totalSpend) * 100 : 0 
      }))
      .sort((a, b) => b.amount - a.amount);

    return { totalSpend, percentChange, chartData, categoryBreakdown };
  }, [transactions, activeTab]);

  return (
    <main className="px-[20px] pt-8 pb-32 max-w-[390px] mx-auto w-full relative">
      {/* Header */}
      <header className="flex justify-between items-center w-full mb-6">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="w-12 h-12 rounded-full overflow-hidden border border-[#434933] bg-[#1A1A1A] flex items-center justify-center hover:border-[#a1d800] transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[#a1d800] text-2xl">person</span>
          </Link>
          <h1 className="font-semibold text-[24px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">
            Analytics
          </h1>
        </div>
        <Link href="/search" className="w-12 h-12 flex items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2C2C2E] hover:border-[#a1d800] transition-colors cursor-pointer">
          <span className="material-symbols-outlined text-[#a1d800]">search</span>
        </Link>
      </header>

      {/* Tab Switcher */}
      <div className="flex bg-[#1a1c1c] p-1 rounded-xl border border-[#434933] mb-8">
        {['Weekly', 'Monthly', 'Yearly'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as TabType)}
            className={`flex-1 py-2 text-center rounded-lg text-[12px] leading-[16px] tracking-[0.05em] font-bold uppercase transition-colors font-[family-name:var(--font-geist-sans)] cursor-pointer ${
              activeTab === tab ? 'bg-[#a1d800] text-[#141f00]' : 'text-[#c3caac]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="h-24 bg-[#1a1c1c] rounded-2xl"></div>
          <div className="h-64 bg-[#1a1c1c] rounded-2xl"></div>
          <div className="h-20 bg-[#1a1c1c] rounded-2xl"></div>
        </div>
      ) : (
        <>
          {/* Total Spending & Chart */}
          <div className="mb-10">
            <p className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-[#c3caac] uppercase mb-1 font-[family-name:var(--font-geist-sans)]">
              TOTAL SPENDING
            </p>
            <div className="flex items-baseline gap-3 mb-6">
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-[32px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">₹</span>
                <span className="font-bold text-[36px] leading-[1.1] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight">
                  {stats.totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {stats.percentChange !== 0 && (
                <span className="px-2 py-1 rounded-full text-[12px] font-bold font-[family-name:var(--font-geist-sans)] flex items-center text-[#a1d800] bg-[#a1d800]/10">
                  {stats.percentChange > 0 ? '+' : ''}{stats.percentChange.toFixed(0)}%
                </span>
              )}
            </div>

            <div className="bg-[#1a1c1c] border border-[#2C2C2E] rounded-2xl p-4 pt-6 outline-none focus:outline-none" tabIndex={-1}>
              <div className="h-[200px] w-full outline-none focus:outline-none">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none">
                    <BarChart data={stats.chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={activeTab === 'Yearly' ? 12 : 24}>
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#8d9479', fontSize: 10, fontFamily: 'var(--font-geist-sans)' }} 
                        dy={10} 
                      />
                      <Tooltip 
                        cursor={false} 
                        contentStyle={{ backgroundColor: '#121414', border: '1px solid #434933', borderRadius: '8px', padding: '8px 12px' }} 
                        itemStyle={{ color: '#ffffff', fontSize: '12px', fontFamily: 'var(--font-inter)' }} 
                        labelStyle={{ color: '#8d9479', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}
                      />
                      <Bar dataKey="Want" stackId="a" fill="#c3caac" activeBar={false} />
                      <Bar dataKey="Need" stackId="a" fill="#a1d800" radius={[4, 4, 0, 0]} activeBar={false} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              
              {/* Chart Legend */}
              <div className="flex items-center gap-6 mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#a1d800]"></div>
                  <span className="text-[12px] font-bold text-[#e2e2e2] font-[family-name:var(--font-geist-sans)]">Need</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#c3caac]"></div>
                  <span className="text-[12px] font-bold text-[#e2e2e2] font-[family-name:var(--font-geist-sans)]">Want</span>
                </div>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div>
            <h2 className="font-semibold text-[20px] text-[#ffffff] font-[family-name:var(--font-geist-sans)] tracking-tight mb-5">
              Category Breakdown
            </h2>
            
            {stats.categoryBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-[#1a1c1c] border border-[#2C2C2E] rounded-2xl border-dashed">
                <div className="w-12 h-12 bg-[#333535] rounded-full flex items-center justify-center mb-4 text-[#8d9479]">
                  <span className="material-symbols-outlined text-[24px]">bar_chart</span>
                </div>
                <h3 className="text-[14px] text-[#ffffff] font-semibold mb-1 font-[family-name:var(--font-geist-sans)]">No expenses</h3>
                <p className="text-[12px] text-[#c3caac] font-[family-name:var(--font-inter)]">No spending recorded for this period.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-[12px]">
                {stats.categoryBreakdown.map(item => {
                  const roundedPercent = stats.categoryBreakdown.length === 1 ? 100 : Math.round(item.percent);
                  return (
                    <div key={item.category} className="bg-[#1a1c1c] border border-[#2C2C2E] rounded-xl p-[16px] flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[#333535] flex items-center justify-center text-[#e2e2e2] border border-[#434933]">
                            <span className="material-symbols-outlined text-[22px]">{getCategoryIcon(item.category)}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[#ffffff] font-[family-name:var(--font-inter)] text-[16px] font-medium">{item.category}</span>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full border border-[#434933] text-[9px] font-bold tracking-widest text-[#8d9479] uppercase font-[family-name:var(--font-geist-sans)] max-w-min">
                              {item.type}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 mt-1">
                          <span className="text-[#ffffff] font-bold text-[16px] font-[family-name:var(--font-geist-sans)] tracking-tight">
                            ₹ {item.amount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[#a1d800] font-bold text-[14px] font-[family-name:var(--font-geist-sans)]">
                            {roundedPercent}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-[#333535] rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-[#a1d800] rounded-full transition-all duration-1000 ease-out" style={{ width: `${roundedPercent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
