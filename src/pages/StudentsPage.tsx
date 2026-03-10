import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useData } from '@/contexts/DataContext';
import type { Student, Payment, FeeType } from '@/types';
import { Plus, Search, Edit2, Archive, RotateCcw, Trash2, X, User, ArrowLeft, AlertCircle, MessageCircle, Upload, ChevronDown, ChevronRight, Users } from 'lucide-react';
import ShamsiDatePicker from '@/components/ShamsiDatePicker';
import { formatShamsi, getShamsiMonthsRange, formatShamsiMonth, toShamsi } from '@/lib/shamsi';
import { fmtAFN, parseNumInput, numDisplay } from '@/lib/helpers';
import ConfirmDialog from '@/components/ConfirmDialog';
import ImportDialog from '@/components/ImportDialog';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

const emptyForm = () => ({
  name: '', idNumber: '', grade: '', parentName: '', parentPhone: '',
  discountType: 'none' as Student['discountType'], discountValue: 0, monthlyFee: 0,
  entryDate: new Date().toISOString().split('T')[0], schoolId: '', status: 'active' as Student['status'],
});

const feeTypes: FeeType[] = ['tuition', 'transportation', 'registration'];

interface StudentCardProps {
  student: Student;
  payments: Payment[];
  lang: string;
  t: (k: any) => string;
  schoolName: (id: string) => string;
  getUnpaidMonths: (s: Student) => { year: number; month: number; feeType: FeeType }[];
  onView: (s: Student) => void;
  onEdit: (s: Student) => void;
  onArchive: (s: Student) => void;
  onDelete: (id: string) => void;
}

