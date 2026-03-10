import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useData } from '@/contexts/DataContext';
import type { School, GradeSection } from '@/types';
import { Plus, Search, Edit2, Trash2, X, MapPin, Phone, Users, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import ConfirmDialog from '@/components/ConfirmDialog';

const SchoolsPage = () => {
  const { t } = useLanguage();
  const { schools, students, addSchool, updateSchool, deleteSchool } = useData();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<School | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '' });
  const [formGrades, setFormGrades] = useState<GradeSection[]>([]);
  const [newGrade, setNewGrade] = useState('');
  const [newSection, setNewSection] = useState('');
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);

  const filtered = schools.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.address.toLowerCase().includes(search.toLowerCase()));
  const studentCount = (id: string) => students.filter(s => s.schoolId === id && s.status === 'active').length;

  const openAdd = () => { setForm({ name: '', address: '', phone: '' }); setFormGrades([]); setEditing(null); setShowForm(true); };
  const openEdit = (s: School) => {
    setForm({ name: s.name, address: s.address, phone: s.phone });
    setFormGrades(s.grades || []);
    setEditing(s); setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) updateSchool({ ...editing, ...form, grades: formGrades });
    else addSchool({ ...form, grades: formGrades });
    setShowForm(false);
  };

  const addGradeSection = () => {
    if (!newGrade.trim() || !newSection.trim()) return;
    if (formGrades.some(g => g.grade === newGrade.trim() && g.section === newSection.trim())) return;
    setFormGrades([...formGrades, { grade: newGrade.trim(), section: newSection.trim() }]);
    setNewGrade(''); setNewSection('');
  };

  const removeGradeSection = (idx: number) => {
    setFormGrades(formGrades.filter((_, i) => i !== idx));
  };

  // Group grades for display
  const groupGrades = (grades: GradeSection[]) => {
    const map = new Map<string, string[]>();
    (grades || []).forEach(g => {
      const list = map.get(g.grade) || [];
      list.push(g.section);
      map.set(g.grade, list);
    });
    return Array.from(map.entries());
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

      {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">{t('noData')}</p>}

      <div className="space-y-3">
        {filtered.map(school => {
          const isExpanded = expandedSchool === school.id;
          const gradeGroups = groupGrades(school.grades);
          return (
            <div key={school.id} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-foreground">{school.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin size={12} />{school.address}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone size={12} />{school.phone}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users size={12} />{studentCount(school.id)} {t('students')}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><BookOpen size={12} />{(school.grades || []).length} {t('grades')}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setExpandedSchool(isExpanded ? null : school.id)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => openEdit(school)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><Edit2 size={16} /></button>
                    <button onClick={() => setDeleteId(school.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-border px-4 py-3 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-2">{t('grades')}</p>
                  {gradeGroups.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t('noGrades')}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {gradeGroups.map(([grade, sections]) => (
                        <div key={grade} className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground">{t('gradeLabel')} {grade}:</span>
                          {sections.map(sec => (
                            <span key={sec} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {t('sectionLabel')} {sec}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog open={!!deleteId} title={t('deleteSchool')} message={t('deleteConfirm')}
        onConfirm={() => { if (deleteId) deleteSchool(deleteId); setDeleteId(null); }}
        onCancel={() => setDeleteId(null)} />

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card w-full max-w-lg rounded-2xl p-6 space-y-4 animate-in zoom-in-95 max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground">{editing ? t('editSchool') : t('addSchool')}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-muted-foreground" /></button>
            </div>
            {[{ k: 'name', l: 'schoolName' }, { k: 'address', l: 'address' }, { k: 'phone', l: 'phone' }].map(f => (
              <div key={f.k}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t(f.l as any)}</label>
                <input value={(form as any)[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground" />
              </div>
            ))}

            {/* Grade Management */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{t('manageGrades')}</label>
              {formGrades.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {formGrades.map((g, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                      {t('gradeLabel')} {g.grade} - {t('sectionLabel')} {g.section}
                      <button onClick={() => removeGradeSection(i)} className="hover:text-destructive"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('gradeLabel')}</label>
                  <input value={newGrade} onChange={e => setNewGrade(e.target.value)} placeholder={t('gradeLabel')}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{t('sectionLabel')}</label>
                  <input value={newSection} onChange={e => setNewSection(e.target.value)} placeholder={t('sectionLabel')}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground" />
                </div>
              </div>
              <button onClick={addGradeSection} className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5">
                <Plus size={16} /> {t('add')}
              </button>
            </div>

            <button onClick={handleSave} className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium">{t('save')}</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default SchoolsPage;