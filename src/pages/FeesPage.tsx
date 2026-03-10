import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useData } from '@/contexts/DataContext';
import type { Payment, FeeType } from '@/types';
import { Plus, Search, Edit2, Trash2, X, FileText, MessageCircle, ChevronDown, ChevronUp, ChevronsUpDown, Check, Printer, ChevronRight } from 'lucide-react';
import ShamsiDatePicker from '@/components/ShamsiDatePicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { formatShamsi, toShamsi, formatShamsiMonth } from '@/lib/shamsi';
import { fmtAFN, printHTML, toWestern, parseNumInput, numDisplay } from '@/lib/helpers';
import ConfirmDialog from '@/components/ConfirmDialog';

const feeTypes: FeeType[] = ['tuition', 'transportation', 'registration', 'other'];

const feeTypeLabel = (ft: FeeType, t: (k: any) => string, customLabel?: string) =>
  ft === 'other' ? (customLabel || t('otherFee')) : t(ft);

const emptyForm = () => ({
  studentId: '', schoolId: '', feeType: 'tuition' as FeeType,
  amount: 0, discount: 0, finalAmount: 0, date: new Date().toISOString().split('T')[0],
  note: '', billNumber: '', customFeeLabel: '',
});

/** Group payments by Shamsi month key "YYYY-MM" */
const groupByMonth = (payments: Payment[]): Map<string, Payment[]> => {
  const map = new Map<string, Payment[]>();
  payments.forEach(p => {
    const d = new Date(p.date);
    if (isNaN(d.getTime())) return;
    const { year, month } = toShamsi(d);
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const list = map.get(key) || [];
    list.push(p);
    map.set(key, list);
  });
  // Sort keys descending (newest first)
  return new Map([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])));
};

