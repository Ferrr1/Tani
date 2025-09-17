import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useExpenseList, useExpenseService } from "@/services/expenseService";
import { useSeasonList } from "@/services/seasonService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
    useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ExpenseScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    // Seasons
    const { loading: seasonLoading, rows: seasonRows, fetchOnce: fetchSeasons } = useSeasonList();
    const [seasonId, setSeasonId] = useState<string | "all">("all");
    const [openSeasonList, setOpenSeasonList] = useState(false);

    // default pilih season terbaru
    useEffect(() => {
        if (seasonRows.length && (seasonId === "all" || !seasonId)) {
            const sorted = [...seasonRows].sort(
                (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            );
            setSeasonId(sorted[0].id);
        }
    }, [seasonRows, seasonId]);

    const seasons = useMemo(
        () =>
            [...seasonRows].sort(
                (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            ),
        [seasonRows]
    );
    const currentSeason = useMemo(
        () => seasons.find((s) => s.id === seasonId),
        [seasons, seasonId]
    );

    // Expenses
    const {
        loading: expenseLoading,
        refreshing,
        data: expenses,
        setSeasonId: setExpenseSeasonId,
        fetchOnce: fetchExpenses,
        refresh: refreshExpenses,
        grandTotalCash,
        grandTotalNonCash,
        typeInfo,
    } = useExpenseList(seasonId);

    const { deleteExpense } = useExpenseService();

    // fetch on focus (anti spam karena hook sudah guard inFlight)
    useFocusEffect(
        useCallback(() => {
            fetchSeasons();
            fetchExpenses();
        }, [fetchSeasons, fetchExpenses])
    );

    // sinkron filter
    useEffect(() => {
        setExpenseSeasonId(seasonId);
    }, [seasonId, setExpenseSeasonId]);

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });

    const formatMoney = (n: number) =>
        `-${(Number(n) || 0).toLocaleString("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0,
        })}`;

    const onDelete = useCallback(
        (id: string) => {
            Alert.alert("Hapus Pengeluaran", "Yakin menghapus data ini?", [
                { text: "Batal", style: "cancel" },
                {
                    text: "Hapus",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteExpense(id);
                            await refreshExpenses();
                        } catch (e: any) {
                            Alert.alert("Gagal", e?.message ?? "Tidak dapat menghapus data.");
                        }
                    },
                },
            ]);
        },
        [deleteExpense, refreshExpenses]
    );

    const showBlocking = (seasonLoading || expenseLoading) && expenses.length === 0;


    const goEdit = (expenseId: string) => {
        const qs = seasonId && seasonId !== "all" ? `?expenseId=${expenseId}&seasonId=${seasonId}` : `?expenseId=${expenseId}`;
        router.push(`/(form)/expense/costType${qs}`);
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            {/* Header */}
            <LinearGradient
                colors={[C.gradientFrom, C.gradientTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
            >
                <View style={styles.headerRow}>
                    <Text style={[styles.headerTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                        Pengeluaran
                    </Text>
                    <View style={{ width: 36 }} />
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                    <Pressable
                        onPress={() =>
                            router.push(
                                // sesuaikan path form “expense” kamu
                                `/(form)/expense/expenseType${seasonId && seasonId !== "all" ? `?seasonId=${seasonId}` : ""}`
                            )
                        }
                        style={({ pressed }) => [
                            styles.addBtn,
                            { backgroundColor: C.tint, borderRadius: S.radius.xl, opacity: pressed ? 0.98 : 1 },
                        ]}
                    >
                        <Ionicons name="add-circle-outline" size={18} color="#fff" />
                        <Text style={[styles.addText, { fontFamily: Fonts.rounded as any }]}>
                            Tambah Data Pengeluaran
                        </Text>
                    </Pressable>
                </View>
            </LinearGradient>

            {showBlocking ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={C.tint} size={"large"} />
                    <Text style={{ marginTop: 8, color: C.textMuted }}>Menyiapkan data…</Text>
                </View>
            ) : (
                <FlatList
                    data={expenses}
                    keyExtractor={(it) => it.id}
                    contentContainerStyle={{ padding: S.spacing.lg, paddingBottom: S.spacing.xl }}
                    ItemSeparatorComponent={() => <View style={{ height: S.spacing.md }} />}
                    refreshing={refreshing}
                    onRefresh={refreshExpenses}
                    ListHeaderComponent={
                        <View
                            style={[
                                styles.selectorCard,
                                {
                                    backgroundColor: C.surface,
                                    borderColor: C.border,
                                    borderRadius: S.radius.lg,
                                    marginBottom: S.spacing.md,
                                },
                                scheme === "light" ? S.shadow.light : S.shadow.dark,
                            ]}
                        >
                            {/* Season selector */}
                            <Pressable
                                onPress={() => setOpenSeasonList((v) => !v)}
                                style={({ pressed }) => [
                                    styles.seasonRow,
                                    { borderColor: C.border, opacity: pressed ? 0.96 : 1 },
                                ]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.seasonTitle, { color: C.text }]}>
                                        {currentSeason ? `Musim Ke-${currentSeason.season_no}` : "Pilih Musim"}
                                    </Text>
                                    {currentSeason && (
                                        <Text style={[styles.seasonRange, { color: C.textMuted }]}>
                                            {formatDate(currentSeason.start_date)} — {formatDate(currentSeason.end_date)}
                                        </Text>
                                    )}
                                </View>
                                <Ionicons name={openSeasonList ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
                            </Pressable>

                            {openSeasonList && (
                                <View style={[styles.seasonList, { borderColor: C.border }]}>
                                    {seasons.map((s) => (
                                        <Pressable
                                            key={s.id}
                                            onPress={() => {
                                                setSeasonId(s.id);
                                                setOpenSeasonList(false);
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
                                                {formatDate(s.start_date)} — {formatDate(s.end_date)}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>
                    }
                    ListFooterComponent={
                        expenses.length > 0 ? (
                            <View style={{ marginTop: 8, alignItems: "flex-end" }}>
                                <Text style={{ color: C.textMuted, fontSize: 12 }}>Total Pengeluaran</Text>
                                <Text style={{ color: C.danger, fontSize: 16, fontWeight: "900" }}>
                                    {formatMoney(grandTotalCash + grandTotalNonCash)}
                                </Text>
                            </View>
                        ) : null
                    }
                    renderItem={({ item }) => {
                        const info = typeInfo(item.type);
                        const isCash = item.type === "cash";
                        return (
                            <View
                                style={[
                                    styles.rowCard,
                                    {
                                        backgroundColor: C.surface,
                                        borderColor: C.border,
                                        borderRadius: S.radius.lg,
                                    },
                                    scheme === "light" ? S.shadow.light : S.shadow.dark,
                                ]}
                            >
                                {/* Badge kiri */}
                                <View
                                    style={[
                                        styles.dateBadge,
                                        { backgroundColor: C.surfaceSoft, borderColor: C.border },
                                    ]}
                                >
                                    <Text style={{ color: C.text, fontSize: 12, fontWeight: "700" }} numberOfLines={1}>
                                        {formatDate(item.created_at)}
                                    </Text>

                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                        <Ionicons name={info.icon} size={14} color={C.icon} />
                                        <Text
                                            style={{
                                                color: C.textMuted,
                                                fontSize: 12,
                                                fontFamily: Fonts.serif as any,
                                            }}
                                            numberOfLines={1}
                                        >
                                            {info.label}
                                        </Text>
                                    </View>

                                    <Text
                                        style={{
                                            color: C.danger,
                                            fontSize: 16,
                                            fontWeight: "900",
                                            marginTop: 2,
                                        }}
                                        numberOfLines={1}
                                    >
                                        {isCash ? formatMoney(item.total_cash || 0) : formatMoney(item.total_noncash_est || 0)}
                                    </Text>
                                </View>

                                {/* Aksi */}
                                <View style={styles.actions}>
                                    <Pressable
                                        onPress={() => goEdit(item.id)}
                                        style={({ pressed }) => [
                                            styles.actionBtn,
                                            { borderColor: C.border, backgroundColor: C.surfaceSoft, opacity: pressed ? 0.9 : 1 },
                                        ]}
                                    >
                                        <Ionicons name="create-outline" size={16} color={C.text} />
                                        <Text style={[styles.actionText, { color: C.text }]}>Ubah</Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => onDelete(item.id)}
                                        style={({ pressed }) => [
                                            styles.actionBtn,
                                            { borderColor: C.border, backgroundColor: C.surfaceSoft, opacity: pressed ? 0.9 : 1 },
                                        ]}
                                    >
                                        <Ionicons name="trash-outline" size={16} color={C.danger} />
                                        <Text style={[styles.actionText, { color: C.danger }]}>Hapus</Text>
                                    </Pressable>
                                </View>
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        !(seasonLoading || expenseLoading) ? (
                            <View style={{ alignItems: "center", marginTop: 24 }}>
                                <Text style={{ color: C.textMuted }}>Belum ada data pengeluaran.</Text>
                            </View>
                        ) : null
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // Header
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    addBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flexDirection: "row",
    },
    addText: { color: "#fff", fontSize: 14, fontWeight: "800" },

    // Season selector card
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

    // List item row card
    rowCard: {
        padding: 12,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    dateBadge: {
        maxWidth: 175,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignItems: "flex-start",
        justifyContent: "flex-start",
        gap: 6,
    },
    actions: { flexDirection: "row", gap: 8, marginLeft: 8 },
    actionBtn: {
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 10,
        flexDirection: "row",
        gap: 4,
        alignItems: "center",
    },
    actionText: { fontSize: 11, fontWeight: "800" },
});
