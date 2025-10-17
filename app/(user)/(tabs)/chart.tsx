// screens/ChartScreen.tsx
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useExpenseChartData } from "@/services/chartService";
import { CATEGORY_LABEL } from "@/types/chart";
import { currency } from "@/utils/currency";
import { formatWithOutYear } from "@/utils/date";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

    // Service lokal (tanpa filter global)
    const {
        seasons,
        seasonId,
        setSeasonId,
        year,
        setYear,
        yearOptions,
        expensePieSummary,
        totalOut,
        loading,
        forceRefetch,
    } = useExpenseChartData();

    const [openSeason, setOpenSeason] = useState(false);
    const [openYear, setOpenYear] = useState(false);

    // Fetch on focus (keras)
    useFocusEffect(
        useCallback(() => {
            forceRefetch();
        }, [forceRefetch])
    );

    // Urutkan musim terbaru
    const orderedSeasons = useMemo(
        () =>
            [...seasons].sort(
                (a, b) =>
                    new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            ),
        [seasons]
    );

    // Auto-pick latest on first load (jika belum pilih tahun)
    useEffect(() => {
        if (!seasonId && year === "all" && orderedSeasons.length) {
            setSeasonId(orderedSeasons[0].id);
        }
    }, [seasonId, year, orderedSeasons, setSeasonId]);

    const currentIdx = useMemo(
        () => (seasonId ? orderedSeasons.findIndex((s) => s.id === seasonId) : -1),
        [orderedSeasons, seasonId]
    );
    const currentSeason =
        currentIdx >= 0 ? orderedSeasons[currentIdx] : undefined;

    const yearActive = year !== "all";
    const canPrev = !yearActive && currentIdx >= 0 && currentIdx < orderedSeasons.length - 1;
    const canNext = !yearActive && currentIdx > 0;

    const pickSeason = (id: string) => {
        setYear("all"); // pilih musim => matikan filter tahun
        setSeasonId(id);
    };
    const goPrev = () => {
        if (canPrev) pickSeason(orderedSeasons[currentIdx + 1].id);
    };
    const goNext = () => {
        if (canNext) pickSeason(orderedSeasons[currentIdx - 1].id);
    };

    const pickYear = (y: number) => {
        setSeasonId(undefined); // mode tahun => nonaktifkan musim
        setYear(y);
    };
    const clearYearFilter = () => {
        setYear("all");
        if (orderedSeasons.length) setSeasonId(orderedSeasons[0].id);
    };

    // Chart sizing
    const chartWidth = Dimensions.get("window").width - S.spacing.lg * 2;
    const pieSize = Math.min(chartWidth - 24, 280);

    const palette =
        scheme === "light"
            ? [
                "#4f8cff",
                "#ff6b6b",
                "#2bd4a1",
                "#ffb020",
                "#9b7bff",
                "#22c7e6",
                "#ff6584",
                "#35d266",
                "#4f8cff",
                "#ff6b6b",
                "#2bd4a1",
                "#ffb020",
                "#9b7bff",
                "#22c7e6",
                "#ff6584",
                "#ffa3cf",
                "#ffd24d",
                "#ffaf3f",
                "#fff36e",
                "#ff9f1a",
                "#ff7a1a",
                "#ff4d4d",
                "#ff1744",
                "#e6de3a",
                "#c2bf2b",
                "#8c7a1e",
                "#5a4d16",
                "#ffd9e8ff",
            ]
            : [
                "#3b7ae0",
                "#e05555",
                "#27b389",
                "#d59b1a",
                "#8166e0",
                "#1fb1c8",
                "#e35e78",
                "#2fb259",
                "#3b7ae0",
                "#e05555",
                "#27b389",
                "#d59b1a",
                "#8166e0",
                "#1fb1c8",
                "#e35e78",
                "#d4af37",
                "#cc8400",
                "#d69400",
                "#e6d800",
                "#d1b300",
                "#cc5200",
                "#cc3300",
                "#d00000",
                "#bcb800",
                "#8a8500",
                "#5a5300",
                "#2f2a00",
            ];

    const categoryLabel = (raw?: string) =>
        !raw ? "Lainnya" : CATEGORY_LABEL[raw] ?? raw.replace(/_/g, " ");

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
        const noNameEntries = Array.from(noNameMap.entries()).map(
            ([label, sum]) => ({
                label,
                name: "",
                amount: sum,
            })
        );
        return [...withName, ...noNameEntries];
    }, [expensePieSummary]);

    // --- grand total harus dihitung sebelum series ---
    const expenseGrandTotal = useMemo(
        () =>
            combinedSummary.reduce(
                (sum, x) => sum + (Number(x.amount) || 0),
                0
            ),
        [combinedSummary]
    );

    // --- series dengan label persentase; hide jika < 3% ---
    const series = useMemo(() => {
        const total = expenseGrandTotal || 0;
        return combinedSummary.map((s, i) => {
            const amount = Number(s.amount) || 0;
            const pct = total > 0 ? (amount / total) * 100 : 0;
            const showLabel = pct >= 3; // <= syarat: kalau kurang dari 3% tidak dimunculkan

            return {
                value: amount,
                color: palette[i % palette.length],
                label: showLabel
                    ? {
                        text: `${Math.round(pct)}%`,
                        fontSize: 11,
                        fontWeight: "800",
                        fill: scheme === "light" ? "#111" : "#fff",
                        // offsetX: 0,
                        // offsetY: -2,
                    }
                    : undefined,
            };
        });
    }, [combinedSummary, palette, expenseGrandTotal, scheme]);

    const slicesWithPct = useMemo(
        () =>
            combinedSummary.map((s, i) => ({
                label: categoryLabel(s.label),
                name: s.name,
                amount: Number(s.amount) || 0,
                pct:
                    expenseGrandTotal > 0
                        ? ((Number(s.amount) || 0) / expenseGrandTotal) * 100
                        : 0,
                color: palette[i % palette.length],
                idx: i,
            })),
        [combinedSummary, expenseGrandTotal, palette]
    );

    const showBlocking = loading && expenseGrandTotal === 0;

    const activeFilterText = yearActive
        ? `Filter: Tahun ${year}`
        : seasonId && currentSeason
            ? `Filter: Musim Ke-${currentSeason.season_no} · ${formatWithOutYear(
                currentSeason.start_date
            )} — ${formatWithOutYear(currentSeason.end_date)} (${currentSeason.season_year})`
            : "Pilih Musim atau Tahun";

    const chartTitleSuffix = yearActive
        ? `(${year})`
        : seasonId && currentSeason
            ? `(Musim Ke-${currentSeason.season_no})`
            : "";

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            <ScrollView contentContainerStyle={{ paddingBottom: S.spacing.xl }}>
                {/* Header */}
                <LinearGradient
                    colors={[C.gradientFrom, C.gradientTo]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.header,
                        { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg },
                    ]}
                >
                    <View style={styles.headerRow}>
                        <Text
                            style={[
                                styles.headerTitle,
                                { color: C.text, fontFamily: Fonts.rounded as any },
                            ]}
                        >
                            Grafik
                        </Text>
                        <View style={{ width: 36 }} />
                    </View>
                </LinearGradient>

                {/* Body */}
                <View style={{ paddingHorizontal: S.spacing.lg }}>
                    {/* Season Selector */}
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
                        <View
                            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                        >
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
                                <Ionicons
                                    name="chevron-back"
                                    size={16}
                                    color={canPrev ? C.text : C.textMuted}
                                />
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
                                        {seasonId && currentSeason
                                            ? `Musim Ke-${currentSeason.season_no}`
                                            : "Pilih Musim"}
                                    </Text>
                                    {seasonId && currentSeason && (
                                        <Text style={[styles.seasonRange, { color: C.textMuted }]}>
                                            {formatWithOutYear(currentSeason.start_date)} —{" "}
                                            {formatWithOutYear(currentSeason.end_date)}  {`(${currentSeason.season_year})`}
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
                                <Ionicons
                                    name="chevron-forward"
                                    size={16}
                                    color={canNext ? C.text : C.textMuted}
                                />
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
                                            {formatWithOutYear(s.start_date)} — {formatWithOutYear(s.end_date)} {`(${s.season_year})`}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}

                        {yearActive && (
                            <Text
                                style={{
                                    marginTop: 8,
                                    fontSize: 12,
                                    color: C.textMuted,
                                    fontWeight: "700",
                                }}
                            >
                                Filter Musim nonaktif saat Filter Tahun aktif.
                            </Text>
                        )}
                    </View>

                    {/* Year Selector */}
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
                            <View
                                style={{
                                    marginBottom: 8,
                                    flexDirection: "row",
                                    justifyContent: "flex-end",
                                }}
                            >
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
                                    <Text style={{ color: C.textMuted, fontWeight: "900" }}>
                                        ✕
                                    </Text>
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
                                    {year !== "all" ? `Tahun ${year}` : "Pilih Tahun"}
                                </Text>
                            </View>
                            <Ionicons
                                name={openYear ? "chevron-up" : "chevron-down"}
                                size={18}
                                color={C.icon}
                            />
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
                                        style={({ pressed }) => [
                                            styles.seasonItem,
                                            { opacity: pressed ? 0.96 : 1 },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                color: C.text,
                                                fontWeight: (year === y ? "800" : "600") as any,
                                            }}
                                        >
                                            {y}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Info filter aktif */}
                    <Text
                        style={{
                            marginTop: 8,
                            color: C.textMuted,
                            fontSize: 12,
                            fontWeight: "700",
                        }}
                    >
                        {activeFilterText}
                    </Text>

                    {/* Loader */}
                    {showBlocking ? (
                        <View style={{ paddingVertical: 24, alignItems: "center" }}>
                            <ActivityIndicator color={C.tint} size={"large"} />
                            <Text style={{ marginTop: 8, color: C.textMuted }}>
                                Memuat grafik…
                            </Text>
                        </View>
                    ) : (
                        <>
                            {/* Ringkasan */}
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
                                    <Ionicons
                                        name="arrow-up-circle-outline"
                                        size={18}
                                        color={C.danger}
                                    />
                                    <Text style={[styles.summaryLabel, { color: C.textMuted }]}>
                                        Total Pengeluaran
                                    </Text>
                                    <Text style={[styles.summaryValue, { color: C.text }]}>
                                        {currency(totalOut)}
                                    </Text>
                                </View>
                            </View>

                            {/* Chart */}
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
                                <Text
                                    style={[
                                        styles.chartTitle,
                                        { color: C.text, fontFamily: Fonts.rounded as any },
                                    ]}
                                >
                                    Komposisi Pengeluaran {chartTitleSuffix}
                                </Text>

                                {expenseGrandTotal === 0 ? (
                                    <View style={{ paddingVertical: 24, alignItems: "center" }}>
                                        <Text style={{ color: C.textMuted }}>
                                            Belum ada data pengeluaran untuk filter ini.
                                        </Text>
                                    </View>
                                ) : (
                                    <>
                                        <View style={{ alignItems: "center", gap: 12 }}>
                                            <PieChart
                                                widthAndHeight={pieSize}
                                                series={series}
                                            />
                                            <Text style={{ color: C.textMuted }}>
                                                Total Pengeluaran: {currency(expenseGrandTotal)}
                                            </Text>
                                        </View>

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
                                                    <View
                                                        style={{
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            gap: 8,
                                                        }}
                                                    >
                                                        <View
                                                            style={{
                                                                width: 12,
                                                                height: 12,
                                                                borderRadius: 3,
                                                                backgroundColor: s.color,
                                                            }}
                                                        />
                                                        <Text style={{ color: C.text }}>
                                                            {s.name ? `${s.label} ${s.name}` : s.label}
                                                        </Text>
                                                    </View>
                                                    <Text
                                                        style={{ color: C.textMuted, fontWeight: "800" }}
                                                    >
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
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
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
    seasonList: {
        borderTopWidth: 1,
        borderRadius: 10,
        overflow: "hidden",
        marginTop: 10,
    },
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
