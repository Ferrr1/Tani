// services/chartService.ts
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
  expense_group: "cash" | "noncash" | "TK";
  row_key: string;
  item_kind: "material" | "labor" | "extra" | "tool" | "tax" | "hok";
  item_label: string | null;
  item_name: string | null;
  base_amount: number | null;
  tax_rate_percent: number;
  final_amount: number;
};

type SeasonLite = {
  id: string;
  start_date: string;
  end_date: string;
  season_no?: number | null;
};

export function useExpenseChartData(initialSeasonId?: string) {
  const { user } = useAuth();

  const [seasons, setSeasons] = useState<SeasonLite[]>([]);
  const [seasonId, setSeasonId] = useState<string | undefined>(initialSeasonId);
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

  // ===== Seasons
  const fetchSeasons = useCallback(async () => {
    if (!user) return;
    setLoadingSeasons(true);
    const myReq = ++reqSeasonsRef.current;
    try {
      const data = (await seasonRepo.list(user.id)) as SeasonLite[];
      if (!mounted.current || myReq !== reqSeasonsRef.current) return;
      setSeasons(data);

      // Auto-pick season terbaru jika belum dipilih & year = "all"
      if (!seasonId && year === "all" && data?.length) {
        const latest = [...data].sort(
          (a, b) =>
            new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        )[0];
        setSeasonId(latest.id);
      }
    } finally {
      if (!mounted.current || myReq !== reqSeasonsRef.current) return;
      setLoadingSeasons(false);
    }
  }, [user, seasonId, year]);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  // ===== Tahun options dari seasons
  const yearOptions = useMemo(() => {
    const ys = new Set<number>();
    for (const s of seasons) {
      if (s?.start_date) ys.add(new Date(s.start_date).getFullYear());
      if (s?.end_date) ys.add(new Date(s.end_date).getFullYear());
    }
    return Array.from(ys).sort((a, b) => a - b);
  }, [seasons]);

  // ===== Season IDs yang overlap tahun terpilih
  const seasonIdsForYear = useMemo(() => {
    if (year === "all" || !seasons.length) return undefined;
    const y = Number(year);
    const ids = seasons
      .filter((s) => {
        const y1 = new Date(s.start_date).getFullYear();
        const y2 = new Date(s.end_date).getFullYear();
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        return y >= minY && y <= maxY;
      })
      .map((s) => s.id);
    return ids.length ? ids : ["__none__"]; // jaga supaya IN() tetap valid
  }, [year, seasons]);

  // ===== Fetch items (auto pilih chart view: season vs year)
  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoadingItems(true);
    const myReq = ++reqItemsRef.current;
    try {
      const viewName = seasonId
        ? "v_expense_chart_screen_season"
        : "v_expense_chart_screen_year";

      let q = supabase.from(viewName).select("*").eq("user_id", user.id);

      if (seasonId) {
        q = q.eq("season_id", seasonId);
      } else if (seasonIdsForYear) {
        q = q.in("season_id", seasonIdsForYear);
        if (year !== "all") q = q.eq("year", Number(year));
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
  }, [user, seasonId, seasonIdsForYear, year]);

  // panggilan refetch ringan (tanpa clear)
  const refetch = fetchItems;

  // panggilan refetch keras (clear dulu agar spinner tampil)
  const forceRefetch = useCallback(() => {
    setItems([]);
    fetchItems();
  }, [fetchItems]);

  // clear & fetch saat filter berubah
  useEffect(() => {
    setItems([]);
    if (user) fetchItems();
  }, [user?.id, seasonId, seasonIdsForYear, year, fetchItems]);

  // ===== ringkasan untuk chart
  const expensePieSummary = useMemo(
    () =>
      items.map((r) => ({
        key: r.row_key,
        label: r.item_label ?? r.item_kind.toUpperCase(),
        name: r.item_name,
        amount: Number(r.final_amount) || 0,
        kind: r.item_kind,
        group: r.expense_group, // 'cash' | 'noncash' | 'TK'
      })),
    [items]
  );

  const totalOut = useMemo(
    () => expensePieSummary.reduce((s, x) => s + (Number(x.amount) || 0), 0),
    [expensePieSummary]
  );

  const loading = loadingSeasons || loadingItems;

  return {
    // Filters
    seasons,
    seasonId,
    setSeasonId,
    year,
    setYear,
    yearOptions,

    // Data chart (RAW)
    expenseItems: items,
    expensePieSummary,
    totalOut,

    // Loading
    loading,
    loadingSeasons,
    loadingItems,

    // Actions
    refetch,
    forceRefetch,
  };
}
