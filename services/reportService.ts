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
  tools: {
    toolName: string;
    quantity: number;
    purchasePrice: number;
  }[];
  extras: {
    category: string;
    label: string;
    amount: number;
  }[];

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
          | "noncash_tool_detail";
        label: string | null; // ex: 'seed', 'fertilizer', 'transport', 'Penerimaan', etc.
        name: string | null; // nama item (jika ada)
        qty: number | null; // bisa terisi untuk material & alat; juga HOK utk labor di view
        unit: string | null; // 'kg', 'gr', 'HOK', dst (bisa null)
        unit_price: number | null; // harga satuan (material/alat/labor daily) jika ada
        amount: number | null; // total nominal (selalu ada untuk ringkasan)
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

      // Bagi per section
      const prod = rows.filter((r) => r.section === "production");
      const cashDetail = rows.filter((r) => r.section === "cash_detail");
      const cashLaborTotal = rows.filter(
        (r) => r.section === "cash_labor_total"
      );
      const noncashLaborTotal = rows.filter(
        (r) => r.section === "noncash_labor_total"
      );
      const toolDetail = rows.filter(
        (r) => r.section === "noncash_tool_detail"
      );

      const production = prod.map((r) => {
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
      });

      type AggMat = {
        qty: number;
        amt: number; // amt dari baris yg punya qty
        unit: string | null;
        multiUnit: boolean;
      };
      const matMap = new Map<string, AggMat>();
      const extraMap = new Map<string, number>();

      for (const r of cashDetail) {
        const rawLabel = (r.label ?? "").trim(); // contoh: 'seed', 'fertilizer', 'transport', dll
        const rawName = (r.name ?? "").trim(); // contoh: 'Urea', 'Mospilan'
        const key = rawName ? `${rawLabel}|${rawName}` : rawLabel;

        const hasQtyLike = r.qty != null || r.unit_price != null;
        if (hasQtyLike) {
          const qv = r.qty != null ? num(r.qty) : 0;
          const pv = r.unit_price != null ? num(r.unit_price) : 0;
          const av = qv > 0 && pv > 0 ? qv * pv : num(r.amount);

          const prev = matMap.get(key) || {
            qty: 0,
            amt: 0,
            unit: r.unit ?? null,
            multiUnit: false,
          };
          // unit konsisten
          const thisUnit = r.unit ?? null;
          if (prev.unit == null) {
            prev.unit = thisUnit;
          } else if (thisUnit && prev.unit !== thisUnit) {
            prev.multiUnit = true;
          }

          prev.qty += qv;
          prev.amt += av;
          matMap.set(key, prev);
        } else {
          // extra nominal
          extraMap.set(key, (extraMap.get(key) ?? 0) + num(r.amount));
        }
      }

      const laborCashNom = sum(
        cashLaborTotal.map((r) =>
          r.qty && r.unit_price ? num(r.qty) * num(r.unit_price) : num(r.amount)
        )
      );
      if (laborCashNom > 0) {
        const key = "labor_outside";
        extraMap.set(key, (extraMap.get(key) ?? 0) + laborCashNom);
      }

      const cashByCategory: ReportDataset["cashByCategory"] = [];

      for (const [key, ag] of matMap.entries()) {
        const qtyConv = ag.qty * landFactor;
        const unit = ag.multiUnit ? null : ag.unit ?? null;
        const unitPrice = ag.qty > 0 ? ag.amt / ag.qty : ag.amt; // harga satuan rata-rata tertimbang
        cashByCategory.push({
          category: key, // raw label or raw|name
          quantity: qtyConv, // dikonversi
          unit,
          unitPrice, // tidak dikonversi
        });
      }

      for (const [key, amount] of extraMap.entries()) {
        cashByCategory.push({
          category: key, // raw label (akan di-map di UI)
          quantity: null,
          unit: null,
          unitPrice: amount * landFactor, // nilai nominal terkonversi
        });
      }

      const laborNoncashNomBase = sum(
        noncashLaborTotal.map((r) =>
          r.qty && r.unit_price ? num(r.qty) * num(r.unit_price) : num(r.amount)
        )
      );
      const laborVal = laborNoncashNomBase * landFactor;
      const labor: ReportDataset["labor"] =
        laborVal > 0
          ? [
              {
                stageKey: undefined,
                stageLabel: "Dalam Keluarga",
                laborType: "daily",
                value: laborVal,
              },
            ]
          : [];

      const tools: ReportDataset["tools"] = toolDetail.map((r) => ({
        toolName: r.name || "Alat",
        quantity: (r.qty != null ? num(r.qty) : 0) * landFactor, // skala qty
        purchasePrice: r.unit_price != null ? num(r.unit_price) : 0,
      }));

      const extras: ReportDataset["extras"] = [];

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
    totalReceipts: 0,
    totalCash: 0,
    totalLabor: 0,
    totalTools: 0,
    totalExtras: 0,
    totalNonCash: 0,
    totalCost: 0,
  };
}
