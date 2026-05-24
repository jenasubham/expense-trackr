import React, { useState, useRef, useEffect } from 'react';

interface CustomDatePickerProps {
  date: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CustomDatePicker({ date, onChange }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [yearStr, monthStr, dayStr] = date.split('-');
  const selectedDate = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
  
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSelectDate = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    // Format YYYY-MM-DD
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Previous month days for padding
  const daysInPrevMonth = getDaysInMonth(currentMonth === 0 ? currentYear - 1 : currentYear, currentMonth === 0 ? 11 : currentMonth - 1);

  const displayDate = selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const today = new Date();
  const todayDateStr = mounted
    ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    : '';

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#1a1c1c] border ${isOpen ? 'border-[#a1d800]' : 'border-[#434933]'} rounded-xl py-3 px-4 text-left text-[14px] text-[#ffffff] outline-none font-[family-name:var(--font-inter)] flex justify-between items-center transition-colors cursor-pointer`}
      >
        <span>{displayDate}</span>
        <span className="material-symbols-outlined text-[#c3caac] text-[20px]">event</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[260px] bg-[#1a1c1c] border border-[#333535] rounded-2xl p-4 shadow-2xl z-50 animate-fade-in">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={handlePrevMonth} 
              type="button"
              className="w-8 h-8 flex items-center justify-center text-[#c3caac] hover:bg-[#2C2C2E] rounded-full transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <div className="font-bold text-[#ffffff] text-[15px] font-[family-name:var(--font-geist-sans)]">
              {MONTHS[currentMonth]} {currentYear}
            </div>
            <button 
              onClick={handleNextMonth} 
              type="button"
              className="w-8 h-8 flex items-center justify-center text-[#c3caac] hover:bg-[#2C2C2E] rounded-full transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(day => (
              <div key={day} className="text-center text-[#8d9479] text-[12px] font-medium font-[family-name:var(--font-inter)] py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots for prev month */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="text-center py-1.5 text-[#474746] text-[13px] font-[family-name:var(--font-inter)]">
                {daysInPrevMonth - firstDay + i + 1}
              </div>
            ))}
            
            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = 
                selectedDate.getDate() === dayNum && 
                selectedDate.getMonth() === currentMonth && 
                selectedDate.getFullYear() === currentYear;
              
              const dayDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = dayDateStr === todayDateStr;
                
              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDate(dayNum)}
                  className={`relative py-1.5 w-full flex items-center justify-center rounded-lg text-[13px] font-bold font-[family-name:var(--font-inter)] transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-[#a1d800] text-[#141f00] font-bold rounded-lg shadow-[0_2px_8px_rgba(161,216,0,0.4)]' 
                      : 'text-[#e2e2e2] hover:bg-[#333535]'
                  }`}
                >
                  {isToday && !isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-6 h-6 rounded-full border border-[#a1d800]/60 shadow-[0_0_8px_rgba(161,216,0,0.2)]"></div>
                    </div>
                  )}
                  <span className="relative z-10">{dayNum}</span>
                </button>
              );
            })}
            
            {/* Empty slots for next month */}
            {Array.from({ length: 42 - (firstDay + daysInMonth) }).map((_, i) => (
              <div key={`next-empty-${i}`} className="text-center py-1.5 text-[#474746] text-[13px] font-[family-name:var(--font-inter)]">
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
