// services/expenseChartService.ts
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { seasonRepo } from "./seasonService";

export type ExpenseItemRow = {
  expense_id: string;
  user_id: string;
  season_id: string;
  expense_date: string; // ISO
  year: number;
  type: "cash" | "noncash";
  expense_group: "cash" | "noncash";
  row_key: string; // unik per baris di view
  item_kind: "material" | "labor" | "extra" | "tool" | "tax";
  item_label: string | null;
  item_name: string | null;
  base_amount: number | null;
  tax_rate_percent: number;
  final_amount: number;
};

export function useExpenseChartData(initialSeasonId?: string | "all") {
  const { user } = useAuth();

  const [seasons, setSeasons] = useState<any[]>([]);
  const initial = initialSeasonId === "all" ? undefined : initialSeasonId;
  const [seasonId, setSeasonId] = useState<string | undefined>(initial);
  const [year, setYear] = useState<number | "all">("all");

  const [items, setItems] = useState<ExpenseItemRow[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);

  const mounted = useRef(true);
  const reqSeasonsRef = useRef(0);
  const reqItemsRef = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** ===== Fetch seasons (user-scoped) ===== */
  const fetchSeasons = useCallback(async () => {
    if (!user) return;
    setLoadingSeasons(true);
    const myReq = ++reqSeasonsRef.current;
    try {
      const data = await seasonRepo.list(user.id);
      if (!mounted.current || myReq !== reqSeasonsRef.current) return;
      setSeasons(data);
    } finally {
      if (!mounted.current || myReq !== reqSeasonsRef.current) return;
      setLoadingSeasons(false);
    }
  }, [user]);

  /** ===== Compute year options from seasons (start/end year) ===== */
  const yearOptions = useMemo(() => {
    const ys = new Set<number>();
    for (const s of seasons) {
      if (s?.start_date) ys.add(new Date(s.start_date).getFullYear());
      if (s?.end_date) ys.add(new Date(s.end_date).getFullYear());
    }
    return Array.from(ys).sort((a, b) => a - b);
  }, [seasons]);

  /** ===== Compute season IDs overlapping selected year (when no specific season is chosen) ===== */
  const seasonIdsForYear = useMemo(() => {
    if (year === "all" || !seasons.length) return undefined;
    const y = Number(year);
    const ids = seasons
      .filter((s) => {
        const y1 = new Date(s.start_date).getFullYear();
        const y2 = new Date(s.end_date).getFullYear();
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        return y >= minY && y <= maxY; // overlap by year
      })
      .map((s) => s.id);
    return ids.length ? ids : ["__none__"]; // avoid .in([]) error
  }, [year, seasons]);

  /** ===== Fetch expense items from view (user-scoped) ===== */
  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoadingItems(true);
    const myReq = ++reqItemsRef.current;
    try {
      let q = supabase
        .from("v_expense_items_screen")
        .select("*")
        .eq("user_id", user.id);

      // Prioritize explicit season filter
      if (seasonId) {
        q = q.eq("season_id", seasonId);
      } else if (seasonIdsForYear) {
        // When filtering by year, use overlapping season ids (align with Report)
        q = q.in("season_id", seasonIdsForYear);
      }

      const { data, error } = await q.order("expense_date", {
        ascending: true,
      });
      if (error) throw error;

      const rows = (data || []) as ExpenseItemRow[];
      if (!mounted.current || myReq !== reqItemsRef.current) return;
      setItems(rows);
    } catch (e) {
      console.warn("expenseChartService.fetchItems", e);
      if (!mounted.current || myReq !== reqItemsRef.current) return;
      setItems([]);
    } finally {
      if (!mounted.current || myReq !== reqItemsRef.current) return;
      setLoadingItems(false);
    }
  }, [user, seasonId, seasonIdsForYear]);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  useEffect(() => {
    if (user) fetchItems();
  }, [user?.id, seasonId, seasonIdsForYear, fetchItems]);

  /** ===== Build pie summary ===== */
  const expensePieSummary = useMemo(
    () =>
      items.map((r) => ({
        key: r.row_key,
        label: r.item_label ?? r.item_kind.toUpperCase(),
        name: r.item_name,
        amount: Number(r.final_amount) || 0,
        kind: r.item_kind,
        group: r.expense_group,
      })),
    [items]
  );

  const totalOut = useMemo(
    () => expensePieSummary.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [expensePieSummary]
  );

  const loading = loadingSeasons || loadingItems;

  return {
    // data sumber
    seasons,
    seasonId,
    setSeasonId,
    year,
    setYear,
    yearOptions,

    // item & ringkasan
    expenseItems: items,
    expensePieSummary,
    totalOut,

    // loading
    loading,
    loadingSeasons,
    loadingItems,
  };
}
