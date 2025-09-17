export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const yearOf = (iso: string) => new Date(iso).getFullYear();

const pad2 = (n: number) => String(n).padStart(2, "0");
export const fmtDMY = (d?: Date | null) =>
  d ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}` : "";

export const parseDMY = (s: string): Date | null => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((s || "").trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = Number(dd),
    mth = Number(mm),
    y = Number(yyyy);
  if (mth < 1 || mth > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mth - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mth - 1 ||
    date.getDate() !== d
  )
    return null;
  return date;
};
export const toISO = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const fromISOtoDMY = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return fmtDMY(d);
};
