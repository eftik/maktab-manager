import { useState, useRef } from 'react';
import { X, Upload, AlertCircle, Loader2, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useData } from '@/contexts/DataContext';
import type { Student, Payment, FeeType } from '@/types';
import * as XLSX from 'xlsx';

type ImportType = 'students' | 'payments';

interface Props {
  open: boolean;
  onClose: () => void;
}

// Flexible column name matching — maps various possible headers to internal keys
const STUDENT_COLUMN_MAP: Record<string, string[]> = {
  name: ['name', 'نام', 'student name', 'student', 'اسم', 'نام شاگرد', 'نام متعلم', 'full name'],
  idNumber: ['idnumber', 'id number', 'id', 'شماره تذکره', 'تذکره', 'شماره', 'tazkira', 'national id', 'شماره تذکیره'],
  grade: ['grade', 'صنف', 'class', 'کلاس', 'درجه', 'section', 'grade/section'],
  parentName: ['parentname', 'parent name', 'father', 'father name', 'نام والدین', 'نام پدر', 'والدین', 'guardian', 'نام ولي'],
  parentPhone: ['parentphone', 'parent phone', 'phone', 'تلفن', 'تلفن والدین', 'شماره تماس', 'mobile', 'contact', 'شماره تلفن'],
  school: ['school', 'مکتب', 'school name', 'نام مکتب', 'مدرسه'],
  entryDate: ['entrydate', 'entry date', 'تاریخ شمولیت', 'تاریخ', 'date', 'enrollment date', 'start date', 'join date'],
  monthlyFee: ['monthlyfee', 'monthly fee', 'fee', 'فیس', 'فیس ماهانه', 'tuition', 'amount'],
  discountType: ['discounttype', 'discount type', 'discount', 'تخفیف'],
  discountValue: ['discountvalue', 'discount value', 'discount amount', 'مقدار تخفیف'],
  status: ['status', 'حالت', 'وضعیت', 'active'],
};

const PAYMENT_COLUMN_MAP: Record<string, string[]> = {
  student: ['student', 'نام شاگرد', 'شاگرد', 'student name', 'name', 'نام'],
  feeType: ['feetype', 'fee type', 'نوع فیس', 'type', 'نوع'],
  amount: ['amount', 'مبلغ', 'fee', 'فیس', 'total'],
  date: ['date', 'تاریخ', 'payment date'],
  billNumber: ['billnumber', 'bill number', 'bill', 'شماره بل', 'بل'],
  note: ['note', 'یادداشت', 'notes', 'description', 'توضیح'],
  discount: ['discount', 'تخفیف', 'off'],
};

/** Find the best matching column header from the Excel row keys */
const findColumn = (headers: string[], possibleNames: string[]): string | null => {
  const normalized = possibleNames.map(n => n.toLowerCase().trim());
  for (const h of headers) {
    const hNorm = h.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
    if (normalized.includes(hNorm)) return h;
    // Also try without spaces
    const hNoSpace = hNorm.replace(/\s/g, '');
    for (const n of normalized) {
      if (n.replace(/\s/g, '') === hNoSpace) return h;
    }
  }
  return null;
};

const getValue = (row: Record<string, any>, headers: string[], possibleNames: string[]): string => {
  const col = findColumn(headers, possibleNames);
  if (!col) return '';
  return String(row[col] ?? '').trim();
};

const getNumValue = (row: Record<string, any>, headers: string[], possibleNames: string[]): number => {
  const v = getValue(row, headers, possibleNames);
  return Number(v.replace(/[^0-9.]/g, '')) || 0;
};

