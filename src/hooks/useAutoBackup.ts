import { useEffect, useRef, useCallback } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';


const BACKUP_DEBOUNCE_MS = 30_000; // 30 seconds after last change
const BACKUP_FILE = 'maktab-manager-backup.xlsx';

/**
 * Auto-backs up all app data to cloud storage as an Excel file.
 * Only runs for the owner account, only when online.
 */
export const useAutoBackup = () => {
  const { schools, students, payments, expenses, staffList, isOnline } = useData();
  const { isOwner } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastHashRef = useRef('');

  const generateAndUpload = useCallback(async () => {
    if (!isOwner || !isOnline) return;

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Schools
      const schoolRows = schools.map(s => ({
        ID: s.id, Name: s.name, Address: s.address, Phone: s.phone,
        Grades: (s.grades || []).map(g => `${g.grade}-${g.section}`).join(', '),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(schoolRows.length ? schoolRows : [{}]), 'Schools');

      // Sheet 2: Students
      const studentRows = students.map(s => {
        const school = schools.find(sc => sc.id === s.schoolId);
        return {
          ID: s.id, Name: s.name, IDNumber: s.idNumber, Grade: s.grade,
          ParentName: s.parentName, ParentPhone: s.parentPhone,
          School: school?.name || '', MonthlyFee: s.monthlyFee,
          DiscountType: s.discountType, DiscountValue: s.discountValue,
          EntryDate: s.entryDate, Status: s.status,
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(studentRows.length ? studentRows : [{}]), 'Students');

      // Sheet 3: Payments
      const paymentRows = payments.map(p => {
        const student = students.find(s => s.id === p.studentId);
        const school = schools.find(s => s.id === p.schoolId);
        return {
          ID: p.id, Student: student?.name || '', School: school?.name || '',
          FeeType: p.feeType, CustomLabel: p.customFeeLabel || '',
          Amount: p.amount, Discount: p.discount, FinalAmount: p.finalAmount,
          Date: p.date, BillNumber: p.billNumber, Note: p.note,
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentRows.length ? paymentRows : [{}]), 'Payments');

      // Sheet 4: Expenses
      const expenseRows = expenses.map(e => {
        const school = schools.find(s => s.id === e.schoolId);
        const staff = staffList.find(s => s.id === e.staffId);
        return {
          ID: e.id, School: school?.name || '', Category: e.category,
          Amount: e.amount, PersonName: e.personName, StaffName: staff?.name || '',
          Description: e.description, Date: e.date, BillNumber: e.billNumber,
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseRows.length ? expenseRows : [{}]), 'Expenses');

      // Sheet 5: Staff
      const staffRows = staffList.map(s => {
        const school = schools.find(sc => sc.id === s.schoolId);
        return {
          ID: s.id, Name: s.name, Role: s.role, CustomRole: s.customRole || '',
          Phone: s.phone, IDNumber: s.idNumber, Salary: s.salary,
          School: school?.name || '', EntryDate: s.entryDate,
          ExitDate: s.exitDate || '', Active: s.active ? 'Yes' : 'No',
        };
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staffRows.length ? staffRows : [{}]), 'Staff');

      // Sheet 6: Summary
      const totalIncome = payments.reduce((s, p) => s + p.finalAmount, 0);
      const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
      const summaryRows = [
        { Metric: 'Total Schools', Value: schools.length },
        { Metric: 'Total Students (Active)', Value: students.filter(s => s.status === 'active').length },
        { Metric: 'Total Students (Archived)', Value: students.filter(s => s.status === 'archived').length },
        { Metric: 'Total Staff', Value: staffList.length },
        { Metric: 'Total Income', Value: totalIncome },
        { Metric: 'Total Expenses', Value: totalExp },
        { Metric: 'Net Profit', Value: totalIncome - totalExp },
        { Metric: 'Total Payments', Value: payments.length },
        { Metric: 'Backup Date', Value: new Date().toISOString() },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');

      // Convert to binary
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Upload (upsert) to storage
      const { error } = await supabase.storage
        .from('backups')
        .upload(BACKUP_FILE, blob, { upsert: true, contentType: blob.type });

      if (error) {
        console.error('Backup upload failed:', error.message);
      } else {
        console.log('Auto-backup completed:', new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Backup generation failed:', err);
    }
  }, [schools, students, payments, expenses, staffList, isOwner]);

  // Debounce: trigger backup 30s after last data change
  useEffect(() => {
    if (!isOwner || !isOnline) return;

    // Simple hash to detect actual data changes
    const hash = JSON.stringify([schools.length, students.length, payments.length, expenses.length, staffList.length]);
    if (hash === lastHashRef.current) return;
    lastHashRef.current = hash;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      generateAndUpload();
    }, BACKUP_DEBOUNCE_MS);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [schools, students, payments, expenses, staffList, isOwner, isOnline, generateAndUpload]);

  return { backupNow: generateAndUpload };
};
