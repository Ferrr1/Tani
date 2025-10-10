import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useExpenseService } from "@/services/expenseService";
import { useReceiptService } from "@/services/receiptService";
import { useSeasonList } from "@/services/seasonService";
import { fmtDate } from "@/utils/date";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ExpenseKind = "tunai" | "nontunai";
type YearFilter = "all" | number;

export default function ExpenseForm() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();
    const { seasonId: qsSeasonId, type: qsType } = useLocalSearchParams<{
        seasonId?: string;
        type?: ExpenseKind;
    }>();

    const { loading: seasonLoading, rows: seasonRows, fetchOnce, refresh } = useSeasonList();
    const { listExpenses } = useExpenseService();
    const { listReceipts } = useReceiptService();

    const [type, setType] = useState<ExpenseKind | null>(null);
    const [seasonOpen, setSeasonOpen] = useState(false);
    const [yearOpen, setYearOpen] = useState(false);
    const [seasonIdx, setSeasonIdx] = useState(0);
    const [yearFilter, setYearFilter] = useState<YearFilter>("all");

    // metrics
    const [receiptsTotal, setReceiptsTotal] = useState<number>(0);
    const [hasAnyReceipt, setHasAnyReceipt] = useState<boolean>(false);
    const [hasCashExpense, setHasCashExpense] = useState<boolean>(false);
    const [hasNonCashExpense, setHasNonCashExpense] = useState<boolean>(false);
    const [totalExpenseUsed, setTotalExpenseUsed] = useState<number>(0);

    const [metricsLoading, setMetricsLoading] = useState<boolean>(false);
    const [firstHydrated, setFirstHydrated] = useState(false);

    const didFetchSeasonsRef = useRef(false);
    const reqRef = useRef(0);
    const hydratedQueryRef = useRef(false);

    const listReceiptsRef = useRef(listReceipts);
    const listExpensesRef = useRef(listExpenses);
    useEffect(() => { listReceiptsRef.current = listReceipts; }, [listReceipts]);
    useEffect(() => { listExpensesRef.current = listExpenses; }, [listExpenses]);

    // fetch seasons sekali
    useEffect(() => {
        if (didFetchSeasonsRef.current) return;
        didFetchSeasonsRef.current = true;
        fetchOnce();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // qs type → state
    useEffect(() => {
        if (!qsType) return;
        if (qsType === "tunai" || qsType === "nontunai") setType(qsType);
    }, [qsType]);

    const seasons = useMemo(
        () =>
            [...seasonRows].sort(
                (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            ),
        [seasonRows]
    );

    const yearOptions = useMemo(() => {
        const ys = new Set<number>();
        seasons.forEach((s) => ys.add(new Date(s.start_date).getFullYear()));
        return Array.from(ys).sort((a, b) => b - a);
    }, [seasons]);

    const filteredSeasons = useMemo(() => {
        if (yearFilter === "all") return seasons;
        return seasons.filter((s) => new Date(s.start_date).getFullYear() === yearFilter);
    }, [seasons, yearFilter]);

    // sinkronkan filter tahun dari query (sekali)
    useEffect(() => {
        if (!seasons.length || hydratedQueryRef.current) return;
        if (qsSeasonId) {
            const idxAll = seasons.findIndex((s) => s.id === String(qsSeasonId));
            if (idxAll >= 0) {
                const y = new Date(seasons[idxAll].start_date).getFullYear();
                setYearFilter(y as YearFilter);
            }
            hydratedQueryRef.current = true;
        }
    }, [seasons, qsSeasonId]);

    // set season index dalam filtered list
    useEffect(() => {
        if (!filteredSeasons.length) {
            setSeasonIdx(0);
            return;
        }
        if (qsSeasonId) {
            const i = filteredSeasons.findIndex((s) => s.id === String(qsSeasonId));
            setSeasonIdx(i >= 0 ? i : 0);
        } else {
            setSeasonIdx(0);
        }
    }, [filteredSeasons, qsSeasonId]);

    const season = filteredSeasons[seasonIdx];

    const seasonRange = useMemo(() => {
        if (!season) return "";
        return `${fmtDate(season.start_date)} — ${fmtDate(season.end_date)}`;
    }, [season]);

    const canPrev = seasonIdx >= 0 && seasonIdx < filteredSeasons.length - 1;
    const canNext = seasonIdx > 0;
    const goPrevSeason = () => { if (canPrev) setSeasonIdx((i) => i + 1); };
    const goNextSeasonNav = () => { if (canNext) setSeasonIdx((i) => i - 1); };

    // === loader logic yang “anti-glitch” ===
    // daftar season sudah siap?
    const seasonsReady = !seasonLoading && seasons.length >= 1;
    // season terpilih sudah ada?
    const readySeason = seasonsReady && !!season;

    // metrics per season (jalan hanya saat season sudah ada)
    useEffect(() => {
        if (!readySeason) return; // ← tunggu season ada dulu baru fetch metrik
        let alive = true;
        const myReq = ++reqRef.current;

        const loadMetrics = async () => {
            setMetricsLoading(true);
            try {
                const receipts = await listReceiptsRef.current({ seasonId: season!.id });
                if (!alive || myReq !== reqRef.current) return;
                const rTotal = (receipts ?? []).reduce(
                    (acc: number, r: any) => acc + (Number(r.total) || 0),
                    0
                );
                setReceiptsTotal(rTotal);
                setHasAnyReceipt((receipts ?? []).length > 0);

                const expenses = await listExpensesRef.current({ seasonId: season!.id });
                if (!alive || myReq !== reqRef.current) return;

                const hasCash = (expenses ?? []).some((e: any) => e.type === "cash");
                const hasNonCash = (expenses ?? []).some((e: any) => e.type === "noncash");
                setHasCashExpense(hasCash);
                setHasNonCashExpense(hasNonCash);

                const used =
                    (expenses ?? []).reduce(
                        (acc: number, e: any) =>
                            acc +
                            (Number(e.total_cash || 0) || 0) +
                            (Number(e.total_noncash_est || 0) || 0),
                        0
                    ) || 0;
                setTotalExpenseUsed(used);
            } catch {
                if (!alive || myReq !== reqRef.current) return;
                setReceiptsTotal(0);
                setHasAnyReceipt(false);
                setHasCashExpense(false);
                setHasNonCashExpense(false);
                setTotalExpenseUsed(0);
            } finally {
                if (!alive || myReq !== reqRef.current) return;
                setMetricsLoading(false);
                if (!firstHydrated) setFirstHydrated(true);
            }
        };

        loadMetrics();
        return () => { alive = false; };
    }, [readySeason, season?.id, firstHydrated]);

    const receiptsShort = useMemo(
        () =>
            receiptsTotal.toLocaleString("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
            }),
        [receiptsTotal]
    );

    const usedShort = useMemo(
        () =>
            totalExpenseUsed.toLocaleString("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
            }),
        [totalExpenseUsed]
    );

    const incomeMissing = !hasAnyReceipt;
    const overBudget = receiptsTotal > 0 && totalExpenseUsed >= receiptsTotal;

    const goNext = () => {
        if (!type || !season) return;

        if (incomeMissing) {
            Alert.alert(
                "Validasi",
                "Musim ini belum memiliki penerimaan. Tambahkan penerimaan terlebih dahulu sebelum membuat pengeluaran."
            );
            return;
        }
        if (type === "tunai" && hasCashExpense) {
            Alert.alert("Validasi", "Pengeluaran tunai untuk musim ini sudah ada.");
            return;
        }
        if (type === "nontunai" && hasNonCashExpense) {
            Alert.alert("Validasi", "Pengeluaran non-tunai untuk musim ini sudah ada.");
            return;
        }
        if (overBudget) {
            Alert.alert(
                "Validasi",
                "Total pengeluaran musim ini sudah sama atau melebihi total penerimaan."
            );
            return;
        }

        router.push({
            pathname: "/(form)/expense/costType",
            params: { seasonId: season.id, type },
        });
    };

    // TAMPILKAN LOADER kalau:
    // - daftar season belum siap, atau
    // - season terpilih belum ada, atau
    // - (initial) metrics masih loading
    const showLoader = !readySeason || (!firstHydrated && metricsLoading);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
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
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => [
                            styles.iconBtn,
                            {
                                borderColor: C.border,
                                backgroundColor: C.surface,
                                opacity: pressed ? 0.9 : 1,
                            },
                        ]}
                    >
                        <Ionicons name="arrow-back" size={18} color={C.text} />
                    </Pressable>
                    <Text
                        style={[
                            styles.headerTitle,
                            { color: C.text, fontFamily: Fonts.rounded as any },
                        ]}
                    >
                        Pengeluaran
                    </Text>
                    <View style={{ width: 36 }} />
                </View>
            </LinearGradient>

            {/* EMPTY STATE: tidak ada season sama sekali */}
            {!seasonLoading && seasons.length === 0 ? (
                <ScrollView contentContainerStyle={{ padding: S.spacing.lg }}>
                    <Text style={{ color: C.textMuted, marginBottom: 12 }}>
                        Belum ada musim. Tambahkan musim terlebih dahulu.
                    </Text>
                    <Pressable
                        onPress={refresh}
                        style={({ pressed }) => [
                            styles.cta,
                            {
                                backgroundColor: C.surface,
                                borderWidth: 1,
                                borderColor: C.border,
                                opacity: pressed ? 0.98 : 1,
                                borderRadius: S.radius.xl,
                            },
                        ]}
                    >
                        <Ionicons name="refresh-outline" size={18} color={C.text} />
                        <Text style={{ color: C.text, fontWeight: "900" }}>Muat Ulang</Text>
                    </Pressable>
                </ScrollView>
            ) : showLoader ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={C.tint} size={"large"} />
                    <Text style={{ marginTop: 8, color: C.textMuted }}>Menyiapkan data…</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: S.spacing.lg, gap: S.spacing.md }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Jenis Biaya */}
                    <Text style={[styles.label, { color: C.text }]}>Jenis Biaya</Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                        {(["tunai", "nontunai"] as const).map((t) => {
                            const active = type === t;
                            const disabled =
                                (t === "tunai" && hasCashExpense) ||
                                (t === "nontunai" && hasNonCashExpense);
                            return (
                                <Pressable
                                    key={t}
                                    disabled={disabled}
                                    onPress={() => setType(t)}
                                    style={({ pressed }) => [
                                        styles.chipBtn,
                                        {
                                            borderColor: C.border,
                                            backgroundColor: active ? C.tint + "1A" : C.surface,
                                            opacity: disabled ? 0.5 : pressed ? 0.95 : 1,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name={t === "tunai" ? "cash-outline" : "people-outline"}
                                        size={16}
                                        color={active ? C.tint : C.icon}
                                    />
                                    <Text style={{ color: active ? C.tint : C.text, fontWeight: "800" }}>
                                        {t === "tunai" ? "Tunai" : "Non Tunai"}
                                        {disabled ? " (sudah ada)" : ""}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Ringkasan musim */}
                    <View
                        style={[
                            styles.summaryCard,
                            {
                                borderColor: C.border,
                                backgroundColor: C.surface,
                                borderRadius: S.radius.lg,
                            },
                        ]}
                    >
                        <Text style={{ color: C.text, fontWeight: "900", marginBottom: 6 }}>
                            Musim Ke-{season!.season_no}
                        </Text>
                        <Text style={{ color: C.textMuted, marginBottom: 8 }}>
                            {fmtDate(season!.start_date)} — {fmtDate(season!.end_date)}
                        </Text>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ color: C.text }}>Total Penerimaan</Text>
                            <Text style={{ color: C.text, fontWeight: "900" }}>{receiptsShort}</Text>
                        </View>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                            <Text style={{ color: C.text }}>Total Pengeluaran</Text>
                            <Text style={{ color: C.text, fontWeight: "900" }}>{usedShort}</Text>
                        </View>
                    </View>

                    {/* Filter Tahun */}
                    <Text style={[styles.label, { color: C.text }]}>Filter Tahun</Text>
                    <Pressable
                        onPress={() => {
                            setYearOpen((v) => !v);
                            setSeasonOpen(false);
                        }}
                        style={({ pressed }) => [
                            styles.inputLike,
                            {
                                borderColor: C.border,
                                backgroundColor: C.surface,
                                opacity: pressed ? 0.98 : 1,
                            },
                        ]}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: C.text, fontWeight: "800" }}>
                                {yearFilter === "all" ? "Semua Tahun" : `Tahun ${yearFilter}`}
                            </Text>
                            <Text style={{ color: C.textMuted, fontSize: 12 }}>
                                Saring daftar musim berdasarkan tahun
                            </Text>
                        </View>
                        <Ionicons
                            name={yearOpen ? "chevron-up" : "chevron-down"}
                            size={18}
                            color={C.icon}
                        />
                    </Pressable>
                    {yearOpen && (
                        <View
                            style={[
                                styles.dropdown,
                                { borderColor: C.border, backgroundColor: C.surface },
                            ]}
                        >
                            <Pressable
                                onPress={() => {
                                    setYearFilter("all");
                                    setYearOpen(false);
                                }}
                                style={({ pressed }) => [
                                    styles.dropdownItem,
                                    { opacity: pressed ? 0.96 : 1 },
                                ]}
                            >
                                <Text
                                    style={{
                                        color: C.text,
                                        fontWeight: (yearFilter === "all" ? "800" : "600") as any,
                                    }}
                                >
                                    Semua Tahun
                                </Text>
                            </Pressable>
                            {yearOptions.map((y) => (
                                <Pressable
                                    key={y}
                                    onPress={() => {
                                        setYearFilter(y);
                                        setYearOpen(false);
                                    }}
                                    style={({ pressed }) => [
                                        styles.dropdownItem,
                                        { opacity: pressed ? 0.96 : 1 },
                                    ]}
                                >
                                    <Text
                                        style={{
                                            color: C.text,
                                            fontWeight: (yearFilter === y ? "800" : "600") as any,
                                        }}
                                    >
                                        {y}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    )}

                    {/* Pilih Musim */}
                    <Text style={[styles.label, { color: C.text }]}>Pilih Musim</Text>
                    {filteredSeasons.length === 0 ? (
                        <ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
                            <Text style={{ color: C.textMuted, marginBottom: 8 }}>
                                Tidak ada musim pada filter tahun ini.
                            </Text>
                            <Pressable
                                onPress={() => setYearFilter("all")}
                                style={({ pressed }) => [
                                    styles.cta,
                                    {
                                        backgroundColor: C.tint,
                                        opacity: pressed ? 0.98 : 1,
                                        borderRadius: S.radius.xl,
                                    },
                                ]}
                            >
                                <Ionicons name="filter-outline" size={18} color="#fff" />
                                <Text style={{ color: "#fff", fontWeight: "900" }}>
                                    Tampilkan Semua Tahun
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={refresh}
                                style={({ pressed }) => [
                                    styles.cta,
                                    {
                                        backgroundColor: C.surface,
                                        borderWidth: 1,
                                        borderColor: C.border,
                                        opacity: pressed ? 0.98 : 1,
                                        borderRadius: S.radius.xl,
                                        marginTop: 8,
                                    },
                                ]}
                            >
                                <Ionicons name="refresh-outline" size={18} color={C.text} />
                                <Text style={{ color: C.text, fontWeight: "900" }}>Muat Ulang</Text>
                            </Pressable>
                        </ScrollView>
                    ) : (
                        <>
                            {/* Nav + trigger dropdown */}
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Pressable
                                    onPress={goPrevSeason}
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
                                    onPress={() => {
                                        setSeasonOpen((v) => !v);
                                        setYearOpen(false);
                                    }}
                                    style={({ pressed }) => [
                                        styles.inputLike,
                                        {
                                            borderColor: C.border,
                                            backgroundColor: C.surface,
                                            opacity: pressed ? 0.98 : 1,
                                            flex: 1,
                                        },
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: C.text, fontWeight: "800" }}>
                                            Musim Ke-{filteredSeasons[seasonIdx]?.season_no ?? "-"}
                                        </Text>
                                        <Text style={{ color: C.textMuted, fontSize: 12 }}>
                                            {seasonRange}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name={seasonOpen ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color={C.icon}
                                    />
                                </Pressable>

                                <Pressable
                                    onPress={goNextSeasonNav}
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

                            {seasonOpen && (
                                <View
                                    style={[
                                        styles.dropdown,
                                        { borderColor: C.border, backgroundColor: C.surface },
                                    ]}
                                >
                                    {filteredSeasons.map((s, i) => (
                                        <Pressable
                                            key={s.id}
                                            onPress={() => {
                                                setSeasonIdx(i);
                                                setSeasonOpen(false);
                                            }}
                                            style={({ pressed }) => [
                                                styles.dropdownItem,
                                                {
                                                    backgroundColor:
                                                        i === seasonIdx
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
                                                    fontWeight: i === seasonIdx ? "800" : "600",
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
                        </>
                    )}

                    {/* Lanjut */}
                    <Pressable
                        onPress={goNext}
                        disabled={
                            !type ||
                            !season ||
                            incomeMissing ||
                            (type === "tunai" && hasCashExpense) ||
                            (type === "nontunai" && hasNonCashExpense) ||
                            overBudget
                        }
                        style={({ pressed }) => [
                            styles.cta,
                            {
                                backgroundColor:
                                    !type ||
                                        !season ||
                                        incomeMissing ||
                                        (type === "tunai" && hasCashExpense) ||
                                        (type === "nontunai" && hasNonCashExpense) ||
                                        overBudget
                                        ? C.icon
                                        : C.tint,
                                opacity: pressed ? 0.98 : 1,
                                borderRadius: S.radius.xl,
                            },
                        ]}
                    >
                        <Ionicons name="arrow-forward-circle-outline" size={18} color="#fff" />
                        <Text style={{ color: "#fff", fontWeight: "900" }}>Lanjut</Text>
                    </Pressable>

                    {/* Pesan merah hanya di bawah */}
                    {incomeMissing && (
                        <Text style={{ color: C.danger, marginTop: 6 }}>
                            Tambahkan penerimaan untuk musim ini sebelum membuat pengeluaran.
                        </Text>
                    )}
                    {overBudget && (
                        <Text style={{ color: C.danger, marginTop: 6 }}>
                            Total pengeluaran telah sama/lebih besar dari penerimaan.
                        </Text>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    label: { fontSize: 12, fontWeight: "800" },
    chipBtn: {
        flexDirection: "row",
        gap: 8,
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    inputLike: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
    },
    dropdown: { borderWidth: 1, borderRadius: 12, overflow: "hidden", marginTop: 8 },
    dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
    cta: {
        marginTop: 6,
        paddingVertical: 12,
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    navBtn: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    summaryCard: {
        padding: 12,
        borderWidth: 1,
    },
});
