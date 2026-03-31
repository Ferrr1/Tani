import { ChemItem, LaborForm, SeedLine, Unit, Category, SERVICE_UNIT } from "@/types/expense";
import { toNum } from "./number";
import { calcLaborSubtotal, sumChem } from "./calculate";
import { daysInclusive } from "./date";

/**
 * Calculates the total cost for seeds in CashForm.
 */
export function calculateSeedSubtotal(seeds: SeedLine[]): number {
    return seeds.reduce((acc, s) => {
        const q = toNum(s.qty);
        const p = toNum(s.price);
        return acc + (q > 0 && p >= 0 ? q * p : 0);
    }, 0);
}

/**
 * Calculates the aggregate total for multiple chemical categories.
 */
export function calculateChemOthersTotal(
    fertilizer: ChemItem[],
    insecticide: ChemItem[],
    herbicide: ChemItem[],
    fungicide: ChemItem[]
): number {
    return sumChem(fertilizer) + sumChem(insecticide) + sumChem(herbicide) + sumChem(fungicide);
}

/**
 * Calculates the total labor cost across all stages.
 */
export function calculateLaborTotal(labor: Record<string, LaborForm>): number {
    return Object.values(labor).reduce((acc, lf) => acc + calcLaborSubtotal(lf), 0);
}

/**
 * Calculates prorated cost based on season duration vs yearly cost.
 */
export function calculateProratedCost(yearlyAmount: number, seasonDays: number): number {
    if (seasonDays <= 0) return 0;
    return (yearlyAmount / 365) * seasonDays;
}

/**
 * Calculates total tools cost for NonCashForm.
 */
export function calculateToolsTotal(tools: { jumlah: string | number; hargaBeli: string | number }[]): number {
    return tools.reduce((sum, t) => {
        const qty = toNum(t.jumlah);
        const price = toNum(t.hargaBeli);
        return sum + (qty > 0 && price >= 0 ? qty * price : 0);
    }, 0);
}

/**
 * Aggregates all manual extra items.
 */
export function calculateExtrasPanelSubtotal(extraItems: { amount: string | number }[]): number {
    return (extraItems || []).reduce((acc, r) => {
        const v = toNum(r.amount);
        return acc + (Number.isFinite(v) && v >= 0 ? v : 0);
    }, 0);
}