const ImportDialog = ({ open, onClose }: Props) => {
  const { t } = useLanguage();
  const { schools, students, addStudent, addPayment } = useData();
  const [importType, setImportType] = useState<ImportType>('students');
  const [preview, setPreview] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [detectedMapping, setDetectedMapping] = useState<Record<string, string | null>>({});
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => { setPreview([]); setHeaders([]); setDetectedMapping({}); setError(''); setImported(0); setSkipped(0); };

  const detectColumns = (hdrs: string[], type: ImportType) => {
    const map = type === 'students' ? STUDENT_COLUMN_MAP : PAYMENT_COLUMN_MAP;
    const detected: Record<string, string | null> = {};
    for (const [key, possibles] of Object.entries(map)) {
      detected[key] = findColumn(hdrs, possibles);
    }
    setDetectedMapping(detected);
  };

  const parseFile = async (file: File) => {
    reset();
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (rows.length === 0) { setError('File is empty'); return; }
      const hdrs = Object.keys(rows[0]);
      setHeaders(hdrs);
      setPreview(rows);
      detectColumns(hdrs, importType);
    } catch {
      setError('Failed to parse file');
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    let count = 0;
    let skip = 0;
    const colMap = importType === 'students' ? STUDENT_COLUMN_MAP : PAYMENT_COLUMN_MAP;

    if (importType === 'students') {
      for (const row of preview) {
        const name = getValue(row, headers, colMap.name);
        const idNumber = getValue(row, headers, colMap.idNumber);
        const grade = getValue(row, headers, colMap.grade);
        const parentName = getValue(row, headers, colMap.parentName);
        const parentPhone = getValue(row, headers, colMap.parentPhone);
        const schoolName = getValue(row, headers, colMap.school);
        const entryDate = getValue(row, headers, colMap.entryDate) || new Date().toISOString().split('T')[0];
        const monthlyFee = getNumValue(row, headers, colMap.monthlyFee);
        const discountType = getValue(row, headers, colMap.discountType || []) || 'none';
        const discountValue = getNumValue(row, headers, colMap.discountValue || []);

        // Match school by name (case-insensitive, partial match)
        const school = schools.find(s =>
          s.name.toLowerCase().includes(schoolName.toLowerCase()) ||
          schoolName.toLowerCase().includes(s.name.toLowerCase())
        ) || (schools.length === 1 ? schools[0] : null);

        if (name.trim() && school) {
          try {
            await addStudent({
              name, idNumber, grade, parentName, parentPhone,
              discountType: (['none', 'percentage', 'free'].includes(discountType) ? discountType : 'none') as Student['discountType'],
              discountValue, monthlyFee, entryDate,
              schoolId: school.id, status: 'active',
            });
            count++;
          } catch { skip++; }
        } else {
          skip++;
        }
      }
    } else {
      for (const row of preview) {
        const studentName = getValue(row, headers, colMap.student);
        const feeType = (getValue(row, headers, colMap.feeType) || 'tuition') as FeeType;
        const amount = getNumValue(row, headers, colMap.amount);
        const discount = getNumValue(row, headers, colMap.discount || []);
        const date = getValue(row, headers, colMap.date) || new Date().toISOString().split('T')[0];
        const billNumber = getValue(row, headers, colMap.billNumber);
        const note = getValue(row, headers, colMap.note);

        const student = students.find(s =>
          s.name.toLowerCase() === studentName.toLowerCase()
        );

        if (student && amount > 0) {
          try {
            await addPayment({
              studentId: student.id, schoolId: student.schoolId, feeType,
              amount, discount, finalAmount: Math.max(0, amount - discount),
              date, billNumber, note,
            });
            count++;
          } catch { skip++; }
        } else {
          skip++;
        }
      }
    }

    setImported(count);
    setSkipped(skip);
    setPreview([]);
    setImporting(false);
  };

  const matchedCount = Object.values(detectedMapping).filter(Boolean).length;
  const totalFields = Object.keys(detectedMapping).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom max-h-[85vh] overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-foreground">{t('importData' as any) || 'Import Data'}</h2>
          <button onClick={() => { reset(); onClose(); }}><X size={20} className="text-muted-foreground" /></button>
        </div>

        <div className="flex gap-2">
          <button onClick={() => { setImportType('students'); reset(); }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border ${importType === 'students' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
            {t('students')}
          </button>
          <button onClick={() => { setImportType('payments'); reset(); }}
            className={`flex-1 py-2 rounded-xl text-sm font-medium border ${importType === 'payments' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
            {t('fees')}
          </button>
        </div>

        <div className="bg-muted/50 border border-border rounded-xl p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm">
            {importType === 'students' ? 'Student columns (auto-detected):' : 'Payment columns (auto-detected):'}
          </p>
          {importType === 'students' ? (
            <p>name, idNumber, grade, parentName, parentPhone, school, entryDate, monthlyFee</p>
          ) : (
            <p>student, feeType, amount, date, billNumber, note, discount</p>
          )}
          <p className="text-[10px] text-muted-foreground/70">
            Supports English, Dari, Pashto column names. If only one school exists, it's auto-assigned.
          </p>
        </div>

        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={e => e.target.files?.[0] && parseFile(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 mx-auto text-muted-foreground hover:text-foreground">
            <Upload size={24} />
            <span className="text-sm">CSV, XLSX, XLS</span>
          </button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-center gap-2 text-destructive text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Column mapping feedback */}
        {preview.length > 0 && (
          <div className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                Column Detection: {matchedCount}/{totalFields} matched
              </p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${matchedCount >= totalFields * 0.5 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                {matchedCount >= totalFields * 0.5 ? '✓ Good' : '⚠ Check'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(detectedMapping).map(([key, col]) => (
                <span key={key} className={`text-[10px] px-2 py-0.5 rounded-full ${col ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground line-through'}`}>
                  {key}{col ? ` → "${col}"` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Preview table */}
        {preview.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {preview.length} {importType === 'students' ? t('students') : t('fees')} found
            </p>
            <div className="overflow-x-auto border border-border rounded-xl max-h-48">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted sticky top-0">
                    {headers.slice(0, 6).map(k => <th key={k} className="px-2 py-1.5 text-left text-muted-foreground whitespace-nowrap">{k}</th>)}
                    {headers.length > 6 && <th className="px-2 py-1.5 text-muted-foreground">+{headers.length - 6}</th>}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 8).map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {headers.slice(0, 6).map((h, j) => <td key={j} className="px-2 py-1 text-foreground whitespace-nowrap max-w-[120px] truncate">{String(row[h])}</td>)}
                      {headers.length > 6 && <td className="px-2 py-1 text-muted-foreground">…</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={handleImport} disabled={importing}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50">
              {importing ? <><Loader2 size={16} className="animate-spin" /> Importing...</> : `Import ${preview.length} Records`}
            </button>
          </div>
        )}

        {imported > 0 && (
          <div className="space-y-2">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center text-sm font-medium text-green-700 dark:text-green-400 flex items-center justify-center gap-2">
              <Check size={16} /> {imported} records imported successfully!
            </div>
            {skipped > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-2.5 text-center text-xs text-yellow-700 dark:text-yellow-400">
                {skipped} rows skipped (missing name or school match)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportDialog;
