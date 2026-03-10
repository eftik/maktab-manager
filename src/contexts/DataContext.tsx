import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef
} from "react";

import { supabase } from "../integrations/supabase/client";
import { uid } from "../lib/helpers";
import { idbGetAll, idbPutAll, idbGetQueue, idbSaveQueue, idbAddToQueue } from "../lib/indexedDB";

import type {
  School,
  Student,
  Payment,
  Expense,
  Staff,
  GradeSection,
  DiscountType,
  FeeType,
  ExpenseCategory,
  StaffRole
} from "../types";

interface QueuedMutation {
  id: string;
  table: "schools" | "students" | "payments" | "expenses" | "staff";
  action: "insert" | "update" | "delete";
  data: any;
  localId: string;
  timestamp: number;
}

type SyncStatus = "online" | "offline" | "syncing" | "error";

interface Ctx {
  schools: School[];
  students: Student[];
  payments: Payment[];
  expenses: Expense[];
  staffList: Staff[];

  loading: boolean;
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingSyncCount: number;

  syncNow: () => Promise<void>;

  addSchool: (s: Omit<School, "id">) => Promise<void>;
  updateSchool: (s: School) => Promise<void>;
  deleteSchool: (id: string) => Promise<void>;

  addStudent: (s: Omit<Student, "id">) => Promise<void>;
  updateStudent: (s: Student) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;

  addPayment: (p: Omit<Payment, "id">) => Promise<void>;
  updatePayment: (p: Payment) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;

  addExpense: (e: Omit<Expense, "id">) => Promise<void>;
  updateExpense: (e: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  addStaff: (s: Omit<Staff, "id">) => Promise<void>;
  updateStaff: (s: Staff) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
}

const DataContext = createContext<Ctx | null>(null);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(
    navigator.onLine ? "online" : "offline"
  );

  const [queue, setQueue] = useState<QueuedMutation[]>([]);
  const syncingRef = useRef(false);

  const initializedRef = useRef(false);
  const idMapRef = useRef<Map<string, string>>(new Map());

