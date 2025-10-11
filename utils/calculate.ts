import { ChemItem, LaborForm } from "@/types/expense";
import { toNum } from "./number";

export function calcLaborSubtotal(lf: LaborForm): number {
  if (lf?.tipe === "borongan") {
    const kontrak = toNum(lf.hargaBorongan);
    return kontrak >= 0 ? kontrak : 0;
  }
  const orang = toNum(lf.jumlahOrang);
  const hari = toNum(lf.jumlahHari);
  const upah = toNum(lf.upahHarian);
  return orang > 0 && hari > 0 && upah >= 0 ? orang * hari * upah : 0;
}

export const sumChem = (rows: ChemItem[]) => {
  return rows.reduce((acc, r) => {
    const q = toNum(r.qty);
    const p = toNum(r.price);
    return acc + (q > 0 && p >= 0 ? q * p : 0);
  }, 0);
};
