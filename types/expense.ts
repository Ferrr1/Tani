export type Unit =
  | "gram"
  | "kilogram"
  | "liter"
  | "ikat"
  | "service"
  | "polybag";
export const SATUAN_KIMIA: Unit[] = ["gram", "kilogram", "liter"];
export const UNIT_FERTILIZER: Unit = "kilogram";
export const SEED_UNIT_CHOICES: Unit[] = ["gram", "kilogram"];
export const SEEDLING_UNIT_CHOICES: Unit[] = ["ikat", "polybag"];
export const SERVICE_UNIT: Unit = "service";

export const FERTILIZER_CHOICES = [
  "organik",
  "kandang",
  "urea",
  "phonska",
  "KCL",
  "TSP",
] as const;

export type Category =
  | "seed"
  | "seedling"
  | "fertilizer"
  | "insecticide"
  | "herbicide"
  | "fungicide"
  | "labor_nursery"
  | "labor_land_prep"
  | "labor_planting"
  | "labor_fertilizing"
  | "labor_irrigation"
  | "labor_weeding"
  | "labor_pest_ctrl"
  | "labor_harvest"
  | "labor_postharvest"
  | "tax"
  | "land_rent"
  | "transport"
  | "other";
export type ExpenseType = "cash" | "noncash";

export type ExpenseRow = {
  id: string;
  user_id: string;
  season_id: string;
  type: ExpenseType;
  note: string | null;
  expense_date: string;
  created_at: string;
  updated_at: string;

  total_cash: number; // total baris kind='cash'
  total_noncash_est: number; // total baris kind<>'cash'
  total_all: number; // gabungan
};

export type ExpenseItemKind = "cash" | "labor" | "tool" | "extra";
export type ExtraKind = "tax" | "land_rent" | "transport" | "other";

export type ExpenseItemRow = {
  id: string;
  expense_id: string;
  kind: ExpenseItemKind;
  label: string | null;

  // umum
  quantity: number | null;
  unit_price: number | null;

  // labor
  labor_type: "contract" | "daily";
  hours_per_day: number | null;
  contract_price: number | null;
  prevailing_wage: number | null;
  people_count: number | null;
  days: number | null;
  daily_wage: number | null;

  // tool
  purchase_price: number | null;
  useful_life_years: number | null;
  salvage_value: number | null;

  // extra
  extra_kind: ExtraKind | null;

  // computed
  amount_estimate: number;

  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};

/** ====== CASH input ====== */
export type CashItemInput = {
  category: Category;
  itemName?: string | null;
  unit: Unit;
  quantity: number;
  unitPrice: number;
  _meta?: Record<string, any>;
};

export type CreateCashExpenseInput = {
  seasonId: string;
  items: CashItemInput[];
  note?: string | null;
  expenseDate?: string; // optional override (YYYY-MM-DD)
};

/** ====== Labor form (UI) ====== */
export type LaborForm = {
  tipe: "borongan" | "harian";
  jumlahOrang: string;
  jumlahHari: string;
  jamKerja: string;
  upahHarian: string;
  hargaBorongan?: string; // UI borongan
  upahBerlaku?: string; // UI catatan upah berlaku (optional)
};

/** ====== Tool form (UI) ====== */
export type ToolForm = {
  id: string;
  nama: string;
  jumlah: string;
  hargaBeli: string;
  umurThn: string; // optional
  nilaiSisa: string; // optional
};

/** ====== NonCash form (UI) ====== */
export type NonCashFormValues = {
  labor: {
    nursery: LaborForm;
    land_prep: LaborForm;
    planting: LaborForm;
    fertilizing: LaborForm;
    irrigation: LaborForm;
    weeding: LaborForm;
    pest_ctrl: LaborForm;
    harvest: LaborForm;
    postharvest: LaborForm;
  };
  tools: ToolForm[];
  extras: { tax: string; landRent: string };
};

/** ====== CASH form (UI) ====== */
export type ChemItem = {
  id: string;
  category: Category;
  name?: string;
  unit: Unit;
  qty: string;
  price: string;
};

export type CashFormValues = {
  extras: { tax: string; landRent: string; transport: string };
  labor: {
    nursery: LaborForm;
    land_prep: LaborForm;
    planting: LaborForm;
    fertilizing: LaborForm;
    irrigation: LaborForm;
    weeding: LaborForm;
    pest_ctrl: LaborForm;
    harvest: LaborForm;
    postharvest: LaborForm;
  };
};

/** ====== NONCASH input (payload ke service/DB) — DISCRIMINATED UNION ======
 *  Penting: varian 'contract' TIDAK punya dailyWage; varian 'daily' TIDAK punya contractPrice/prevailingWage.
 *  Service kamu memang memvalidasi:
 *    - contract: contractPrice (required), prevailingWage (required)
 *    - daily: peopleCount, days, dailyWage (required)
 */
export type ContractNonCashLaborInput = {
  laborType: "contract";
  contractPrice: number;
  prevailingWage: number; // service ensureMoneyNum() -> wajib number (0 boleh)
  stageLabel?: string | null;
  jamKerja?: number | null; // disimpan null oleh service saat insert; keep for API parity
  // bidirectional compatibility:
  peopleCount?: 0;
  days?: 0;
  dailyWage?: never;
};

export type DailyNonCashLaborInput = {
  laborType: "daily";
  peopleCount: number;
  days: number;
  dailyWage: number;
  stageLabel?: string | null;
  jamKerja?: number | null;
  // bidirectional compatibility:
  contractPrice?: never;
  prevailingWage?: never;
};

export type NonCashLaborInput =
  | ContractNonCashLaborInput
  | DailyNonCashLaborInput;

export type NonCashToolInput = {
  toolName: string;
  quantity: number;
  purchasePrice: number;
  usefulLifeYears?: number | null;
  salvageValue?: number | null;
  note?: string | null;
};

export type NonCashExtraInput = {
  type: "tax" | "land_rent";
  amount: number;
  note?: string | null;
};

export type CreateNonCashExpenseInput = {
  seasonId: string;
  labors: NonCashLaborInput[];
  tools: NonCashToolInput[];
  extras?: NonCashExtraInput[];
  note?: string | null;
  expenseDate?: string; // optional override (YYYY-MM-DD)
};

export type SeedLine = {
  kind: "seed" | "seedling";
  cropName: string;
  qty: string;
  price: string;
};
