import {
    CashFormValues,
    Category,
    ChemItem,
    NonCashFormValues,
    NonCashLaborInput,
    NonCashToolInput,
    SERVICE_UNIT,
    Unit,
    SEED_UNIT_CHOICES,
    SEEDLING_UNIT_CHOICES,
    LaborForm,
} from "@/types/expense";
import { toNum } from "./number";

/**
 * Calculates prorated cost based on annual value and season days.
 * Formula: (yearly / 365) * seasonDays
 */
export const calcProrata = (yearly: number | string, seasonDays: number): number => {
    const v = toNum(yearly);
    return seasonDays > 0 ? (v / 365) * seasonDays : 0;
};

/**
 * Maps database stage labels to internal NonCashForm labor keys.
 */
export const getStageKeyFromRow = (row: any): keyof NonCashFormValues["labor"] | undefined => {
    const labelToKey: Record<string, keyof NonCashFormValues["labor"]> = {
        persemaian: "nursery",
        "pengolahan lahan": "land_prep",
        penanaman: "planting",
        pemupukan: "fertilizing",
        penyiraman: "irrigation",
        penyiangan: "weeding",
        "pengendalian hama & penyakit": "pest_ctrl",
        "pengendalian hama dan penyakit": "pest_ctrl",
        panen: "harvest",
        "pasca panen": "postharvest",
    };

    const lbl = String(row?.label ?? "").trim().toLowerCase();
    if (labelToKey[lbl]) return labelToKey[lbl];
    
    const contains = (s: string) => lbl.includes(s);
    if (contains("semai")) return "nursery";
    if (contains("olah") && contains("lahan")) return "land_prep";
    if (contains("tanam")) return "planting";
    if (contains("pupuk")) return "fertilizing";
    if (contains("siram")) return "irrigation";
    if (contains("siang")) return "weeding";
    if (contains("hama") || contains("penyakit")) return "pest_ctrl";
    if (contains("panen") && !contains("pasca")) return "harvest";
    if (contains("pasca")) return "postharvest";
    
    return undefined;
};

/**
 * Validates that all seed rows in CashForm are complete.
 */
export const validateCashSeeds = (seeds: any[]): boolean => {
    if (!seeds || !seeds.length) return false;
    return seeds.every(
        (r) =>
            toNum(r.qty) > 0 &&
            toNum(r.price) >= 0 &&
            r.unit &&
            (r.kind === "seed" || r.kind === "seedling")
    );
};

/**
 * Validates chemical/material rows.
 * @param required If true, requires at least one item.
 */
export const validateChemRows = (rows: ChemItem[], required: boolean = false): boolean => {
    if (required && rows.length === 0) return false;
    if (rows.length === 0) return true;
    return rows.every(
        (r) =>
            (r.name?.trim()?.length ?? 0) > 0 &&
            toNum(r.qty) > 0 &&
            toNum(r.price) >= 0
    );
};

/**
 * Builds payload for non-cash expense create/update.
 */
export const buildNonCashPayload = (
    fv: NonCashFormValues,
    tools: any[],
    extraItems: any[]
) => {
    const mapLabor = (
        key: keyof NonCashFormValues["labor"],
        stageLabel: string
    ): NonCashLaborInput | null => {
        const r = fv.labor[key];
        if (!r) return null;

        if (r.tipe === "borongan") {
            const contractPrice = Math.max(0, toNum(r.hargaBorongan));
            const prevailingWage = Math.max(0, toNum(r.upahBerlaku));
            return {
                laborType: "contract",
                contractPrice,
                prevailingWage,
                stageLabel,
            };
        }

        const people = Math.max(0, toNum(r.jumlahOrang));
        const days = Math.max(0, toNum(r.jumlahHari));
        const wage = Math.max(0, toNum(r.upahHarian));
        if (!(people > 0 && days > 0 && wage >= 0)) return null;

        return {
            laborType: "daily",
            peopleCount: people,
            days,
            dailyWage: wage,
            jamKerja: r.jamKerja !== "" ? Math.max(0, toNum(r.jamKerja)) : null,
            stageLabel,
        };
    };

    const labors = [
        mapLabor("nursery", "Persemaian"),
        mapLabor("land_prep", "Pengolahan Lahan"),
        mapLabor("planting", "Penanaman"),
        mapLabor("fertilizing", "Pemupukan"),
        mapLabor("irrigation", "Penyiraman"),
        mapLabor("weeding", "Penyiangan"),
        mapLabor("pest_ctrl", "Pengendalian Hama & Penyakit"),
        mapLabor("harvest", "Panen"),
        mapLabor("postharvest", "Pasca Panen"),
    ].filter((v): v is NonCashLaborInput => v !== null);

    const toolItems = (tools || [])
        .map((t): NonCashToolInput | null => {
            const quantity = Math.max(0, toNum(t.jumlah));
            const purchasePrice = Math.max(0, toNum(t.hargaBeli));
            if (!(quantity > 0 && purchasePrice >= 0)) return null;

            const uly = t.umurThn ? Math.max(0, toNum(t.umurThn)) : undefined;
            const sv = t.nilaiSisa ? Math.max(0, toNum(t.nilaiSisa)) : undefined;

            return {
                toolName: t.nama?.trim() || "Alat",
                quantity,
                purchasePrice,
                ...(uly !== undefined ? { usefulLifeYears: uly } : {}),
                ...(sv !== undefined ? { salvageValue: sv } : {}),
            };
        })
        .filter((v): v is NonCashToolInput => v !== null);

    const extras: any[] = [];
    const vTax = toNum(fv.extras.tax);
    if (vTax > 0) extras.push({ type: "tax", amount: vTax });
    const vRent = toNum(fv.extras.landRent);
    if (vRent > 0) extras.push({ type: "land_rent", amount: vRent });

    (extraItems || []).forEach((e) => {
        const amt = toNum(e.amount);
        if (!Number.isFinite(amt) || amt < 0) return;
        extras.push({
            type: e.label,
            amount: amt,
            note: null,
            _meta: { category: "other", unit: SERVICE_UNIT },
        });
    });

    return { labors, tools: toolItems, extras };
};

