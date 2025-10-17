import RowView from "@/components/RowView";
import SectionTitle from "@/components/SectionTitle";
import SubMini from "@/components/SubMini";
import SubTitle from "@/components/SubTitle";
import TotalLine from "@/components/TotalLine";
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { generateReportPdf } from "@/services/pdf/reportPdf";
import { getMyProfile } from "@/services/profileService";
import { useReportData } from "@/services/reportService";
import { CATEGORY_LABEL_REPORT, Theme } from "@/types/report";
import { currency } from "@/utils/currency";
import { fmtDate } from "@/utils/date";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Keyboard,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useColorScheme,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

function prettyLabel(raw: string): string {
    const [rawCat, name] = raw.split("|");

    if (rawCat?.trim() === "TK Luar Keluarga" || rawCat?.trim() === "TK Dalam Keluarga") {
        return name ? `${rawCat.trim()} | ${name.trim()}` : rawCat.trim();
    }

    const label =
        CATEGORY_LABEL_REPORT[rawCat] ??
        rawCat?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    return name ? `${label} ${name.trim()}` : label;
}

// ===== Tambahan untuk Year Mode =====
type YearRow = {
    section: "penerimaan" | "biaya" | "pendapatan" | "rc";
    label: string;
    amount: number;
};

export default function ReportScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme] as Theme;
    const S = Tokens;

    const {
        seasons,
        seasonId,
        setSeasonId,
        year,
        setYear,
        yearOptions,
        buildDataset,
        loading: loadingService,
    } = useReportData();

    const [profileVillage, setProfileVillage] = useState<string>("");
    const [profileAreaHa, setProfileAreaHa] = useState<number>(0);
    const [profileLoading, setProfileLoading] = useState<boolean>(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setProfileLoading(true);
                const prof = await getMyProfile();
                if (!alive) return;
                const ha = Number(prof?.luas_lahan) || 0;
                setProfileVillage(prof?.nama_desa || "");
                setProfileAreaHa(ha > 0 ? ha : 1);
            } catch {
                if (!alive) return;
                setProfileAreaHa(1);
            } finally {
                if (alive) setProfileLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    const [openSeason, setOpenSeason] = useState(false);
    const [openYear, setOpenYear] = useState(false);

    // Urutkan musim terbaru dulu
    const orderedSeasons = useMemo(
        () =>
            [...seasons].sort(
                (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            ),
        [seasons]
    );
    const currentIdx = useMemo(
        () => (seasonId ? orderedSeasons.findIndex((s) => s.id === seasonId) : -1),
        [orderedSeasons, seasonId]
    );
    const currentSeason = currentIdx >= 0 ? orderedSeasons[currentIdx] : undefined;

    // Year-active => disable season nav
    const yearActive = year !== "all";
    const canPrev = !yearActive && currentIdx >= 0 && currentIdx < orderedSeasons.length - 1;
    const canNext = !yearActive && currentIdx > 0;

    const pickSeason = (id: string) => {
        setYear("all" as any); // saat pilih musim, matikan filter tahun
        setSeasonId(id);
    };

    const goPrev = () => {
        if (!canPrev) return;
        pickSeason(orderedSeasons[currentIdx + 1].id);
    };
    const goNext = () => {
        if (!canNext) return;
        pickSeason(orderedSeasons[currentIdx - 1].id);
    };

    // Pilih tahun => nonaktifkan season (mode RAW)
    const pickYear = (y: number) => {
        setSeasonId(undefined);
        setYear(y as any);
    };

    // Matikan filter tahun => pilih musim terbaru
    const clearYearFilter = () => {
        setYear("all" as any);
        if (orderedSeasons.length > 0) {
            setSeasonId(orderedSeasons[0].id);
        }
    };

    const activeFilterText =
        seasonId && currentSeason
            ? `Filter: Musim Ke-${currentSeason.season_no} · ${fmtDate(
                currentSeason.start_date
            )} — ${fmtDate(currentSeason.end_date)}`
            : yearActive
                ? `Filter: Tahun ${year}`
                : "Pilih Musim atau Tahun";

    const seasonCropType = seasonId ? currentSeason?.crop_type : "";

    const [overrideAreaStr, setOverrideAreaStr] = useState<string>("");
    const [effectiveArea, setEffectiveArea] = useState<number | null>(null);

    const onConvert = () => {
        const v = parseFloat((overrideAreaStr || "").replace(",", "."));
        if (Number.isFinite(v) && v > 0) setEffectiveArea(v);
        Keyboard.dismiss();
    };
    const onReset = () => {
        setOverrideAreaStr("");
        setEffectiveArea(null);
    };

    const landFactor = useMemo(() => {
        const base = profileAreaHa > 0 ? profileAreaHa : 1;
        const target = effectiveArea != null ? effectiveArea : base;
        return target / base;
    }, [profileAreaHa, effectiveArea]);

    const [yearRows, setYearRows] = useState<YearRow[]>([]); // <== sumber year-mode
    const [base, setBase] = useState({
        production: [] as {
            label: string;
            quantity: number | null;
            unitType: string | null;
            unitPrice: number;
        }[],
        cash: [] as {
            category: string;
            quantity: number | null;
            unit: string | null;
            unitPrice: number;
        }[],
        cashExtras: [] as { label: string; amount: number }[], // ⬅️ NEW (tunai lainnya)
        laborNonCashNom: 0,
        laborNonCashDetail: null as null | {
            qty: number | null;
            unit: string | null;
            unitPrice: number | null;
            amount: number;
        },
        tools: [] as { toolName: string; quantity: number; purchasePrice: number }[],
        extras: [] as { category: string; label: string; amount: number }[],
    });
    const [bootLoading, setBootLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            if (profileLoading) return;
            setBootLoading(true);
            try {
                const d = await buildDataset({ landFactor });
                if (!alive) return;
                setBase({
                    production: d.production || [],
                    cash: d.cashByCategory || [],
                    cashExtras: d.cashExtras || [], // ⬅️ ambil dari service
                    laborNonCashNom: (d.labor || []).reduce((a, r) => a + (r.value || 0), 0),
                    laborNonCashDetail: d.laborNonCashDetail ?? null,
                    tools: d.tools || [],
                    extras: d.extras || [],
                });
                // set untuk year-mode
                setYearRows(d.yearRows || []);
            } catch (e) {
                console.warn("report dataset error:", e);
                if (!alive) return;
                setBase({
                    production: [],
                    cash: [],
                    cashExtras: [],
                    laborNonCashNom: 0,
                    laborNonCashDetail: null,
                    tools: [],
                    extras: [],
                });
                setYearRows([]);
            } finally {
                if (alive) setBootLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [buildDataset, profileLoading, seasonId, year, landFactor]);

    const prodValue = (p: (typeof base.production)[number]) =>
        p.quantity != null ? p.quantity * p.unitPrice : p.unitPrice;

    const cashValue = (c: (typeof base.cash)[number]) =>
        c.quantity != null ? c.quantity * c.unitPrice : c.unitPrice;

    const cashExtraValue = (e: (typeof base.cashExtras)[number]) => e.amount || 0;

    const toolValue = (t: (typeof base.tools)[number]) => t.quantity * t.purchasePrice;

    const extraValue = (e: (typeof base.extras)[number]) => e.amount || 0;

    const totalProduksi = useMemo(
        () => base.production.reduce((acc, p) => acc + prodValue(p), 0),
        [base.production]
    );

    const totalBiayaTunai = useMemo(
        () =>
            base.cash.reduce((acc, c) => acc + cashValue(c), 0) +
            base.cashExtras.reduce((acc, e) => acc + cashExtraValue(e), 0),
        [base.cash, base.cashExtras]
    );

    const totalBiayaNonTunaiTK = useMemo(() => base.laborNonCashNom, [base.laborNonCashNom]);

    const totalTools = useMemo(
        () => base.tools.reduce((acc, t) => acc + t.quantity * t.purchasePrice, 0),
        [base.tools]
    );

    const totalToolsQty = useMemo(
        () => base.tools.reduce((acc, t) => acc + t.quantity, 0),
        [base.tools]
    );
    console.log("BASE TOOLS", base.tools);

    const totalBiayaNonTunaiLain = useMemo(() => {
        const toolsVal = base.tools.reduce((acc, t) => acc + toolValue(t), 0);
        const extrasVal = base.extras.reduce((acc, e) => acc + extraValue(e), 0);
        return toolsVal + extrasVal;
    }, [base.tools, base.extras]);

    const totalBiayaNonTunai = totalBiayaNonTunaiTK + totalBiayaNonTunaiLain;
    const totalBiaya = totalBiayaTunai + totalBiayaNonTunai;

    const pendapatanAtasBiayaTunai = totalProduksi - totalBiayaTunai;
    const pendapatanAtasBiayaTotal = totalProduksi - totalBiaya;
    const rcTunai = totalBiayaTunai > 0 ? totalProduksi / totalBiayaTunai : 0;
    const rcTotal = totalBiaya > 0 ? totalProduksi / totalBiaya : 0;

    const showBlocking = (loadingService || profileLoading) && totalProduksi === 0;

    const musimLabel = seasonId && currentSeason ? `Musim-${currentSeason.season_no}` : "Semua-Musim";

    const tahunLabel = yearActive
        ? String(year)
        : currentSeason
            ? `${new Date(currentSeason.start_date).getFullYear()}`
            : "Semua-Tahun";

    const pdfFileName = `Laporan ${musimLabel} ${tahunLabel}`;

    // ===== Row sederhana untuk Year Mode (tanpa Satuan & Harga) =====
    const SimpleRow = ({
        label,
        value,
    }: {
        label: string;
        value: number;
    }) => (
        <View style={[styles.simpleRow, { borderColor: C.border }]}>
            <Text style={[styles.tdUraian, { color: C.text }]} numberOfLines={2}>
                {label}
            </Text>
            <Text style={[styles.tdRight, { color: C.text }]}>{currency(value)}</Text>
        </View>
    );

    const yrRaw = (lbl: string) => {
        const row = yearRows.find((r) => r.label.toLowerCase() === lbl.toLowerCase());
        return row ? Number(row.amount || 0) : 0;
    };
    const yrMoney = (lbl: string) => (yrRaw(lbl) * landFactor);
    const extractMtNo = (label: string): number | null => {
        const m = label.match(/MT\s*(\d+)/i);
        return m ? Number(m[1]) : null;
    };
    const mtList = useMemo(() => {
        const set = new Set<number>();
        yearRows.forEach((r) => {
            const n = extractMtNo(r.label || "");
            if (n != null && Number.isFinite(n)) set.add(n);
        });
        return Array.from(set).sort((a, b) => a - b);
    }, [yearRows]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            <KeyboardAwareScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                enableOnAndroid
                enableAutomaticScroll
                extraScrollHeight={Platform.select({ ios: 80, android: 200 })}
                keyboardShouldPersistTaps="handled"
            >
                {/* ===== Header ===== */}
                <LinearGradient
                    colors={[C.gradientFrom, C.gradientTo]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
                >
                    <View style={styles.headerRow}>
                        <Text style={[styles.headerTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                            Report
                        </Text>
                        <Pressable
                            onPress={async () => {
                                await generateReportPdf({
                                    fileName: pdfFileName,
                                    title: `Laporan ${musimLabel.replace(/-/g, " ")} | ${tahunLabel.replace(/-/g, " ")}`,
                                    cropType: seasonCropType,
                                    village: profileVillage,
                                    perHaTitle: `Tabel Analisis Kelayakan Usaha Tani per ${profileAreaHa} ha`,
                                    profileAreaHa,
                                    effectiveArea: effectiveArea != null ? effectiveArea : profileAreaHa,
                                    landFactor,
                                    cashExtras: base.cashExtras,
                                    production: base.production,
                                    cash: base.cash,
                                    tools: base.tools,
                                    extras: base.extras,
                                    laborNonCashNom: base.laborNonCashNom,
                                    laborNonCashDetail: base.laborNonCashDetail ?? undefined,
                                    prettyLabel,
                                    // Year Mode:
                                    yearRows: yearActive
                                        ? yearRows.map(r =>
                                            r.section === "rc" ? r : { ...r, amount: Number(r.amount || 0) * landFactor } // ⬅️ skala uang, bukan RC
                                        )
                                        : undefined,
                                    share: true,
                                });
                            }}
                            style={({ pressed }) => [
                                styles.iconBtn,
                                { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.9 : 1 },
                            ]}
                        >
                            <Ionicons name="download-outline" size={18} color={C.text} />
                        </Pressable>
                    </View>
                </LinearGradient>

                {/* Body */}
                <View style={{ paddingHorizontal: S.spacing.lg }}>
                    {/* === Season Selector === */}
                    <View
                        style={[
                            styles.selectorCard,
                            {
                                backgroundColor: C.surface,
                                borderColor: C.border,
                                borderRadius: S.radius.lg,
                                marginTop: S.spacing.lg,
                                opacity: yearActive ? 0.6 : 1,
                            },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Pressable
                                onPress={goPrev}
                                disabled={!canPrev}
                                style={({ pressed }) => [
                                    styles.navBtn,
                                    {
                                        borderColor: C.border,
                                        backgroundColor: canPrev ? C.surfaceSoft : C.surface,
                                        opacity: pressed ? 0.9 : 1,
                                    },
                                ]}
                            >
                                <Ionicons name="chevron-back" size={16} color={canPrev ? C.text : C.textMuted} />
                            </Pressable>

                            <Pressable
                                disabled={yearActive}
                                onPress={() => {
                                    if (yearActive) return;
                                    setOpenSeason((v) => !v);
                                    setOpenYear(false);
                                }}
                                style={({ pressed }) => [
                                    styles.seasonRow,
                                    { borderColor: C.border, opacity: pressed ? 0.96 : 1, flex: 1 },
                                ]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.seasonTitle, { color: C.text }]}>
                                        {seasonId && currentSeason ? `Musim Ke-${currentSeason.season_no}` : "Pilih Musim"}
                                    </Text>
                                    {seasonId && currentSeason && (
                                        <Text style={[styles.seasonRange, { color: C.textMuted }]}>
                                            {fmtDate(currentSeason.start_date)} — {fmtDate(currentSeason.end_date)}
                                        </Text>
                                    )}
                                </View>
                                <Ionicons
                                    name={openSeason ? "chevron-up" : "chevron-down"}
                                    size={18}
                                    color={yearActive ? C.textMuted : C.icon}
                                />
                            </Pressable>

                            <Pressable
                                onPress={goNext}
                                disabled={!canNext}
                                style={({ pressed }) => [
                                    styles.navBtn,
                                    {
                                        borderColor: C.border,
                                        backgroundColor: canNext ? C.surfaceSoft : C.surface,
                                        opacity: pressed ? 0.9 : 1,
                                    },
                                ]}
                            >
                                <Ionicons name="chevron-forward" size={16} color={canNext ? C.text : C.textMuted} />
                            </Pressable>
                        </View>

                        {openSeason && !yearActive && (
                            <View style={[styles.seasonList, { borderColor: C.border }]}>
                                {orderedSeasons.map((s) => (
                                    <Pressable
                                        key={s.id}
                                        onPress={() => {
                                            pickSeason(s.id);
                                            setOpenSeason(false);
                                        }}
                                        style={({ pressed }) => [
                                            styles.seasonItem,
                                            {
                                                backgroundColor:
                                                    s.id === seasonId
                                                        ? scheme === "light"
                                                            ? C.surfaceSoft
                                                            : C.surface
                                                        : "transparent",
                                                opacity: pressed ? 0.96 : 1,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                color: C.text,
                                                fontWeight: (s.id === seasonId ? "800" : "600") as any,
                                            }}
                                        >
                                            Musim Ke-{s.season_no}
                                        </Text>
                                        <Text style={{ color: C.textMuted, fontSize: 12 }}>
                                            {fmtDate(s.start_date)} — {fmtDate(s.end_date)}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}

                        {yearActive && (
                            <Text style={{ marginTop: 8, fontSize: 12, color: C.textMuted, fontWeight: "700" }}>
                                Filter Musim nonaktif saat Filter Tahun aktif.
                            </Text>
                        )}
                    </View>

                    {/* === Year Selector === */}
                    <View
                        style={[
                            styles.selectorCard,
                            {
                                backgroundColor: C.surface,
                                borderColor: C.border,
                                borderRadius: S.radius.lg,
                                marginTop: S.spacing.md,
                            },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        {yearActive && (
                            <View style={{ marginBottom: 8, flexDirection: "row", justifyContent: "flex-end" }}>
                                <Pressable
                                    onPress={clearYearFilter}
                                    style={({ pressed }) => [
                                        {
                                            width: 30,
                                            height: 30,
                                            borderRadius: 8,
                                            borderWidth: 1,
                                            borderColor: C.border,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundColor: pressed ? C.surfaceSoft : C.surface,
                                        },
                                    ]}
                                    accessibilityLabel="Matikan filter tahun"
                                >
                                    <Text style={{ color: C.textMuted, fontWeight: "900" }}>✕</Text>
                                </Pressable>
                            </View>
                        )}
                        <Pressable
                            onPress={() => {
                                setOpenYear((v) => !v);
                                setOpenSeason(false);
                            }}
                            style={({ pressed }) => [
                                styles.seasonRow,
                                { borderColor: C.border, opacity: pressed ? 0.96 : 1 },
                            ]}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.seasonTitle, { color: C.text }]}>
                                    {yearActive ? `Tahun ${year}` : "Pilih Tahun"}
                                </Text>
                            </View>
                            <Ionicons name={openYear ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
                        </Pressable>

                        {openYear && (
                            <View style={[styles.seasonList, { borderColor: C.border }]}>
                                {yearOptions.map((y) => (
                                    <Pressable
                                        key={y}
                                        onPress={() => {
                                            pickYear(y);
                                            setOpenYear(false);
                                        }}
                                        style={({ pressed }) => [styles.seasonItem, { opacity: pressed ? 0.96 : 1 }]}
                                    >
                                        <Text style={{ color: C.text, fontWeight: (year === y ? "800" : "600") as any }}>
                                            {y}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Keterangan filter + judul per Ha */}
                    <Text style={{ marginTop: 8, color: C.textMuted, fontSize: 12, fontWeight: "700" as any }}>
                        {activeFilterText}
                    </Text>
                    <Text style={[styles.tableTitle, { color: C.text, marginTop: 6 }]}>
                        Tabel Analisis Kelayakan Usaha Tani per{" "}
                        <Text style={{ color: C.danger, fontWeight: "900" as any }}>{profileAreaHa} Ha</Text>
                    </Text>
                    <Text style={{ marginTop: 4, color: C.textMuted, fontSize: 12 }}>
                        Luas Profil: <Text style={{ color: C.text, fontWeight: "800" as any }}>{profileAreaHa} Ha</Text> ·{" "}
                        Luas Konversi:{" "}
                        <Text style={{ color: C.text, fontWeight: "800" as any }}>
                            {effectiveArea != null ? effectiveArea : profileAreaHa} Ha
                        </Text>{" "}
                        · Faktor: <Text style={{ color: C.text, fontWeight: "800" as any }}>{landFactor.toFixed(2)}</Text>
                    </Text>

                    {(showBlocking || bootLoading) && (
                        <View style={{ paddingVertical: 24, alignItems: "center" }}>
                            <ActivityIndicator color={C.tint} size={"large"} />
                            <Text style={{ marginTop: 8, color: C.textMuted }}>Memuat report…</Text>
                        </View>
                    )}

                    {/* ===== TABEL ===== */}
                    {!showBlocking && !bootLoading && (
                        <>
                            {/* Header Kolom */}
                            {yearActive ? (
                                <View style={[styles.tableHead, { borderColor: C.border }]}>
                                    <Text style={[styles.thUraian, { color: C.textMuted }]}>Uraian</Text>
                                    <Text style={[styles.thRightSlim, { color: C.textMuted }]}>Nilai (Rp)</Text>
                                </View>
                            ) : (
                                <View style={[styles.tableHead, { borderColor: C.border }]}>
                                    <Text style={[styles.thUraian, { color: C.textMuted }]}>Uraian</Text>
                                    <Text style={[styles.thSmall, { color: C.textMuted }]}>Jumlah</Text>
                                    <Text style={[styles.thSmall, { color: C.textMuted }]}>Satuan</Text>
                                    <Text style={[styles.thSmall, { color: C.textMuted }]}>Harga (Rp)</Text>
                                    <Text style={[styles.thRight, { color: C.textMuted }]}>Nilai (Rp)</Text>
                                </View>
                            )}

                            {/* ====== YEAR MODE CONTENT ====== */}
                            {yearActive ? (
                                <>
                                    {/* PENERIMAAN */}
                                    <SectionTitle text="Penerimaan" C={C} />
                                    {mtList.map((n) => (
                                        <SimpleRow
                                            key={`pen-mt-${n}`}
                                            label={`Penerimaan MT ${n}`}
                                            value={yrMoney(`Penerimaan MT ${n}`)}
                                        />
                                    ))}

                                    {/* BIAYA PRODUKSI */}
                                    <SectionTitle text="Biaya Produksi" C={C} />
                                    {mtList.map((n) => (
                                        <React.Fragment key={`biaya-mt-${n}`}>
                                            <SubTitle text={`MT ${n}`} C={C} />
                                            <SimpleRow
                                                label={`Biaya Non Tunai MT ${n}`}
                                                value={yrMoney(`Biaya Non Tunai MT ${n}`)}
                                            />
                                            <SimpleRow
                                                label={`Biaya Tunai MT ${n}`}
                                                value={yrMoney(`Biaya Tunai MT ${n}`)}
                                            />
                                            <SimpleRow
                                                label={`Biaya Total MT ${n}`}
                                                value={yrMoney(`Biaya Total MT ${n}`)}
                                            />
                                        </React.Fragment>
                                    ))}

                                    {/* PENDAPATAN */}
                                    <SectionTitle text="Pendapatan" C={C} />
                                    {mtList.map((n) => (
                                        <React.Fragment key={`pend-mt-${n}`}>
                                            <SimpleRow
                                                label={`Pendapatan Atas Biaya Tunai MT ${n}`}
                                                value={yrMoney(`Pendapatan Atas Biaya Tunai MT ${n}`)}
                                            />
                                            <SimpleRow
                                                label={`Pendapatan Atas Biaya Non Tunai MT ${n}`}
                                                value={yrMoney(`Pendapatan Atas Biaya Non Tunai MT ${n}`)}
                                            />
                                            <SimpleRow
                                                label={`Pendapatan Atas Biaya Total MT ${n}`}
                                                value={yrMoney(`Pendapatan Atas Biaya Total MT ${n}`)}
                                            />
                                        </React.Fragment>
                                    ))}

                                    {/* R/C */}
                                    <SectionTitle text="R/C" C={C} />
                                    {mtList.map((n) => (
                                        <React.Fragment key={`rc-mt-${n}`}>
                                            <TotalLine
                                                label={`R/C Biaya Tunai MT ${n}`}
                                                valueStr={yrMoney(`R/C Biaya Tunai MT ${n}`).toFixed(2)}
                                                C={C}
                                            />
                                            <TotalLine
                                                label={`R/C Biaya Non Tunai MT ${n}`}
                                                valueStr={yrMoney(`R/C Biaya Non Tunai MT ${n}`).toFixed(2)}
                                                C={C}
                                            />
                                            <TotalLine
                                                label={`R/C Biaya Total MT ${n}`}
                                                valueStr={yrMoney(`R/C Biaya Total MT ${n}`).toFixed(2)}
                                                C={C}
                                            />
                                        </React.Fragment>
                                    ))}
                                </>
                            ) : (
                                // ====== SEASON MODE CONTENT ======
                                <>
                                    {/* Penerimaan */}
                                    <SectionTitle text="Penerimaan" C={C} />
                                    {base.production.map((p, i) => {
                                        const value = p.quantity != null ? p.quantity * p.unitPrice : p.unitPrice;
                                        return (
                                            <RowView
                                                key={`prod-${i}`}
                                                C={C}
                                                label={p.label ?? "Produksi"}
                                                qty={Number(p.quantity?.toFixed(0)) ?? undefined}
                                                unit={p.unitType ?? null}
                                                price={p.unitPrice ?? undefined}
                                                value={value}
                                            />
                                        );
                                    })}

                                    {/* BIAYA PRODUKSI */}
                                    <SectionTitle text="Biaya Produksi" C={C} />
                                    <SubTitle text="I. Biaya Tunai" C={C} />

                                    {/* Material & TK Luar Keluarga (dari cashByCategory) */}
                                    {base.cash.map((c, i) => {
                                        const label = prettyLabel(c.category || "");
                                        const value = c.quantity != null ? c.quantity * c.unitPrice : c.unitPrice;
                                        return (
                                            <RowView
                                                key={`bt-${i}`}
                                                C={C}
                                                label={label}
                                                qty={Number(c.quantity?.toFixed(0)) ?? undefined}
                                                unit={c.unit ?? undefined}
                                                price={c.quantity != null ? c.unitPrice : undefined}
                                                value={value}
                                            />
                                        );
                                    })}

                                    {base.cashExtras.length > 0 && (
                                        <>
                                            <SubMini text="Biaya Lain" C={C} />
                                            {base.cashExtras.map((e, i) => (
                                                <RowView
                                                    key={`cash-extra-${i}`}
                                                    C={C}
                                                    label={prettyLabel(e.label ?? "Biaya Lain")}
                                                    value={cashExtraValue(e)}
                                                />
                                            ))}
                                        </>
                                    )}

                                    <SubTitle text="II. Biaya Non Tunai" C={C} />

                                    {/* TK Non Tunai */}
                                    {base.laborNonCashDetail?.amount ? (
                                        <RowView
                                            C={C}
                                            label={prettyLabel("TK Dalam Keluarga")}
                                            qty={base.laborNonCashDetail.qty ?? undefined}
                                            unit={base.laborNonCashDetail.unit ?? undefined}
                                            price={
                                                base.laborNonCashDetail.unitPrice != null
                                                    ? base.laborNonCashDetail.unitPrice
                                                    : undefined
                                            }
                                            value={base.laborNonCashDetail.amount}
                                        />
                                    ) : (
                                        base.laborNonCashNom > 0 && (
                                            <RowView
                                                C={C}
                                                label={prettyLabel("TK Dalam Keluarga")}
                                                value={base.laborNonCashNom}
                                            />
                                        )
                                    )}

                                    <SubMini text="Biaya Lain" C={C} />

                                    {/* Tools */}
                                    {totalTools > 0 && (
                                        <RowView C={C} label="Penyusutan Alat" qty={totalToolsQty} value={totalTools} />
                                    )}

                                    {/* Extras noncash */}
                                    {base.extras.map((e, i) => (
                                        <RowView
                                            key={`extra-${i}`}
                                            C={C}
                                            label={prettyLabel(e.label ?? e.category ?? "Biaya Lain")}
                                            value={extraValue(e)}
                                        />
                                    ))}

                                    {/* TOTALS */}
                                    <TotalLine label="Total Biaya Tunai" value={totalBiayaTunai} C={C} />
                                    <TotalLine label="Total Biaya Non Tunai" value={totalBiayaNonTunai} C={C} />
                                    <TotalLine label="Total Biaya" value={totalBiaya} C={C} bold />

                                    {/* PENDAPATAN */}
                                    <SectionTitle text="Pendapatan" C={C} />
                                    <TotalLine
                                        label="Pendapatan Atas Biaya Tunai"
                                        value={pendapatanAtasBiayaTunai}
                                        C={C}
                                    />
                                    <TotalLine
                                        label="Pendapatan Atas Biaya Total"
                                        value={pendapatanAtasBiayaTotal}
                                        C={C}
                                    />
                                    <TotalLine label="R/C Biaya Tunai" valueStr={rcTunai.toFixed(2)} C={C} />
                                    <TotalLine label="R/C Biaya Total" valueStr={rcTotal.toFixed(2)} C={C} />
                                </>
                            )}

                            {/* ===== Konversi Input ===== */}
                            <View style={[styles.convertWrap, { borderTopColor: C.border }]}>
                                <View
                                    style={[styles.convertInputWrap, { borderColor: C.border, backgroundColor: C.surface }]}
                                >
                                    <TextInput
                                        placeholder="Masukkan Ukuran Lahan (Ha)"
                                        placeholderTextColor={C.icon}
                                        keyboardType="decimal-pad"
                                        value={overrideAreaStr}
                                        onChangeText={setOverrideAreaStr}
                                        style={[styles.convertInput, { color: C.text, fontFamily: Fonts.sans as any }]}
                                        returnKeyType="done"
                                        onSubmitEditing={Keyboard.dismiss}
                                    />
                                    <Pressable
                                        onPress={onConvert}
                                        style={({ pressed }) => [
                                            styles.convertBtn,
                                            { backgroundColor: C.tint, opacity: pressed ? 0.95 : 1 },
                                        ]}
                                    >
                                        <Text style={{ color: "#fff", fontWeight: "800" as any }}>Konversi</Text>
                                    </Pressable>
                                </View>

                                <Pressable
                                    onPress={onReset}
                                    style={({ pressed }) => [
                                        styles.resetBtn,
                                        { backgroundColor: "#ef4444", opacity: pressed ? 0.95 : 1 },
                                    ]}
                                >
                                    <Text style={{ color: "#fff", fontWeight: "900" as any }}>Reset</Text>
                                </Pressable>
                            </View>
                        </>
                    )}
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    tableTitle: { fontSize: 13 },

    // Season selector
    selectorCard: { padding: 12, borderWidth: 1 },
    seasonRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    seasonTitle: { fontSize: 14, fontWeight: "800" },
    seasonRange: { fontSize: 12, marginTop: 2 },
    seasonList: { borderTopWidth: 1, borderRadius: 10, overflow: "hidden", marginTop: 10 },
    seasonItem: { paddingHorizontal: 12, paddingVertical: 10 },
    navBtn: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
    },

    // Table (full)
    tableHead: {
        flexDirection: "row",
        borderBottomWidth: 1,
        paddingVertical: 8,
        marginTop: 10,
    },
    thUraian: { flex: 1.8, fontSize: 12, fontWeight: "800" },
    thSmall: { flex: 1, fontSize: 12, fontWeight: "800" },
    thRight: { width: 110, fontSize: 12, fontWeight: "800", textAlign: "right" },

    // Table (year mode)
    thRightSlim: { width: 130, fontSize: 12, fontWeight: "800", textAlign: "right" },
    simpleRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        paddingVertical: 8,
    },
    tdUraian: { flex: 1.8, fontSize: 12 },
    tdSmall: { flex: 1, textAlign: "center", fontSize: 12 },
    tdRight: { width: 130, fontSize: 12, textAlign: "right" },

    // Convert area
    convertWrap: {
        borderTopWidth: 1,
        marginTop: 18,
        paddingTop: 12,
    },
    convertInputWrap: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderRadius: 12,
        overflow: "hidden",
        marginTop: 8,
    },
    convertInput: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 13,
    },
    convertBtn: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    resetBtn: {
        marginTop: 12,
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
    },
});
