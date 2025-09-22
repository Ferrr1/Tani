import { useAuth } from "@/context/AuthContext";
import { expenseRepo } from "@/services/expenseService";
import { receiptRepo } from "@/services/receiptService";
import { seasonRepo } from "@/services/seasonService";
import type { ExpenseRow } from "@/types/expense";
import type { ReceiptRow } from "@/types/receipt";
import type { SeasonRow } from "@/types/season";
import { yearOf } from "@/utils/date";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ReportProductionItem = {
  label: string;
  quantity: number;
  unitType: string | null;
  unitPrice: number; // harga/satuan
  total: number; // quantity * unitPrice
};

export type ReportCashItem = {
  category: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  total: number;
};

export type ReportLaborItem = {
  stageLabel: string | null;
  laborType: "daily" | "contract";
  peopleCount: number;
  days: number;
  dailyWage: number;
  value: number; // peopleCount*days*dailyWage OR contract total
  hok: number; // HOK estimasi (lihat aturan di bawah)
};

export type ReportToolItem = {
  toolName: string;
  quantity: number;
  purchasePrice: number;
  total: number;
};

export type ReportExtraItem = {
  kind: "tax" | "land_rent" | "other";
  label: string;
  amount: number;
};

export type ReportDataset = {
  seasons: SeasonRow[];
  yearOptions: number[];
  receipts: ReceiptRow[];
  expenses: ExpenseRow[];
  production: ReportProductionItem[]; // penerimaan
  cashByCategory: ReportCashItem[]; // biaya tunai (per kategori)
  labor: ReportLaborItem[]; // non tunai: tenaga kerja
  tools: ReportToolItem[]; // non tunai: alat
  extras: ReportExtraItem[]; // non tunai: biaya lain (tax/land_rent/other)
  totalReceipts: number;
  totalCash: number;
  totalLabor: number;
  totalTools: number;
  totalExtras: number;
  totalNonCash: number;
  totalCost: number;
};

type BuildOptions = {
  landFactor?: number;
  standardDailyWage?: number;
};

async function fetchAllExpenseItemsFor(userId: string, expenseIds: string[]) {
  const results = await Promise.all(
    expenseIds.map(async (id) => {
      const [cash, labor, tools, extras] = await Promise.all([
        expenseRepo.listItems(userId, id, "cash"),
        expenseRepo.listItems(userId, id, "labor"),
        expenseRepo.listItems(userId, id, "tool"),
        expenseRepo.listItems(userId, id, "extra"),
      ]);
      return { id, cash, labor, tools, extras };
    })
  );
  return results;
}