const StudentCard = ({ student, payments, lang, t, schoolName, getUnpaidMonths, onView, onEdit, onArchive, onDelete }: StudentCardProps) => {
  const sp = payments.filter(p => p.studentId === student.id);
  const totalPaid = sp.reduce((sum, p) => sum + p.finalAmount, 0);
  const unpaid = getUnpaidMonths(student);
  const unpaidMonthCount = new Set(unpaid.map(u => `${u.year}-${u.month}`)).size;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm" onClick={() => onView(student)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground">{student.name}</h3>
          <p className="text-xs text-muted-foreground">{student.parentName} · {student.grade}</p>
          <p className="text-xs text-muted-foreground">{schoolName(student.schoolId)}</p>
          <p className="text-xs font-medium text-primary">{t('totalPaid')}: {fmtAFN(totalPaid)}</p>
          {(student.monthlyFee || 0) > 0 && (
            <p className="text-xs text-muted-foreground">{t('monthlyFee')}: {fmtAFN(student.monthlyFee)}</p>
          )}
          {unpaidMonthCount > 0 && (
            <p className="text-xs font-medium text-destructive flex items-center gap-1">
              <AlertCircle size={12} /> {unpaidMonthCount} {t('unpaid')} {lang === 'en' ? 'month(s)' : lang === 'da' ? 'ماه' : 'میاشت'}
            </p>
          )}
        </div>
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(student)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><Edit2 size={16} /></button>
          <button onClick={() => onArchive(student)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            {student.status === 'active' ? <Archive size={16} /> : <RotateCcw size={16} />}
          </button>
          <button onClick={() => onDelete(student.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 size={16} /></button>
        </div>
      </div>
    </div>
  );
};

const StudentsPage = () => {
  const { t, lang } = useLanguage();
  const { schools, students, payments, addStudent, updateStudent, deleteStudent } = useData();
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [showImport, setShowImport] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const selectedSchool = schools.find(s => s.id === form.schoolId);
  const schoolGrades = selectedSchool?.grades || [];

  const getUnpaidMonths = (student: Student) => {
    const allMonths = getShamsiMonthsRange(student.entryDate);
    const studentPayments = payments.filter(p => p.studentId === student.id);
    const paidKeys = new Set(
      studentPayments.map(p => {
        const s = toShamsi(new Date(p.date));
        return `${s.year}-${s.month}-${p.feeType}`;
      })
    );
    const unpaid: { year: number; month: number; feeType: FeeType }[] = [];
    for (const m of allMonths) {
      for (const ft of feeTypes) {
        if (!paidKeys.has(`${m.year}-${m.month}-${ft}`)) {
          unpaid.push({ ...m, feeType: ft });
        }
      }
    }
    return unpaid;
  };

  const filtered = students
    .filter(s => showArchived ? s.status === 'archived' : s.status === 'active')
    .filter(s => !schoolFilter || s.schoolId === schoolFilter)
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.parentName.toLowerCase().includes(search.toLowerCase()));

  const groupedStudents = useMemo(() => {
    const groups = new Map<string, Student[]>();
    filtered.forEach(student => {
      const key = student.grade || (lang === 'en' ? 'Unassigned' : lang === 'da' ? 'نامشخص' : 'نامشخص');
      const list = groups.get(key) || [];
      list.push(student);
      groups.set(key, list);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, lang]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const openAdd = () => { setForm({ ...emptyForm(), schoolId: schools[0]?.id || '' }); setEditing(null); setShowForm(true); };
  const openEdit = (s: Student) => {
    setForm({ name: s.name, idNumber: s.idNumber, grade: s.grade, parentName: s.parentName,
      parentPhone: s.parentPhone, discountType: s.discountType, discountValue: s.discountValue,
      monthlyFee: s.monthlyFee || 0, entryDate: s.entryDate, schoolId: s.schoolId, status: s.status });
    setEditing(s); setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.schoolId) return;
    if (editing) updateStudent({ ...editing, ...form });
    else addStudent(form);
    setShowForm(false);
  };

  const schoolName = (id: string) => schools.find(s => s.id === id)?.name || '';

  const sendWhatsApp = (student: Student, unpaidMonths: { year: number; month: number; feeType: FeeType }[]) => {
    const phone = student.parentPhone.replace(/[^0-9+]/g, '');
    if (!phone) return;
    const monthList = [...new Set(unpaidMonths.map(u => formatShamsiMonth(u.year, u.month, lang)))];
    const feeList = [...new Set(unpaidMonths.map(u => t(u.feeType)))];
    const msg = `سلام ${student.parentName} صاحب،\n\nاحتراماً به اطلاع شما میرسانیم که فیس ${feeList.join('، ')} شاگرد ${student.name} برای ماه‌های ${monthList.join('، ')} پرداخت نشده است.\n\nلطفاً هر چه زودتر اقدام فرمایید.\n\nبا احترام،\n${schoolName(student.schoolId)}`;
    window.open(`https://wa.me/${phone.startsWith('+') ? phone.slice(1) : phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ── Student Detail View ──
  if (viewStudent) {
    const sp = payments.filter(p => p.studentId === viewStudent.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalPaid = sp.reduce((sum, p) => sum + p.finalAmount, 0);
    const unpaid = getUnpaidMonths(viewStudent);
    const grouped = new Map<string, FeeType[]>();
    unpaid.forEach(u => {
      const key = `${u.year}-${u.month}`;
      grouped.set(key, [...(grouped.get(key) || []), u.feeType]);
    });

    return (
      <div className="p-4 space-y-4">
        <button onClick={() => setViewStudent(null)} className="flex items-center gap-2 text-primary text-sm font-medium">
          <ArrowLeft size={16} /> {t('students')}
        </button>
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-full"><User size={24} className="text-primary" /></div>
            <div>
              <h2 className="font-bold text-lg text-foreground">{viewStudent.name}</h2>
              <p className="text-xs text-muted-foreground">{schoolName(viewStudent.schoolId)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground text-xs">{t('idNumber')}</span><p className="font-medium text-foreground">{viewStudent.idNumber}</p></div>
            <div><span className="text-muted-foreground text-xs">{t('grade')}</span><p className="font-medium text-foreground">{viewStudent.grade}</p></div>
            <div><span className="text-muted-foreground text-xs">{t('parentName')}</span><p className="font-medium text-foreground">{viewStudent.parentName}</p></div>
            <div><span className="text-muted-foreground text-xs">{t('parentPhone')}</span><p className="font-medium text-foreground">{viewStudent.parentPhone}</p></div>
            <div><span className="text-muted-foreground text-xs">{t('discountType')}</span><p className="font-medium text-foreground">{t(viewStudent.discountType)}</p></div>
            <div><span className="text-muted-foreground text-xs">{t('entryDate')}</span><p className="font-medium text-foreground">{formatShamsi(viewStudent.entryDate, lang)}</p></div>
            {(viewStudent.monthlyFee || 0) > 0 && (
              <div><span className="text-muted-foreground text-xs">{t('monthlyFee')}</span><p className="font-medium text-foreground">{fmtAFN(viewStudent.monthlyFee)}</p></div>
            )}
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{t('totalPaid')}</span>
          <span className="text-lg font-bold text-primary">{fmtAFN(totalPaid)}</span>
        </div>

        {unpaid.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-destructive flex items-center gap-1.5">
                <AlertCircle size={16} /> {t('unpaid')} {lang === 'en' ? 'Months' : lang === 'da' ? 'ماه‌ها' : 'میاشتونه'}
              </h3>
              <button onClick={() => sendWhatsApp(viewStudent, unpaid)}
                className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-green-700 transition-colors">
                <MessageCircle size={14} /> {t('whatsappReminder')}
              </button>
            </div>
            <div className="space-y-1.5">
              {Array.from(grouped.entries()).map(([key, types]) => {
                const [y, m] = key.split('-').map(Number);
                return (
                  <div key={key} className="bg-destructive/5 border border-destructive/20 rounded-xl p-3">
                    <p className="text-sm font-medium text-foreground">{formatShamsiMonth(y, m, lang)}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {types.map(ft => (
                        <span key={ft} className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">{t(ft)}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <h3 className="font-semibold text-foreground">{t('paymentHistory')}</h3>
        {sp.length === 0 ? <p className="text-muted-foreground text-sm">{t('noData')}</p> : (
          <div className="space-y-3">
            {(() => {
              const monthGroups = new Map<string, typeof sp>();
              sp.forEach(p => {
                const s = toShamsi(new Date(p.date));
                const key = `${s.year}-${s.month}`;
                monthGroups.set(key, [...(monthGroups.get(key) || []), p]);
              });
              return Array.from(monthGroups.entries()).map(([key, pList]) => {
                const [y, m] = key.split('-').map(Number);
                const monthTotal = pList.reduce((sum, p) => sum + p.finalAmount, 0);
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-muted-foreground">{formatShamsiMonth(y, m, lang)}</span>
                      <span className="text-xs font-semibold text-primary">{fmtAFN(monthTotal)}</span>
                    </div>
                    {pList.map(p => (
                      <div key={p.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{t(p.feeType)} — {fmtAFN(p.finalAmount)}</p>
                          <p className="text-xs text-muted-foreground">{formatShamsi(p.date, lang)}{p.billNumber ? ` · #${p.billNumber}` : ''}</p>
                          {p.note && <p className="text-xs text-muted-foreground italic mt-0.5">{p.note}</p>}
                        </div>
                        <span className="text-xs font-medium text-primary">{fmtAFN(p.finalAmount)}</span>
                      </div>
                    ))}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground" />
        </div>
        <button onClick={() => setShowImport(true)} className="bg-secondary text-secondary-foreground p-2.5 rounded-xl"><Upload size={20} /></button>
        <button onClick={openAdd} className="bg-primary text-primary-foreground p-2.5 rounded-xl"><Plus size={20} /></button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}
          className="flex-1 min-w-[120px] rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground">
          <option value="">{t('allSchools')}</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={() => setShowArchived(!showArchived)}
          className={`px-3 py-2 rounded-xl text-xs font-medium border ${showArchived ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
          {showArchived ? t('archivedStudents') : t('activeStudents')}
        </button>
      </div>

      {groupedStudents.length > 1 && (
        <div className="flex gap-2">
          <button onClick={() => setExpandedGroups(new Set(groupedStudents.map(([k]) => k)))}
            className="text-xs text-primary font-medium">
            {lang === 'en' ? 'Expand All' : 'باز کردن همه'}
          </button>
          <span className="text-muted-foreground text-xs">|</span>
          <button onClick={() => setExpandedGroups(new Set())}
            className="text-xs text-primary font-medium">
            {lang === 'en' ? 'Collapse All' : 'بستن همه'}
          </button>
        </div>
      )}

      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">{t('noData')}</p>}

      <div className="space-y-3">
        {groupedStudents.map(([gradeKey, gradeStudents]) => (
          <Collapsible key={gradeKey} open={expandedGroups.has(gradeKey)} onOpenChange={() => toggleGroup(gradeKey)}>
            <CollapsibleTrigger className="w-full">
              <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2.5 rounded-xl">
                    <Users size={18} className="text-primary" />
                  </div>
                  <div className="text-start">
                    <h3 className="font-semibold text-foreground">{gradeKey}</h3>
                    <p className="text-xs text-muted-foreground">{gradeStudents.length} {t('students')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">{gradeStudents.length}</span>
                  {expandedGroups.has(gradeKey) ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground" />}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 mt-2 ml-4">
                {gradeStudents.map(student => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    payments={payments}
                    lang={lang}
                    t={t}
                    schoolName={schoolName}
                    getUnpaidMonths={getUnpaidMonths}
                    onView={setViewStudent}
                    onEdit={openEdit}
                    onArchive={s => updateStudent({ ...s, status: s.status === 'active' ? 'archived' : 'active' })}
                    onDelete={setDeleteId}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      <ConfirmDialog open={!!deleteId} title={t('delete')} message={t('deleteConfirm')}
        onConfirm={() => { if (deleteId) deleteStudent(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)} />

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card w-full max-w-lg rounded-2xl p-6 space-y-3 animate-in zoom-in-95 max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground">{editing ? t('editStudent') : t('addStudent')}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('school')}</label>
              <select value={form.schoolId} onChange={e => setForm({ ...form, schoolId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground">
                <option value="">{t('filterBySchool')}</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {[{k:'name',l:'name'},{k:'idNumber',l:'idNumber'},{k:'parentName',l:'parentName'},{k:'parentPhone',l:'parentPhone'}].map(f => (
              <div key={f.k}>
                <label className="text-xs font-medium text-muted-foreground">{t(f.l as any)}</label>
                <input value={(form as any)[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground" />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('grade')}</label>
              {schoolGrades.length > 0 ? (
                <select value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground">
                  <option value="">—</option>
                  {schoolGrades.map((g, i) => (
                    <option key={i} value={`${g.grade}-${g.section}`}>{t('gradeLabel' as any)} {g.grade} - {t('sectionLabel' as any)} {g.section}</option>
                  ))}
                </select>
              ) : (
                <input value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground" />
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('monthlyFee')}</label>
              <input type="text" inputMode="numeric" value={numDisplay(form.monthlyFee)}
                onChange={e => setForm({ ...form, monthlyFee: parseNumInput(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground" placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('discountType')}</label>
              <select value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value as any })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground">
                <option value="none">{t('none')}</option>
                <option value="percentage">{t('percentage')}</option>
                <option value="free">{t('free')}</option>
              </select>
            </div>
            {form.discountType === 'percentage' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('discountValue')} (%)</label>
                <input type="text" inputMode="numeric" value={numDisplay(form.discountValue)}
                  onChange={e => setForm({ ...form, discountValue: parseNumInput(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('entryDate')}</label>
              <ShamsiDatePicker value={form.entryDate} onChange={d => setForm({ ...form, entryDate: d })} />
            </div>
            <button onClick={handleSave} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium">{t('save')}</button>
          </div>
        </div>
      )}

      <ImportDialog open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
};

export default StudentsPage;