/**
 * Builds payload for cash expense create/update (items array).
 */
export const buildCashPayload = (
    fv: CashFormValues & { seeds: any[] },
    fertilizerItems: ChemItem[],
    insectItems: ChemItem[],
    herbItems: ChemItem[],
    fungiItems: ChemItem[],
    extraItems: any[],
    seasonDays: number
) => {
    const out: any[] = [];

    // SEEDS
    (fv.seeds || []).forEach((s) => {
        const unit: Unit = (s.unit as Unit) ?? (s.kind === "seed" ? SEED_UNIT_CHOICES : SEEDLING_UNIT_CHOICES);
        const q = toNum(s.qty);
        const p = toNum(s.price);
        if (q > 0 && p >= 0) {
            out.push({
                category: s.kind,
                itemName: s.cropName,
                unit,
                quantity: q,
                unitPrice: p,
                _meta: { category: s.kind, unit, cropName: s.cropName },
            });
        }
    });

    const chemToRows = (rows: ChemItem[]) =>
        rows.map((r) => ({
            category: r.category,
            itemName: r.name ?? null,
            unit: r.unit,
            quantity: toNum(r.qty),
            unitPrice: toNum(r.price),
            _meta: { category: r.category, unit: r.unit },
        }));

    out.push(
        ...chemToRows(fertilizerItems),
        ...chemToRows(insectItems),
        ...chemToRows(herbItems),
        ...chemToRows(fungiItems)
    );

    const laborOne = (cat: Category, lf: LaborForm) => {
        if (lf.tipe === "borongan") {
            const kontrak = Math.max(0, toNum(lf.hargaBorongan));
            if (!(kontrak >= 0)) return null;
            return {
                category: cat,
                itemName: "borongan",
                unit: "service" as Unit,
                quantity: 1,
                unitPrice: kontrak,
                _meta: {
                    category: cat,
                    unit: "service",
                    laborType: "contract",
                    prevailingWage: lf.upahBerlaku
                        ? Math.max(0, toNum(lf.upahBerlaku))
                        : undefined,
                    jamKerja: lf.jamKerja || undefined,
                },
            };
        }
        const people = Math.max(0, toNum(lf.jumlahOrang));
        const days = Math.max(0, toNum(lf.jumlahHari));
        const qty = Math.max(0, people * days);
        const upah = Math.max(0, toNum(lf.upahHarian));
        if (qty <= 0) return null;
        return {
            category: cat,
            itemName: "harian",
            unit: "service" as Unit,
            quantity: qty,
            unitPrice: upah,
            _meta: {
                category: cat,
                unit: "service",
                laborType: "daily",
                peopleCount: people,
                days,
                jamKerja: lf.jamKerja || undefined,
            },
        };
    };

    out.push(
        laborOne("labor_nursery", fv.labor.nursery),
        laborOne("labor_land_prep", fv.labor.land_prep),
        laborOne("labor_planting", fv.labor.planting),
        laborOne("labor_fertilizing", fv.labor.fertilizing),
        laborOne("labor_irrigation", fv.labor.irrigation),
        laborOne("labor_weeding", fv.labor.weeding),
        laborOne("labor_pest_ctrl", fv.labor.pest_ctrl),
        laborOne("labor_harvest", fv.labor.harvest),
        laborOne("labor_postharvest", fv.labor.postharvest)
    );

    const vTax = toNum(fv.extras.tax);
    if (vTax > 0)
        out.push({
            category: "tax",
            unit: SERVICE_UNIT,
            quantity: 1,
            unitPrice: vTax,
            itemName: null,
            _meta: {
                category: "tax",
                unit: SERVICE_UNIT,
                proratedFromYearly: toNum(fv.extras.tax) || undefined,
                seasonDays: seasonDays || undefined,
            },
        });

    const vRent = toNum(fv.extras.landRent);
    if (vRent > 0)
        out.push({
            category: "land_rent",
            unit: SERVICE_UNIT,
            quantity: 1,
            unitPrice: vRent,
            itemName: null,
            _meta: {
                category: "land_rent",
                unit: SERVICE_UNIT,
                proratedFromYearly: toNum(fv.extras.landRent) || undefined,
                seasonDays: seasonDays || undefined,
            },
        });

    const vTrans = Math.max(0, toNum(fv.extras.transport));
    if (vTrans > 0)
        out.push({
            category: "transport",
            unit: SERVICE_UNIT,
            quantity: 1,
            unitPrice: vTrans,
            itemName: null,
            _meta: { category: "transport", unit: SERVICE_UNIT },
        });

    (extraItems || []).forEach((e) => {
        const amt = toNum(e.amount);
        if (!Number.isFinite(amt) || amt < 0) return;

        out.push({
            category: e.label || "Biaya Lain",
            unit: SERVICE_UNIT,
            quantity: 1,
            unitPrice: amt,
            itemName: e.label,
            _meta: { category: "other", unit: SERVICE_UNIT },
        });
    });

    return out.filter(
        (x) =>
            x !== null &&
            Number.isFinite(x.quantity) &&
            x.quantity > 0 &&
            Number.isFinite(x.unitPrice) &&
            x.unitPrice >= 0
    );
};
