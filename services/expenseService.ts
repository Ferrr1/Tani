import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  Category,
  CreateCashExpenseInput,
  CreateNonCashExpenseInput,
  ExpenseItemKind,
  ExpenseItemRow,
  ExpenseRow,
  ExpenseType,
  ExtraKind,
  Unit,
} from "@/types/expense";
import { ensureText, nullIfEmpty } from "@/utils/expense";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ================== Helpers ================== */

const toNumOrNull = (v: any): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toNum0 = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

async function assertExpenseOwnership(userId: string, expenseId: string) {
  const { data, error } = await supabase
    .from("expenses")
    .select("id,user_id,type")
    .eq("id", expenseId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Expense tidak ditemukan.");
  if (data.user_id !== userId) throw new Error("Data bukan milik user ini.");
}

const MATERIAL_CATS: Category[] = [
  "seed",
  "seedling",
  "fertilizer",
  "insecticide",
  "herbicide",
  "fungicide",
];

const EXTRA_CATS: Category[] = ["tax", "land_rent", "transport", "other"];

const isMaterial = (c: any): c is Category =>
  MATERIAL_CATS.includes(c as Category);
const isExtra = (c: any): c is Category => {
  if (!c) return false;
  if (isLaborCat(c)) return false;
  if (MATERIAL_CATS.includes(c as Category)) return false;
  return true;
};
const isLaborCat = (c: any) => typeof c === "string" && c.startsWith("labor_"); // labor_nursery, dst.

/** Bentuk item “lama” agar hydrate lama tetap jalan */
function mkLegacyRow(partial: Partial<ExpenseItemRow>): ExpenseItemRow {
  return {
    id: partial.id ?? "",
    expense_id: partial.expense_id ?? "",
    kind: partial.kind ?? ("cash" as ExpenseItemKind),
    label: partial.label ?? null,
    quantity: partial.quantity ?? null,
    unit_price: partial.unit_price ?? null,
    people_count: partial.people_count ?? null,
    days: partial.days ?? null,
    daily_wage: partial.daily_wage ?? null,
    purchase_price: partial.purchase_price ?? null,
    useful_life_years: partial.useful_life_years ?? null,
    salvage_value: partial.salvage_value ?? null,
    extra_kind: partial.extra_kind ?? null,
    amount_estimate: partial.amount_estimate ?? 0,
    metadata: partial.metadata ?? {},
    created_at: partial.created_at ?? new Date().toISOString(),
    updated_at: partial.updated_at ?? new Date().toISOString(),
  } as ExpenseItemRow;
}

/** ================== Repo ================== */

export const expenseRepo = {
  async list(
    userId: string,
    opts?: { seasonId?: string }
  ): Promise<ExpenseRow[]> {
    let q = supabase
      .from("v_expenses_with_totals_screen")
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
      .from("v_expenses_with_totals_screen")
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as ExpenseRow) ?? null;
  },

  /** ====== CASH: list per tabel baru (untuk UI baru) ====== */
  async listCashMaterials(userId: string, expenseId: string) {
    await assertExpenseOwnership(userId, expenseId);
    const { data, error } = await supabase
      .from("cash_material_items")
      .select("*")
      .eq("expense_id", expenseId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async listCashLabors(userId: string, expenseId: string) {
    await assertExpenseOwnership(userId, expenseId);
    const { data, error } = await supabase
      .from("cash_labor_items")
      .select("*")
      .eq("expense_id", expenseId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async listCashExtras(userId: string, expenseId: string) {
    await assertExpenseOwnership(userId, expenseId);
    const { data, error } = await supabase
      .from("cash_extra_items")
      .select("*")
      .eq("expense_id", expenseId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  /** ========== CASH: read gabungan (kompat lama) ========== */
  async listCashItems(
    userId: string,
    expenseId: string
  ): Promise<ExpenseItemRow[]> {
    // cek ownership + jenis
    const { data: parent, error: e1 } = await supabase
      .from("expenses")
      .select("id,user_id,type")
      .eq("id", expenseId)
      .maybeSingle();
    if (e1) throw e1;
    if (!parent || parent.user_id !== userId)
      throw new Error("Data bukan milik user ini.");
    if (parent.type !== "cash") throw new Error("Jenis expense bukan cash.");

    const [
      { data: mats, error: eM },
      { data: labs, error: eL },
      { data: exs, error: eE },
    ] = await Promise.all([
      supabase
        .from("cash_material_items")
        .select("*")
        .eq("expense_id", expenseId)
        .order("created_at", { ascending: true }),
      supabase
        .from("cash_labor_items")
        .select("*")
        .eq("expense_id", expenseId)
        .order("created_at", { ascending: true }),
      supabase
        .from("cash_extra_items")
        .select("*")
        .eq("expense_id", expenseId)
        .order("created_at", { ascending: true }),
    ]);

    if (eM) throw eM;
    if (eL) throw eL;
    if (eE) throw eE;

    const rows: ExpenseItemRow[] = [];

    // materials → bentuk lama
    (mats || []).forEach((r: any) => {
      rows.push(
        mkLegacyRow({
          id: r.id,
          expense_id: r.expense_id,
          kind: "cash",
          label: r.item_name ?? r.category ?? null,
          quantity: r.quantity,
          unit_price: r.unit_price,
          amount_estimate:
            r.amount_estimate ??
            Number(r.quantity || 0) * Number(r.unit_price || 0),
          metadata: {
            category: r.category, // "seed" | "fertilizer" | ...
            unit: r.unit as Unit,
          },
          created_at: r.created_at,
          updated_at: r.updated_at,
        })
      );
    });

    // labor cash → bentuk lama
    (labs || []).forEach((r: any) => {
      const isContract = r.labor_type === "contract";
      const unitPrice = isContract ? r.contract_price : r.daily_wage;
      const qty = isContract
        ? 1
        : Number(r.people_count || 0) * Number(r.days || 0);
      const stageCode = r.stage_code ?? r.metadata?.category ?? null;

      rows.push(
        mkLegacyRow({
          id: r.id,
          expense_id: r.expense_id,
          kind: "cash",
          label: r.stage_label ?? "Tenaga Kerja",
          quantity: qty,
          unit_price: unitPrice,
          amount_estimate:
            r.amount_estimate ?? Number(qty || 0) * Number(unitPrice || 0),
          metadata: {
            category: stageCode || "labor_generic",
            unit: "service",
            laborType: isContract ? "contract" : "daily",
            peopleCount: r.people_count ?? null,
            days: r.days ?? null,
            jamKerja: r.hours_per_day ?? null,
          },
          created_at: r.created_at,
          updated_at: r.updated_at,
        })
      );
    });

    // extras cash → bentuk lama
    (exs || []).forEach((r: any) => {
      rows.push(
        mkLegacyRow({
          id: r.id,
          expense_id: r.expense_id,
          kind: "cash",
          label: r.note ?? r.extra_kind ?? "Biaya",
          quantity: 1,
          unit_price: r.amount,
          amount_estimate: r.amount,
          metadata: {
            category: r.extra_kind, // "tax" | "land_rent" | "transport"
            unit: "service",
          },
          created_at: r.created_at,
          updated_at: r.updated_at,
        })
      );
    });

    return rows;
  },

  /** ========== NONCASH: read dari tabel baru ========== */
  async listNonCashLabor(
    userId: string,
    expenseId: string
  ): Promise<ExpenseItemRow[]> {
    const { data: parent, error: e1 } = await supabase
      .from("expenses")
      .select("id,user_id,type")
      .eq("id", expenseId)
      .maybeSingle();
    if (e1) throw e1;
    if (!parent || parent.user_id !== userId)
      throw new Error("Data bukan milik user ini.");
    if (parent.type !== "noncash")
      throw new Error("Jenis expense bukan noncash.");

    const { data, error } = await supabase
      .from("noncash_labor_items")
      .select("*")
      .eq("expense_id", expenseId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    return (data || []).map((r: any) => {
      const isContract = r.labor_type === "contract";
      return mkLegacyRow({
        id: r.id,
        expense_id: r.expense_id,
        kind: "labor",
        label: r.stage_label ?? "Tenaga Kerja",

        // kolom umum (legacy)
        quantity: null,
        unit_price: null,

        // kolom labor (legacy)
        people_count: isContract ? null : toNumOrNull(r.people_count),
        days: isContract ? null : toNumOrNull(r.days),
        daily_wage: isContract ? null : toNumOrNull(r.daily_wage),

        amount_estimate: toNum0(r.amount_estimate),

        // simpan semua schema-spesifik ke metadata agar ExpenseItemRow tetap stabil
        metadata: {
          ...(r.metadata ?? {}),
          labor_type: r.labor_type, // 'daily' | 'contract'
          hours_per_day: toNumOrNull(r.hours_per_day), // schema: numeric >= 0
          contract_price: isContract ? toNumOrNull(r.contract_price) : null,
          prevailing_wage: isContract ? toNumOrNull(r.prevailing_wage) : null,
        },

        created_at: r.created_at,
        updated_at: r.updated_at,
      });
    });
  },

  async listNonCashTools(
    userId: string,
    expenseId: string
  ): Promise<ExpenseItemRow[]> {
    const { data: parent, error: e1 } = await supabase
      .from("expenses")
      .select("id,user_id,type")
      .eq("id", expenseId)
      .maybeSingle();
    if (e1) throw e1;
    if (!parent || parent.user_id !== userId)
      throw new Error("Data bukan milik user ini.");
    if (parent.type !== "noncash")
      throw new Error("Jenis expense bukan noncash.");

    const { data, error } = await supabase
      .from("noncash_tool_items")
      .select("*")
      .eq("expense_id", expenseId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    return (data || []).map((r: any) =>
      mkLegacyRow({
        id: r.id,
        expense_id: r.expense_id,
        kind: "tool",
        label: r.tool_name,

        // kolom umum (legacy)
        quantity: toNumOrNull(r.quantity), // schema: numeric > 0
        unit_price: toNumOrNull(r.purchase_price), // schema: numeric >= 0

        // kolom tool (legacy)
        purchase_price: toNumOrNull(r.purchase_price),
        useful_life_years: r.useful_life_years ?? null, // schema: integer > 0 | null
        salvage_value: toNumOrNull(r.salvage_value),

        amount_estimate: toNum0(r.amount_estimate),

        metadata: {
          ...(r.metadata ?? {}),
        },

        created_at: r.created_at,
        updated_at: r.updated_at,
      })
    );
  },

  async listNonCashExtras(
    userId: string,
    expenseId: string
  ): Promise<ExpenseItemRow[]> {
    const { data: parent, error: e1 } = await supabase
      .from("expenses")
      .select("id,user_id,type")
      .eq("id", expenseId)
      .maybeSingle();
    if (e1) throw e1;
    if (!parent || parent.user_id !== userId)
      throw new Error("Data bukan milik user ini.");
    if (parent.type !== "noncash")
      throw new Error("Jenis expense bukan noncash.");

    const { data, error } = await supabase
      .from("noncash_extra_items")
      .select("*")
      .eq("expense_id", expenseId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    return (data || []).map((r: any) =>
      mkLegacyRow({
        id: r.id,
        expense_id: r.expense_id,
        kind: "extra",
        label: r.note ?? r.extra_kind, // tampilkan note kalau ada

        // legacy: extras ditampilkan sebagai 1 x amount
        quantity: 1,
        unit_price: toNum0(r.amount),

        extra_kind: r.extra_kind as ExtraKind,
        amount_estimate: toNum0(r.amount),

        metadata: {
          ...(r.metadata ?? {}),
        },

        created_at: r.created_at,
        updated_at: r.updated_at,
      })
    );
  },
  /** ========== CASH: create via RPC (atomic) ========== */
  async createCash(
    userId: string,
    input: CreateCashExpenseInput
  ): Promise<ExpenseRow> {
    ensureText(input.seasonId, "Season");
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new Error("Minimal satu item cash.");
    }
    await assertSeasonOwnership(userId, input.seasonId);

    const materials = input.items
      .filter((x) => isMaterial(x.category))
      .map((x) => ({
        category: x.category,
        itemName: x.itemName ?? null,
        unit: x.unit as Unit,
        quantity: x.quantity,
        unitPrice: x.unitPrice,
        _meta: { ...(x._meta ?? {}) },
      }));

    const labors = input.items
      .filter(
        (x: any) => isLaborCat(x?._meta?.category) || isLaborCat(x?.category)
      )
      .map((x: any) => {
        const lt = (x?._meta?.laborType ?? "daily") as "daily" | "contract";
        return lt === "contract"
          ? {
              laborType: "contract",
              itemName: x.itemName ?? "Tenaga Kerja",
              contractPrice: x.unitPrice,
              _meta: {
                category: x?._meta?.category ?? null,
                jamKerja: x?._meta?.jamKerja ?? null,
                prevailingWage: x?._meta?.prevailingWage ?? null,
                ...(x._meta ?? {}),
              },
            }
          : {
              laborType: "daily",
              itemName: x.itemName ?? "Tenaga Kerja",
              dailyWage: x.unitPrice,
              _meta: {
                category: x?._meta?.category ?? null,
                peopleCount: x._meta.peopleCount,
                days: x._meta.days,
                jamKerja: x?._meta?.jamKerja ?? null,
                ...(x._meta ?? {}),
              },
            };
      });

    const extras = input.items
      .filter((x) => isExtra(x.category))
      .map((x) => ({
        type: x.category as string,
        amount: x.unitPrice,
        itemName: x.itemName ?? null,
        unit: x.unit,
        _meta: { ...(x._meta ?? {}) },
      }));

    const { data: newId, error } = await supabase.rpc("create_cash_expense", {
      p_user_id: userId,
      p_season_id: input.seasonId,
      p_note: input.note ?? null,
      p_expense_date: input.expenseDate ?? null,
      p_materials: nullIfEmpty(materials),
      p_labors: nullIfEmpty(labors),
      p_extras: nullIfEmpty(extras),
    });
    if (error) throw error;

    const created = await this.getById(userId, String(newId));
    if (!created)
      throw new Error("Gagal mengambil data setelah membuat expense.");
    return created;
  },

  /** ========== CASH: update via RPC (atomic) ========== */
  async updateCash(
    userId: string,
    expenseId: string,
    input: CreateCashExpenseInput
  ): Promise<void> {
    const materials = (input.items ?? [])
      .filter((x) => isMaterial(x.category))
      .map((x) => ({
        category: x.category,
        itemName: x.itemName ?? null,
        unit: x.unit as Unit,
        quantity: x.quantity,
        unitPrice: x.unitPrice,
        _meta: { ...(x._meta ?? {}) },
      }));

    const labors = (input.items ?? [])
      .filter(
        (x: any) => isLaborCat(x?._meta?.category) || isLaborCat(x?.category)
      )
      .map((x: any) => {
        const lt = (x?._meta?.laborType ?? "daily") as "daily" | "contract";
        return lt === "contract"
          ? {
              laborType: "contract",
              itemName: x.itemName ?? "Tenaga Kerja",
              contractPrice: x.unitPrice,
              _meta: {
                category: x?._meta?.category ?? null,
                jamKerja: x?._meta?.jamKerja ?? null,
                prevailingWage: x?._meta?.prevailingWage ?? null,
                ...(x._meta ?? {}),
              },
            }
          : {
              laborType: "daily",
              itemName: x.itemName ?? "Tenaga Kerja",
              dailyWage: x.unitPrice,
              _meta: {
                category: x?._meta?.category ?? null,
                peopleCount: x._meta.peopleCount,
                days: x._meta.days,
                jamKerja: x?._meta?.jamKerja ?? null,
                ...(x._meta ?? {}),
              },
            };
      });

    const extras = (input.items ?? [])
      .filter((x) => isExtra(x.category))
      .map((x) => ({
        type: x.category as string,
        amount: x.unitPrice,
        itemName: x.itemName ?? null,
        unit: x.unit,
        _meta: { ...(x._meta ?? {}) },
      }));

    try {
      const { error } = await supabase.rpc("update_cash_expense", {
        p_user_id: userId,
        p_expense_id: expenseId,
        p_note: input.note ?? null,
        p_expense_date: input.expenseDate ?? null,
        // ⬇️ TANPA stringify
        p_materials: nullIfEmpty(materials),
        p_labors: nullIfEmpty(labors),
        p_extras: nullIfEmpty(extras),
      });
      if (error) throw error;
    } catch (e: any) {
      if (
        e?.code === "P0001" ||
        /melebihi total penerimaan/i.test(e?.message || "")
      ) {
        throw new Error(
          "Total pengeluaran melebihi total penerimaan untuk musim ini."
        );
      }
      if (e?.code === "42804") {
        throw new Error(
          "Tipe data tidak sesuai (enum). Periksa kategori/unit/laborType."
        );
      }
      throw e;
    }
  },

  /** ========== NONCASH: create via RPC (atomic) ========== */
  async createNonCash(
    userId: string,
    input: CreateNonCashExpenseInput
  ): Promise<ExpenseRow> {
    ensureText(input.seasonId, "Season");
    await assertSeasonOwnership(userId, input.seasonId);

    const labors = (input.labors ?? []).map((l) =>
      l.laborType === "contract"
        ? {
            laborType: "contract",
            stageLabel: l.stageLabel ?? "Tenaga Kerja",
            contractPrice: l.contractPrice,
            prevailingWage: l.prevailingWage,
            jamKerja: null,
          }
        : {
            laborType: "daily",
            stageLabel: l.stageLabel ?? "Tenaga Kerja",
            peopleCount: l.peopleCount,
            days: l.days,
            dailyWage: l.dailyWage,
            jamKerja: l.jamKerja ?? null,
          }
    );

    const tools = (input.tools ?? []).map((t) => ({
      toolName: t.toolName,
      quantity: t.quantity,
      purchasePrice: t.purchasePrice,
      usefulLifeYears: t.usefulLifeYears ?? null,
      salvageValue: t.salvageValue ?? null,
      note: t.note ?? null,
    }));

    // IZINKAN "other" juga (selaras dengan ExtrasPanel)
    const extras = (input.extras ?? []).map((e) => ({
      type: e.type, // "tax" | "land_rent" | "other"
      amount: e.amount,
      note: e.note ?? null, // label dari ExtrasPanel masuk ke sini
    }));

    try {
      const { data: newId, error } = await supabase.rpc(
        "create_noncash_expense",
        {
          p_user_id: userId,
          p_season_id: input.seasonId,
          p_note: input.note ?? null,
          p_expense_date: input.expenseDate ?? null,
          p_labors: nullIfEmpty(labors),
          p_tools: nullIfEmpty(tools),
          p_extras: nullIfEmpty(extras),
        }
      );
      if (error) throw error;

      const created = await this.getById(userId, String(newId));
      if (!created)
        throw new Error("Gagal mengambil data setelah membuat expense.");
      return created;
    } catch (e: any) {
      if (
        e?.code === "P0001" ||
        /melebihi total penerimaan/i.test(e?.message || "")
      ) {
        throw new Error(
          "Total pengeluaran melebihi total penerimaan untuk musim ini."
        );
      }
      if (e?.code === "42804") {
        throw new Error(
          "Tipe data tidak sesuai (enum). Periksa laborType/type dll."
        );
      }
      throw e;
    }
  },

  /** ========== NONCASH: update via RPC (atomic) ========== */
  async updateNonCash(
    userId: string,
    expenseId: string,
    input: CreateNonCashExpenseInput
  ): Promise<void> {
    const labors = (input.labors ?? []).map((l) =>
      l.laborType === "contract"
        ? {
            laborType: "contract",
            stageLabel: l.stageLabel ?? "Tenaga Kerja",
            contractPrice: l.contractPrice,
            prevailingWage: l.prevailingWage,
            jamKerja: null,
          }
        : {
            laborType: "daily",
            stageLabel: l.stageLabel ?? "Tenaga Kerja",
            peopleCount: l.peopleCount,
            days: l.days,
            dailyWage: l.dailyWage,
            jamKerja: l.jamKerja ?? null,
          }
    );

    const tools = (input.tools ?? []).map((t) => ({
      toolName: t.toolName,
      quantity: t.quantity,
      purchasePrice: t.purchasePrice,
      usefulLifeYears: t.usefulLifeYears ?? null,
      salvageValue: t.salvageValue ?? null,
      note: t.note ?? null,
    }));

    // HAPUS cast sempit; izinkan "other" juga saat update
    const extras = (input.extras ?? []).map((e) => ({
      type: e.type, // "tax" | "land_rent" | "other"
      amount: e.amount,
      note: e.note ?? null,
    }));

    try {
      const { error } = await supabase.rpc("update_noncash_expense", {
        p_user_id: userId,
        p_expense_id: expenseId,
        p_note: input.note ?? null,
        p_expense_date: input.expenseDate ?? null,
        p_labors: nullIfEmpty(labors),
        p_tools: nullIfEmpty(tools),
        p_extras: nullIfEmpty(extras),
      });
      if (error) throw error;
    } catch (e: any) {
      if (
        e?.code === "P0001" ||
        /melebihi total penerimaan/i.test(e?.message || "")
      ) {
        throw new Error(
          "Total pengeluaran melebihi total penerimaan untuk musim ini."
        );
      }
      if (e?.code === "42804") {
        throw new Error(
          "Tipe data tidak sesuai (enum). Periksa laborType/type dll."
        );
      }
      throw e;
    }
  },

  /** ========== Delete header (cascade RLS/ FK) ========== */
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

/** ================== Hooks (public API) ================== */

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

  // === CASH (baru & lama) ===
  const listCashMaterials = useCallback(
    (expenseId: string) => {
      const u = ensureUser();
      return expenseRepo.listCashMaterials(u.id, expenseId);
    },
    [ensureUser]
  );

  const listCashLabors = useCallback(
    (expenseId: string) => {
      const u = ensureUser();
      return expenseRepo.listCashLabors(u.id, expenseId);
    },
    [ensureUser]
  );

  const listCashExtras = useCallback(
    (expenseId: string) => {
      const u = ensureUser();
      return expenseRepo.listCashExtras(u.id, expenseId);
    },
    [ensureUser]
  );

  const listCashItems = useCallback(
    (expenseId: string) => {
      const u = ensureUser();
      return expenseRepo.listCashItems(u.id, expenseId);
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

  const updateCashExpense = useCallback(
    (expenseId: string, input: CreateCashExpenseInput) => {
      const u = ensureUser();
      return expenseRepo.updateCash(u.id, expenseId, input);
    },
    [ensureUser]
  );

  // === NONCASH ===
  const listNonCashLabor = useCallback(
    (expenseId: string) => {
      const u = ensureUser();
      return expenseRepo.listNonCashLabor(u.id, expenseId);
    },
    [ensureUser]
  );

  const listNonCashTools = useCallback(
    (expenseId: string) => {
      const u = ensureUser();
      return expenseRepo.listNonCashTools(u.id, expenseId);
    },
    [ensureUser]
  );

  const listNonCashExtras = useCallback(
    (expenseId: string) => {
      const u = ensureUser();
      return expenseRepo.listNonCashExtras(u.id, expenseId);
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

      // cash (baru & lama)
      listCashMaterials,
      listCashLabors,
      listCashExtras,
      listCashItems,
      createCashExpense,
      updateCashExpense,

      // noncash
      listNonCashLabor,
      listNonCashTools,
      listNonCashExtras,
      createNonCashExpense,
      updateNonCashExpense,

      deleteExpense,
    }),
    [
      listExpenses,
      getExpenseById,

      listCashMaterials,
      listCashLabors,
      listCashExtras,
      listCashItems,
      createCashExpense,
      updateCashExpense,

      listNonCashLabor,
      listNonCashTools,
      listNonCashExtras,
      createNonCashExpense,
      updateNonCashExpense,

      deleteExpense,
    ]
  );
}

/** ========= Hook daftar expenses ========= */
export function useExpenseList(seasonId?: string) {
  const { user } = useAuth();

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      const myReq = ++reqIdRef.current;
      if (opts?.force) {
        // optional: reset sementara
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

  useEffect(() => {
    setRows([]);
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
