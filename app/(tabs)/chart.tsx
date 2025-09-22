import { Colors, Fonts, Tokens } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
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

import { useChartData } from "@/services/chartService";

/** ===== Util ===== */
const money = (n: number) =>
    n.toLocaleString("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    });

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

/** ===== Screen ===== */
export default function ChartScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;

    // chart service (sinkron service terbaru: undefined = semua musim)
    const {
        seasons,
        seasonId,
        setSeasonId,
        year,
        setYear,
        yearOptions,
        totalIn,
        totalOut,
        loading,
    } = useChartData(); // <— tanpa arg: default semua musim

    const [openSeason, setOpenSeason] = useState(false);
    const [openYear, setOpenYear] = useState(false);

    // urutkan musim dari service mungkin sudah stabil; kalau perlu urutkan di sini.
    const orderedSeasons = useMemo(
        () =>
            [...seasons].sort(
                (a, b) =>
                    new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            ),
        [seasons]
    );

    const currentIdx = useMemo(
        () => (seasonId ? orderedSeasons.findIndex((s) => s.id === seasonId) : -1),
        [orderedSeasons, seasonId]
    );
    const currentSeason = currentIdx >= 0 ? orderedSeasons[currentIdx] : undefined;

    // navigasi prev/next (sama gaya dengan Income/Expense)
    const canPrev = currentIdx >= 0 && currentIdx < orderedSeasons.length - 1;
    const canNext = currentIdx > 0;
    const goPrev = () => {
        if (!canPrev) return;
        setSeasonId(orderedSeasons[currentIdx + 1].id);
        setYear("all"); // eksklusif
    };
    const goNext = () => {
        if (!canNext) return;
        setSeasonId(orderedSeasons[currentIdx - 1].id);
        setYear("all"); // eksklusif
    };

    /** ===== Pie sizing & series ===== */
    const chartWidth = Dimensions.get("window").width - S.spacing.lg * 2;
    const pieSize = Math.min(chartWidth - 24, 280);

    const total = totalIn + totalOut;
    const pctIn = total > 0 ? Math.round((totalIn / total) * 100) : 0;
    const pctOut = total > 0 ? 100 - pctIn : 0;
    const series = [
        { value: totalIn, color: C.success }, // penerimaan
        { value: totalOut, color: C.danger }, // pengeluaran
    ] as any;

    const showBlocking = loading && total === 0;

    const activeFilterText =
        seasonId
            ? `Filter: Musim Ke-${currentSeason?.season_no ?? "?"}`
            : year !== "all"
                ? `Filter: Tahun ${year}`
                : "Filter: Semua data";

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            <ScrollView contentContainerStyle={{ paddingBottom: S.spacing.xl }}>
                {/* Header gradient (title only) */}
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
                    {/* === Season Selector Card (mirip Income/Expense) === */}
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
                            {/* Prev */}
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

                            {/* Season Dropdown Trigger */}
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
                                        {seasonId && currentSeason
                                            ? `Musim Ke-${currentSeason.season_no}`
                                            : "Semua Musim"}
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
                                    color={C.icon}
                                />
                            </Pressable>

                            {/* Next */}
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

                        {/* Season Dropdown */}
                        {openSeason && (
                            <View style={[styles.seasonList, { borderColor: C.border }]}>
                                {/* Semua Musim */}
                                <Pressable
                                    onPress={() => {
                                        setSeasonId(undefined); // semua musim
                                        setYear("all");
                                        setOpenSeason(false);
                                    }}
                                    style={({ pressed }) => [
                                        styles.seasonItem,
                                        { opacity: pressed ? 0.96 : 1 },
                                    ]}
                                >
                                    <Text
                                        style={{
                                            color: C.text,
                                            fontWeight: (!seasonId ? "800" : "600") as any,
                                        }}
                                    >
                                        Semua Musim
                                    </Text>
                                </Pressable>

                                {orderedSeasons.map((s) => (
                                    <Pressable
                                        key={s.id}
                                        onPress={() => {
                                            setSeasonId(s.id);
                                            setYear("all"); // eksklusif
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

                    {/* === Year Selector (kartu terpisah, masih mirip style) === */}
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
                                    {seasonId
                                        ? "Filter Tahun nonaktif saat memilih Musim"
                                        : "Saring data berdasarkan tahun"}
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
                                <Pressable
                                    onPress={() => {
                                        setYear("all");
                                        setSeasonId(undefined); // eksklusif
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
                                            fontWeight: (year === "all" ? "800" : "600") as any,
                                        }}
                                    >
                                        Semua Tahun
                                    </Text>
                                </Pressable>

                                {yearOptions.map((y) => (
                                    <Pressable
                                        key={y}
                                        onPress={() => {
                                            setYear(y);
                                            setSeasonId(undefined); // eksklusif
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
                                                fontWeight: ((year === y ? "800" : "600") as any),
                                            }}
                                        >
                                            {y}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Keterangan filter aktif */}
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

                    {/* Blocking loader (awal) */}
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
                                        name="arrow-down-circle-outline"
                                        size={18}
                                        color={C.success}
                                    />
                                    <Text
                                        style={[styles.summaryLabel, { color: C.textMuted }]}
                                    >{`Penerimaan`}</Text>
                                    <Text style={[styles.summaryValue, { color: C.text }]}>
                                        {money(totalIn)}
                                    </Text>
                                </View>
                                <View style={[styles.sep, { backgroundColor: C.border }]} />
                                <View style={styles.summaryItem}>
                                    <Ionicons
                                        name="arrow-up-circle-outline"
                                        size={18}
                                        color={C.danger}
                                    />
                                    <Text
                                        style={[styles.summaryLabel, { color: C.textMuted }]}
                                    >{`Pengeluaran`}</Text>
                                    <Text style={[styles.summaryValue, { color: C.text }]}>
                                        {money(totalOut)}
                                    </Text>
                                </View>
                                <View style={[styles.sep, { backgroundColor: C.border }]} />
                                <View style={styles.summaryItem}>
                                    <Ionicons name="cash-outline" size={18} color={C.tint} />
                                    <Text style={[styles.summaryLabel, { color: C.textMuted }]}>
                                        Bersih
                                    </Text>
                                    <Text style={[styles.summaryValue, { color: C.text }]}>
                                        {money(totalIn - totalOut)}
                                    </Text>
                                </View>
                            </View>

                            {/* Kartu Chart (Pie) */}
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
                                    Komposisi{" "}
                                    {seasonId && currentSeason
                                        ? `(Musim Ke-${currentSeason.season_no})`
                                        : ""}
                                    {year !== "all"
                                        ? seasonId
                                            ? ` | ${year}`
                                            : `(${year})`
                                        : ""}
                                </Text>

                                {/* --- Pie --- */}
                                {total === 0 ? (
                                    <View style={{ paddingVertical: 24, alignItems: "center" }}>
                                        <Text style={{ color: C.textMuted }}>
                                            Belum ada data untuk filter ini.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{ alignItems: "center", gap: 12 }}>
                                        <PieChart widthAndHeight={pieSize} series={series} />
                                        <Text style={{ color: C.textMuted }}>
                                            {pctIn}% Penerimaan | {pctOut}% Pengeluaran
                                        </Text>
                                    </View>
                                )}

                                {/* Legend */}
                                <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                        <View
                                            style={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: 3,
                                                backgroundColor: C.success,
                                            }}
                                        />
                                        <Text style={{ color: C.textMuted, fontSize: 12 }}>
                                            Penerimaan
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                        <View
                                            style={{
                                                width: 12,
                                                height: 12,
                                                borderRadius: 3,
                                                backgroundColor: C.danger,
                                            }}
                                        />
                                        <Text style={{ color: C.textMuted, fontSize: 12 }}>
                                            Pengeluaran
                                        </Text>
                                    </View>
                                </View>
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

    // Season selector (mirip Income/Expense)
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

    // Summary
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
    sep: { width: 1, height: 32, opacity: 0.6 },

    // Chart
    chartCard: { marginTop: 16, padding: 12, borderWidth: 1 },
    chartTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
});
