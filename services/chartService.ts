import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { seasonRepo } from "./seasonService";
import { calculateTotalExpense, ExpenseItemRow, transformExpenseToPieSummary } from "@/utils/chart-calculator";

type SeasonLite = {
  id: string;
  start_date: string;
  end_date: string;
  season_no?: number | null;
  season_year?: string | null;
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

  const yearOptions = useMemo(() => {
    const ys = new Set<number>();
    seasons.forEach((s) => {
      const y = Number(s.season_year);
      if (Number.isFinite(y)) ys.add(y); // ignore null/invalid
    });
    return Array.from(ys).sort((a, b) => b - a);
  }, [seasons]);

  const seasonIdsForYear = useMemo(() => {
    if (year === "all" || !seasons.length) return undefined;

    const y = Number(year);
    if (!Number.isFinite(y)) return ["__none__"];

    const ids = seasons
      .filter((s) => Number(s.season_year) === y)
      .map((s) => s.id);

    return ids.length ? ids : ["__none__"];
  }, [year, seasons]);

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

  const refetch = fetchItems;

  const forceRefetch = useCallback(() => {
    setItems([]);
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    setItems([]);
    if (user) fetchItems();
  }, [user?.id, seasonId, seasonIdsForYear, year, fetchItems]);

  const expensePieSummary = useMemo(
    () => transformExpenseToPieSummary(items),
    [items]
  );

  const totalOut = useMemo(
    () => calculateTotalExpense(expensePieSummary),
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
