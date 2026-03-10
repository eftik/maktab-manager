import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  toShamsi, toGregorian, formatShamsi, getShamsiMonthDays,
  getShamsiFirstDayOfWeek, shamsiMonths, weekDays
} from '@/lib/shamsi';
import type { Language } from '@/types';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';

interface ShamsiDatePickerProps {
  value?: string; // ISO date string
  onChange: (isoDate: string) => void;
  placeholder?: string;
  className?: string;
}

const ShamsiDatePicker = ({ value, onChange, placeholder, className }: ShamsiDatePickerProps) => {
  const { lang, dir } = useLanguage();
  const [open, setOpen] = useState(false);

  const today = toShamsi(new Date());
  const selected = value ? toShamsi(new Date(value)) : null;
  const [viewYear, setViewYear] = useState(selected?.year || today.year);
  const [viewMonth, setViewMonth] = useState(selected?.month || today.month);

  const daysInMonth = getShamsiMonthDays(viewYear, viewMonth);
  const firstDay = getShamsiFirstDayOfWeek(viewYear, viewMonth);

  const handlePrev = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const handleNext = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const handleSelect = (day: number) => {
    const greg = toGregorian(viewYear, viewMonth, day);
    onChange(greg.toISOString().split('T')[0]);
    setOpen(false);
  };

  const isSelected = (day: number) =>
    selected && selected.year === viewYear && selected.month === viewMonth && selected.day === day;

  const isToday = (day: number) =>
    today.year === viewYear && today.month === viewMonth && today.day === day;

  const displayValue = value ? formatShamsi(value, lang) : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground text-left",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon size={16} className="text-muted-foreground shrink-0" />
          <span className="flex-1">{displayValue || placeholder || (lang !== 'en' ? 'تاریخ انتخاب کنید' : 'Select date')}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 pointer-events-auto" dir={dir}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={handlePrev} type="button" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              {dir === 'rtl' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
            <span className="text-sm font-semibold text-foreground">
              {shamsiMonths[lang][viewMonth - 1]} {viewYear}
            </span>
            <button onClick={handleNext} type="button" className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
              {dir === 'rtl' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          {/* Week days */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays[lang].map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
              <button
                key={day}
                type="button"
                onClick={() => handleSelect(day)}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-medium transition-colors",
                  isSelected(day) && "bg-primary text-primary-foreground",
                  isToday(day) && !isSelected(day) && "bg-accent text-accent-foreground font-bold",
                  !isSelected(day) && !isToday(day) && "hover:bg-muted text-foreground"
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ShamsiDatePicker;
