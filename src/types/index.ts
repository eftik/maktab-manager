export interface GradeSection {
  grade: string;
  section: string;
}

export interface School {
  id: string;
  name: string;
  address: string;
  phone: string;
  grades: GradeSection[];
}

export type DiscountType = 'none' | 'percentage' | 'free';

export interface Student {
  id: string;
  name: string;
  idNumber: string;
  grade: string;
  parentName: string;
  parentPhone: string;
  discountType: DiscountType;
  discountValue: number;
  monthlyFee: number;
  entryDate: string;
  status: 'active' | 'archived';
  schoolId: string;
}

export type FeeType = 'tuition' | 'transportation' | 'registration' | 'other';

export interface Payment {
  id: string;
  studentId: string;
  schoolId: string;
  feeType: FeeType;
  customFeeLabel?: string;
  amount: number;
  discount: number;
  finalAmount: number;
  date: string;
  note: string;
  billNumber: string;
}

export type ExpenseCategory = 'salary' | 'electricity' | 'rent' | 'maintenance' | 'supplies' | 'other';

export interface Expense {
  id: string;
  schoolId: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  personName: string;
  date: string;
  billNumber: string;
  staffId?: string;
}

export type StaffRole = 'teacher' | 'guard' | 'admin_staff' | 'cleaner' | 'driver' | 'other';

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  customRole?: string;
  phone: string;
  idNumber: string;
  salary: number;
  entryDate: string;
  exitDate?: string;
  active: boolean;
  schoolId: string;
}

export type Language = 'en' | 'da' | 'ps';
