import { idbGetAll } from "./indexedDB";

export const createBackup = async () => {
  const schools = await idbGetAll("schools");
  const students = await idbGetAll("students");
  const payments = await idbGetAll("payments");
  const expenses = await idbGetAll("expenses");
  const staff = await idbGetAll("staff");

  const backup = {
    createdAt: new Date().toISOString(),
    schools,
    students,
    payments,
    expenses,
    staff
  };

  const json = JSON.stringify(backup, null, 2);

  const blob = new Blob([json], { type: "application/json" });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  const date = new Date().toISOString().split("T")[0];

  a.href = url;
  a.download = `school-finance-backup-${date}.json`;

  a.click();

  URL.revokeObjectURL(url);
};


export const restoreBackup = async (file: File) => {
  const text = await file.text();
  const backup = JSON.parse(text);

  const { idbPutAll } = await import("./indexedDB");

  if (backup.schools) await idbPutAll("schools", backup.schools);
  if (backup.students) await idbPutAll("students", backup.students);
  if (backup.payments) await idbPutAll("payments", backup.payments);
  if (backup.expenses) await idbPutAll("expenses", backup.expenses);
  if (backup.staff) await idbPutAll("staff", backup.staff);

  alert("Backup restored successfully. Please refresh the app.");
};