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

    // biarkan kapitalisasi label TK apa adanya (cash & noncash)
    if (rawCat?.trim() === "TK Luar Keluarga" || rawCat?.trim() === "TK Dalam Keluarga") {
        return name ? `${rawCat.trim()} | ${name.trim()}` : rawCat.trim();
    }

    const label =
        CATEGORY_LABEL_REPORT[rawCat] ??
        rawCat?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    return name ? `${label} | ${name.trim()}` : label;
}

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

    const canPrev = currentIdx >= 0 && currentIdx < orderedSeasons.length - 1;
    const canNext = currentIdx > 0;
    const goPrev = () => {
        if (!canPrev) return;
        setSeasonId(orderedSeasons[currentIdx + 1].id);
        setYear("all" as any);
    };
    const goNext = () => {
        if (!canNext) return;
        setSeasonId(orderedSeasons[currentIdx - 1].id);
        setYear("all" as any);
    };

    const activeFilterText = seasonId
        ? `Filter: Musim Ke-${currentSeason?.season_no ?? "?"}`
        : year !== "all"
            ? `Filter: Tahun ${year}`
            : "Filter: Semua data";
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
                    laborNonCashNom: (d.labor || []).reduce((a, r) => a + (r.value || 0), 0),
                    laborNonCashDetail: d.laborNonCashDetail ?? null,
                    tools: d.tools || [],
                    extras: d.extras || [],
                });
            } catch (e) {
                console.warn("report dataset error:", e);
                if (!alive) return;
                setBase({
                    production: [],
                    cash: [],
                    laborNonCashNom: 0,
                    laborNonCashDetail: null,
                    tools: [],
                    extras: [],
                });
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

    const toolValue = (t: (typeof base.tools)[number]) => t.quantity * t.purchasePrice;

    const extraValue = (e: (typeof base.extras)[number]) => e.amount || 0;

    const totalProduksi = useMemo(
        () => base.production.reduce((acc, p) => acc + prodValue(p), 0),
        [base.production]
    );

    const totalBiayaTunai = useMemo(
        () => base.cash.reduce((acc, c) => acc + cashValue(c), 0),
        [base.cash]
    );

    const totalBiayaNonTunaiTK = useMemo(
        () => base.laborNonCashNom,
        [base.laborNonCashNom]
    );

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
                                    title: "Report",
                                    filterText: activeFilterText,
                                    cropType: seasonCropType,
                                    village: profileVillage,
                                    perHaTitle: `Tabel Analisis Kelayakan Usaha Tani per ${profileAreaHa} Ha`,
                                    profileAreaHa,
                                    effectiveArea: effectiveArea != null ? effectiveArea : profileAreaHa,
                                    landFactor, // metadata PDF; dataset sudah terskalakan
                                    production: base.production,
                                    cash: base.cash,
                                    tools: base.tools,
                                    extras: base.extras,
                                    laborNonCashNom: base.laborNonCashNom,
                                    laborNonCashDetail: base.laborNonCashDetail ?? undefined,
                                    prettyLabel,
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
                                onPress={() => {
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
                                        {seasonId && currentSeason ? `Musim Ke-${currentSeason.season_no}` : "Semua Musim"}
                                    </Text>
                                    {seasonId && currentSeason && (
                                        <Text style={[styles.seasonRange, { color: C.textMuted }]}>
                                            {fmtDate(currentSeason.start_date)} — {fmtDate(currentSeason.end_date)}
                                        </Text>
                                    )}
                                </View>
                                <Ionicons name={openSeason ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
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

                        {openSeason && (
                            <View style={[styles.seasonList, { borderColor: C.border }]}>
                                <Pressable
                                    onPress={() => {
                                        setSeasonId(undefined);
                                        setYear("all" as any);
                                        setOpenSeason(false);
                                    }}
                                    style={({ pressed }) => [styles.seasonItem, { opacity: pressed ? 0.96 : 1 }]}
                                >
                                    <Text style={{ color: C.text, fontWeight: (!seasonId ? "800" : "600") as any }}>
                                        Semua Musim
                                    </Text>
                                </Pressable>

                                {orderedSeasons.map((s) => (
                                    <Pressable
                                        key={s.id}
                                        onPress={() => {
                                            setSeasonId(s.id);
                                            setYear("all" as any);
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
                                    {year === "all" ? "Semua Tahun" : `Tahun ${year}`}
                                </Text>
                                <Text style={[styles.seasonRange, { color: C.textMuted }]}>
                                    {seasonId ? "Filter Tahun nonaktif saat memilih Musim" : "Saring data berdasarkan tahun"}
                                </Text>
                            </View>
                            <Ionicons name={openYear ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
                        </Pressable>

                        {openYear && (
                            <View style={[styles.seasonList, { borderColor: C.border }]}>
                                <Pressable
                                    onPress={() => {
                                        setYear("all" as any);
                                        setSeasonId(undefined);
                                        setOpenYear(false);
                                    }}
                                    style={({ pressed }) => [styles.seasonItem, { opacity: pressed ? 0.96 : 1 }]}
                                >
                                    <Text style={{ color: C.text, fontWeight: (year === "all" ? "800" : "600") as any }}>
                                        Semua Tahun
                                    </Text>
                                </Pressable>

                                {yearOptions.map((y) => (
                                    <Pressable
                                        key={y}
                                        onPress={() => {
                                            setYear(y as any);
                                            setSeasonId(undefined);
                                            setOpenYear(false);
                                        }}
                                        style={({ pressed }) => [styles.seasonItem, { opacity: pressed ? 0.96 : 1 }]}
                                    >
                                        <Text style={{ color: C.text, fontWeight: ((year === y ? "800" : "600") as any) }}>
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
                            <View style={[styles.tableHead, { borderColor: C.border }]}>
                                <Text style={[styles.thUraian, { color: C.textMuted }]}>Uraian</Text>
                                <Text style={[styles.thSmall, { color: C.textMuted }]}>Jumlah</Text>
                                <Text style={[styles.thSmall, { color: C.textMuted }]}>Satuan</Text>
                                <Text style={[styles.thSmall, { color: C.textMuted }]}>Harga (Rp)</Text>
                                <Text style={[styles.thRight, { color: C.textMuted }]}>Nilai (Rp)</Text>
                            </View>

                            {/* PRODUKSI */}
                            <SectionTitle text="Produksi" C={C} />
                            {base.production.map((p, i) => {
                                const value = prodValue(p);
                                return (
                                    <RowView
                                        key={`prod-${i}`}
                                        C={C}
                                        label={p.label ?? "Penerimaan"}
                                        qty={p.quantity ?? undefined}
                                        unit={p.unitType ?? null}
                                        price={p.unitPrice ?? undefined}
                                        value={value}
                                    />
                                );
                            })}

                            {/* BIAYA PRODUKSI */}
                            <SectionTitle text="Biaya Produksi" C={C} />
                            <SubTitle text="I. Biaya Tunai" C={C} />
                            {base.cash.map((c, i) => {
                                const label = prettyLabel(c.category || "");
                                const value = cashValue(c);
                                return (
                                    <RowView
                                        key={`bt-${i}`}
                                        C={C}
                                        label={label}
                                        qty={c.quantity ?? undefined}
                                        unit={c.unit ?? undefined}
                                        price={c.quantity != null ? c.unitPrice : undefined}
                                        value={value}
                                    />
                                );
                            })}

                            <SubTitle text="II. Biaya Non Tunai" C={C} />

                            {/* TK Non Tunai (detail qty HOK + harga/HOK bila tersedia) */}
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
                                totalBiayaNonTunaiTK > 0 && (
                                    <RowView
                                        C={C}
                                        label={prettyLabel("TK Dalam Keluarga")}
                                        value={totalBiayaNonTunaiTK}
                                    />
                                )
                            )}


                            <SubMini text="Biaya Lain" C={C} />
                            {/* Tools detail */}
                            {base.tools.map((t, i) => {
                                const value = toolValue(t);
                                return (
                                    <RowView
                                        key={`tool-${i}`}
                                        C={C}
                                        label={`Alat${t.toolName ? ` | ${t.toolName}` : ""}`}
                                        qty={t.quantity}
                                        unit={null}
                                        price={t.purchasePrice}
                                        value={value}
                                    />
                                );
                            })}
                            {/* Extras nominal (termasuk tax noncash) */}
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
                            <TotalLine label="Pendapatan Atas Biaya Tunai" value={pendapatanAtasBiayaTunai} C={C} />
                            <TotalLine label="Pendapatan Atas Biaya Total" value={pendapatanAtasBiayaTotal} C={C} />
                            <TotalLine label="R/C Biaya Tunai" valueStr={rcTunai.toFixed(2)} C={C} />
                            <TotalLine label="R/C Biaya Total" valueStr={rcTotal.toFixed(2)} C={C} />

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

    // Table
    tableHead: {
        flexDirection: "row",
        borderBottomWidth: 1,
        paddingVertical: 8,
        marginTop: 10,
    },
    thUraian: { flex: 1.8, fontSize: 12, fontWeight: "800" },
    thSmall: { flex: 1, fontSize: 12, fontWeight: "800" },
    thRight: { width: 110, fontSize: 12, fontWeight: "800", textAlign: "right" },
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
