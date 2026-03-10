import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useData } from '@/contexts/DataContext';
import type { Staff as StaffT, StaffRole } from '@/types';
import { Plus, Search, Edit2, Trash2, X, User, ArrowLeft, DollarSign, ChevronDown, ChevronUp, UserX, UserCheck } from 'lucide-react';
import ShamsiDatePicker from '@/components/ShamsiDatePicker';
import { formatShamsi } from '@/lib/shamsi';
import { fmtAFN, uid, parseNumInput, numDisplay } from '@/lib/helpers';
import ConfirmDialog from '@/components/ConfirmDialog';

const roles: StaffRole[] = ['teacher', 'guard', 'admin_staff', 'cleaner', 'driver', 'other'];
const roleKey: Record<StaffRole, string> = { teacher:'teacher', guard:'guard', admin_staff:'adminStaff', cleaner:'cleaner', driver:'driver', other:'other' };

const emptyForm = () => ({
  name: '', role: 'teacher' as StaffRole, customRole: '', phone: '', idNumber: '',
  salary: 0, entryDate: new Date().toISOString().split('T')[0], schoolId: '', active: true,
});

const StaffPage = () => {
  const { t, lang } = useLanguage();
  const { schools, staffList, expenses, addStaff, updateStaff, deleteStaff, addExpense } = useData();
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StaffT | null>(null);
  const [viewStaff, setViewStaff] = useState<StaffT | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [payDialog, setPayDialog] = useState<StaffT | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const filtered = staffList
    .filter(s => !schoolFilter || s.schoolId === schoolFilter)
    .filter(s => !roleFilter || s.role === roleFilter)
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const schoolName = (id: string) => schools.find(s => s.id === id)?.name || '';
  const salaryPayments = (staffId: string) => expenses.filter(e => e.staffId === staffId && e.category === 'salary');
  const totalPaid = (staffId: string) => salaryPayments(staffId).reduce((s, e) => s + e.amount, 0);

  const openAdd = () => { setForm({ ...emptyForm(), schoolId: schools[0]?.id || '' }); setEditing(null); setShowForm(true); };
  const openEdit = (s: StaffT) => {
    setForm({ name: s.name, role: s.role, customRole: s.customRole || '', phone: s.phone,
      idNumber: s.idNumber, salary: s.salary, entryDate: s.entryDate, schoolId: s.schoolId, active: s.active });
    setEditing(s); setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.schoolId) return;
    if (editing) updateStaff({ ...editing, ...form });
    else addStaff(form);
    setShowForm(false);
  };

  const handlePaySalary = () => {
    if (!payDialog || !payAmount) return;
    addExpense({
      schoolId: payDialog.schoolId, category: 'salary', amount: payAmount,
      description: `${t('salary')} - ${payDialog.name}`, personName: payDialog.name,
      date: payDate, billNumber: '', staffId: payDialog.id,
    });
    setPayDialog(null); setPayAmount(0);
  };

  const toggleActive = (s: StaffT) => {
    updateStaff({ ...s, active: !s.active, exitDate: !s.active ? undefined : new Date().toISOString().split('T')[0] });
  };

  if (viewStaff) {
    const sp = salaryPayments(viewStaff.id);
    return (
      <div className="p-4 space-y-4">
        <button onClick={() => setViewStaff(null)} className="flex items-center gap-2 text-primary text-sm font-medium"><ArrowLeft size={16} />{t('staff')}</button>
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-full"><User size={24} className="text-primary" /></div>
            <div>
              <h2 className="font-bold text-lg text-foreground">{viewStaff.name}</h2>
              <p className="text-xs text-muted-foreground">{t(roleKey[viewStaff.role] as any)}{viewStaff.customRole ? ` (${viewStaff.customRole})` : ''}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground text-xs">{t('salary')}</span><p className="font-medium text-foreground">{fmtAFN(viewStaff.salary)}</p></div>
            <div><span className="text-muted-foreground text-xs">{t('phone')}</span><p className="font-medium text-foreground">{viewStaff.phone}</p></div>
            <div><span className="text-muted-foreground text-xs">{t('school')}</span><p className="font-medium text-foreground">{schoolName(viewStaff.schoolId)}</p></div>
            <div><span className="text-muted-foreground text-xs">{t('totalPaid')}</span><p className="font-medium text-foreground">{fmtAFN(totalPaid(viewStaff.id))}</p></div>
            <div><span className="text-muted-foreground text-xs">{t('entryDate')}</span><p className="font-medium text-foreground">{formatShamsi(viewStaff.entryDate, lang)}</p></div>
            {viewStaff.exitDate && <div><span className="text-muted-foreground text-xs">{t('exitDate')}</span><p className="font-medium text-foreground">{formatShamsi(viewStaff.exitDate, lang)}</p></div>}
          </div>
        </div>
        <h3 className="font-semibold text-foreground">{t('paymentHistory')}</h3>
        {sp.length === 0 ? <p className="text-muted-foreground text-sm">{t('noData')}</p> :
          <div className="space-y-2">{sp.map(e => (
            <div key={e.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
              <div><p className="text-sm font-medium text-foreground">{fmtAFN(e.amount)}</p><p className="text-xs text-muted-foreground">{formatShamsi(e.date, lang)}</p></div>
            </div>
          ))}</div>
        }
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
        <button onClick={openAdd} className="bg-primary text-primary-foreground p-2.5 rounded-xl"><Plus size={20} /></button>
      </div>

      <div className="flex gap-2">
        <select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}
          className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground">
          <option value="">{t('allSchools')}</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground">
          <option value="">{t('role')}</option>
          {roles.map(r => <option key={r} value={r}>{t(roleKey[r] as any)}</option>)}
        </select>
      </div>

      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">{t('noData')}</p>}


      <div className="space-y-3">
        {filtered.map(s => (
          <div key={s.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between" onClick={() => setViewStaff(s)}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{s.name}</h3>
                  {!s.active && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">{t('deactivate')}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{t(roleKey[s.role] as any)} · {schoolName(s.schoolId)}</p>
                <p className="text-xs font-medium text-primary">{fmtAFN(s.salary)}/mo · {t('totalPaid')}: {fmtAFN(totalPaid(s.id))}</p>
              </div>
              <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                <div className="flex gap-1">
                  <button onClick={() => { setPayDialog(s); setPayAmount(s.salary); setPayDate(new Date().toISOString().split('T')[0]); }}
                    className="p-2 rounded-lg hover:bg-muted text-green-600"><DollarSign size={16} /></button>
                  <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><Edit2 size={16} /></button>
                  <button onClick={() => toggleActive(s)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                    {s.active ? <UserX size={16} /> : <UserCheck size={16} />}
                  </button>
                  <button onClick={() => setDeleteId(s.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>

            {/* Collapsible payment history */}
            <button onClick={() => setExpandedHistory(expandedHistory === s.id ? null : s.id)}
              className="mt-2 flex items-center gap-1 text-xs text-primary font-medium">
              {t('paymentHistory')} {expandedHistory === s.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expandedHistory === s.id && (
              <div className="mt-2 space-y-1">
                {salaryPayments(s.id).length === 0 ? <p className="text-xs text-muted-foreground">{t('noData')}</p> :
                  salaryPayments(s.id).map(e => (
                    <div key={e.id} className="flex justify-between text-xs py-1 border-b border-border last:border-0">
                      <span className="text-foreground">{fmtAFN(e.amount)}</span>
                      <span className="text-muted-foreground">{formatShamsi(e.date, lang)}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog open={!!deleteId} title={t('delete')} message={t('deleteConfirm')}
        onConfirm={() => { if (deleteId) deleteStaff(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)} />

      {/* Pay salary dialog */}
      {payDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPayDialog(null)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground">{t('paySalary')} — {payDialog.name}</h2>
              <button onClick={() => setPayDialog(null)}><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('amount')}</label>
              <input type="text" inputMode="numeric" value={numDisplay(payAmount)} onChange={e => setPayAmount(parseNumInput(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('date')}</label>
              <ShamsiDatePicker value={payDate} onChange={setPayDate} />
            </div>
            <button onClick={handlePaySalary} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium">{t('paySalary')}</button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card w-full max-w-lg rounded-2xl p-6 space-y-3 animate-in zoom-in-95 max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground">{editing ? t('editStaff') : t('addStaff')}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('school')}</label>
              <select value={form.schoolId} onChange={e => setForm({ ...form, schoolId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground">
                <option value="">—</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {[{k:'name',l:'name'},{k:'idNumber',l:'idNumber'},{k:'phone',l:'phone'}].map(f => (
              <div key={f.k}>
                <label className="text-xs font-medium text-muted-foreground">{t(f.l as any)}</label>
                <input value={(form as any)[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground" />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('role')}</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as StaffRole })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground">
                {roles.map(r => <option key={r} value={r}>{t(roleKey[r] as any)}</option>)}
              </select>
            </div>
            {form.role === 'other' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('customRole')}</label>
                <input value={form.customRole} onChange={e => setForm({ ...form, customRole: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('salary')}</label>
              <input type="text" inputMode="numeric" value={numDisplay(form.salary)} onChange={e => setForm({ ...form, salary: parseNumInput(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('entryDate')}</label>
              <ShamsiDatePicker value={form.entryDate} onChange={d => setForm({ ...form, entryDate: d })} />
            </div>
            <button onClick={handleSave} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium">{t('save')}</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default StaffPage;
