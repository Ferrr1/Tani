import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useSeasonList } from "@/services/seasonService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ExpenseKind = "tunai" | "nontunai";
type YearFilter = "all" | number;

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

export default function ExpenseForm() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();
    const { seasonId: qsSeasonId, type: qsType } = useLocalSearchParams<{
        seasonId?: string;
        type?: ExpenseKind;
    }>();
    const { loading, rows: seasonRows, fetchOnce, refresh } = useSeasonList();
    console.log("seasonRows", seasonRows);
    const seasons = useMemo(
        () =>
            [...seasonRows].sort(
                (a, b) =>
                    new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            ),
        [seasonRows]
    );
    const [type, setType] = useState<ExpenseKind | null>(null);
    const [seasonOpen, setSeasonOpen] = useState(false);
    const [yearOpen, setYearOpen] = useState(false);
    const [seasonIdx, setSeasonIdx] = useState(0);
    const [yearFilter, setYearFilter] = useState<YearFilter>("all");

    useEffect(() => {
        fetchOnce();
    }, [fetchOnce]);

    useEffect(() => {
        if (!qsType) return;
        if (qsType === "tunai" || qsType === "nontunai") {
            setType(qsType);
        }
    }, [qsType]);

    const yearOptions = useMemo(() => {
        const ys = new Set<number>();
        seasons.forEach((s) => ys.add(new Date(s.start_date).getFullYear()));
        return Array.from(ys).sort((a, b) => b - a); // terbaru → lama
    }, [seasons]);

    const filteredSeasons = useMemo(() => {
        if (yearFilter === "all") return seasons;
        console.log("filteredSeasons:", seasons);
        return seasons.filter(
            (s) => new Date(s.start_date).getFullYear() === yearFilter
        );
    }, [seasons, yearFilter]);

    useEffect(() => {
        if (!seasons.length) return;
        if (!qsSeasonId) return;

        const idxAll = seasons.findIndex((s) => s.id === String(qsSeasonId));
        if (idxAll >= 0) {
            const y = new Date(seasons[idxAll].start_date).getFullYear();
            setYearFilter(y as YearFilter);
        }
    }, [seasons, qsSeasonId]);

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
    const goPrevSeason = () => {
        if (!canPrev) return;
        setSeasonIdx((i) => i + 1);
    };
    const goNextSeason = () => {
        if (!canNext) return;
        setSeasonIdx((i) => i - 1);
    };

    const goNext = () => {
        if (!type || !season) return;
        router.push({
            pathname: "/(form)/expense/costType",
            params: { seasonId: season.id, type },
        });
    };

    const showLoader = loading && !seasons.length;

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

            {showLoader ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={C.tint} size={"large"} />
                    <Text style={{ marginTop: 8, color: C.textMuted }}>Memuat musim…</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: S.spacing.lg, gap: S.spacing.md }}
                >
                    {/* Jenis Biaya */}
                    <Text style={[styles.label, { color: C.text }]}>Jenis Biaya</Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                        {(["tunai", "nontunai"] as const).map((t) => {
                            const active = type === t;
                            return (
                                <Pressable
                                    key={t}
                                    onPress={() => setType(t)}
                                    style={({ pressed }) => [
                                        styles.chipBtn,
                                        {
                                            borderColor: C.border,
                                            backgroundColor: active ? C.tint + "1A" : C.surface,
                                            opacity: pressed ? 0.95 : 1,
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name={t === "tunai" ? "cash-outline" : "people-outline"}
                                        size={16}
                                        color={active ? C.tint : C.icon}
                                    />
                                    <Text
                                        style={{ color: active ? C.tint : C.text, fontWeight: "800" }}
                                    >
                                        {t === "tunai" ? "Tunai" : "Non Tunai"}
                                    </Text>
                                </Pressable>
                            );
                        })}
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

                    {/* Pilih Musim (sesuai tahun terpilih) */}
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
                                <Text style={{ color: C.text, fontWeight: "900" }}>
                                    Muat Ulang
                                </Text>
                            </Pressable>
                        </ScrollView>
                    ) : (
                        <>
                            {/* Baris navigasi + trigger dropdown */}
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
                                    onPress={goNextSeason}
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
                        disabled={!type || !season}
                        style={({ pressed }) => [
                            styles.cta,
                            {
                                backgroundColor: !type || !season ? C.icon : C.tint,
                                opacity: pressed ? 0.98 : 1,
                                borderRadius: S.radius.xl,
                            },
                        ]}
                    >
                        <Ionicons name="arrow-forward-circle-outline" size={18} color="#fff" />
                        <Text style={{ color: "#fff", fontWeight: "900" }}>Lanjut</Text>
                    </Pressable>
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
});
