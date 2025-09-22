import { useAuth } from "@/context/AuthContext";
import { ExpenseRow } from "@/types/expense";
import { ReceiptRow } from "@/types/receipt";
import { SeasonRow } from "@/types/season";
import { yearOf } from "@/utils/date";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { expenseRepo } from "./expenseService";
import { receiptRepo } from "./receiptService";
import { seasonRepo } from "./seasonService";

/**
 * Versi sinkron dengan service terbaru:
 * - seasonId optional (undefined = semua season)
 * - Anti-race untuk setiap fetch (seasons/receipts/expenses)
 * - Refetch kuat ketika seasonId berubah
 * - Tetap sediakan year filter
 */
export function useChartData(initialSeasonId?: string | "all") {
  const { user } = useAuth();

  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  // Peta "all" -> undefined agar service mengambil semua season
  const initial = initialSeasonId === "all" ? undefined : initialSeasonId;
  const [seasonId, setSeasonId] = useState<string | undefined>(initial);
  const [year, setYear] = useState<number | "all">("all");

  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  const mounted = useRef(true);
  const reqSeasonsRef = useRef(0);
  const reqReceiptsRef = useRef(0);
  const reqExpensesRef = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** ====== FETCHERS (anti-race) ====== */
  const fetchSeasons = useCallback(async () => {
    if (!user) return;
    setLoadingSeasons(true);
    const myReq = ++reqSeasonsRef.current;
    try {
      const data = await seasonRepo.list(user.id);
      if (!mounted.current || myReq !== reqSeasonsRef.current) return;
      setSeasons(data);
    } catch (e) {
      console.warn("chartService.fetchSeasons", e);
    } finally {
      if (!mounted.current || myReq !== reqSeasonsRef.current) return;
      setLoadingSeasons(false);
    }
  }, [user]);

  const fetchReceipts = useCallback(async () => {
    if (!user) return;
    setLoadingReceipts(true);
    const myReq = ++reqReceiptsRef.current;
    try {
      const data = await receiptRepo.list(user.id, { seasonId }); // seasonId undefined => semua
      if (!mounted.current || myReq !== reqReceiptsRef.current) return;
      setReceipts(data);
    } catch (e) {
      console.warn("chartService.fetchReceipts", e);
    } finally {
      if (!mounted.current || myReq !== reqReceiptsRef.current) return;
      setLoadingReceipts(false);
    }
  }, [user, seasonId]);

  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    setLoadingExpenses(true);
    const myReq = ++reqExpensesRef.current;
    try {
      const data = await expenseRepo.list(user.id, { seasonId }); // seasonId undefined => semua
      if (!mounted.current || myReq !== reqExpensesRef.current) return;
      setExpenses(data);
    } catch (e) {
      console.warn("chartService.fetchExpenses", e);
    } finally {
      if (!mounted.current || myReq !== reqExpensesRef.current) return;
      setLoadingExpenses(false);
    }
  }, [user, seasonId]);

  /** ====== EFFECTS ====== */
  // Sekali saat mount: ambil seasons
  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  // Setiap kali seasonId berubah → reset data & refetch kuat (menang lawan respons lama)
  useEffect(() => {
    setReceipts([]);
    setExpenses([]);
    if (user) {
      // dengan menaikkan reqId di masing-masing fetch, respons lama tidak bisa override
      fetchReceipts();
      fetchExpenses();
    }
  }, [user?.id, seasonId, fetchReceipts, fetchExpenses]);

  /** ====== DERIVATIVES ====== */
  const yearOptions = useMemo(() => {
    const yearsFromReceipts = receipts.map((r) => yearOf(r.created_at));
    const yearsFromExpenses = expenses.map((e) =>
      e.expense_date ? yearOf(e.expense_date) : yearOf(e.created_at)
    );
    return Array.from(
      new Set([...yearsFromReceipts, ...yearsFromExpenses])
    ).sort((a, b) => a - b);
  }, [receipts, expenses]);

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

  const totalIn = useMemo(
    () => filteredReceipts.reduce((acc, r) => acc + (Number(r.total) || 0), 0),
    [filteredReceipts]
  );

  const totalOut = useMemo(
    () =>
      filteredExpenses.reduce((acc, r) => acc + (Number(r.total_all) || 0), 0),
    [filteredExpenses]
  );

  const loading = loadingSeasons || loadingReceipts || loadingExpenses;

  /** ====== API ====== */
  const refreshAll = useCallback(() => {
    // Paksa request baru (req id naik) agar mengalahkan respons lama
    fetchSeasons();
    fetchReceipts();
    fetchExpenses();
  }, [fetchSeasons, fetchReceipts, fetchExpenses]);

  return {
    // data
    seasons,
    receipts,
    expenses,
    filteredReceipts,
    filteredExpenses,

    // filter
    seasonId,
    setSeasonId, // kirim string | undefined; undefined = semua season
    year,
    setYear,
    yearOptions,

    // aggregates
    totalIn,
    totalOut,

    // loading flags
    loading,
    loadingSeasons,
    loadingReceipts,
    loadingExpenses,

    // actions
    fetchAll: refreshAll,
  };
}
