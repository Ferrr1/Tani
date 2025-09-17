export const ensureDates = (start: string, end: string) => {
  const d1 = new Date(start);
  const d2 = new Date(end);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) {
    throw new Error("Format tanggal tidak valid (YYYY-MM-DD).");
  }
  if (d2.getTime() < d1.getTime()) {
    throw new Error("Tanggal selesai harus setelah/sama dengan tanggal mulai.");
  }
};
