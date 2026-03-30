export const toNum = (input?: unknown): number => {
  if (input == null) return 0;
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (typeof input === "boolean") return input ? 1 : 0;
  let s = String(input).trim();
  if (!s) return 0;
  
  // Hapus semua selain angka, titik, koma, e, E, +, -
  s = s.replace(/[^\d.,eE+\-]/g, "");

  // Logika Normalisasi Indonesia:
  // Jika ada koma, kemungkinan besar itu desimal.
  // Jika ada titik, kemungkinan besar itu ribuan (kecuali jika titik di posisi desimal).
  
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Kasus 1.000,50 -> dot adalah ribuan, comma adalah desimal
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      s = s.split(".").join("").replace(",", "."); // 1000.50
    } else {
      // Kasus 1,000.50 (US style) -> comma adalah ribuan
      s = s.split(",").join("");
    }
  } else if (hasComma) {
    // Hanya ada koma: 1.000,50 -> 1000,50 atau hanya 10,5
    // Mayoritas di Indo: comma adalah desimal.
    // Tapi jika comma di posisi ribuan (misal 1,000), ini ambigu.
    // Kita asumsikan comma adalah desimal jika ada 1 atau 2 angka di belakangnya.
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      s = parts[0] + "." + parts[1];
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasDot) {
    // Hanya ada titik: 1.000 (Indo: 1000) vs 1.5 (US: 1.5)
    // Jika 3 digit di belakang titik, asumsikan ribuan.
    const parts = s.split(".");
    if (parts.length === 2 && parts[1].length === 3) {
      s = s.replace(/\./g, ""); // 1.000 -> 1000
    } else if (parts.length > 2) {
      s = s.replace(/\./g, ""); // 1.000.000 -> 1000000
    }
    // Jika hanya 1 atau 2 digit, asumsikan desimal (misal 1.5 atau 1.50)
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Parsing string ribuan (e.g. "1.000.000") langsung ke number tanpa menebak desimal.
 * Cocok untuk input nominal uang/biaya yang tidak pakai desimal.
 */
export function parseCurrency(input: string | number | null | undefined): number {
  if (!input) return 0;
  // Hapus semua karakter yang bukan angka
  const clean = String(input).replace(/[^\d]/g, "");
  return Number(clean) || 0;
}

export function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}

/** Ambil hanya digit 0-9. */
export function onlyDigits(input: string | number | null | undefined): string {
  const s = String(input ?? "");
  return s.replace(/[^\d]/g, "");
}

/** Format ribuan dengan titik. 1000000 -> "1.000.000" */
export function formatThousands(
  input: string | number | null | undefined
): string {
  const digits = onlyDigits(input);
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Parse "1.000.000" -> 1000000 (number) */
export function parseThousandsToNumber(
  input: string | number | null | undefined
): number {
  return parseCurrency(input);
}

/**
 * Untuk dipakai di onChangeText:
 * - input user apapun -> format ribuan real-time.
 */
export function formatInputThousands(text: string): string {
  return formatThousands(text);
}
