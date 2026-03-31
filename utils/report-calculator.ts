import { normalizeUnitLabel } from "./unitLabel";
import { sum, toNum } from "./number";

export type ReportDataset = {
  production: { label: string; quantity: number | null; unitType: string | null; unitPrice: number }[];
  cashByCategory: { category: string; quantity: number | null; unit: string | null; unitPrice: number }[];
  cashExtras: { label: string; amount: number }[];
  labor: { stageLabel?: string; laborType: "daily" | "contract"; value: number }[];
  tools: { toolName: string; quantity: number; purchasePrice: number }[];
  extras: { category: string; label: string; amount: number }[];
  laborCashDetail?: { qty: number | null; unit: string | null; unitPrice: number | null; amount: number } | null;
  laborNonCashDetail?: { qty: number | null; unit: string | null; unitPrice: number | null; amount: number } | null;
  taxCash: number;
  taxNonCash: number;
  yearRows?: any[];
  totalReceipts: number;
  totalCash: number;
  totalLabor: number;
  totalTools: number;
  totalExtras: number;
  totalNonCash: number;
  totalCost: number;
};

/**
 * Calculates a scaling factor based on base area vs desired area.
 */
export function calculateLandFactor(profileAreaHa: number, effectiveArea: number | null): number {
  const base = profileAreaHa > 0 ? profileAreaHa : 1;
  const target = effectiveArea != null ? effectiveArea : base;
  return target / base;
}

/**
 * Calculates a single row's absolute value (quantity * price).
 */
export function calculateRowValue(item: { quantity?: number | null; unitPrice: number }): number {
  return (item.quantity != null ? item.quantity : 1) * item.unitPrice;
}

/**
 * Calculates R/C (Revenue to Cost) Ratio.
 */
export function calculateRcRatio(revenue: number, cost: number): number {
  if (cost <= 0) return 0;
  return revenue / cost;
}

/**
 * Transforms raw source rows from v_report_source_season into a structured ReportDataset.
 */
export function transformReportSeasonRows(rows: any[], landFactor: number): ReportDataset {
  const productionRows = rows.filter((r) => r.section === "production");
  const cashDetailRows = rows.filter((r) => r.section === "cash_detail");
  const cashLaborTotalRows = rows.filter((r) => r.section === "cash_labor_total");
  const noncashLaborTotalRows = rows.filter((r) => r.section === "noncash_labor_total");
  const noncashToolRows = rows.filter((r) => r.section === "noncash_tool_detail");
  const noncashDetailRows = rows.filter((r) => r.section === "noncash_detail");
  const cashTaxRows = rows.filter((r) => r.section === "cash_tax_info");
  const noncashTaxRows = rows.filter((r) => r.section === "noncash_tax_info");

  const taxCash = sum(cashTaxRows.map((r) => (r.amount != null ? toNum(r.amount) * landFactor : 0)));
  const taxNonCash = sum(noncashTaxRows.map((r) => (r.amount != null ? toNum(r.amount) * landFactor : 0)));

  const production = productionRows.map((r) => {
    const baseQty = r.qty != null ? toNum(r.qty) : null;
    return {
      label: `Produksi ${r.label ?? ""}`,
      quantity: baseQty != null ? baseQty * landFactor : null,
      unitType: r.unit ?? null,
      unitPrice: r.unit_price != null ? toNum(r.unit_price) : (r.amount != null ? toNum(r.amount) : 0),
    };
  });

  const matAggMap = new Map<string, { qty: number; amt: number; unit: string | null; multiUnit: boolean }>();
  const nominalMap = new Map<string, number>();
  const cashExtras: { label: string; amount: number }[] = [];

  for (const r of cashDetailRows) {
    const rawLabel = (r.label ?? "").trim();
    const rawName = (r.name ?? "").trim();
    const key = rawName ? `${rawLabel}|${rawName}` : rawLabel;

    if (r.qty == null) {
      const amount = r.amount != null ? toNum(r.amount) * landFactor : 0;
      if (amount > 0) cashExtras.push({ label: rawLabel, amount });
      continue;
    }

    const qv = toNum(r.qty);
    const pv = toNum(r.unit_price);
    const av = qv > 0 && pv > 0 ? qv * pv : toNum(r.amount);

    const prev = matAggMap.get(key) || { qty: 0, amt: 0, unit: r.unit ?? null, multiUnit: false };
    const thisUnit = r.unit ?? null;
    if (prev.unit == null) prev.unit = thisUnit;
    else if (thisUnit && prev.unit !== thisUnit) prev.multiUnit = true;

    prev.qty += qv;
    prev.amt += av;
    matAggMap.set(key, prev);
  }

  const cashByCategory: { category: string; quantity: number | null; unit: string | null; unitPrice: number }[] = Array.from(matAggMap.entries()).map(([key, ag]) => ({
    category: key,
    quantity: ag.qty * landFactor,
    unit: ag.multiUnit ? null : normalizeUnitLabel(ag.unit) ?? null,
    unitPrice: ag.qty > 0 ? ag.amt / ag.qty : ag.amt,
  }));

  // TK CASH
  const laborCashData = (() => {
    if (!cashLaborTotalRows.length) return null;
    const qty = sum(cashLaborTotalRows.map((r) => toNum(r.qty)));
    const amount = sum(cashLaborTotalRows.map((r) => r.amount != null ? toNum(r.amount) : toNum(r.qty) * toNum(r.unit_price)));
    const unitPrice = qty > 0 ? amount / qty : cashLaborTotalRows[0]?.unit_price ?? 0;
    
    cashByCategory.push({
      category: "TK Luar Keluarga",
      quantity: qty > 0 ? qty * landFactor : null,
      unit: qty > 0 ? "HOK" : null,
      unitPrice: qty > 0 ? unitPrice : amount * landFactor,
    });

    return { qty: qty * landFactor, unit: "HOK", unitPrice: qty > 0 ? unitPrice : null, amount: amount * landFactor };
  })();

  // NONCASH TK
  const laborNonCashData = (() => {
    if (!noncashLaborTotalRows.length) return null;
    const qty = sum(noncashLaborTotalRows.map((r) => toNum(r.qty)));
    const amount = sum(noncashLaborTotalRows.map((r) => r.amount != null ? toNum(r.amount) : toNum(r.qty) * toNum(r.unit_price)));
    const unitPrice = qty > 0 ? amount / qty : noncashLaborTotalRows[0]?.unit_price ?? 0;
    return { qty: qty * landFactor, unit: "HOK", unitPrice: qty > 0 ? unitPrice : null, amount: amount * landFactor };
  })();

  const labor = laborNonCashData ? [{ stageLabel: "TK Dalam Keluarga", laborType: "daily" as const, value: laborNonCashData.amount }] : [];
  const tools = noncashToolRows.map((r) => ({
    toolName: r.name || "Alat",
    quantity: toNum(r.qty) * landFactor,
    purchasePrice: toNum(r.unit_price),
  }));
  const extras = noncashDetailRows.map((r) => ({
    category: (r.label ?? "").trim(),
    label: (r.label ?? "").trim(),
    amount: toNum(r.amount) * landFactor,
  }));

  const totalReceipts = sum(production.map((p) => p.quantity != null ? p.quantity * p.unitPrice : p.unitPrice));
  const totalCash = sum(cashByCategory.map((c) => c.quantity != null ? c.quantity * c.unitPrice : c.unitPrice)) + sum(cashExtras.map((e) => e.amount));
  const totalTools = sum(tools.map((t) => t.quantity * t.purchasePrice));
  const totalLabor = sum(labor.map((l) => l.value));
  const totalExtras = sum(extras.map((e) => e.amount));
  const totalNonCash = totalLabor + totalTools + totalExtras;

  return {
    production,
    cashByCategory,
    cashExtras,
    labor,
    tools,
    extras,
    laborCashDetail: laborCashData,
    laborNonCashDetail: laborNonCashData,
    taxCash,
    taxNonCash,
    totalReceipts,
    totalCash,
    totalLabor,
    totalTools,
    totalExtras,
    totalNonCash,
    totalCost: totalCash + totalNonCash,
  };
}