const FeesPage = () => {
  const { t, lang } = useLanguage();
  const { students, schools, payments, addPayment, updatePayment, deletePayment } = useData();
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [quickAdd, setQuickAdd] = useState<string | null>(null);
  const [quickForm, setQuickForm] = useState({ feeType: 'tuition' as FeeType, amount: 0, discount: 0, billNumber: '', note: '', date: new Date().toISOString().split('T')[0], customFeeLabel: '' });
  const [studentPopoverOpen, setStudentPopoverOpen] = useState(false);
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());

  const activeStudents = students.filter(s => s.status === 'active');

  const filtered = useMemo(() => {
    let list = [...payments];
    if (schoolFilter) list = list.filter(p => p.schoolId === schoolFilter);
    if (search) list = list.filter(p => {
      const s = students.find(st => st.id === p.studentId);
      return s?.name.toLowerCase().includes(search.toLowerCase());
    });
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, schoolFilter, search, students]);

  const grouped = useMemo(() => {
    const map = new Map<string, Payment[]>();
    filtered.forEach(p => {
      const list = map.get(p.studentId) || [];
      list.push(p);
      map.set(p.studentId, list);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const openAdd = () => { setForm(emptyForm()); setEditing(null); setShowForm(true); };
  const openEdit = (p: Payment) => {
    setForm({ studentId: p.studentId, schoolId: p.schoolId, feeType: p.feeType,
      amount: p.amount, discount: p.discount, finalAmount: p.finalAmount,
      date: p.date, note: p.note, billNumber: p.billNumber, customFeeLabel: p.customFeeLabel || '' });
    setEditing(p); setShowForm(true);
  };

  const handleSave = () => {
    if (!form.studentId || !form.schoolId) return;
    if (form.feeType === 'other' && !form.customFeeLabel.trim()) return;
    const final = form.amount - form.discount;
    const { customFeeLabel, ...rest } = form;
    const data = { ...rest, finalAmount: final > 0 ? final : 0, customFeeLabel: form.feeType === 'other' ? customFeeLabel : undefined };
    if (editing) updatePayment({ ...editing, ...data });
    else addPayment(data);
    setShowForm(false);
  };

  const handleQuickSave = (studentId: string) => {
    const s = students.find(st => st.id === studentId);
    if (!s) return;
    const final = quickForm.amount - quickForm.discount;
    addPayment({ studentId, schoolId: s.schoolId, feeType: quickForm.feeType, amount: quickForm.amount, discount: quickForm.discount, finalAmount: final > 0 ? final : 0, date: quickForm.date, note: quickForm.note, billNumber: quickForm.billNumber, customFeeLabel: quickForm.feeType === 'other' ? quickForm.customFeeLabel : undefined });
    setQuickAdd(null);
    setQuickForm({ feeType: 'tuition', amount: 0, discount: 0, billNumber: '', note: '', date: new Date().toISOString().split('T')[0], customFeeLabel: '' });
  };

  const handleStudentChange = (studentId: string) => {
    const s = students.find(st => st.id === studentId);
    setForm({ ...form, studentId, schoolId: s?.schoolId || form.schoolId });
  };

  const studentName = (id: string) => students.find(s => s.id === id)?.name || '';
  const schoolName = (id: string) => schools.find(s => s.id === id)?.name || '';

  const toggleSelect = (id: string) => {
    setSelectedPayments(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (studentPayments: Payment[]) => {
    const allSelected = studentPayments.every(p => selectedPayments.has(p.id));
    setSelectedPayments(prev => {
      const next = new Set(prev);
      studentPayments.forEach(p => allSelected ? next.delete(p.id) : next.add(p.id));
      return next;
    });
  };

  const toggleMonth = (key: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  /** Print a COMBINED receipt: one receipt with all selected items as line items */
  const printSelectedReceipts = () => {
    const selected = filtered.filter(p => selectedPayments.has(p.id));
    if (!selected.length) return;
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Group selected by student for the combined receipt
    const byStudent = new Map<string, Payment[]>();
    selected.forEach(p => {
      const list = byStudent.get(p.studentId) || [];
      list.push(p);
      byStudent.set(p.studentId, list);
    });

    const grandTotal = selected.reduce((s, p) => s + p.finalAmount, 0);
    const totalDiscount = selected.reduce((s, p) => s + p.discount, 0);
    const totalAmount = selected.reduce((s, p) => s + p.amount, 0);

    // Get first student/school for header (or generic if multiple students)
    const studentIds = [...byStudent.keys()];
    const isSingleStudent = studentIds.length === 1;
    const firstStudent = students.find(st => st.id === studentIds[0]);
    const firstSchool = schools.find(sc => sc.id === selected[0].schoolId);

    const itemRows = selected.map((p, i) => {
      const sName = isSingleStudent ? '' : `<td style="padding:6px 8px;border:1px solid #ddd;font-size:12px;">${studentName(p.studentId)}</td>`;
      return `<tr>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:12px;text-align:center;">${i + 1}</td>
        ${sName}
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:12px;">${feeTypeLabel(p.feeType, t, p.customFeeLabel)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:12px;">${formatShamsi(p.date, lang)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:12px;text-align:right;">${fmtAFN(p.amount)}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:12px;text-align:right;color:#e53e3e;">${p.discount > 0 ? fmtAFN(p.discount) : '—'}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;font-size:12px;text-align:right;font-weight:600;">${fmtAFN(p.finalAmount)}</td>
      </tr>`;
    }).join('');

    const studentHeader = isSingleStudent ? '' : `<th style="padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;font-size:12px;">${t('student')}</th>`;

    const receiptHTML = `
      <div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px;">
          <h1 style="font-size:22px;margin:0 0 4px;">🧾 ${t('combinedReceipt')}</h1>
          <p style="margin:0;font-size:13px;color:#666;">${firstSchool?.name || ''}</p>
          ${firstSchool?.phone ? `<p style="margin:2px 0 0;font-size:12px;color:#888;">${firstSchool.phone}</p>` : ''}
        </div>
        ${isSingleStudent ? `
        <div style="margin-bottom:12px;">
          <div class="row"><strong>${t('student')}:</strong><span>${firstStudent?.name || ''}</span></div>
          <div class="row"><span>${t('grade')}:</span><span>${firstStudent?.grade || '—'}</span></div>
          <div class="row"><span>${t('idNumber')}:</span><span>${firstStudent?.idNumber || '—'}</span></div>
          <div class="row"><span>${t('parentName')}:</span><span>${firstStudent?.parentName || '—'}</span></div>
        </div>` : ''}
        <p style="font-size:13px;color:#666;margin-bottom:8px;">${t('items')}: ${selected.length}</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr>
              <th style="padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;font-size:12px;">#</th>
              ${studentHeader}
              <th style="padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;font-size:12px;">${t('feeType')}</th>
              <th style="padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;font-size:12px;">${t('date')}</th>
              <th style="padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;font-size:12px;text-align:right;">${t('amount')}</th>
              <th style="padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;font-size:12px;text-align:right;">${t('discount')}</th>
              <th style="padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;font-size:12px;text-align:right;">${t('finalAmount')}</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr style="font-weight:bold;background:#f9f9f9;">
              <td colspan="${isSingleStudent ? 3 : 4}" style="padding:8px;border:1px solid #ddd;font-size:13px;">${t('grandTotal')}</td>
              <td style="padding:8px;border:1px solid #ddd;font-size:13px;text-align:right;">${fmtAFN(totalAmount)}</td>
              <td style="padding:8px;border:1px solid #ddd;font-size:13px;text-align:right;color:#e53e3e;">${totalDiscount > 0 ? fmtAFN(totalDiscount) : '—'}</td>
              <td style="padding:8px;border:1px solid #ddd;font-size:13px;text-align:right;">${fmtAFN(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
        <div style="font-size:12px;color:#666;">
          <div class="row"><span>Time:</span><span>${now}</span></div>
        </div>
        <div style="text-align:center;margin-top:20px;padding-top:12px;border-top:1px dashed #ccc;font-size:11px;color:#aaa;">
          <p style="margin:0;">Thank you / تشکر از پرداخت شما</p>
        </div>
      </div>`;
    printHTML(t('combinedReceipt'), receiptHTML);
    setSelectedPayments(new Set());
  };

  const sendWhatsApp = (p: Payment) => {
    const s = students.find(st => st.id === p.studentId);
    if (!s) return;
    const msg = encodeURIComponent(`محترم والد صاحب،\nفیس شاگرد ${s.name} به مبلغ ${p.finalAmount} افغانی پرداخت نشده است.\nلطفا پرداخت نمایید.`);
    window.open(`https://wa.me/${(s.parentPhone || '').replace(/\D/g, '')}?text=${msg}`, '_blank');
  };

  const showReceipt = (p: Payment) => {
    const s = students.find(st => st.id === p.studentId);
    const sch = schools.find(sc => sc.id === p.schoolId);
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    printHTML(t('receipt'), `
      <div style="max-width:400px;margin:0 auto;font-family:system-ui,sans-serif;">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px;">
          <h1 style="font-size:22px;margin:0 0 4px;">🧾 ${t('receipt')}</h1>
          <p style="margin:0;font-size:13px;color:#666;">${sch?.name || ''}</p>
          ${sch?.phone ? `<p style="margin:2px 0 0;font-size:12px;color:#888;">${sch.phone}</p>` : ''}
        </div>
        <div style="margin-bottom:12px;">
          <div class="row"><strong>${t('student')}:</strong><span>${s?.name || ''}</span></div>
          <div class="row"><span>${t('grade')}:</span><span>${s?.grade || '—'}</span></div>
          <div class="row"><span>${t('idNumber')}:</span><span>${s?.idNumber || '—'}</span></div>
          <div class="row"><span>${t('parentName')}:</span><span>${s?.parentName || '—'}</span></div>
        </div>
        <div style="border-top:1px dashed #ccc;border-bottom:1px dashed #ccc;padding:8px 0;margin-bottom:12px;">
          <div class="row"><span>${t('feeType')}:</span><span>${feeTypeLabel(p.feeType, t, p.customFeeLabel)}</span></div>
          <div class="row"><span>${t('amount')}:</span><span>${fmtAFN(p.amount)}</span></div>
          ${p.discount > 0 ? `<div class="row"><span>${t('discount')}:</span><span style="color:#e53e3e;">- ${fmtAFN(p.discount)}</span></div>` : ''}
          <div class="row" style="font-weight:bold;font-size:15px;border-top:1px solid #ddd;margin-top:6px;padding-top:8px;">
            <span>${t('finalAmount')}:</span><span>${fmtAFN(p.finalAmount)}</span>
          </div>
        </div>
        <div style="font-size:12px;color:#666;">
          <div class="row"><span>${t('date')}:</span><span>${formatShamsi(p.date, lang)}</span></div>
          ${p.billNumber ? `<div class="row"><span>${t('billNumber')}:</span><span>#${p.billNumber}</span></div>` : ''}
          ${p.note ? `<div class="row"><span>${t('note')}:</span><span>${p.note}</span></div>` : ''}
          <div class="row"><span>Time:</span><span>${now}</span></div>
        </div>
        <div style="text-align:center;margin-top:20px;padding-top:12px;border-top:1px dashed #ccc;font-size:11px;color:#aaa;">
          <p style="margin:0;">Thank you / تشکر از پرداخت شما</p>
        </div>
      </div>
    `);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground" />
        </div>
        <button onClick={openAdd} className="bg-primary text-primary-foreground p-2.5 rounded-xl"><Plus size={20} /></button>
      </div>

      <select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground">
        <option value="">{t('allSchools')}</option>
        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {selectedPayments.size > 0 && (
        <button onClick={printSelectedReceipts}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium">
          <Printer size={16} /> {t('printSelected')} ({selectedPayments.size})
        </button>
      )}

      {grouped.length === 0 && <p className="text-center text-muted-foreground py-8">{t('noData')}</p>}

      <div className="space-y-3">
        {grouped.map(([studentId, studentPayments]) => {
          const student = students.find(s => s.id === studentId);
          const isExpanded = expandedStudent === studentId;
          const totalPaid = studentPayments.reduce((sum, p) => sum + p.finalAmount, 0);
          const monthGroups = groupByMonth(studentPayments);

          return (
            <div key={studentId} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedStudent(isExpanded ? null : studentId)}
                className="w-full flex items-center justify-between p-4 text-start"
              >
                <div>
                  <p className="font-semibold text-sm text-foreground">{student?.name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{t('idNumber')}: {toWestern(student?.idNumber || '—')} · {toWestern(String(studentPayments.length))}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('totalPaid')}: {fmtAFN(totalPaid)}</p>
                </div>
                {isExpanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="border-t border-border">
                  {/* Quick Add Inline Form */}
                  {quickAdd === studentId ? (
                    <div className="px-4 py-3 space-y-2 bg-muted/50">
                      <div className="flex gap-2">
                        <select value={quickForm.feeType} onChange={e => setQuickForm({ ...quickForm, feeType: e.target.value as FeeType })}
                          className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground">
                         {feeTypes.map(ft => <option key={ft} value={ft}>{ft === 'other' ? t('otherFee') : t(ft)}</option>)}
                        </select>
                        <input type="text" inputMode="numeric" placeholder={t('amount')} value={numDisplay(quickForm.amount)} onChange={e => setQuickForm({ ...quickForm, amount: parseNumInput(e.target.value) })}
                          className="w-24 px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground" />
                      </div>
                      <div className="flex gap-2">
                        <input type="text" inputMode="numeric" placeholder={t('discount')} value={numDisplay(quickForm.discount)} onChange={e => setQuickForm({ ...quickForm, discount: parseNumInput(e.target.value) })}
                          className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground" />
                        <input type="text" placeholder={t('billNumber')} value={quickForm.billNumber} onChange={e => setQuickForm({ ...quickForm, billNumber: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground" />
                       </div>
                       {quickForm.feeType === 'other' && (
                         <input type="text" placeholder={t('customFeeLabel')} value={quickForm.customFeeLabel} onChange={e => setQuickForm({ ...quickForm, customFeeLabel: e.target.value })}
                           className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground" />
                       )}
                       <ShamsiDatePicker value={quickForm.date} onChange={d => setQuickForm({ ...quickForm, date: d })} />
                      <div className="flex gap-2">
                        <button onClick={() => handleQuickSave(studentId)} className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl text-sm font-medium">{t('save')}</button>
                        <button onClick={() => setQuickAdd(null)} className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground">{t('cancel')}</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setQuickAdd(studentId); setQuickForm({ feeType: 'tuition', amount: 0, discount: 0, billNumber: '', note: '', date: new Date().toISOString().split('T')[0], customFeeLabel: '' }); }}
                      className="w-full px-4 py-2.5 text-sm font-medium text-primary hover:bg-muted/50 flex items-center justify-center gap-1 border-b border-border">
                      <Plus size={14} /> {t('addFee')}
                    </button>
                  )}

                  {/* Select All for this student */}
                  <div className="px-4 py-2 flex items-center gap-2 border-b border-border bg-muted/30">
                    <input type="checkbox"
                      checked={studentPayments.every(p => selectedPayments.has(p.id))}
                      onChange={() => toggleSelectAll(studentPayments)}
                      className="rounded border-border accent-primary w-4 h-4" />
                    <span className="text-xs text-muted-foreground">{t('selectAll')}</span>
                  </div>

                  {/* Payments grouped by Shamsi month */}
                  {[...monthGroups.entries()].map(([monthKey, monthPayments]) => {
                    const [yearStr, monthStr] = monthKey.split('-');
                    const year = parseInt(yearStr);
                    const month = parseInt(monthStr);
                    const monthLabel = formatShamsiMonth(year, month, lang);
                    const monthTotal = monthPayments.reduce((s, p) => s + p.finalAmount, 0);
                    const isMonthExpanded = expandedMonths.has(`${studentId}-${monthKey}`);
                    const toggleKey = `${studentId}-${monthKey}`;

                    return (
                      <div key={monthKey}>
                        <button
                          onClick={() => toggleMonth(toggleKey)}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors border-b border-border"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronRight size={14} className={`text-muted-foreground transition-transform ${isMonthExpanded ? 'rotate-90' : ''}`} />
                            <span className="text-xs font-semibold text-foreground">{monthLabel}</span>
                            <span className="text-xs text-muted-foreground">({monthPayments.length})</span>
                          </div>
                          <span className="text-xs font-semibold text-primary">{fmtAFN(monthTotal)}</span>
                        </button>

                        {isMonthExpanded && (
                          <div className="divide-y divide-border">
                            {monthPayments.map(p => (
                              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <input type="checkbox"
                                    checked={selectedPayments.has(p.id)}
                                    onChange={() => toggleSelect(p.id)}
                                    className="rounded border-border accent-primary w-4 h-4 shrink-0" />
                                  <div>
                                    <p className="text-xs text-foreground">{feeTypeLabel(p.feeType, t, p.customFeeLabel)} · {fmtAFN(p.finalAmount)}</p>
                                    <p className="text-xs text-muted-foreground">{formatShamsi(p.date, lang)}{p.billNumber ? ` · #${toWestern(p.billNumber)}` : ''}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => showReceipt(p)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><FileText size={14} /></button>
                                  <button onClick={() => sendWhatsApp(p)} className="p-1.5 rounded-lg hover:bg-muted text-green-600"><MessageCircle size={14} /></button>
                                  <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><Edit2 size={14} /></button>
                                  <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog open={!!deleteId} title={t('delete')} message={t('deleteConfirm')}
        onConfirm={() => { if (deleteId) deletePayment(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)} />

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card w-full max-w-lg rounded-2xl p-6 space-y-3 animate-in zoom-in-95 max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground">{editing ? t('editFee') : t('addFee')}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('student')}</label>
              <Popover open={studentPopoverOpen} onOpenChange={setStudentPopoverOpen}>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground">
                    {form.studentId ? `${studentName(form.studentId)} (${schoolName(form.schoolId)})` : '—'}
                    <ChevronsUpDown size={14} className="text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('search')} />
                    <CommandList>
                      <CommandEmpty>{t('noData')}</CommandEmpty>
                      <CommandGroup>
                        {activeStudents.map(s => (
                          <CommandItem key={s.id} value={`${s.name} ${schoolName(s.schoolId)}`} onSelect={() => { handleStudentChange(s.id); setStudentPopoverOpen(false); }}>
                            <Check size={14} className={`mr-2 ${form.studentId === s.id ? 'opacity-100' : 'opacity-0'}`} />
                            {s.name} <span className="text-muted-foreground ml-1">({schoolName(s.schoolId)})</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('feeType')}</label>
              <select value={form.feeType} onChange={e => setForm({ ...form, feeType: e.target.value as FeeType })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground">
                {feeTypes.map(ft => <option key={ft} value={ft}>{ft === 'other' ? t('otherFee') : t(ft)}</option>)}
              </select>
            </div>
            {form.feeType === 'other' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('customFeeLabel')}</label>
                <input type="text" value={form.customFeeLabel} onChange={e => setForm({ ...form, customFeeLabel: e.target.value })}
                  placeholder={t('customFeeLabel')}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground" />
              </div>
            )}
            {[{k:'amount',l:'amount',num:true},{k:'discount',l:'discount',num:true},{k:'billNumber',l:'billNumber',num:false},{k:'note',l:'note',num:false}].map(f => (
              <div key={f.k}>
                <label className="text-xs font-medium text-muted-foreground">{t(f.l as any)}</label>
                <input type="text" inputMode={f.num ? "numeric" : "text"} value={f.num ? numDisplay((form as any)[f.k]) : (form as any)[f.k]} onChange={e => setForm({ ...form, [f.k]: f.num ? parseNumInput(e.target.value) : e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground" />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('date')}</label>
              <ShamsiDatePicker value={form.date} onChange={d => setForm({ ...form, date: d })} />
            </div>
            <button onClick={handleSave} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium">{t('save')}</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default FeesPage;
