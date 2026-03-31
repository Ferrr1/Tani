import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { sum, toNum } from "@/utils/number";
import { normalizeUnitLabel } from "@/utils/unitLabel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { seasonRepo } from "./seasonService";
import { aggregateYearlyTotals, transformReportSeasonRows, transformReportYearRows } from "@/utils/report-calculator";

type YearFilter = number | "all";

export type YearSummaryRow = {
  user_id: string;
  season_id: string;
  year: number | null;
  section: "penerimaan" | "biaya" | "pendapatan" | "rc";
  label: string;
  amount: number;
};

export type ReportDataset = {
  // === Season mode (detail) ===
  production: {
    label: string;
    quantity: number | null;
    unitType: string | null;
    unitPrice: number;
  }[];
  cashByCategory: {
    category: string;
    quantity: number | null;
    unit: string | null;
    unitPrice: number;
  }[];
  cashExtras: { label: string; amount: number }[];

  labor: {
    stageKey?: string;
    stageLabel?: string;
    laborType: "daily" | "contract";
    value: number;
  }[];
  tools: { toolName: string; quantity: number; purchasePrice: number }[];
  extras: { category: string; label: string; amount: number }[];

  laborCashDetail?: {
    qty: number | null;
    unit: string | null;
    unitPrice: number | null;
    amount: number;
  } | null;
  laborNonCashDetail?: {
    qty: number | null;
    unit: string | null;
    unitPrice: number | null;
    amount: number;
  } | null;

  // === Pajak
  taxCash?: number;
  taxNonCash?: number;

  // === Year mode (summary)
  yearRows?: YearSummaryRow[];

  // === Totals
  totalReceipts: number;
  totalCash: number;
  totalLabor: number;
  totalTools: number;
  totalExtras: number;
  totalNonCash: number;
  totalCost: number;
};

export function useReportData(initialSeasonId?: string | "all") {
  const { user } = useAuth();

  const [seasons, setSeasons] = useState<any[]>([]);
  const initial = initialSeasonId === "all" ? undefined : initialSeasonId;
  const [seasonId, setSeasonId] = useState<string | undefined>(initial);
  const [year, setYear] = useState<YearFilter>("all");

  const [loading, setLoading] = useState<boolean>(true);
  const [yearOptions, setYearOptions] = useState<number[]>([]);
  const reqRef = useRef(0);

  // Bootstrap seasons + year options
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) return;
      setLoading(true);
      const myReq = ++reqRef.current;
      try {
        const ss = await seasonRepo.list(user.id);
        if (!alive || myReq !== reqRef.current) return;

        const ordered = (ss || []).sort(
          (a: any, b: any) =>
            new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        );
        setSeasons(ordered);

        const years = new Set<number>();
        ordered.forEach((s: any) => {
          const y = Number(s?.season_year);
          if (Number.isFinite(y)) years.add(y);
        });
        setYearOptions(Array.from(years).sort((a, b) => a - b));

        if (!seasonId && year === "all" && ordered.length > 0) {
          setSeasonId(ordered[0].id);
        }
      } catch (e) {
        console.warn("reportService bootstrap", e);
      } finally {
        if (alive && myReq === reqRef.current) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const seasonIdsForYear = useMemo(() => {
    if (year === "all" || !seasons?.length) return undefined;
    const y = Number(year);
    if (!Number.isFinite(y)) return ["__none__"];
    const ids = seasons
      .filter((s: any) => Number(s?.season_year) === y)
      .map((s: any) => s.id);
    return ids.length ? ids : ["__none__"];
  }, [year, seasons]);

  const buildDataset = useCallback(
    async (opts?: { landFactor?: number }): Promise<ReportDataset> => {
      if (!user) return emptyDataset();
      const landFactor = Number(opts?.landFactor ?? 1) || 1;

      if (!seasonId) {
        let q = supabase.from("v_report_source_year").select("*").eq("user_id", user.id);
        if (seasonIdsForYear) q = q.in("season_id", seasonIdsForYear);

        const { data, error } = await q;
        if (error) throw error;
        return transformReportYearRows(data || [], landFactor);
      }

      let q = supabase
        .from("v_report_source_season")
        .select("*")
        .eq("user_id", user.id)
        .eq("season_id", seasonId);

      const { data, error } = await q;
      if (error) throw error;

      return transformReportSeasonRows(data || [], landFactor);
    },
    [user?.id, seasonId, seasonIdsForYear, year]
  );

  return {
    // sumber & filter
    seasons,
    seasonId,
    setSeasonId,
    year,
    setYear,
    yearOptions,

    // status
    loading,

    // builder dataset
    buildDataset,
  };
}

function emptyDataset(): ReportDataset {
  return {
    production: [],
    cashByCategory: [],
    cashExtras: [], // default kosong
    labor: [],
    tools: [],
    extras: [],
    laborCashDetail: null,
    laborNonCashDetail: null,
    taxCash: 0,
    taxNonCash: 0,
    yearRows: [],
    totalReceipts: 0,
    totalCash: 0,
    totalLabor: 0,
    totalTools: 0,
    totalExtras: 0,
    totalNonCash: 0,
    totalCost: 0,
  };
}