  /* ---------------- ONLINE / OFFLINE ---------------- */

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setSyncStatus("online");
    };

    const goOffline = () => {
      setIsOnline(false);
      setSyncStatus("offline");
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  /* ---------------- LOAD FROM INDEXEDDB ---------------- */

  useEffect(() => {
    const init = async () => {
      const [
        cachedSchools,
        cachedStudents,
        cachedPayments,
        cachedExpenses,
        cachedStaff,
        cachedQueue
      ] = await Promise.all([
        idbGetAll<School>("schools"),
        idbGetAll<Student>("students"),
        idbGetAll<Payment>("payments"),
        idbGetAll<Expense>("expenses"),
        idbGetAll<Staff>("staff"),
        idbGetQueue()
      ]);

      if (cachedSchools.length) setSchools(cachedSchools);
      if (cachedStudents.length) setStudents(cachedStudents);
      if (cachedPayments.length) setPayments(cachedPayments);
      if (cachedExpenses.length) setExpenses(cachedExpenses);
      if (cachedStaff.length) setStaffList(cachedStaff);

      if (cachedQueue.length) setQueue(cachedQueue);

      initializedRef.current = true;
      setLoading(false);
    };

    init();
  }, []);

  /* ---------------- SAVE CACHE ---------------- */

  useEffect(() => {
    if (initializedRef.current) idbPutAll("schools", schools);
  }, [schools]);

  useEffect(() => {
    if (initializedRef.current) idbPutAll("students", students);
  }, [students]);

  useEffect(() => {
    if (initializedRef.current) idbPutAll("payments", payments);
  }, [payments]);

  useEffect(() => {
    if (initializedRef.current) idbPutAll("expenses", expenses);
  }, [expenses]);

  useEffect(() => {
    if (initializedRef.current) idbPutAll("staff", staffList);
  }, [staffList]);

  useEffect(() => {
    if (initializedRef.current) idbSaveQueue(queue);
  }, [queue]);

  /* ---------------- QUEUE ---------------- */

  const enqueue = useCallback(
    async (m: Omit<QueuedMutation, "id" | "timestamp">) => {
      const mutation: QueuedMutation = {
        ...m,
        id: uid(),
        timestamp: Date.now()
      };

      setQueue((prev) => [...prev, mutation]);
      await idbAddToQueue(mutation);
    },
    []
  );

  /* ---------------- PROCESS QUEUE ---------------- */

  const processQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;

    const pending = await idbGetQueue();
    if (!pending.length) return;

    syncingRef.current = true;
    setSyncStatus("syncing");

    const remaining: QueuedMutation[] = [];

    for (const m of pending) {
      try {
        const resolveId = (id: string) =>
          idMapRef.current.get(id) || id;

        if (m.action === "insert") {
          const rowData = { ...m.data };

          if (rowData.id) delete rowData.id;

          const { data, error } = await (supabase.from(m.table) as any)
            .insert(rowData)
            .select()
            .single();

          if (error) throw error;

          if (data) idMapRef.current.set(m.localId, data.id);
        }

        if (m.action === "update") {
          const realId = resolveId(m.localId);

          const rowData = { ...m.data };
          if (rowData.id) delete rowData.id;

          const { error } = await (supabase.from(m.table) as any)
            .update(rowData)
            .eq("id", realId);

          if (error) throw error;
        }

        if (m.action === "delete") {
          const realId = resolveId(m.localId);

          const { error } = await (supabase.from(m.table) as any)
            .delete()
            .eq("id", realId);

          if (error) throw error;
        }
      } catch (err) {
        console.error("Sync failed:", m);
        remaining.push(m);
      }
    }

    setQueue(remaining);
    await idbSaveQueue(remaining);

    syncingRef.current = false;
    setSyncStatus("online");
  }, []);

  /* ---------------- AUTO SYNC ---------------- */

  useEffect(() => {
    if (isOnline && queue.length) {
      processQueue();
    }
  }, [isOnline, queue.length, processQueue]);

  /* ---------------- CRUD HELPERS ---------------- */

  const tryOnlineOrQueue = useCallback(
    async (
      table: QueuedMutation["table"],
      action: QueuedMutation["action"],
      data: any,
      localId: string,
      updateLocal: () => void
    ) => {
      updateLocal();

      if (navigator.onLine) {
        try {
          await (supabase.from(table) as any)[action](data);
          return;
        } catch {}
      }

      enqueue({ table, action, data, localId });
    },
    [enqueue]
  );

  /* ---------------- SCHOOLS ---------------- */

  const addSchool = async (s: Omit<School, "id">) => {
    const localId = uid();
    const school: School = { ...s, id: localId };

    await tryOnlineOrQueue(
      "schools",
      "insert",
      school,
      localId,
      () => setSchools((p) => [...p, school])
    );
  };

  const updateSchool = async (s: School) => {
    await tryOnlineOrQueue(
      "schools",
      "update",
      s,
      s.id,
      () => setSchools((p) => p.map((x) => (x.id === s.id ? s : x)))
    );
  };

  const deleteSchool = async (id: string) => {
    await tryOnlineOrQueue(
      "schools",
      "delete",
      { id },
      id,
      () => setSchools((p) => p.filter((x) => x.id !== id))
    );
  };

  /* ---------------- STUDENTS ---------------- */

  const addStudent = async (s: Omit<Student, "id">) => {
    const localId = uid();
    const student: Student = { ...s, id: localId };

    await tryOnlineOrQueue(
      "students",
      "insert",
      student,
      localId,
      () => setStudents((p) => [...p, student])
    );
  };

  const updateStudent = async (s: Student) => {
    await tryOnlineOrQueue(
      "students",
      "update",
      s,
      s.id,
      () => setStudents((p) => p.map((x) => (x.id === s.id ? s : x)))
    );
  };

  const deleteStudent = async (id: string) => {
    await tryOnlineOrQueue(
      "students",
      "delete",
      { id },
      id,
      () => setStudents((p) => p.filter((x) => x.id !== id))
    );
  };

  /* ---------------- PAYMENTS ---------------- */

  const addPayment = async (p: Omit<Payment, "id">) => {
    const localId = uid();
    const payment: Payment = { ...p, id: localId };

    await tryOnlineOrQueue(
      "payments",
      "insert",
      payment,
      localId,
      () => setPayments((x) => [...x, payment])
    );
  };

  const updatePayment = async (p: Payment) => {
    await tryOnlineOrQueue(
      "payments",
      "update",
      p,
      p.id,
      () => setPayments((x) => x.map((a) => (a.id === p.id ? p : a)))
    );
  };

  const deletePayment = async (id: string) => {
    await tryOnlineOrQueue(
      "payments",
      "delete",
      { id },
      id,
      () => setPayments((x) => x.filter((a) => a.id !== id))
    );
  };

  /* ---------------- EXPENSES ---------------- */

  const addExpense = async (e: Omit<Expense, "id">) => {
    const localId = uid();
    const expense: Expense = { ...e, id: localId };

    await tryOnlineOrQueue(
      "expenses",
      "insert",
      expense,
      localId,
      () => setExpenses((p) => [...p, expense])
    );
  };

  const updateExpense = async (e: Expense) => {
    await tryOnlineOrQueue(
      "expenses",
      "update",
      e,
      e.id,
      () => setExpenses((p) => p.map((x) => (x.id === e.id ? e : x)))
    );
  };

  const deleteExpense = async (id: string) => {
    await tryOnlineOrQueue(
      "expenses",
      "delete",
      { id },
      id,
      () => setExpenses((p) => p.filter((x) => x.id !== id))
    );
  };

  /* ---------------- STAFF ---------------- */

  const addStaff = async (s: Omit<Staff, "id">) => {
    const localId = uid();
    const staff: Staff = { ...s, id: localId };

    await tryOnlineOrQueue(
      "staff",
      "insert",
      staff,
      localId,
      () => setStaffList((p) => [...p, staff])
    );
  };

  const updateStaff = async (s: Staff) => {
    await tryOnlineOrQueue(
      "staff",
      "update",
      s,
      s.id,
      () => setStaffList((p) => p.map((x) => (x.id === s.id ? s : x)))
    );
  };

  const deleteStaff = async (id: string) => {
    await tryOnlineOrQueue(
      "staff",
      "delete",
      { id },
      id,
      () => setStaffList((p) => p.filter((x) => x.id !== id))
    );
  };

  return (
    <DataContext.Provider
      value={{
        schools,
        students,
        payments,
        expenses,
        staffList,

        loading,
        isOnline,
        syncStatus,
        pendingSyncCount: queue.length,
        syncNow: processQueue,

        addSchool,
        updateSchool,
        deleteSchool,

        addStudent,
        updateStudent,
        deleteStudent,

        addPayment,
        updatePayment,
        deletePayment,

        addExpense,
        updateExpense,
        deleteExpense,

        addStaff,
        updateStaff,
        deleteStaff
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);

  if (!ctx) {
    throw new Error("useData must be used inside DataProvider");
  }

  return ctx;
};