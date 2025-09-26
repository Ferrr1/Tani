import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
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

export type ReportDataset = {
  production: {
    label: string;
    quantity: number | null;
    unitType: string | null;
    unitPrice: number;
  }[];
  cashByCategory: {
    category: string; // contoh "seed|Urea" atau "seed" atau "TK Luar Keluarga" atau extra/tax
    quantity: number | null; // quantity (termasuk HOK utk TK cash), sudah diskalakan landFactor
    unit: string | null; // "kg", "gram", "HOK", dll
    unitPrice: number; // harga satuan (avg) atau nominal langsung (extras/tax)
  }[];
  labor: {
    stageKey?: string;
    stageLabel?: string; // "TK Dalam Keluarga"
    laborType: "daily" | "contract";
    value: number; // nominal total noncash labor (sudah diskalakan landFactor)
  }[];
  tools: {
    toolName: string;
    quantity: number; // sudah diskalakan landFactor
    purchasePrice: number;
  }[];
  extras: {
    category: string; // label/kategori noncash extras/tax
    label: string; // siap tampil di UI
    amount: number; // nominal (sudah diskalakan landFactor)
  }[];

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

  totalReceipts: number;
  totalCash: number;
  totalLabor: number; // noncash labor
  totalTools: number; // noncash tools
  totalExtras: number; // noncash extras (termasuk tax noncash)
  totalNonCash: number; // labor + tools + extras noncash
  totalCost: number; // totalCash + totalNonCash
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

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) return;
      setLoading(true);
      const myReq = ++reqRef.current;
      try {
        const ss = await seasonRepo.list(user.id);
        if (!alive || myReq !== reqRef.current) return;
        setSeasons(ss || []);

        const years = new Set<number>();
        (ss || []).forEach((s: any) => {
          if (s?.start_date) years.add(new Date(s.start_date).getFullYear());
          if (s?.end_date) years.add(new Date(s.end_date).getFullYear());
        });
        const opts = Array.from(years).sort((a, b) => a - b);
        setYearOptions(opts);
      } catch (e) {
        console.warn("reportService bootstrap", e);
      } finally {
        if (alive && reqRef.current) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const seasonIdsForYear = useMemo(() => {
    if (year === "all" || !seasons?.length) return undefined;
    const y = Number(year);
    const ids = seasons
      .filter((s: any) => {
        const y1 = new Date(s.start_date).getFullYear();
        const y2 = new Date(s.end_date).getFullYear();
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        return y >= minY && y <= maxY; // overlap by year
      })
      .map((s: any) => s.id);
    return ids.length ? ids : ["__none__"]; // hindari .in([]) error
  }, [year, seasons]);

  const buildDataset = useCallback(
    async (opts?: { landFactor?: number }): Promise<ReportDataset> => {
      if (!user) return emptyDataset();
      const landFactor = Number(opts?.landFactor ?? 1) || 1;

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
          | "noncash_detail";
        label: string | null; // ex: 'seed', 'fertilizer', 'transport', 'Penerimaan', 'TK Luar Keluarga', 'Tax'
        name: string | null; // nama item (material/tool)
        qty: number | null; // qty (termasuk HOK utk labor_total)
        unit: string | null; // 'kg', 'gram', 'HOK', dst
        unit_price: number | null; // harga satuan; utk labor_total = avg biaya/HOK
        amount: number | null; // total nominal
      };

      let q = supabase
        .from("v_report_source")
        .select("*")
        .eq("user_id", user.id);

      if (seasonId) {
        q = q.eq("season_id", seasonId);
      } else if (seasonIdsForYear) {
        q = q.in("season_id", seasonIdsForYear);
      }

      const { data, error } = await q;
      if (error) throw error;

      const rows: Row[] = (data || []) as any[];
      // Kelompok per section
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
      ); // extras & tax noncash

      // ===== PRODUKSI =====
      const production: ReportDataset["production"] = productionRows.map(
        (r) => {
          const baseQty = r.qty != null ? num(r.qty) : null;
          return {
            label: "Penerimaan",
            quantity: baseQty != null ? baseQty * landFactor : null, // skala qty
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

      // ===== CASH (material/extras/tax) =====
      type AggMat = {
        qty: number; // total qty (material)
        amt: number; // total nominal yg terkait qty
        unit: string | null;
        multiUnit: boolean;
      };
      const matAggMap = new Map<string, AggMat>();
      const nominalMap = new Map<string, number>(); // for extras/tax (nominal)

      for (const r of cashDetailRows) {
        const rawLabel = (r.label ?? "").trim(); // 'seed', 'fertilizer', 'transport', 'Tax', dll
        const rawName = (r.name ?? "").trim(); // 'Urea', 'Mospilan', ...
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
          // pure nominal (extras/tax)
          nominalMap.set(key, (nominalMap.get(key) ?? 0) + num(r.amount));
        }
      }

      const cashByCategory: ReportDataset["cashByCategory"] = [];

      // material (punya qty)
      for (const [key, ag] of matAggMap.entries()) {
        const qtyScaled = ag.qty * landFactor;
        const normalizedUnit = ag.multiUnit ? null : ag.unit ?? null;
        const avgUnitPrice = ag.qty > 0 ? ag.amt / ag.qty : ag.amt; // rata-rata tertimbang
        cashByCategory.push({
          category: key,
          quantity: qtyScaled,
          unit: normalizedUnit,
          unitPrice: avgUnitPrice,
        });
      }

      // extras/tax (nominal → taruh sebagai unitPrice dengan quantity=null)
      for (const [key, amount] of nominalMap.entries()) {
        cashByCategory.push({
          category: key,
          quantity: null,
          unit: null,
          unitPrice: amount * landFactor,
        });
      }

      // ===== TK CASH (Luar Keluarga) → kategori khusus di cashByCategory =====
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
            quantity: qty * landFactor, // skala HOK
            unit: unit,
            unitPrice: unitPrice ?? 0, // rata-rata biaya/HOK
          });
        } else if (amount > 0) {
          // fallback nominal-only
          cashByCategory.push({
            category: "TK Luar Keluarga",
            quantity: null,
            unit: null,
            unitPrice: amount * landFactor,
          });
        }
        return {
          qty: qty > 0 ? qty * landFactor : qty, // kalau mau tampilkan sesuai skala
          unit,
          unitPrice: unitPrice ?? null,
          amount: amount * landFactor,
        };
      })();

      // ===== NONCASH TK (Dalam Keluarga) → bucket labor =====
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

      const noncashLaborNominal =
        laborNonCashDetail?.amount != null ? laborNonCashDetail.amount : 0;

      const labor: ReportDataset["labor"] =
        noncashLaborNominal > 0
          ? [
              {
                stageKey: undefined,
                stageLabel: "TK Dalam Keluarga",
                laborType: "daily", // tampilan saja; view sudah agregat
                value: noncashLaborNominal,
              },
            ]
          : [];

      // ===== NONCASH TOOLS =====
      const tools: ReportDataset["tools"] = noncashToolRows.map((r) => ({
        toolName: r.name || "Alat",
        quantity: (r.qty != null ? num(r.qty) : 0) * landFactor,
        purchasePrice: r.unit_price != null ? num(r.unit_price) : 0,
      }));

      // ===== NONCASH EXTRAS & TAX (agar tampil di Biaya Non Tunai → Biaya Lain) =====
      const extras: ReportDataset["extras"] = noncashDetailRows.map((r) => ({
        category: (r.label ?? "").trim(),
        label: (r.label ?? "").trim(),
        amount: (r.amount != null ? num(r.amount) : 0) * landFactor,
      }));

      // ===== TOTALS =====
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
      const totalLabor = sum(labor.map((l) => l.value)); // noncash labor
      const totalExtras = sum(extras.map((e) => e.amount)); // noncash extras (termasuk tax noncash)
      const totalNonCash = totalLabor + totalTools + totalExtras;
      const totalCost = totalCash + totalNonCash;

      return {
        production,
        cashByCategory,
        labor,
        tools,
        extras,

        // detail opsional (bisa dipakai UI)
        laborCashDetail,
        laborNonCashDetail,

        totalReceipts,
        totalCash,
        totalLabor,
        totalTools,
        totalExtras,
        totalNonCash,
        totalCost,
      };
    },
    [user?.id, seasonId, seasonIdsForYear]
  );

  return {
    seasons,
    seasonId,
    setSeasonId,
    year,
    setYear,
    yearOptions,
    loading,
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
    totalReceipts: 0,
    totalCash: 0,
    totalLabor: 0,
    totalTools: 0,
    totalExtras: 0,
    totalNonCash: 0,
    totalCost: 0,
  };
}
