import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  CreateCashExpenseInput,
  CreateNonCashExpenseInput,
  ExpenseItemKind,
  ExpenseItemRow,
  ExpenseRow,
  ExpenseType,
  ExtraKind,
} from "@/types/expense";
import { ensureMoneyNum, ensurePosNum, ensureText } from "@/utils/expense";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

export const expenseRepo = {
  async list(
    userId: string,
    opts?: { seasonId?: string } // undefined = semua season
  ): Promise<ExpenseRow[]> {
    let q = supabase
      .from("v_expenses_with_totals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (opts?.seasonId) {
      q = q.eq("season_id", opts.seasonId);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data || []) as ExpenseRow[];
  },

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
        metadata: {
          category: x.category,
          unit: x.unit,
          ...(x._meta ?? {}),
        },
      };
    });

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
          label: l.stageLabel ?? "Tenaga kerja",
          quantity: null,
          unit_price: null,
          people_count: l.peopleCount,
          days: l.days,
          daily_wage: l.dailyWage,
          purchase_price: null,
          useful_life_years: null,
          salvage_value: null,
          extra_kind: null,
          metadata: { labor_type: l.laborType, jamKerja: l.jamKerja },
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

    // reinsert items baru
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
          label: l.stageLabel ?? "Tenaga kerja",
          quantity: null,
          unit_price: null,
          people_count: l.peopleCount,
          days: l.days,
          daily_wage: l.dailyWage,
          purchase_price: null,
          useful_life_years: null,
          salvage_value: null,
          extra_kind: null,
          metadata: { labor_type: l.laborType, jamKerja: l.jamKerja },
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

    const { error: eDel } = await supabase
      .from("expense_items")
      .delete()
      .eq("expense_id", expenseId);
    if (eDel) throw eDel;

    const payload = items.map((it) => ({ ...it, expense_id: expenseId }));
    const { error: eIns } = await supabase
      .from("expense_items")
      .insert(payload);
    if (eIns) throw eIns;
  },

  async remove(userId: string, id: string): Promise<void> {
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

export function useExpenseService() {
  const { user, authReady } = useAuth();

  const ensureUser = useCallback(() => {
    if (!authReady) throw new Error("Auth masih loading.");
    if (!user) throw new Error("Tidak ada sesi login.");
    return user;
  }, [authReady, user]);

  const listExpenses = useCallback(
    (opts?: { seasonId?: string }) => {
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

/** ========= Hook daftar expenses (single source of truth + anti-race) ========= */
export function useExpenseList(seasonId?: string) {
  const { user } = useAuth();

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // anti-race id
  const reqIdRef = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchOnce = useCallback(async () => {
    if (!user || !seasonId) return;
    setLoading(true);
    const myReq = ++reqIdRef.current;
    try {
      const data = await expenseRepo.list(user.id, { seasonId });
      if (!mounted.current || myReq !== reqIdRef.current) return;
      setRows(data);
    } catch (e) {
      console.warn(e);
    } finally {
      if (!mounted.current || myReq !== reqIdRef.current) return;
      setLoading(false);
    }
  }, [user, seasonId]);

  const refresh = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!user || !seasonId) return;
      const myReq = ++reqIdRef.current; // jadikan ini request terbaru
      if (opts?.force) {
        // opsional: bisa clear rows sementara untuk UX
        // setRows([]);
      }
      setRefreshing(true);
      try {
        const data = await expenseRepo.list(user.id, { seasonId });
        if (!mounted.current || myReq !== reqIdRef.current) return;
        setRows(data);
      } catch (e) {
        console.warn(e);
      } finally {
        if (!mounted.current || myReq !== reqIdRef.current) return;
        setRefreshing(false);
      }
    },
    [user, seasonId]
  );

  // Auto refetch saat user/seasonId berubah
  useEffect(() => {
    setRows([]); // reset tampilan saat ganti season
    if (user && seasonId) {
      refresh({ force: true });
    }
  }, [user?.id, seasonId, refresh]);

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
    loading,
    refreshing,
    rows,
    data,
    grandTotalCash,
    grandTotalNonCash,
    typeInfo,
    fetchOnce,
    refresh,
  };
}