/**
 * Transforms raw source rows from v_report_source_year into structured year summary.
 */
export function transformReportYearRows(rows: any[], landFactor: number): ReportDataset {
  const yearRows = rows.map((r) => ({
    user_id: r.user_id,
    season_id: r.season_id,
    year: r.year,
    section: r.section,
    label: (r.label ?? "").trim(),
    amount: toNum(r.amount),
  }));

  const totalReceipts = sum(yearRows.filter((x) => x.section === "penerimaan").map((x) => x.amount));
  const totalCash = sum(yearRows.filter((x) => x.section === "biaya" && /^Biaya Tunai MT /i.test(x.label)).map((x) => x.amount));
  const totalNonCash = sum(yearRows.filter((x) => x.section === "biaya" && /^Biaya Non Tunai MT /i.test(x.label)).map((x) => x.amount));
  const totalCost = sum(yearRows.filter((x) => x.section === "biaya" && /^Biaya Total MT /i.test(x.label)).map((x) => x.amount));

  return {
    production: [],
    cashByCategory: [],
    cashExtras: [],
    labor: [],
    tools: [],
    extras: [],
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

export function aggregateYearlyTotals(yearRows: any[], landFactor: number) {
    const totals = {
        penerimaan: 0,
        biayaTunai: 0,
        biayaNonTunai: 0,
        biayaTotal: 0,
        pendTunai: 0,
        pendNonTunai: 0,
        pendTotal: 0,
        rcTunai: 0,
        rcTotal: 0,
    };

    yearRows.forEach((r) => {
        const label = (r.label || "").toLowerCase();
        const money = r.section === "rc" ? 0 : Number(r.amount || 0) * landFactor;

        if (r.section === "penerimaan" && label.startsWith("penerimaan mt"))
            totals.penerimaan += money;

        if (r.section === "biaya") {
            if (label.startsWith("biaya tunai mt")) totals.biayaTunai += money;
            if (label.startsWith("biaya non tunai mt")) totals.biayaNonTunai += money;
            if (label.startsWith("biaya total mt")) totals.biayaTotal += money;
        }

        if (r.section === "pendapatan") {
            if (label.startsWith("pendapatan atas biaya tunai mt")) totals.pendTunai += money;
            if (label.startsWith("pendapatan atas biaya non tunai mt")) totals.pendNonTunai += money;
            if (label.startsWith("pendapatan atas biaya total mt")) totals.pendTotal += money;
        }
    });

    totals.rcTunai = totals.biayaTunai > 0 ? totals.penerimaan / totals.biayaTunai : 0;
    totals.rcTotal = totals.biayaTotal > 0 ? totals.penerimaan / totals.biayaTotal : 0;

    return totals;
}
