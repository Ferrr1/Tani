// services/chartService.ts
import { useAuth } from "@/context/AuthContext";
import { ExpenseRow } from "@/types/expense";
import { ReceiptRow } from "@/types/receipt";
import { SeasonRow } from "@/types/season";
import { yearOf } from "@/utils/date";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { expenseRepo } from "./expenseService";
import { receiptRepo } from "./receiptService";
import { seasonRepo } from "./seasonService";

export function useChartData(initialSeasonId: string | "all" = "all") {
  const { user, loading: authLoading } = useAuth();

  // ===== State sumber data =====
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  // ===== State filter =====
  const [seasonId, setSeasonId] = useState<string | "all">(initialSeasonId);
  const [year, setYear] = useState<number | "all">("all");

  // ===== Loading flags =====
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  // guards
  const mounted = useRef(true);
  const inFlightSeasons = useRef(false);
  const inFlightReceipts = useRef(false);
  const inFlightExpenses = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** ===== Fetch Seasons ===== */
  const fetchSeasons = useCallback(async () => {
    if (authLoading || !user) return;
    if (inFlightSeasons.current) return;
    inFlightSeasons.current = true;
    try {
      if (mounted.current) setLoadingSeasons(true);
      const data = await seasonRepo.list(user.id);
      if (!mounted.current) return;
      setSeasons(data);
    } catch (e) {
      console.warn("chartService.fetchSeasons", e);
    } finally {
      inFlightSeasons.current = false;
      if (mounted.current) setLoadingSeasons(false);
    }
  }, [authLoading, user]);

  /** ===== Fetch Receipts (by season filter) ===== */
  const fetchReceipts = useCallback(async () => {
    if (authLoading || !user) return;
    if (inFlightReceipts.current) return;
    inFlightReceipts.current = true;
    try {
      if (mounted.current) setLoadingReceipts(true);
      const data = await receiptRepo.list(user.id, { seasonId });
      if (!mounted.current) return;
      setReceipts(data);
    } catch (e) {
      console.warn("chartService.fetchReceipts", e);
    } finally {
      inFlightReceipts.current = false;
      if (mounted.current) setLoadingReceipts(false);
    }
  }, [authLoading, user, seasonId]);

  /** ===== Fetch Expenses (by season filter) ===== */
  const fetchExpenses = useCallback(async () => {
    if (authLoading || !user) return;
    if (inFlightExpenses.current) return;
    inFlightExpenses.current = true;
    try {
      if (mounted.current) setLoadingExpenses(true);
      const data = await expenseRepo.list(user.id, { seasonId });
      if (!mounted.current) return;
      setExpenses(data);
    } catch (e) {
      console.warn("chartService.fetchExpenses", e);
    } finally {
      inFlightExpenses.current = false;
      if (mounted.current) setLoadingExpenses(false);
    }
  }, [authLoading, user, seasonId]);

  /** ===== Initial loads ===== */
  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  useEffect(() => {
    // muat data setiap seasonId berubah
    fetchReceipts();
    fetchExpenses();
  }, [seasonId, fetchReceipts, fetchExpenses]);

  /** ===== Year options (dibangun dari data yang sedang aktif) ===== */
  const yearOptions = useMemo(() => {
    const yearsFromReceipts = receipts.map((r) => yearOf(r.created_at));
    const yearsFromExpenses = expenses.map((e) =>
      e.expense_date ? yearOf(e.expense_date) : yearOf(e.created_at)
    );
    return Array.from(
      new Set([...yearsFromReceipts, ...yearsFromExpenses])
    ).sort((a, b) => a - b);
  }, [receipts, expenses]);

  /** ===== Filter by year (opsional; UI: eksklusif dgn season) ===== */
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

  /** ===== Aggregates ===== */
  const totalIn = useMemo(
    () => filteredReceipts.reduce((acc, r) => acc + (Number(r.total) || 0), 0),
    [filteredReceipts]
  );

  const totalOut = useMemo(
    () =>
      filteredExpenses.reduce((acc, r) => acc + (Number(r.total_all) || 0), 0),
    [filteredExpenses]
  );

  const loading =
    authLoading || loadingSeasons || loadingReceipts || loadingExpenses;

  /** ===== API ===== */
  return {
    // data sumber
    seasons,
    receipts,
    expenses,

    // data terfilter
    filteredReceipts,
    filteredExpenses,

    // filter state
    seasonId,
    setSeasonId,
    year,
    setYear,
    yearOptions,

    // aggregate
    totalIn,
    totalOut,

    // loading
    loading,
    loadingSeasons,
    loadingReceipts,
    loadingExpenses,

    // actions
    fetchAll: () => {
      fetchSeasons();
      fetchReceipts();
      fetchExpenses();
    },
  };
}
