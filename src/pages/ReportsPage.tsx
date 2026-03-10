import { useState, useMemo, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useData } from '@/contexts/DataContext';
import { FileText, Printer, Download, Users, TrendingUp, TrendingDown, DollarSign, AlertCircle, Calendar, PieChart, Upload, X, FileSpreadsheet, FileDown } from 'lucide-react';
import { fmtAFN, toCSV, downloadFile, printHTML } from '@/lib/helpers';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toShamsi, formatShamsiMonth, getShamsiMonthsRange, toGregorian, getCurrentShamsiDate, formatShamsi } from '@/lib/shamsi';
import type { FeeType, ExpenseCategory } from '@/types';
import * as XLSX from 'xlsx';

interface ExcelRow {
  [key: string]: string | number | undefined;
}

interface ImportedReportData {
  fileName: string;
  headers: string[];
  rows: ExcelRow[];
  summary: { label: string; value: string | number }[];
}

type PeriodType = 'monthly' | 'quarterly' | 'yearly' | 'custom' | 'all';

const ReportsPage = () => {
  const { t, lang } = useLanguage();
  const { schools, students, payments, expenses, staffList } = useData();
  const [schoolFilter, setSchoolFilter] = useState('');
  const [importedData, setImportedData] = useState<ImportedReportData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Period state
  const now = getCurrentShamsiDate();
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(now.month);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil(now.month / 3));
  const [selectedYear, setSelectedYear] = useState(now.year);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Compute date range based on period selection
  const dateRange = useMemo((): { start: Date; end: Date } | null => {
    if (periodType === 'all') return null;
    
    if (periodType === 'monthly') {
      const start = toGregorian(selectedYear, selectedMonth, 1);
      const lastDay = selectedMonth <= 6 ? 31 : selectedMonth <= 11 ? 30 : 29;
      const end = toGregorian(selectedYear, selectedMonth, lastDay);
      return { start, end };
    }
    
    if (periodType === 'quarterly') {
      const startMonth = (selectedQuarter - 1) * 3 + 1;
      const endMonth = selectedQuarter * 3;
      const start = toGregorian(selectedYear, startMonth, 1);
      const lastDay = endMonth <= 6 ? 31 : endMonth <= 11 ? 30 : 29;
      const end = toGregorian(selectedYear, endMonth, lastDay);
      return { start, end };
    }
    
    if (periodType === 'yearly') {
      const start = toGregorian(selectedYear, 1, 1);
      const end = toGregorian(selectedYear, 12, 29);
      return { start, end };
    }
    
    if (periodType === 'custom' && customFrom && customTo) {
      return { start: new Date(customFrom), end: new Date(customTo) };
    }
    
    return null;
  }, [periodType, selectedMonth, selectedQuarter, selectedYear, customFrom, customTo]);

  // Filter by date range
  const isInRange = (dateStr: string) => {
    if (!dateRange) return true;
    const d = new Date(dateStr);
    return d >= dateRange.start && d <= dateRange.end;
  };

  // --- Excel Import Logic ---
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: '' });
      if (jsonData.length === 0) return;
      const headers = Object.keys(jsonData[0]);
      const numericCols = headers.filter(h => jsonData.some(row => {
        const v = row[h];
        return typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== '');
      }));
      const summary = numericCols.map(col => ({
        label: col,
        value: jsonData.reduce((sum, row) => sum + (isNaN(Number(row[col])) ? 0 : Number(row[col])), 0),
      }));
      summary.unshift({ label: t('totalStudents'), value: jsonData.length });
      setImportedData({ fileName: file.name, headers, rows: jsonData, summary });
    };
    reader.readAsBinaryString(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  // Filter data by school AND date range
  const filteredPayments = useMemo(() => {
    let fp = schoolFilter ? payments.filter(p => p.schoolId === schoolFilter) : payments;
    return fp.filter(p => isInRange(p.date));
  }, [payments, schoolFilter, dateRange]);
  
  const filteredExpenses = useMemo(() => {
    let fe = schoolFilter ? expenses.filter(e => e.schoolId === schoolFilter) : expenses;
    return fe.filter(e => isInRange(e.date));
  }, [expenses, schoolFilter, dateRange]);
  
  const filteredStudents = useMemo(() => 
    schoolFilter ? students.filter(s => s.schoolId === schoolFilter) : students,
  [students, schoolFilter]);

  // Basic stats
  const stats = useMemo(() => {
    const income = filteredPayments.reduce((s, p) => s + p.finalAmount, 0);
    const totalExp = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    return {
      totalStudents: filteredStudents.filter(s => s.status === 'active').length,
      income, totalExp, netProfit: income - totalExp,
    };
  }, [filteredStudents, filteredPayments, filteredExpenses]);

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number; month: string }> = {};
    filteredPayments.forEach(p => {
      const { year, month } = toShamsi(new Date(p.date));
      const key = `${year}-${month}`;
      if (!months[key]) months[key] = { income: 0, expenses: 0, month: formatShamsiMonth(year, month, lang) };
      months[key].income += p.finalAmount;
    });
    filteredExpenses.forEach(e => {
      const { year, month } = toShamsi(new Date(e.date));
      const key = `${year}-${month}`;
      if (!months[key]) months[key] = { income: 0, expenses: 0, month: formatShamsiMonth(year, month, lang) };
      months[key].expenses += e.amount;
    });
    return Object.entries(months).sort(([a], [b]) => b.localeCompare(a)).slice(0, 12).map(([, data]) => data);
  }, [filteredPayments, filteredExpenses, lang]);

  // Fee type breakdown
  const feeTypeData = useMemo(() => {
    const types: Record<FeeType, number> = { tuition: 0, transportation: 0, registration: 0, other: 0 };
    filteredPayments.forEach(p => { types[p.feeType] += p.finalAmount; });
    return [
      { type: t('tuition'), amount: types.tuition, color: 'bg-blue-500' },
      { type: t('transportation'), amount: types.transportation, color: 'bg-teal-500' },
      { type: t('registration'), amount: types.registration, color: 'bg-purple-500' },
    ];
  }, [filteredPayments, t]);

  // Expense category breakdown
  const expenseCategoryData = useMemo(() => {
    const cats: Record<ExpenseCategory, number> = { salary: 0, electricity: 0, rent: 0, maintenance: 0, supplies: 0, other: 0 };
    filteredExpenses.forEach(e => { cats[e.category] += e.amount; });
    const catColors: Record<ExpenseCategory, string> = {
      salary: 'bg-red-500', electricity: 'bg-yellow-500', rent: 'bg-orange-500',
      maintenance: 'bg-indigo-500', supplies: 'bg-pink-500', other: 'bg-gray-500',
    };
    return Object.entries(cats).filter(([, amount]) => amount > 0).map(([cat, amount]) => ({
      category: t(cat as ExpenseCategory), amount, color: catColors[cat as ExpenseCategory],
    }));
  }, [filteredExpenses, t]);

  // Unpaid fees summary
  const unpaidSummary = useMemo(() => {
    const activeStudents = filteredStudents.filter(s => s.status === 'active');
    let totalUnpaid = 0, studentsWithUnpaid = 0;
    const feeTypes: FeeType[] = ['tuition', 'transportation', 'registration'];
    activeStudents.forEach(student => {
      const sp = filteredPayments.filter(p => p.studentId === student.id);
      const monthsRange = getShamsiMonthsRange(student.entryDate);
      let hasUnpaid = false;
      feeTypes.forEach(ft => {
        monthsRange.forEach(({ year, month }) => {
          const paid = sp.some(p => p.feeType === ft && toShamsi(new Date(p.date)).year === year && toShamsi(new Date(p.date)).month === month);
          if (!paid) { hasUnpaid = true; totalUnpaid += ft === 'tuition' ? 5000 : ft === 'transportation' ? 1500 : 500; }
        });
      });
      if (hasUnpaid) studentsWithUnpaid++;
    });
    return { totalUnpaid, studentsWithUnpaid, totalActive: activeStudents.length };
  }, [filteredStudents, filteredPayments]);

  const cards = [
    { label: t('totalStudents'), value: stats.totalStudents, icon: Users, color: 'bg-blue-500' },
    { label: t('totalIncome'), value: fmtAFN(stats.income), icon: TrendingUp, color: 'bg-teal-500' },
    { label: t('totalExpenses'), value: fmtAFN(stats.totalExp), icon: TrendingDown, color: 'bg-orange-500' },
    { label: t('netProfit'), value: fmtAFN(stats.netProfit), icon: DollarSign, color: stats.netProfit >= 0 ? 'bg-green-600' : 'bg-red-600' },
  ];

  const handleExportCsv = () => {
    const csv = toCSV(['Metric', 'Value'], [
      ['Students', String(stats.totalStudents)], ['Income', String(stats.income)],
      ['Expenses', String(stats.totalExp)], ['Profit', String(stats.netProfit)]
    ]);
    downloadFile(csv, 'report.csv');
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Summary ──
    const summaryData = [
      ['School', t('totalStudents'), t('totalIncome'), t('totalExpenses'), t('netProfit')],
      ...schools.map(school => {
        const schoolStudents = students.filter(s => s.schoolId === school.id && s.status === 'active');
        const schoolPayments = payments.filter(p => p.schoolId === school.id);
        const income = schoolPayments.reduce((s, p) => s + p.finalAmount, 0);
        const exp = expenses.filter(e => e.schoolId === school.id).reduce((s, e) => s + e.amount, 0);
        return [school.name, schoolStudents.length, income, exp, income - exp];
      }),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

    // ── Sheet 2: Students by Grade/Section ──
    const gradeData: (string | number)[][] = [
      [t('school'), t('gradeSection' as any), t('studentsCount' as any), t('monthlyFee' as any)],
    ];
    schools.forEach(school => {
      const gradeMap = new Map<string, number>();
      students.filter(s => s.schoolId === school.id && s.status === 'active').forEach(s => {
        const key = s.grade || 'Unassigned';
        gradeMap.set(key, (gradeMap.get(key) || 0) + 1);
      });
      Array.from(gradeMap.entries()).sort().forEach(([grade, count]) => {
        gradeData.push([school.name, grade, count, '']);
      });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(gradeData), 'Grade Summary');

    // ── Sheet 3: All Students ──
    const studentRows = [
      [t('name'), t('idNumber'), t('grade'), t('school'), t('parentName'), t('parentPhone'), t('monthlyFee' as any), t('discountType'), t('entryDate'), t('status')],
      ...students.map(s => {
        const school = schools.find(sc => sc.id === s.schoolId);
        return [s.name, s.idNumber, s.grade, school?.name || '', s.parentName, s.parentPhone, s.monthlyFee || 0, s.discountType, s.entryDate, s.status];
      }),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(studentRows), 'Students');

    // ── Sheet 4: Payment Records per Month ──
    const payRows: (string | number)[][] = [
      [t('student'), t('school'), t('grade'), t('feeType'), t('amount'), t('discount'), t('finalAmount'), t('date'), t('billNumber'), t('note')],
    ];
    payments
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach(p => {
        const student = students.find(s => s.id === p.studentId);
        const school = schools.find(s => s.id === p.schoolId);
        const { year, month } = toShamsi(new Date(p.date));
        payRows.push([
          student?.name || '', school?.name || '', student?.grade || '',
          p.feeType, p.amount, p.discount, p.finalAmount,
          formatShamsiMonth(year, month, lang), p.billNumber, p.note,
        ]);
      });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(payRows), 'Payment Records');

    // ── Sheet 5: Staff Salary Payments ──
    const staffPayRows: (string | number)[][] = [
      [t('name'), t('role'), t('school'), t('salary'), t('date'), t('description')],
    ];
    expenses
      .filter(e => e.category === 'salary')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach(e => {
        const school = schools.find(s => s.id === e.schoolId);
        const staffMember = staffList.find(st => st.id === e.staffId);
        staffPayRows.push([
          e.personName || staffMember?.name || '', staffMember?.role || '', school?.name || '',
          e.amount, formatShamsi(e.date, lang), e.description,
        ]);
      });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(staffPayRows), 'Staff Payments');

    XLSX.writeFile(wb, `school-report-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Maktab Manager - Financial Report', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    // Summary table
    autoTable(doc, {
      startY: 35,
      head: [['Metric', 'Value']],
      body: [
        ['Active Students', String(stats.totalStudents)],
        ['Total Income', fmtAFN(stats.income)],
        ['Total Expenses', fmtAFN(stats.totalExp)],
        ['Net Profit/Loss', fmtAFN(stats.netProfit)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Monthly breakdown
    if (monthlyData.length > 0) {
      const lastY = (doc as any).lastAutoTable?.finalY || 70;
      autoTable(doc, {
        startY: lastY + 10,
        head: [['Month', 'Income', 'Expenses', 'Profit/Loss']],
        body: monthlyData.map(m => [
          m.month,
          fmtAFN(m.income),
          fmtAFN(m.expenses),
          fmtAFN(m.income - m.expenses),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
      });
    }

    doc.save(`financial-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    let extraHTML = '';
    if (importedData) {
      extraHTML = `<h2 style="margin-top:24px">📁 ${importedData.fileName}</h2>
        <table><thead><tr>${importedData.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${importedData.rows.slice(0, 50).map(r => `<tr>${importedData.headers.map(h => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
    printHTML(t('monthlyReport'), `
      <h1>📊 ${t('monthlyReport')}</h1>
      <div class="row"><span>${t('totalStudents')}</span><span>${stats.totalStudents}</span></div>
      <div class="row"><span>${t('totalIncome')}</span><span>${fmtAFN(stats.income)}</span></div>
      <div class="row"><span>${t('totalExpenses')}</span><span>${fmtAFN(stats.totalExp)}</span></div>
      <div class="row"><strong>${t('netProfit')}</strong><strong>${fmtAFN(stats.netProfit)}</strong></div>
      <h2 style="margin-top:24px">📅 ${t('monthlyBreakdown')}</h2>
      <table><thead><tr><th>${t('month')}</th><th>${t('income')}</th><th>${t('expenses')}</th><th>${t('profit')}</th></tr></thead>
      <tbody>${monthlyData.map(m => `<tr><td>${m.month}</td><td>${fmtAFN(m.income)}</td><td>${fmtAFN(m.expenses)}</td><td>${fmtAFN(m.income - m.expenses)}</td></tr>`).join('')}</tbody></table>
      ${extraHTML}
    `);
  };

  const totalFeeAmount = feeTypeData.reduce((s, f) => s + f.amount, 0);
  const totalExpenseAmount = expenseCategoryData.reduce((s, e) => s + e.amount, 0);

  // Available years for selectors
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    [...payments, ...expenses].forEach(item => {
      const { year } = toShamsi(new Date((item as any).date));
      years.add(year);
    });
    if (years.size === 0) years.add(now.year);
    return Array.from(years).sort((a, b) => b - a);
  }, [payments, expenses]);

  const shamsiMonthNames = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => formatShamsiMonth(selectedYear, i + 1, lang));
  }, [selectedYear, lang]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-foreground">{t('reports')}</h2>
        <label className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-xs font-medium cursor-pointer active:scale-95 transition-transform">
          <Upload size={16} />
          {t('importExcel')}
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
        </label>
      </div>

      {/* School Filter */}
      <select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">
        <option value="">{t('allSchools')}</option>
        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {/* Period Selector */}
      <div className="bg-card border border-border rounded-2xl p-3 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('period')}</p>
        
        {/* Period type buttons */}
        <div className="grid grid-cols-5 gap-1.5">
          {(['all', 'monthly', 'quarterly', 'yearly', 'custom'] as PeriodType[]).map(type => (
            <button
              key={type}
              onClick={() => setPeriodType(type)}
              className={`py-2 px-1 rounded-xl text-[11px] font-medium transition-all active:scale-95 ${
                periodType === type
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {t(type === 'all' ? 'allTime' : type)}
            </button>
          ))}
        </div>

        {/* Period-specific selectors */}
        {periodType === 'monthly' && (
          <div className="grid grid-cols-2 gap-2">
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground">
              {shamsiMonthNames.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
            </select>
          </div>
        )}

        {periodType === 'quarterly' && (
          <div className="grid grid-cols-2 gap-2">
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={selectedQuarter} onChange={e => setSelectedQuarter(Number(e.target.value))}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground">
              <option value={1}>{t('q1')}</option>
              <option value={2}>{t('q2')}</option>
              <option value={3}>{t('q3')}</option>
              <option value={4}>{t('q4')}</option>
            </select>
          </div>
        )}

        {periodType === 'yearly' && (
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground">
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}

        {periodType === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">{t('fromDate')}</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">{t('toDate')}</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Imported Excel Data */}
      {importedData && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between bg-primary/10 px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">{importedData.fileName}</span>
              <span className="text-xs text-muted-foreground">({importedData.rows.length} {t('rows')})</span>
            </div>
            <button onClick={() => setImportedData(null)} className="p-1 rounded-lg hover:bg-muted transition-colors">
              <X size={16} className="text-muted-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            {importedData.summary.map((item, i) => (
              <div key={i} className="bg-muted/50 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground truncate">{item.label}</p>
                <p className="text-sm font-bold text-foreground">
                  {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                </p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-start font-medium text-muted-foreground">#</th>
                  {importedData.headers.map(h => (
                    <th key={h} className="px-3 py-2 text-start font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importedData.rows.slice(0, 30).map((row, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    {importedData.headers.map(h => (
                      <td key={h} className="px-3 py-2 text-foreground whitespace-nowrap">{String(row[h] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {importedData.rows.length > 30 && (
              <p className="text-center text-xs text-muted-foreground py-2">+{importedData.rows.length - 30} {t('more')}...</p>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`${card.color} p-2.5 rounded-xl`}><card.icon size={20} className="text-white" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-lg font-bold text-foreground">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Unpaid Fees Alert */}
      {unpaidSummary.studentsWithUnpaid > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="bg-destructive p-2.5 rounded-xl"><AlertCircle size={20} className="text-white" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{t('unpaidFees')}</p>
              <p className="text-xs text-muted-foreground">{unpaidSummary.studentsWithUnpaid} / {unpaidSummary.totalActive} {t('students')}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-destructive">~{fmtAFN(unpaidSummary.totalUnpaid)}</p>
              <p className="text-xs text-muted-foreground">{t('estimated')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Tabs */}
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="monthly" className="text-xs gap-1"><Calendar size={14} /> {t('monthly')}</TabsTrigger>
          <TabsTrigger value="fees" className="text-xs gap-1"><TrendingUp size={14} /> {t('fees')}</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs gap-1"><PieChart size={14} /> {t('expenses')}</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-3 space-y-2">
          {monthlyData.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">{t('noData')}</p>
          ) : monthlyData.map((m, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-3">
              <p className="font-medium text-sm text-foreground mb-2">{m.month}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><p className="text-muted-foreground">{t('income')}</p><p className="font-semibold text-primary">{fmtAFN(m.income)}</p></div>
                <div><p className="text-muted-foreground">{t('expenses')}</p><p className="font-semibold text-destructive">{fmtAFN(m.expenses)}</p></div>
                <div><p className="text-muted-foreground">{t('profit')}</p><p className={`font-semibold ${m.income - m.expenses >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmtAFN(m.income - m.expenses)}</p></div>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="fees" className="mt-3 space-y-3">
          {feeTypeData.map((f, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{f.type}</span>
                <span className="text-sm font-bold text-foreground">{fmtAFN(f.amount)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${f.color} rounded-full transition-all`} style={{ width: totalFeeAmount > 0 ? `${(f.amount / totalFeeAmount) * 100}%` : '0%' }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{totalFeeAmount > 0 ? ((f.amount / totalFeeAmount) * 100).toFixed(1) : 0}%</p>
            </div>
          ))}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{t('total')}</span>
              <span className="text-lg font-bold text-primary">{fmtAFN(totalFeeAmount)}</span>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="mt-3 space-y-3">
          {expenseCategoryData.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">{t('noData')}</p>
          ) : expenseCategoryData.map((e, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{e.category}</span>
                <span className="text-sm font-bold text-foreground">{fmtAFN(e.amount)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${e.color} rounded-full transition-all`} style={{ width: totalExpenseAmount > 0 ? `${(e.amount / totalExpenseAmount) * 100}%` : '0%' }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{totalExpenseAmount > 0 ? ((e.amount / totalExpenseAmount) * 100).toFixed(1) : 0}%</p>
            </div>
          ))}
          {expenseCategoryData.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{t('total')}</span>
                <span className="text-lg font-bold text-destructive">{fmtAFN(totalExpenseAmount)}</span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Export Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={handleExportPdf} className="bg-red-600 text-white py-3 rounded-xl text-xs font-medium flex flex-col items-center gap-1">
          <FileDown size={18} />{t('exportPdf')}
        </button>
        <button onClick={handleExportExcel} className="bg-green-600 text-white py-3 rounded-xl text-xs font-medium flex flex-col items-center gap-1">
          <FileSpreadsheet size={18} />{t('exportExcel' as any)}
        </button>
        <button onClick={handlePrint} className="bg-primary text-primary-foreground py-3 rounded-xl text-xs font-medium flex flex-col items-center gap-1">
          <Printer size={18} />{t('printReport')}
        </button>
        <button onClick={handleExportCsv} className="bg-secondary text-secondary-foreground py-3 rounded-xl text-xs font-medium flex flex-col items-center gap-1">
          <Download size={18} />{t('exportCsv')}
        </button>
      </div>
    </div>
  );
};
export default ReportsPage;
