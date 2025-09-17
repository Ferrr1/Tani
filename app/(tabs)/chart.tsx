// app/analytics/index.tsx
import { Colors, Fonts, Tokens } from "@/constants/theme";
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

import { useExpenseList } from "@/services/expenseService";
import { useReceiptList } from "@/services/receiptService";
import { useSeasonList } from "@/services/seasonService";

/** ===== Util ===== */
const money = (n: number) =>
    n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const getYear = (iso: string) => new Date(iso).getFullYear();

/** ===== Screen ===== */
export default function ChartScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;

    // seasons
    const { loading: seasonLoading, rows: seasonRows, fetchOnce: fetchSeasons } = useSeasonList();
    const seasons = useMemo(
        () =>
            [...seasonRows].sort(
                (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            ),
        [seasonRows]
    );

    // selected season
    const [seasonId, setSeasonId] = useState<string>("");
    const [openSeason, setOpenSeason] = useState(false);

    // default pilih musim terbaru saat available
    useEffect(() => {
        fetchSeasons();
    }, [fetchSeasons]);

    useEffect(() => {
        if (!seasonId && seasons.length) {
            setSeasonId(seasons[0].id);
        }
    }, [seasons, seasonId]);

    const currentSeason = useMemo(
        () => seasons.find((s) => s.id === seasonId) || null,
        [seasons, seasonId]
    );

    // data hooks
    const {
        loading: receiptsLoading,
        rows: receiptRows,
        seasonId: receiptSeasonId,
        setSeasonId: setReceiptSeasonId,
        fetchOnce: fetchReceipts,
    } = useReceiptList(seasonId || "all");

    const {
        loading: expensesLoading,
        rows: expenseRows,
        seasonId: expenseSeasonId,
        setSeasonId: setExpenseSeasonId,
        fetchOnce: fetchExpenses,
    } = useExpenseList(seasonId || "all");

    // sinkron filter musim ke dua list
    useEffect(() => {
        if (seasonId && receiptSeasonId !== seasonId) setReceiptSeasonId(seasonId);
        if (seasonId && expenseSeasonId !== seasonId) setExpenseSeasonId(seasonId);
    }, [seasonId, receiptSeasonId, expenseSeasonId, setReceiptSeasonId, setExpenseSeasonId]);

    // initial fetch (hooks sudah ada guard inFlight)
    useEffect(() => {
        if (seasonId) {
            fetchReceipts();
            fetchExpenses();
        }
    }, [seasonId, fetchReceipts, fetchExpenses]);

    // filter tahun
    const [year, setYear] = useState<number | "all">("all");
    const [openYear, setOpenYear] = useState(false);

    const yearOptions = useMemo(() => {
        if (!seasonId) return [];
        const yearsFromReceipts = receiptRows.map((r) => getYear(r.created_at));
        const yearsFromExpenses = expenseRows.map((e) =>
            e.expense_date ? getYear(e.expense_date) : getYear(e.created_at)
        );
        const uniq = Array.from(new Set([...yearsFromReceipts, ...yearsFromExpenses]));
        return uniq.sort((a, b) => a - b);
    }, [seasonId, receiptRows, expenseRows]);

    // data terfilter by tahun
    const filteredReceipts = useMemo(() => {
        if (year === "all") return receiptRows;
        return receiptRows.filter((r) => getYear(r.created_at) === year);
    }, [receiptRows, year]);

    const filteredExpenses = useMemo(() => {
        if (year === "all") return expenseRows;
        return expenseRows.filter((e) =>
            (e.expense_date ? getYear(e.expense_date) : getYear(e.created_at)) === year
        );
    }, [expenseRows, year]);

    // agregasi
    const totalIn = useMemo(
        () => filteredReceipts.reduce((acc, r) => acc + (Number(r.total) || 0), 0),
        [filteredReceipts]
    );
    const totalOut = useMemo(
        () => filteredExpenses.reduce((acc, r) => acc + (Number(r.total_all) || 0), 0),
        [filteredExpenses]
    );

    /** ===== Pie sizing & series ===== */
    const chartWidth = Dimensions.get("window").width - S.spacing.lg * 2;
    const pieSize = Math.min(chartWidth - 24, 280);

    const total = totalIn + totalOut;
    const pctIn = total > 0 ? Math.round((totalIn / total) * 100) : 0;
    const pctOut = total > 0 ? 100 - pctIn : 0;
    const series = [
        { value: totalIn, color: C.success }, // penerimaan
        { value: totalOut, color: C.danger },  // pengeluaran
    ];
    const loading = seasonLoading || receiptsLoading || expensesLoading;
    const showBlocking = loading && (!currentSeason || (receiptRows.length === 0 && expenseRows.length === 0));

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            <ScrollView contentContainerStyle={{ paddingBottom: S.spacing.xl }}>
                {/* Header gradient */}
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

                    {/* Filter pills */}
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                        {/* Musim */}
                        <View style={{ flex: 1 }}>
                            <Pressable
                                onPress={() => {
                                    setOpenSeason((v) => !v);
                                    setOpenYear(false);
                                }}
                                style={({ pressed }) => [
                                    styles.chip,
                                    { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.96 : 1 },
                                ]}
                            >
                                <Ionicons name="leaf-outline" size={14} color={C.textMuted} />
                                <Text style={[styles.chipText, { color: C.text }]}>
                                    {currentSeason ? `Musim Ke-${currentSeason.season_no}` : "Pilih Musim"}
                                </Text>
                                <Ionicons name={openSeason ? "chevron-up" : "chevron-down"} size={14} color={C.icon} />
                            </Pressable>
                            {openSeason && (
                                <View style={[styles.dropdown, { borderColor: C.border, backgroundColor: C.surface }]}>
                                    {seasons.map((s) => (
                                        <Pressable
                                            key={s.id}
                                            onPress={() => {
                                                setSeasonId(s.id);
                                                setOpenSeason(false);
                                                // reset tahun tiap ganti musim agar tidak tersangkut ke tahun yang tidak ada
                                                setYear("all");
                                            }}
                                            style={({ pressed }) => [
                                                styles.dropItem,
                                                {
                                                    backgroundColor:
                                                        s.id === seasonId ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent",
                                                    opacity: pressed ? 0.95 : 1,
                                                },
                                            ]}
                                        >
                                            <Text style={{ color: C.text, fontWeight: (s.id === seasonId ? "800" : "600") as any }}>
                                                Musim Ke-{s.season_no}
                                            </Text>
                                            <Text style={{ color: C.textMuted, fontSize: 12 }}>
                                                {new Date(s.start_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })} —{" "}
                                                {new Date(s.end_date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Tahun */}
                        <View style={{ flex: 1 }}>
                            <Pressable
                                onPress={() => {
                                    setOpenYear((v) => !v);
                                    setOpenSeason(false);
                                }}
                                style={({ pressed }) => [
                                    styles.chip,
                                    { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.96 : 1 },
                                ]}
                            >
                                <Ionicons name="calendar-outline" size={14} color={C.textMuted} />
                                <Text style={[styles.chipText, { color: C.text }]}>{year === "all" ? "Semua Tahun" : year}</Text>
                                <Ionicons name={openYear ? "chevron-up" : "chevron-down"} size={14} color={C.icon} />
                            </Pressable>
                            {openYear && (
                                <View style={[styles.dropdown, { borderColor: C.border, backgroundColor: C.surface }]}>
                                    <Pressable
                                        onPress={() => {
                                            setYear("all");
                                            setOpenYear(false);
                                        }}
                                        style={({ pressed }) => [styles.dropItem, { opacity: pressed ? 0.95 : 1 }]}
                                    >
                                        <Text style={{ color: C.text, fontWeight: (year === "all" ? "800" : "600") as any }}>
                                            Semua Tahun
                                        </Text>
                                    </Pressable>
                                    {yearOptions.map((y) => (
                                        <Pressable
                                            key={y}
                                            onPress={() => {
                                                setYear(y);
                                                setOpenYear(false);
                                            }}
                                            style={({ pressed }) => [styles.dropItem, { opacity: pressed ? 0.95 : 1 }]}
                                        >
                                            <Text style={{ color: C.text, fontWeight: ((year === y ? "800" : "600") as any) }}>{y}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                </LinearGradient>

                {/* Body */}
                <View style={{ paddingHorizontal: S.spacing.lg }}>
                    {/* Blocking loader (awal) */}
                    {showBlocking ? (
                        <View style={{ paddingVertical: 24, alignItems: "center" }}>
                            <ActivityIndicator color={C.tint} size={"large"} />
                            <Text style={{ marginTop: 8, color: C.textMuted }}>Memuat grafik…</Text>
                        </View>
                    ) : (
                        <>
                            {/* Ringkasan */}
                            <View
                                style={[
                                    styles.summary,
                                    { borderColor: C.border, backgroundColor: C.surface, borderRadius: S.radius.lg },
                                ]}
                            >
                                <View style={styles.summaryItem}>
                                    <Ionicons name="arrow-down-circle-outline" size={18} color={C.success} />
                                    <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Penerimaan</Text>
                                    <Text style={[styles.summaryValue, { color: C.text }]}>{money(totalIn)}</Text>
                                </View>
                                <View style={[styles.sep, { backgroundColor: C.border }]} />
                                <View style={styles.summaryItem}>
                                    <Ionicons name="arrow-up-circle-outline" size={18} color={C.danger} />
                                    <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Pengeluaran</Text>
                                    <Text style={[styles.summaryValue, { color: C.text }]}>{money(totalOut)}</Text>
                                </View>
                                <View style={[styles.sep, { backgroundColor: C.border }]} />
                                <View style={styles.summaryItem}>
                                    <Ionicons name="cash-outline" size={18} color={C.tint} />
                                    <Text style={[styles.summaryLabel, { color: C.textMuted }]}>Bersih</Text>
                                    <Text style={[styles.summaryValue, { color: C.text }]}>{money(totalIn - totalOut)}</Text>
                                </View>
                            </View>

                            {/* Kartu Chart (Pie) */}
                            <View
                                style={[
                                    styles.chartCard,
                                    { borderColor: C.border, backgroundColor: C.surface, borderRadius: S.radius.lg },
                                    scheme === "light" ? S.shadow.light : S.shadow.dark,
                                ]}
                            >
                                <Text style={[styles.chartTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                                    Komposisi ({currentSeason ? `Musim Ke-${currentSeason.season_no}` : "–"}
                                    {year === "all" ? "" : ` | ${year}`})
                                </Text>

                                {/* --- Pie --- */}
                                {total === 0 ? (
                                    <View style={{ paddingVertical: 24, alignItems: "center" }}>
                                        <Text style={{ color: C.textMuted }}>Belum ada data untuk filter ini.</Text>
                                    </View>
                                ) : (
                                    <View style={{ alignItems: "center", gap: 12 }}>
                                        <PieChart
                                            widthAndHeight={pieSize}          // number
                                            series={series}      // number[]
                                        // Aktifkan donut kalau mau:
                                        // coverRadius={0.6}               // 0..1
                                        // coverFill={C.surface}           // string (warna)
                                        />
                                        <Text style={{ color: C.textMuted }}>
                                            {pctIn}% Penerimaan | {pctOut}% Pengeluaran
                                        </Text>
                                    </View>
                                )}

                                {/* Legend */}
                                <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: C.success }} />
                                        <Text style={{ color: C.textMuted, fontSize: 12 }}>Penerimaan</Text>
                                    </View>
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: C.danger }} />
                                        <Text style={{ color: C.textMuted, fontSize: 12 }}>Pengeluaran</Text>
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
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    chipText: { fontSize: 12, fontWeight: "800" },
    dropdown: { borderWidth: 1, borderRadius: 12, overflow: "hidden", marginTop: 8 },
    dropItem: { paddingHorizontal: 12, paddingVertical: 10 },

    summary: {
        marginTop: 16,
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

    chartCard: { marginTop: 16, padding: 12, borderWidth: 1 },
    chartTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
});
