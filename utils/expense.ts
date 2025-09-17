export const ensurePosNum = (n: unknown, name: string) => {
  if (typeof n !== "number" || Number.isNaN(n) || n <= 0) {
    throw new Error(`${name} harus angka > 0.`);
  }
};

export const ensureMoneyNum = (n: unknown, name: string) => {
  if (typeof n !== "number" || Number.isNaN(n) || n < 0) {
    throw new Error(`${name} harus angka ≥ 0.`);
  }
};

export const ensureText = (s: unknown, name: string) => {
  if (typeof s !== "string" || s.trim().length === 0) {
    throw new Error(`${name} wajib diisi.`);
  }
};
