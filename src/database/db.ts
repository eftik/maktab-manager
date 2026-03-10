import Dexie from "dexie";

export const db = new Dexie("maktab_local_db");

db.version(1).stores({
  fees: "++id, student_name, amount, date, synced",
  expenses: "++id, title, amount, date, synced",
  transactions: "++id, type, amount, category, date, synced",
  sync_queue: "++id, table_name, record_id, operation, created_at"
});