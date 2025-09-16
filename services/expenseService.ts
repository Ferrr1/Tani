// services/expenseService.ts
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ========= Types (mirror DB/view) ========= */
export type ExpenseType = "cash" | "noncash";

/** Sumber: view public.v_expenses_with_totals */
export type ExpenseRow = {
  id: string;
  user_id: string;
  season_id: string;
  type: ExpenseType;
  note: string | null;
  expense_date: string; // (date di DB, string ISO di client)
  created_at: string;
  updated_at: string;

  total_cash: number; // total baris kind='cash'
  total_noncash_est: number; // total baris kind<>'cash'
  total_all: number; // gabungan
};

/** Satu tabel detail serbaguna: public.expense_items */
export type ExpenseItemKind = "cash" | "labor" | "tool" | "extra";
export type ExtraKind = "tax" | "land_rent" | "other";

export type ExpenseItemRow = {
  id: string;
  expense_id: string;
  kind: ExpenseItemKind;
  label: string | null;

  // umum
  quantity: number | null;
  unit_price: number | null;

  // labor
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

/** ========= Payload dari UI =========
 * Perlu kita LUASKAN supaya CashForm bisa kirim:
 * - kategori labor_* (disimpan sebagai item 'cash' + metadata)
 * - extras 'tax' | 'land_rent' | 'transport' (cash)
 * - serta _meta opsional (jamKerja, laborType, peopleCount, days, dsb)
 */
export type CashCategory =
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
  | "transport";

export type Unit = "gram" | "kilogram" | "liter" | "bundle" | "service";

export type CashItemInput = {
  category: CashCategory;
  itemName?: string | null;
  unit: Unit;
  quantity: number; // > 0
  unitPrice: number; // >= 0
  /** passthrough metadata ke kolom JSONB */
  _meta?: Record<string, any>;
};

export type CreateCashExpenseInput = {
  seasonId: string;
  items: CashItemInput[];
  note?: string | null;
  expenseDate?: string; // optional override (YYYY-MM-DD)
};

/** ====== Non-cash types (tetap) ====== */
export type NonCashLaborInput = {
  laborType: "contract" | "daily";
  peopleCount: number; // > 0
  days: number; // > 0
  dailyWage: number; // >= 0
  note?: string | null;
  stageLabel?: string | null; // contoh: "Pesemaian"
};

export type NonCashToolInput = {
  toolName: string;
  quantity: number; // > 0
  purchasePrice: number; // >= 0
  usefulLifeYears?: number | null; // > 0 jika diisi
  salvageValue?: number | null; // >= 0 jika diisi
  note?: string | null;
};

export type NonCashExtraInput = {
  type: "tax" | "land_rent";
  amount: number; // > 0
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

/** ========= Helpers ========= */
const ensurePosNum = (n: unknown, name: string) => {
  if (typeof n !== "number" || Number.isNaN(n) || n <= 0) {
    throw new Error(`${name} harus angka > 0.`);
  }
};
const ensureMoneyNum = (n: unknown, name: string) => {
  if (typeof n !== "number" || Number.isNaN(n) || n < 0) {
    throw new Error(`${name} harus angka ≥ 0.`);
  }
};
const ensureText = (s: unknown, name: string) => {
  if (typeof s !== "string" || s.trim().length === 0) {
    throw new Error(`${name} wajib diisi.`);
  }
};

async function assertSeasonOwnership(userId: string, seasonId: string) {
  const { data, error } = await supabase
    .from("seasons")
    .select("id,user_id")
    .eq("id", seasonId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Season tidak ditemukan.");
  if (data.user_id !== userId) throw new Error("Season bukan milik user ini.");
}

/** ========= Repo (raw) ========= */
export const expenseRepo = {
  /** List (all or by season) – dari view v_expenses_with_totals */
  async list(
    userId: string,
    opts?: { seasonId?: string | "all" }
  ): Promise<ExpenseRow[]> {
    let q = supabase
      .from("v_expenses_with_totals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (opts?.seasonId && opts.seasonId !== "all") {
      q = q.eq("season_id", opts.seasonId);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as ExpenseRow[];
  },

  /** Get single (pakai view biar ada total-*) */
  async getById(userId: string, id: string): Promise<ExpenseRow | null> {
    const { data, error } = await supabase
      .from("v_expenses_with_totals")
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as ExpenseRow) ?? null;
  },

  /** Detail semua item (opsional filter by kind) */
  async listItems(
    userId: string,
    expenseId: string,
    kind?: ExpenseItemKind
  ): Promise<ExpenseItemRow[]> {
    // ownership via parent
    const { data: parent, error: e1 } = await supabase
      .from("expenses")
      .select("id,user_id")
      .eq("id", expenseId)
      .maybeSingle();
    if (e1) throw e1;
    if (!parent || parent.user_id !== userId)
      throw new Error("Data bukan milik user ini.");

    let q = supabase
      .from("expense_items")
      .select("*")
      .eq("expense_id", expenseId)
      .order("created_at", { ascending: true });
    if (kind) q = q.eq("kind", kind);

    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as ExpenseItemRow[];
  },

  /** Create CASH (header + bulk items) */
  async createCash(
    userId: string,
    input: CreateCashExpenseInput
  ): Promise<ExpenseRow> {
    ensureText(input.seasonId, "Season");
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("Minimal satu item cash.");
    }
    await assertSeasonOwnership(userId, input.seasonId);

    const items = input.items.map((x) => {
      ensureText(x.category, "Kategori");
      ensureText(x.unit, "Satuan");
      ensurePosNum(x.quantity, "Jumlah");
      ensureMoneyNum(x.unitPrice, "Harga/satuan");
      return {
        kind: "cash" as const,
        label: (x.itemName ?? x.category) || x.category,
        quantity: x.quantity,
        unit_price: x.unitPrice,
        people_count: null,
        days: null,
        daily_wage: null,
        purchase_price: null,
        useful_life_years: null,
        salvage_value: null,
        extra_kind: null,
        // PENTING: simpan metadata dari _meta (jamKerja, laborType, peopleCount, days, dll)
        metadata: {
          category: x.category,
          unit: x.unit,
          ...(x._meta ?? {}),
        },
      };
    });

    // 1) insert header -> ambil id
    const { data: head, error: eHead } = await supabase
      .from("expenses")
      .insert({
        user_id: userId,
        season_id: input.seasonId,
        type: "cash",
        note: input.note ?? null,
        ...(input.expenseDate ? { expense_date: input.expenseDate } : {}),
      })
      .select("id")
      .single();
    if (eHead) throw eHead;

    const expenseId = head.id as string;

    // 2) bulk insert items; rollback header jika gagal
    const { error: eItems } = await supabase
      .from("expense_items")
      .insert(items.map((it) => ({ ...it, expense_id: expenseId })));
    if (eItems) {
      await supabase.from("expenses").delete().eq("id", expenseId);
      throw eItems;
    }

    const created = await this.getById(userId, expenseId);
    if (!created)
      throw new Error("Gagal mengambil data setelah membuat expense.");
    return created;
  },

  /** Create NON-CASH (header + bulk items: labor/tool/extra) — tetap */
  async createNonCash(
    userId: string,
    input: CreateNonCashExpenseInput
  ): Promise<ExpenseRow> {
    ensureText(input.seasonId, "Season");
    await assertSeasonOwnership(userId, input.seasonId);

    const laborItems = (input.labors || [])
      .map((l) => {
        if (!l) return null;
        ensureText(l.laborType, "Jenis tenaga kerja");
        ensurePosNum(l.peopleCount, "Jumlah orang");
        ensurePosNum(l.days, "Jumlah hari");
        ensureMoneyNum(l.dailyWage, "Upah harian");
        return {
          kind: "labor" as const,
          label: l.stageLabel ?? l.note ?? "Tenaga kerja",
          quantity: null,
          unit_price: null,
          people_count: l.peopleCount,
          days: l.days,
          daily_wage: l.dailyWage,
          purchase_price: null,
          useful_life_years: null,
          salvage_value: null,
          extra_kind: null,
          metadata: { labor_type: l.laborType, note: l.note ?? null },
        };
      })
      .filter(Boolean) as any[];

    const toolItems = (input.tools || [])
      .map((t) => {
        if (!t) return null;
        ensureText(t.toolName, "Nama alat");
        ensurePosNum(t.quantity, "Jumlah alat");
        ensureMoneyNum(t.purchasePrice, "Harga beli");
        if (t.usefulLifeYears != null)
          ensurePosNum(t.usefulLifeYears, "Umur ekonomis");
        if (t.salvageValue != null)
          ensureMoneyNum(t.salvageValue, "Nilai sisa");
        return {
          kind: "tool" as const,
          label: t.toolName,
          quantity: t.quantity,
          unit_price: null,
          people_count: null,
          days: null,
          daily_wage: null,
          purchase_price: t.purchasePrice,
          useful_life_years: t.usefulLifeYears ?? null,
          salvage_value: t.salvageValue ?? null,
          extra_kind: null,
          metadata: { note: t.note ?? null },
        };
      })
      .filter(Boolean) as any[];

    const extraItems = (input.extras || [])
      .map((e) => {
        if (!e) return null;
        ensureText(e.type, "Jenis extras");
        ensurePosNum(e.amount, "Nominal extras");
        return {
          kind: "extra" as const,
          label:
            e.note ??
            (e.type === "tax"
              ? "Pajak"
              : e.type === "land_rent"
              ? "Sewa Lahan"
              : "Biaya"),
          quantity: 1,
          unit_price: e.amount,
          people_count: null,
          days: null,
          daily_wage: null,
          purchase_price: null,
          useful_life_years: null,
          salvage_value: null,
          extra_kind: e.type as ExtraKind,
          metadata: { note: e.note ?? null },
        };
      })
      .filter(Boolean) as any[];

    const items = [...laborItems, ...toolItems, ...extraItems];
    if (items.length === 0) {
      throw new Error("Isi minimal satu data tenaga kerja, alat, atau extras.");
    }

    // 1) header
    const { data: head, error: eHead } = await supabase
      .from("expenses")
      .insert({
        user_id: userId,
        season_id: input.seasonId,
        type: "noncash",
        note: input.note ?? null,
        ...(input.expenseDate ? { expense_date: input.expenseDate } : {}),
      })
      .select("id")
      .single();
    if (eHead) throw eHead;

    const expenseId = head.id as string;

    // 2) bulk items + rollback jika gagal
    const { error: eItems } = await supabase
      .from("expense_items")
      .insert(items.map((it) => ({ ...it, expense_id: expenseId })));
    if (eItems) {
      await supabase.from("expenses").delete().eq("id", expenseId);
      throw eItems;
    }

    const created = await this.getById(userId, expenseId);
    if (!created)
      throw new Error("Gagal mengambil data setelah membuat expense.");
    return created;
  },

  async updateCash(
    userId: string,
    expenseId: string,
    input: CreateCashExpenseInput
  ): Promise<void> {
    // ownership
    const { data: row, error: e0 } = await supabase
      .from("expenses")
      .select("id,user_id,type")
      .eq("id", expenseId)
      .maybeSingle();
    if (e0) throw e0;
    if (!row) throw new Error("Expense tidak ditemukan.");
    if (row.user_id !== userId) throw new Error("Data bukan milik user ini.");
    if (row.type !== "cash") throw new Error("Jenis expense bukan cash.");

    // optional update header (note/expense_date)
    const updates: any = {};
    if (input.note !== undefined) updates.note = input.note;
    if (input.expenseDate) updates.expense_date = input.expenseDate;
    if (Object.keys(updates).length) {
      const { error: eH } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", expenseId);
      if (eH) throw eH;
    }

    // hapus semua items lama
    const { error: eDel } = await supabase
      .from("expense_items")
      .delete()
      .eq("expense_id", expenseId);
    if (eDel) throw eDel;

    // reinsert items baru – bawa metadata dari _meta
    const items = (input.items || []).map((x) => ({
      expense_id: expenseId,
      kind: "cash" as const,
      label: (x.itemName ?? x.category) || x.category,
      quantity: x.quantity,
      unit_price: x.unitPrice,
      people_count: null,
      days: null,
      daily_wage: null,
      purchase_price: null,
      useful_life_years: null,
      salvage_value: null,
      extra_kind: null,
      metadata: {
        category: x.category,
        unit: x.unit,
        ...(x._meta ?? {}),
      },
    }));
    if (items.length === 0) throw new Error("Minimal satu item cash.");
    const { error: eIns } = await supabase.from("expense_items").insert(items);
    if (eIns) throw eIns;
  },

  async updateNonCash(
    userId: string,
    expenseId: string,
    input: CreateNonCashExpenseInput
  ): Promise<void> {
    // ownership & type check
    const { data: row, error: e0 } = await supabase
      .from("expenses")
      .select("id,user_id,type")
      .eq("id", expenseId)
      .maybeSingle();
    if (e0) throw e0;
    if (!row) throw new Error("Expense tidak ditemukan.");
    if (row.user_id !== userId) throw new Error("Data bukan milik user ini.");
    if (row.type !== "noncash") throw new Error("Jenis expense bukan noncash.");

    const headUpd: any = {};
    if (input.note !== undefined) headUpd.note = input.note;
    if (input.expenseDate) headUpd.expense_date = input.expenseDate;
    if (Object.keys(headUpd).length) {
      const { error: eH } = await supabase
        .from("expenses")
        .update(headUpd)
        .eq("id", expenseId);
      if (eH) throw eH;
    }

    const laborItems = (input.labors || [])
      .map((l) => {
        if (!l) return null;
        ensureText(l.laborType, "Jenis tenaga kerja");
        ensurePosNum(l.peopleCount, "Jumlah orang");
        ensurePosNum(l.days, "Jumlah hari");
        ensureMoneyNum(l.dailyWage, "Upah harian");
        return {
          kind: "labor" as const,
          label: l.stageLabel ?? l.note ?? "Tenaga kerja",
          quantity: null,
          unit_price: null,
          people_count: l.peopleCount,
          days: l.days,
          daily_wage: l.dailyWage,
          purchase_price: null,
          useful_life_years: null,
          salvage_value: null,
          extra_kind: null,
          metadata: { labor_type: l.laborType, note: l.note ?? null },
        };
      })
      .filter(Boolean) as any[];

    const toolItems = (input.tools || [])
      .map((t) => {
        if (!t) return null;
        ensureText(t.toolName, "Nama alat");
        ensurePosNum(t.quantity, "Jumlah alat");
        ensureMoneyNum(t.purchasePrice, "Harga beli");
        if (t.usefulLifeYears != null)
          ensurePosNum(t.usefulLifeYears, "Umur ekonomis");
        if (t.salvageValue != null)
          ensureMoneyNum(t.salvageValue, "Nilai sisa");
        return {
          kind: "tool" as const,
          label: t.toolName,
          quantity: t.quantity,
          unit_price: null,
          people_count: null,
          days: null,
          daily_wage: null,
          purchase_price: t.purchasePrice,
          useful_life_years: t.usefulLifeYears ?? null,
          salvage_value: t.salvageValue ?? null,
          extra_kind: null,
          metadata: { note: t.note ?? null },
        };
      })
      .filter(Boolean) as any[];

    const extraItems = (input.extras || [])
      .map((e) => {
        if (!e) return null;
        ensureText(e.type, "Jenis extras");
        ensurePosNum(e.amount, "Nominal extras");
        return {
          kind: "extra" as const,
          label:
            e.note ??
            (e.type === "tax"
              ? "Pajak"
              : e.type === "land_rent"
              ? "Sewa Lahan"
              : "Biaya"),
          quantity: 1,
          unit_price: e.amount,
          people_count: null,
          days: null,
          daily_wage: null,
          purchase_price: null,
          useful_life_years: null,
          salvage_value: null,
          extra_kind: e.type as ExtraKind,
          metadata: { note: e.note ?? null },
        };
      })
      .filter(Boolean) as any[];

    const items = [...laborItems, ...toolItems, ...extraItems];
    if (items.length === 0) {
      throw new Error("Isi minimal satu data tenaga kerja, alat, atau extras.");
    }

    // delete + insert
    const { error: eDel } = await supabase
      .from("expense_items")
      .delete()
      .eq("expense_id", expenseId);
    if (eDel) throw eDel;
    const { error: eIns } = await supabase.from("expense_items").insert(items);
    if (eIns) throw eIns;
  },

  /** Delete satu expense (cascade ke child via FK) */
  async remove(userId: string, id: string): Promise<void> {
    // Ownership check (optional – RLS mestinya cukup)
    const { data: row, error: e0 } = await supabase
      .from("expenses")
      .select("id,user_id")
      .eq("id", id)
      .maybeSingle();
    if (e0) throw e0;
    if (!row) return;
    if (row.user_id !== userId) throw new Error("Data bukan milik user ini.");

    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;
  },
};

/** ========= Hook (Auth aware) ========= */
export function useExpenseService() {
  const { user, loading } = useAuth();

  // STABILKAN referensi fungsi agar tak memicu spam fetch
  const ensureUser = useCallback(() => {
    if (loading) throw new Error("Auth masih loading.");
    if (!user) throw new Error("Tidak ada sesi login.");
    return user;
  }, [loading, user]);

  const listExpenses = useCallback(
    (opts?: { seasonId?: string | "all" }) => {
      const u = ensureUser();
      return expenseRepo.list(u.id, opts);
    },
    [ensureUser]
  );

  const getExpenseById = useCallback(
    (id: string) => {
      const u = ensureUser();
      return expenseRepo.getById(u.id, id);
    },
    [ensureUser]
  );

  const listCashItems = useCallback(
    (expenseId: string) => {
      const u = ensureUser();
      return expenseRepo.listItems(u.id, expenseId, "cash");
    },
    [ensureUser]
  );

  const listNonCashLabor = useCallback(
    (expenseId: string) => {
      const u = ensureUser();
      return expenseRepo.listItems(u.id, expenseId, "labor");
    },
    [ensureUser]
  );

  const listNonCashTools = useCallback(
    (expenseId: string) => {
      const u = ensureUser();
      return expenseRepo.listItems(u.id, expenseId, "tool");
    },
    [ensureUser]
  );

  const listNonCashExtras = useCallback(
    (expenseId: string) => {
      const u = ensureUser();
      return expenseRepo.listItems(u.id, expenseId, "extra");
    },
    [ensureUser]
  );

  const createCashExpense = useCallback(
    (input: CreateCashExpenseInput) => {
      const u = ensureUser();
      return expenseRepo.createCash(u.id, input);
    },
    [ensureUser]
  );

  const createNonCashExpense = useCallback(
    (input: CreateNonCashExpenseInput) => {
      const u = ensureUser();
      return expenseRepo.createNonCash(u.id, input);
    },
    [ensureUser]
  );

  const updateCashExpense = useCallback(
    (expenseId: string, input: CreateCashExpenseInput) => {
      const u = ensureUser();
      return expenseRepo.updateCash(u.id, expenseId, input);
    },
    [ensureUser]
  );

  const updateNonCashExpense = useCallback(
    (input: { expenseId: string } & CreateNonCashExpenseInput) => {
      const u = ensureUser();
      const { expenseId, ...rest } = input;
      return expenseRepo.updateNonCash(u.id, expenseId, rest);
    },
    [ensureUser]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      const u = ensureUser();
      return expenseRepo.remove(u.id, id);
    },
    [ensureUser]
  );

  return useMemo(
    () => ({
      loading,
      listExpenses,
      getExpenseById,
      listCashItems,
      listNonCashLabor,
      listNonCashTools,
      listNonCashExtras,
      createCashExpense,
      createNonCashExpense,
      updateCashExpense,
      updateNonCashExpense,
      deleteExpense,
    }),
    [
      loading,
      listExpenses,
      getExpenseById,
      listCashItems,
      listNonCashLabor,
      listNonCashTools,
      listNonCashExtras,
      createCashExpense,
      createNonCashExpense,
      updateCashExpense,
      updateNonCashExpense,
      deleteExpense,
    ]
  );
}

/** ========= List hook (anti spam, filterable) ========= */
export function useExpenseList(initialSeasonId: string | "all" = "all") {
  const { user, loading } = useAuth();

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seasonId, setSeasonId] = useState<string | "all">(initialSeasonId);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchOnce = useCallback(async () => {
    if (loading || !user) return;
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      if (mounted.current) setLoadingList(true);
      const data = await expenseRepo.list(user.id, { seasonId });
      if (!mounted.current) return;
      setRows(data);
    } catch (e) {
      console.warn(e);
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoadingList(false);
    }
  }, [loading, user, seasonId]);

  useEffect(() => {
    fetchOnce();
  }, [fetchOnce]);

  const refresh = useCallback(async () => {
    if (loading || !user) return;
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      if (mounted.current) setRefreshing(true);
      const data = await expenseRepo.list(user.id, { seasonId });
      if (!mounted.current) return;
      setRows(data);
    } catch (e) {
      console.warn(e);
    } finally {
      inFlight.current = false;
      if (mounted.current) setRefreshing(false);
    }
  }, [loading, user, seasonId]);

  const data = useMemo(() => rows, [rows]);

  const grandTotalCash = useMemo(
    () => data.reduce((acc, r) => acc + (Number(r.total_cash) || 0), 0),
    [data]
  );
  const grandTotalNonCash = useMemo(
    () => data.reduce((acc, r) => acc + (Number(r.total_noncash_est) || 0), 0),
    [data]
  );

  const typeInfo = (t: ExpenseType) =>
    t === "cash"
      ? { label: "Tunai", icon: "cash-outline" as const }
      : { label: "Non Tunai", icon: "cube-outline" as const };

  return {
    loading: loadingList || loading,
    refreshing,
    rows,
    data,
    seasonId,
    setSeasonId,
    grandTotalCash,
    grandTotalNonCash,
    typeInfo,
    fetchOnce,
    refresh,
  };
}
