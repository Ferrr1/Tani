import { parseThousandsToNumber } from "./number";

/**
 * Calculates the grand total for multiple income items.
 */
export const calcIncomeGrandTotal = (items: any[]): number => {
    return (items || []).reduce((acc, it) => {
        const q = Math.max(0, parseThousandsToNumber(it.qty));
        const p = Math.max(0, parseThousandsToNumber(it.price));
        return acc + q * p;
    }, 0);
};

/**
 * Returns crops that haven't been recorded yet for a specific season.
 */
export const getAvailableCrops = (
    allCrops: any[],
    usedCropsSet: Set<string>
): string[] => {
    const crops = Array.isArray(allCrops) ? allCrops : [];
    return crops
        .map(String)
        .filter((c) => !usedCropsSet.has(c.trim().toLowerCase()));
};

/**
 * Checks if a season has any crops that haven't been recorded yet.
 */
export const seasonHasFreeCrop = (
    seasons: any[],
    sid: string | undefined,
    usedBySeason: Map<string, Set<string>>
): boolean => {
    if (!sid) return false;
    const s = seasons.find((x) => x.id === sid);
    if (!s) return false;
    const available = getAvailableCrops(s.crop_type, usedBySeason.get(sid) ?? new Set());
    return available.length > 0;
};

/**
 * Determines the default season ID to use when creating a new income record.
 */
export const getDefaultSeasonId = (
    seasons: any[],
    seasonIdFromQuery: string | undefined,
    usedBySeason: Map<string, Set<string>>
): string | undefined => {
    if (!seasons.length) return undefined;

    let defaultSid: string | undefined =
        (typeof seasonIdFromQuery === "string" && seasonIdFromQuery) || undefined;

    if (!seasonHasFreeCrop(seasons, defaultSid, usedBySeason)) {
        const firstFree = seasons.find((s) => seasonHasFreeCrop(seasons, s.id, usedBySeason));
        defaultSid = firstFree?.id;
    }

    return defaultSid;
};

/**
 * Builds payloads for multi-row income creation.
 * Filters out incomplete rows.
 */
export const buildIncomeCreatePayloads = (
    selSeasonId: string,
    items: any[]
) => {
    return (items || [])
        .map((it) => ({
            seasonId: selSeasonId,
            itemName: it.cropName,
            quantity: parseThousandsToNumber(it.qty),
            unitType: it.unit,
            unitPrice: parseThousandsToNumber(it.price),
        }))
        .filter((l) => l.unitType && l.quantity > 0 && l.unitPrice >= 0);
};

/**
 * Builds payload for updating a single income record.
 */
export const buildIncomeUpdatePayload = (
    receiptId: string,
    selSeasonId: string,
    quantity: string,
    unit: string,
    price: string
) => {
    const q = parseThousandsToNumber(quantity);
    const p = parseThousandsToNumber(price);
    
    if (!unit) throw new Error("Pilih jenis satuan dulu.");
    if (!Number.isFinite(q) || q <= 0) throw new Error("Kuantitas harus angka > 0.");
    if (!Number.isFinite(p) || p < 0) throw new Error("Harga/satuan harus angka ≥ 0.");

    return {
        id: receiptId,
        seasonId: selSeasonId,
        quantity: q,
        unitType: unit,
        unitPrice: p,
    };
};