/** ===== Hook utama: gunakan di halaman Report ===== */
export function useReportData(initialSeasonId: string | "all" = "all") {
  const { user } = useAuth();

  // sumber
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  // filter
  const [seasonId, setSeasonId] = useState<string | "all">(initialSeasonId);
  const [year, setYear] = useState<number | "all">("all");

  // loading flags
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  // guards
  const mounted = useRef(true);
  const inFlight = useRef({ seasons: false, receipts: false, expenses: false });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** fetchers */
  const fetchSeasons = useCallback(async () => {
    if (!user) return;
    if (inFlight.current.seasons) return;
    inFlight.current.seasons = true;
    try {
      if (mounted.current) setLoadingSeasons(true);
      const data = await seasonRepo.list(user.id);
      if (!mounted.current) return;
      setSeasons(data);
    } catch (e) {
      console.warn("reportService.fetchSeasons", e);
    } finally {
      inFlight.current.seasons = false;
      if (mounted.current) setLoadingSeasons(false);
    }
  }, [user]);

  const fetchReceipts = useCallback(async () => {
    if (!user) return;
    if (inFlight.current.receipts) return;
    inFlight.current.receipts = true;
    try {
      if (mounted.current) setLoadingReceipts(true);
      const data = await receiptRepo.list(user.id, { seasonId });
      if (!mounted.current) return;
      setReceipts(data);
    } catch (e) {
      console.warn("reportService.fetchReceipts", e);
    } finally {
      inFlight.current.receipts = false;
      if (mounted.current) setLoadingReceipts(false);
    }
  }, [user, seasonId]);

  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    if (inFlight.current.expenses) return;
    inFlight.current.expenses = true;
    try {
      if (mounted.current) setLoadingExpenses(true);
      const data = await expenseRepo.list(user.id, { seasonId });
      if (!mounted.current) return;
      setExpenses(data);
    } catch (e) {
      console.warn("reportService.fetchExpenses", e);
    } finally {
      inFlight.current.expenses = false;
      if (mounted.current) setLoadingExpenses(false);
    }
  }, [user, seasonId]);

  // initial
  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);
  useEffect(() => {
    fetchReceipts();
    fetchExpenses();
  }, [seasonId, fetchReceipts, fetchExpenses]);

  /** years (dari data aktif) */
  const yearOptions = useMemo(() => {
    const rYears = receipts.map((r) => yearOf(r.created_at));
    const eYears = expenses.map((e) =>
      e.expense_date ? yearOf(e.expense_date) : yearOf(e.created_at)
    );
    return Array.from(new Set([...rYears, ...eYears])).sort((a, b) => a - b);
  }, [receipts, expenses]);

  /** filter by year (eksklusif vs season diputuskan di UI) */
  const filteredReceipts = useMemo(() => {
    if (year === "all") return receipts;
    return receipts.filter((r) => yearOf(r.created_at) === year);
  }, [receipts, year]);
  const filteredExpenses = useMemo(() => {
    if (year === "all") return expenses;
    return expenses.filter(
      (e) =>
        (e.expense_date ? yearOf(e.expense_date) : yearOf(e.created_at)) ===
        year
    );
  }, [expenses, year]);

  /** ===== Build dataset detail (items) =====
   * Agar bisa dipakai export PDF, sediakan fungsi builder dengan opsi konversi
   */
  const buildDataset = useCallback(
    async (opts?: BuildOptions): Promise<ReportDataset> => {
      const landFactor = opts?.landFactor ?? 1;
      const standardDailyWage = opts?.standardDailyWage ?? 0;

      const _receipts = filteredReceipts;
      const _expenses = filteredExpenses;

      // PRODUKSI
      const production: ReportProductionItem[] = _receipts.map((r) => {
        const quantity = Number(r.quantity) || 0;
        const unitPrice = Number(r.unit_price) || 0;
        const total = quantity * unitPrice;
        return {
          label: "Penerimaan (hasil panen)",
          quantity: quantity * landFactor,
          unitType: r.unit_type ?? null,
          unitPrice,
          total: total * landFactor,
        };
      });

      // EXPENSE ITEMS (per expense)
      const expenseIds = _expenses.map((e) => e.id);
      const itemsBatches =
        user && expenseIds.length
          ? await fetchAllExpenseItemsFor(user.id, expenseIds)
          : [];

      // gabungkan semua jenis
      const cashItems = itemsBatches.flatMap((b: any) => b.cash);
      const laborItems = itemsBatches.flatMap((b: any) => b.labor);
      const toolItems = itemsBatches.flatMap((b: any) => b.tools);
      const extraItems = itemsBatches.flatMap((b: any) => b.extras);

      // CASH -> per kategori (metadata.category, metadata.unit)
      const cashByCategory: ReportCashItem[] = cashItems.map((it: any) => {
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unit_price) || 0;
        const total = qty * price;
        const unit = (it.metadata && (it.metadata as any).unit) || null;
        const category =
          (it.metadata && (it.metadata as any).category) ||
          it.label ||
          "Lainnya";
        return {
          category,
          quantity: qty * landFactor,
          unit,
          unitPrice: price,
          total: total * landFactor,
        };
      });

      // LABOR
      const labor: ReportLaborItem[] = laborItems.map((it: any) => {
        const people = Number(it.people_count) || 0;
        const days = Number(it.days) || 0;
        const wage = Number(it.daily_wage) || 0;
        const value = people * days * wage;
        const laborType =
          (it.metadata && (it.metadata as any).labor_type) === "contract"
            ? "contract"
            : "daily";
        const stageLabel = it.label ?? null;

        // HOK:
        // - daily: HOK = people * days
        // - contract: HOK = (value / standardDailyWage) jika standardDailyWage > 0
        let hok = 0;
        if (laborType === "daily") {
          hok = people * days;
        } else if (standardDailyWage > 0) {
          hok = value / standardDailyWage;
        }

        return {
          stageLabel,
          laborType,
          peopleCount: people * landFactor,
          days,
          dailyWage: wage,
          value: value * landFactor,
          hok: hok * landFactor,
        };
      });

      // TOOLS
      const tools: ReportToolItem[] = toolItems.map((it: any) => {
        const qty = Number(it.quantity) || 0;
        const price = Number(it.purchase_price) || 0;
        const total = qty * price;
        return {
          toolName: it.label ?? "Alat",
          quantity: qty * landFactor,
          purchasePrice: price,
          total: total * landFactor,
        };
      });

      // EXTRAS
      const extras: ReportExtraItem[] = extraItems.map((it: any) => {
        const kind: ReportExtraItem["kind"] =
          it.extra_kind === "tax"
            ? "tax"
            : it.extra_kind === "land_rent"
            ? "land_rent"
            : "other";
        const amount = Number(it.unit_price) || 0;
        return {
          kind,
          label:
            it.label ??
            (kind === "tax"
              ? "Pajak"
              : kind === "land_rent"
              ? "Sewa Lahan"
              : "Biaya"),
          amount: amount * landFactor,
        };
      });

      // Aggregates
      const totalReceipts = production.reduce((a, r) => a + r.total, 0);
      const totalCash = cashByCategory.reduce((a, r) => a + r.total, 0);
      const totalLabor = labor.reduce((a, r) => a + r.value, 0);
      const totalTools = tools.reduce((a, r) => a + r.total, 0);
      const totalExtras = extras.reduce((a, r) => a + r.amount, 0);
      const totalNonCash = totalLabor + totalTools + totalExtras;
      const totalCost = totalCash + totalNonCash;

      return {
        seasons,
        yearOptions,
        receipts: _receipts,
        expenses: _expenses,
        production,
        cashByCategory,
        labor,
        tools,
        extras,
        totalReceipts,
        totalCash,
        totalLabor,
        totalTools,
        totalExtras,
        totalNonCash,
        totalCost,
      };
    },
    [filteredReceipts, filteredExpenses, seasons, yearOptions, user]
  );

  const loading = loadingSeasons || loadingReceipts || loadingExpenses;

  return {
    // filters
    seasonId,
    setSeasonId,
    year,
    setYear,
    seasons,
    yearOptions,

    // loader
    loading,

    // actions
    refreshAll: () => {
      fetchSeasons();
      fetchReceipts();
      fetchExpenses();
    },

    // main builder (bisa dipakai UI & export PDF)
    buildDataset,
  };
}
