// screens/ChartScreen.tsx
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useSeasonFilter } from "@/context/SeasonFilterContext";
import { useExpenseChartData } from "@/services/chartService";
import { CATEGORY_LABEL } from "@/types/chart";
import { currency } from "@/utils/currency";
import { fmtDate } from "@/utils/date";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useColorScheme,
} from "react-native";
import PieChart from "react-native-pie-chart";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChartScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;

    // ===== Global season filter (persisted)
    const { seasonId: seasonIdGlobal, setSeasonId: setSeasonIdGlobal, ready } = useSeasonFilter();

    // ===== Service (pass initial from global)
    const {
        seasons,
        seasonId: seasonIdSvc,
        setSeasonId: setSeasonIdSvc,
        expensePieSummary,
        totalOut,
        loading,
    } = useExpenseChartData(seasonIdGlobal ?? undefined);

    // keep a local computed seasonId for rendering (prefer global if available)
    const seasonId = seasonIdGlobal ?? seasonIdSvc;

    const [openSeason, setOpenSeason] = useState(false);

    // ===== Urutkan musim terbaru dulu
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

    // ===== Auto-pick latest season once: when global not set yet
    useEffect(() => {
        if (!ready) return;
        if (!seasonIdGlobal && orderedSeasons.length > 0) {
            const latestId = orderedSeasons[0].id;
            setSeasonIdGlobal(latestId);
            setSeasonIdSvc(latestId);
        }
    }, [ready, seasonIdGlobal, orderedSeasons, setSeasonIdGlobal, setSeasonIdSvc]);

    // ===== Navigasi musim
    const canPrev = currentIdx >= 0 && currentIdx < orderedSeasons.length - 1;
    const canNext = currentIdx > 0;

    const pickSeason = (id: string) => {
        setSeasonIdGlobal(id);
        setSeasonIdSvc(id);
    };

    const goPrev = () => {
        if (!canPrev) return;
        pickSeason(orderedSeasons[currentIdx + 1].id);
    };
    const goNext = () => {
        if (!canNext) return;
        pickSeason(orderedSeasons[currentIdx - 1].id);
    };

    // ===== Chart sizing
    const chartWidth = Dimensions.get("window").width - S.spacing.lg * 2;
    const pieSize = Math.min(chartWidth - 24, 280);

    // ===== Palet warna
    const palette =
        scheme === "light"
            ? [
                "#4f8cff", "#ff6b6b", "#2bd4a1", "#ffb020",
                "#9b7bff", "#22c7e6", "#ff6584", "#35d266",
                "#4f8cff", "#ff6b6b", "#2bd4a1", "#ffb020",
                "#9b7bff", "#22c7e6", "#ff6584",
                "#ffa3cf", "#ffd24d", "#ffaf3f", "#fff36e",
                "#ff9f1a", "#ff7a1a", "#ff4d4d", "#ff1744",
                "#e6de3a", "#c2bf2b", "#8c7a1e", "#5a4d16",
                "#ffd9e8ff",
            ]
            : [
                "#3b7ae0", "#e05555", "#27b389", "#d59b1a",
                "#8166e0", "#1fb1c8", "#e35e78", "#2fb259",
                "#3b7ae0", "#e05555", "#27b389", "#d59b1a",
                "#8166e0", "#1fb1c8", "#e35e78",
                "#d4af37", "#cc8400", "#d69400", "#e6d800",
                "#d1b300", "#cc5200", "#cc3300", "#d00000",
                "#bcb800", "#8a8500", "#5a5300", "#2f2a00",
            ];

    const categoryLabel = (raw?: string) => (!raw ? "Lainnya" : CATEGORY_LABEL[raw] ?? raw.replace(/_/g, " "));

    // ===== Transform untuk legend (gabung no-name)
    const combinedSummary = useMemo(() => {
        const noNameMap = new Map<string, number>();
        const withName: { label: string; name: string; amount: number }[] = [];

        for (const s of expensePieSummary) {
            const amount = Number(s.amount) || 0;
            const label = String(s.label ?? "");
            const name = String(s.name ?? "").trim();
            if (!name) noNameMap.set(label, (noNameMap.get(label) ?? 0) + amount);
            else withName.push({ label, name, amount });
        }

        const noNameEntries = Array.from(noNameMap.entries()).map(([label, sum]) => ({
            label,
            name: "",
            amount: sum,
        }));

        return [...withName, ...noNameEntries];
    }, [expensePieSummary]);

    const series = useMemo(
        () =>
            combinedSummary.map((s, i) => ({
                value: Number(s.amount) || 0,
                color: palette[i % palette.length],
            })) as any,
        [combinedSummary, palette]
    );

    const expenseGrandTotal = useMemo(
        () => combinedSummary.reduce((sum, x) => sum + (Number(x.amount) || 0), 0),
        [combinedSummary]
    );

    const slicesWithPct = useMemo(
        () =>
            combinedSummary.map((s, i) => {
                const displayLabel = categoryLabel(s.label);
                return {
                    label: displayLabel,
                    name: s.name,
                    amount: Number(s.amount) || 0,
                    pct: expenseGrandTotal > 0 ? ((Number(s.amount) || 0) / expenseGrandTotal) * 100 : 0,
                    color: palette[i % palette.length],
                    idx: i,
                };
            }),
        [combinedSummary, expenseGrandTotal, palette]
    );

    const showBlocking = loading && expenseGrandTotal === 0;

    const activeFilterText =
        seasonId && currentSeason
            ? `Filter: Musim Ke-${currentSeason.season_no} · ${fmtDate(currentSeason.start_date)} — ${fmtDate(
                currentSeason.end_date
            )}`
            : "Pilih Musim";

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            <ScrollView contentContainerStyle={{ paddingBottom: S.spacing.xl }}>
                {/* Header */}
                <LinearGradient
                    colors={[C.gradientFrom, C.gradientTo]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
                >
                    <View style={styles.headerRow}>
                        <Text style={[styles.headerTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                            Grafik
                        </Text>
                        <View style={{ width: 36 }} />
                    </View>
                </LinearGradient>

                {/* Body */}
                <View style={{ paddingHorizontal: S.spacing.lg }}>
                    {/* === Season Selector (global) === */}
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
                                onPress={() => setOpenSeason((v) => !v)}
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
                                                    s.id === seasonId ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent",
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

                    {/* Keterangan filter aktif */}
                    <Text style={{ marginTop: 8, color: C.textMuted, fontSize: 12, fontWeight: "700" }}>
                        {activeFilterText}
                    </Text>

                    {/* Blocking loader */}
                    {showBlocking ? (
                        <View style={{ paddingVertical: 24, alignItems: "center" }}>
                            <ActivityIndicator color={C.tint} size={"large"} />
                            <Text style={{ marginTop: 8, color: C.textMuted }}>Memuat grafik…</Text>
                        </View>
                    ) : (
                        <>
                            {/* Ringkasan Pengeluaran */}
                            <View
                                style={[
                                    styles.summary,
                                    {
                                        borderColor: C.border,
                                        backgroundColor: C.surface,
                                        borderRadius: S.radius.lg,
                                    },
                                ]}
                            >
                                <View style={styles.summaryItem}>
                                    <Ionicons name="arrow-up-circle-outline" size={18} color={C.danger} />
                                    <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Total Pengeluaran</Text>
                                    <Text style={[styles.summaryValue, { color: C.text }]}>{currency(totalOut)}</Text>
                                </View>
                            </View>

                            {/* Kartu Chart */}
                            <View
                                style={[
                                    styles.chartCard,
                                    {
                                        borderColor: C.border,
                                        backgroundColor: C.surface,
                                        borderRadius: S.radius.lg,
                                    },
                                    scheme === "light" ? S.shadow.light : S.shadow.dark,
                                ]}
                            >
                                <Text style={[styles.chartTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                                    Komposisi Pengeluaran {seasonId && currentSeason ? `(Musim Ke-${currentSeason.season_no})` : ""}
                                </Text>

                                {expenseGrandTotal === 0 ? (
                                    <View style={{ paddingVertical: 24, alignItems: "center" }}>
                                        <Text style={{ color: C.textMuted }}>Belum ada data pengeluaran untuk musim ini.</Text>
                                    </View>
                                ) : (
                                    <>
                                        <View style={{ alignItems: "center", gap: 12 }}>
                                            <PieChart widthAndHeight={pieSize} series={series} />
                                            <Text style={{ color: C.textMuted }}>
                                                Total Pengeluaran: {currency(expenseGrandTotal)}
                                            </Text>
                                        </View>

                                        {/* Legend */}
                                        <View style={{ marginTop: 12, gap: 8 }}>
                                            {slicesWithPct.map((s) => (
                                                <View
                                                    key={`${s.label}-${s.name || "no-name"}-${s.idx}`}
                                                    style={{
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        gap: 8,
                                                    }}
                                                >
                                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                                        <View
                                                            style={{
                                                                width: 12,
                                                                height: 12,
                                                                borderRadius: 3,
                                                                backgroundColor: s.color,
                                                            }}
                                                        />
                                                        <Text style={{ color: C.text }}>
                                                            {s.name ? `${s.label} | ${s.name}` : s.label}
                                                        </Text>
                                                    </View>
                                                    <Text style={{ color: C.textMuted, fontWeight: "800" }}>
                                                        {currency(s.amount)} · {s.pct.toFixed(2)}%
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    </>
                                )}
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

/** ===== Styles ===== */
const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitle: { fontSize: 18, fontWeight: "800" },
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
    summary: {
        marginTop: 12,
        padding: 12,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    summaryItem: { flex: 1, gap: 4 },
    summaryLabel: { fontSize: 11, fontWeight: "700" },
    summaryValue: { fontSize: 14, fontWeight: "800" },
    chartCard: { marginTop: 16, padding: 12, borderWidth: 1 },
    chartTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
});
