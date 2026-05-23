import React, { useState, useEffect, useRef } from 'react';

interface DateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (fromDate: string, toDate: string) => void;
  onCancel: () => void;
  initialFromDate?: string; // YYYY-MM-DD
  initialToDate?: string;   // YYYY-MM-DD
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function DateRangePicker({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  initialFromDate = '',
  initialToDate = ''
}: DateRangePickerProps) {
  const [fromDate, setFromDate] = useState<string>(initialFromDate);
  const [toDate, setToDate] = useState<string>(initialToDate);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse display/nav month based on selected fromDate or today's date
  const parseInitialDate = () => {
    if (initialFromDate) {
      const [y, m, d] = initialFromDate.split('-');
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    return new Date();
  };

  const initialRefDate = parseInitialDate();
  const [currentMonth, setCurrentMonth] = useState(initialRefDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialRefDate.getFullYear());

  useEffect(() => {
    if (isOpen) {
      setFromDate(initialFromDate);
      setToDate(initialToDate);
      const refDate = parseInitialDate();
      setCurrentMonth(refDate.getMonth());
      setCurrentYear(refDate.getFullYear());
    }
  }, [isOpen, initialFromDate, initialToDate]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const formatDateString = (year: number, month: number, day: number) => {
    const yyyy = year;
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleSelectDay = (dayNum: number) => {
    const clickedDateStr = formatDateString(currentYear, currentMonth, dayNum);

    if (!fromDate || (fromDate && toDate)) {
      // First tap, or starting a new range
      setFromDate(clickedDateStr);
      setToDate('');
    } else {
      // Second tap
      if (clickedDateStr < fromDate) {
        // If clicked date is earlier than From, reset and treat as new From date
        setFromDate(clickedDateStr);
        setToDate('');
      } else {
        setToDate(clickedDateStr);
      }
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  
  // Previous month days for padding
  const daysInPrevMonth = getDaysInMonth(
    currentMonth === 0 ? currentYear - 1 : currentYear,
    currentMonth === 0 ? 11 : currentMonth - 1
  );

  const today = new Date();
  const todayDateStr = formatDateString(today.getFullYear(), today.getMonth(), today.getDate());

  // Helper to format a YYYY-MM-DD string into "Month DD, YYYY"
  const formatReadable = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleConfirm = () => {
    if (fromDate && toDate) {
      onConfirm(fromDate, toDate);
    } else if (fromDate) {
      // If only fromDate is selected, treat it as single day range (From === To)
      onConfirm(fromDate, fromDate);
    }
  };

  const handleClearAndCancel = () => {
    setFromDate('');
    setToDate('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-md animate-fade-in" 
        onClick={onClose}
      ></div>

      {/* Picker Dialog Card */}
      <div 
        ref={containerRef}
        className="bg-[#1a1c1c] border border-[#434933] rounded-[24px] p-5 w-full max-w-[340px] z-10 shadow-2xl flex flex-col animate-scale-in"
      >
        {/* Header Selected Range Text */}
        <div className="flex flex-col items-center text-center border-b border-[#333535]/50 pb-4 mb-4">
          <span className="text-[10px] tracking-widest font-bold text-[#8d9479] uppercase font-[family-name:var(--font-geist-sans)] mb-1">
            Selected Range
          </span>
          <div className="text-[14px] font-semibold text-[#ffffff] font-[family-name:var(--font-inter)] flex items-center gap-1.5 min-h-[20px]">
            {fromDate ? (
              <>
                <span className="text-[#a1d800]">{formatReadable(fromDate)}</span>
                {toDate ? (
                  <>
                    <span className="text-[#8d9479] font-normal">to</span>
                    <span className="text-[#a1d800]">{formatReadable(toDate)}</span>
                  </>
                ) : (
                  <span className="text-[#8d9479] animate-pulse">→ Select end date…</span>
                )}
              </>
            ) : (
              <span className="text-[#8d9479]">Select date range…</span>
            )}
          </div>
        </div>

        {/* Month Selector Header */}
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={handlePrevMonth} 
            type="button"
            className="w-8 h-8 flex items-center justify-center text-[#c3caac] hover:bg-[#2C2C2E] rounded-full transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <div className="font-bold text-[#ffffff] text-[15px] font-[family-name:var(--font-geist-sans)] tracking-wide">
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
            <div key={day} className="text-center text-[#8d9479] text-[12px] font-semibold font-[family-name:var(--font-inter)] py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Grid of Calendar Days */}
        <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 mb-5">
          {/* Empty slots for prev month padding */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div 
              key={`prev-${i}`} 
              className="text-center py-1.5 text-[#474746]/50 text-[12px] font-[family-name:var(--font-inter)] select-none opacity-20"
            >
              {daysInPrevMonth - firstDay + i + 1}
            </div>
          ))}

          {/* Days of current month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayDateStr = formatDateString(currentYear, currentMonth, dayNum);

            const isStart = fromDate === dayDateStr;
            const isEnd = toDate === dayDateStr;
            const isBetween = fromDate && toDate && dayDateStr > fromDate && dayDateStr < toDate;
            const isSelected = isStart || isEnd;
            const isToday = dayDateStr === todayDateStr;

            let dayStyle = 'text-[#e2e2e2] hover:bg-[#333535] rounded-lg';
            if (isSelected) {
              dayStyle = 'bg-[#a1d800] text-[#141f00] font-bold rounded-lg shadow-[0_2px_8px_rgba(161,216,0,0.4)]';
            } else if (isBetween) {
              dayStyle = 'bg-[#a1d800]/15 text-[#a1d800] font-semibold rounded-md';
            }

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => handleSelectDay(dayNum)}
                className={`relative py-1.5 w-full flex items-center justify-center text-[13px] font-semibold font-[family-name:var(--font-inter)] transition-all cursor-pointer ${dayStyle}`}
              >
                {isToday && !isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-6 h-6 rounded-full border border-[#a1d800]/60 shadow-[0_0_8px_rgba(161,216,0,0.15)]"></div>
                  </div>
                )}
                <span className="relative z-10">{dayNum}</span>
              </button>
            );
          })}

          {/* Empty slots for next month padding */}
          {Array.from({ length: 42 - (firstDay + daysInMonth) }).map((_, i) => (
            <div 
              key={`next-${i}`} 
              className="text-center py-1.5 text-[#474746]/50 text-[12px] font-[family-name:var(--font-inter)] select-none opacity-20"
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full bg-[#a1d800] hover:bg-[#b8f600] text-[#141f00] font-bold py-3 rounded-xl transition-all shadow-[0_4px_12px_rgba(161,216,0,0.2)] font-[family-name:var(--font-geist-sans)] tracking-wide active:scale-[0.98] cursor-pointer"
          >
            Confirm
          </button>
          
          <button
            type="button"
            onClick={handleClearAndCancel}
            className="w-full text-center py-2 text-[#ffb4ab] hover:underline text-[12px] font-bold tracking-wider uppercase font-[family-name:var(--font-geist-sans)] cursor-pointer"
          >
            Cancel Selection
          </button>
        </div>
      </div>
    </div>
  );
}
