// services/reportService.ts
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { normalizeUnitLabel } from "@/utils/unitLabel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { seasonRepo } from "./seasonService";

type YearFilter = number | "all";

function num(x: any): number {
  const n = typeof x === "string" ? parseFloat(x) : Number(x);
  return Number.isFinite(n) ? n : 0;
}
function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}

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

  // === Pajak (diambil dari kedua sisi, tidak masuk total biaya) ===
  taxCash?: number; // total pajak sisi cash (sudah dikalikan landFactor)
  taxNonCash?: number; // total pajak sisi noncash (sudah dikalikan landFactor)

  // === Year mode (summary) ===
  yearRows?: YearSummaryRow[];

  // === Totals (selalu ada) ===
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
          if (s?.start_date) years.add(new Date(s.start_date).getFullYear());
          if (s?.end_date) years.add(new Date(s.end_date).getFullYear());
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

  // season ids yang overlap tahun (untuk mode per-tahun)
  const seasonIdsForYear = useMemo(() => {
    if (year === "all" || !seasons?.length) return undefined;
    const y = Number(year);
    const ids = seasons
      .filter((s: any) => {
        const y1 = new Date(s.start_date).getFullYear();
        const y2 = new Date(s.end_date).getFullYear();
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        return y >= minY && y <= maxY;
      })
      .map((s: any) => s.id);
    return ids.length ? ids : ["__none__"];
  }, [year, seasons]);

  // === Builder utama: pilih view berdasarkan filter (season vs year)
  const buildDataset = useCallback(
    async (opts?: { landFactor?: number }): Promise<ReportDataset> => {
      if (!user) return emptyDataset();
      const landFactor = Number(opts?.landFactor ?? 1) || 1;

      // =========================
      // MODE YEAR (summary only)
      // =========================
      if (!seasonId) {
        type YRow = {
          user_id: string;
          season_id: string;
          year: number | null;
          section: "penerimaan" | "biaya" | "pendapatan" | "rc";
          label: string | null;
          amount: number | null;
        };

        let q = supabase
          .from("v_report_source_year")
          .select("*")
          .eq("user_id", user.id);

        if (seasonIdsForYear) {
          q = q.in("season_id", seasonIdsForYear);
          if (year !== "all") q = q.eq("year", Number(year));
        }

        const { data, error } = await q;
        if (error) throw error;

        const rows = (data || []) as YRow[];

        const yearRows: YearSummaryRow[] = rows.map((r) => ({
          user_id: r.user_id,
          season_id: r.season_id,
          year: r.year,
          section: r.section,
          label: (r.label ?? "").trim(),
          amount: num(r.amount),
        }));

        const totalReceipts = sum(
          yearRows
            .filter((x) => x.section === "penerimaan")
            .map((x) => x.amount)
        );
        const totalCash = sum(
          yearRows
            .filter(
              (x) => x.section === "biaya" && /^Biaya Tunai MT /i.test(x.label)
            )
            .map((x) => x.amount)
        );
        const totalNonCash = sum(
          yearRows
            .filter(
              (x) =>
                x.section === "biaya" && /^Biaya Non Tunai MT /i.test(x.label)
            )
            .map((x) => x.amount)
        );
        const totalCost = sum(
          yearRows
            .filter(
              (x) => x.section === "biaya" && /^Biaya Total MT /i.test(x.label)
            )
            .map((x) => x.amount)
        );

        return {
          production: [],
          cashByCategory: [],
          labor: [],
          tools: [],
          extras: [],
          laborCashDetail: null,
          laborNonCashDetail: null,

          // pajak tidak disediakan di year summary (sesuai view)
          taxCash: 0,
          taxNonCash: 0,

          yearRows,

          totalReceipts,
          totalCash,
          totalLabor: 0,
          totalTools: 0,
          totalExtras: 0,
          totalNonCash,
          totalCost,
        };
      }

      // =========================
      // MODE SEASON (detail)
      // =========================
      type Row = {
        user_id: string;
        season_id: string;
        year: number | null;
        section:
          | "production"
          | "cash_detail"
          | "cash_labor_total"
          | "noncash_labor_total"
          | "noncash_tool_detail"
          | "noncash_detail"
          | "cash_tax_info" // <— pajak cash (info-only)
          | "noncash_tax_info"; // <— pajak noncash (info-only)
        label: string | null;
        name: string | null;
        qty: number | null;
        unit: string | null;
        unit_price: number | null;
        amount: number | null;
      };

      let q = supabase
        .from("v_report_source_season")
        .select("*")
        .eq("user_id", user.id)
        .eq("season_id", seasonId);

      const { data, error } = await q;
      if (error) throw error;

      const rows: Row[] = (data || []) as any[];

      const productionRows = rows.filter((r) => r.section === "production");
      const cashDetailRows = rows.filter((r) => r.section === "cash_detail");
      const cashLaborTotalRows = rows.filter(
        (r) => r.section === "cash_labor_total"
      );
      const noncashLaborTotalRows = rows.filter(
        (r) => r.section === "noncash_labor_total"
      );
      const noncashToolRows = rows.filter(
        (r) => r.section === "noncash_tool_detail"
      );
      const noncashDetailRows = rows.filter(
        (r) => r.section === "noncash_detail"
      );

      // === Pajak (info only, tidak masuk total biaya)
      const cashTaxRows = rows.filter((r) => r.section === "cash_tax_info");
      const noncashTaxRows = rows.filter(
        (r) => r.section === "noncash_tax_info"
      );
      const taxCash = sum(
        cashTaxRows.map((r) =>
          r.amount != null ? num(r.amount) * landFactor : 0
        )
      );
      const taxNonCash = sum(
        noncashTaxRows.map((r) =>
          r.amount != null ? num(r.amount) * landFactor : 0
        )
      );

      // PRODUKSI
      const production: ReportDataset["production"] = productionRows.map(
        (r) => {
          const baseQty = r.qty != null ? num(r.qty) : null;
          return {
            label: "Produksi",
            quantity: baseQty != null ? baseQty * landFactor : null,
            unitType: r.unit ?? null,
            unitPrice:
              r.unit_price != null
                ? num(r.unit_price)
                : r.amount != null
                ? num(r.amount)
                : 0,
          };
        }
      );

      // CASH (material/extras) — pajak sudah dikeluarkan ke section khusus
      type AggMat = {
        qty: number;
        amt: number;
        unit: string | null;
        multiUnit: boolean;
      };
      const matAggMap = new Map<string, AggMat>();
      const nominalMap = new Map<string, number>();

      for (const r of cashDetailRows) {
        const rawLabel = (r.label ?? "").trim();
        const rawName = (r.name ?? "").trim();
        const key = rawName ? `${rawLabel}|${rawName}` : rawLabel;

        const hasQtyOrUnitPrice = r.qty != null || r.unit_price != null;
        if (hasQtyOrUnitPrice) {
          const qv = r.qty != null ? num(r.qty) : 0;
          const pv = r.unit_price != null ? num(r.unit_price) : 0;
          const av = qv > 0 && pv > 0 ? qv * pv : num(r.amount);

          const prev = matAggMap.get(key) || {
            qty: 0,
            amt: 0,
            unit: r.unit ?? null,
            multiUnit: false,
          };
          const thisUnit = r.unit ?? null;

          if (prev.unit == null) prev.unit = thisUnit;
          else if (thisUnit && prev.unit !== thisUnit) prev.multiUnit = true;

          prev.qty += qv;
          prev.amt += av;
          matAggMap.set(key, prev);
        } else {
          nominalMap.set(key, (nominalMap.get(key) ?? 0) + num(r.amount));
        }
      }

      const cashByCategory: ReportDataset["cashByCategory"] = [];

      for (const [key, ag] of matAggMap.entries()) {
        const qtyScaled = ag.qty * landFactor;
        const normalizedUnit = ag.multiUnit
          ? null
          : normalizeUnitLabel(ag.unit) ?? null;
        const avgUnitPrice = ag.qty > 0 ? ag.amt / ag.qty : ag.amt;
        cashByCategory.push({
          category: key,
          quantity: qtyScaled,
          unit: normalizedUnit,
          unitPrice: avgUnitPrice,
        });
      }

      for (const [key, amount] of nominalMap.entries()) {
        cashByCategory.push({
          category: key,
          quantity: null,
          unit: null,
          unitPrice: amount * landFactor,
        });
      }

      // TK CASH (Luar Keluarga)
      const laborCashDetail = (() => {
        if (!cashLaborTotalRows.length) return null;
        const qty = sum(
          cashLaborTotalRows.map((r) => (r.qty != null ? num(r.qty) : 0))
        );
        const amount = sum(
          cashLaborTotalRows.map((r) =>
            r.amount != null
              ? num(r.amount)
              : r.qty && r.unit_price
              ? num(r.qty) * num(r.unit_price)
              : 0
          )
        );
        const unit = "HOK";
        const unitPrice =
          qty > 0 ? amount / qty : cashLaborTotalRows[0]?.unit_price ?? null;

        if (qty > 0) {
          cashByCategory.push({
            category: "TK Luar Keluarga",
            quantity: qty * landFactor,
            unit,
            unitPrice: unitPrice ?? 0,
          });
        } else if (amount > 0) {
          cashByCategory.push({
            category: "TK Luar Keluarga",
            quantity: null,
            unit: null,
            unitPrice: amount * landFactor,
          });
        }
        return {
          qty: qty > 0 ? qty * landFactor : qty,
          unit,
          unitPrice: unitPrice ?? null,
          amount: amount * landFactor,
        };
      })();

      // NONCASH TK (Dalam Keluarga)
      const laborNonCashDetail = (() => {
        if (!noncashLaborTotalRows.length) return null;
        const qty = sum(
          noncashLaborTotalRows.map((r) => (r.qty != null ? num(r.qty) : 0))
        );
        const amount = sum(
          noncashLaborTotalRows.map((r) =>
            r.amount != null
              ? num(r.amount)
              : r.qty && r.unit_price
              ? num(r.qty) * num(r.unit_price)
              : 0
          )
        );
        const unit = "HOK";
        const unitPrice =
          qty > 0 ? amount / qty : noncashLaborTotalRows[0]?.unit_price ?? null;
        return {
          qty: qty > 0 ? qty * landFactor : qty,
          unit,
          unitPrice: unitPrice ?? null,
          amount: amount * landFactor,
        };
      })();

      const noncashLaborNominal = laborNonCashDetail?.amount ?? 0;
      const labor: ReportDataset["labor"] =
        noncashLaborNominal > 0
          ? [
              {
                stageLabel: "TK Dalam Keluarga",
                laborType: "daily",
                value: noncashLaborNominal,
              },
            ]
          : [];

      // NONCASH TOOLS
      const tools: ReportDataset["tools"] = noncashToolRows.map((r) => ({
        toolName: r.name || "Alat",
        quantity: (r.qty != null ? num(r.qty) : 0) * landFactor,
        purchasePrice: r.unit_price != null ? num(r.unit_price) : 0,
      }));

      // NONCASH EXTRAS (sudah exclude pajak karena pajak keluar di *_tax_info)
      const extras: ReportDataset["extras"] = noncashDetailRows.map((r) => ({
        category: (r.label ?? "").trim(),
        label: (r.label ?? "").trim(),
        amount: (r.amount != null ? num(r.amount) : 0) * landFactor,
      }));

      // TOTALS (pajak tidak dihitung di sini)
      const totalReceipts = sum(
        production.map((p) =>
          p.quantity != null ? p.quantity * p.unitPrice : p.unitPrice
        )
      );
      const totalCash = sum(
        cashByCategory.map((c) =>
          c.quantity != null ? c.quantity * c.unitPrice : c.unitPrice
        )
      );
      const totalTools = sum(tools.map((t) => t.quantity * t.purchasePrice));
      const totalLabor = sum(labor.map((l) => l.value));
      const totalExtras = sum(extras.map((e) => e.amount));
      const totalNonCash = totalLabor + totalTools + totalExtras;
      const totalCost = totalCash + totalNonCash;

      return {
        production,
        cashByCategory,
        labor,
        tools,
        extras,
        laborCashDetail,
        laborNonCashDetail,

        taxCash,
        taxNonCash,

        yearRows: undefined,

        totalReceipts,
        totalCash,
        totalLabor,
        totalTools,
        totalExtras,
        totalNonCash,
        totalCost,
      };
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
