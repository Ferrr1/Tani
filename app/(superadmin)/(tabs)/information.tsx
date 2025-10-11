import Chip from "@/components/Chip";
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useInformationList, useInformationService } from "@/services/informationService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
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

export default function InformationScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    const { loading, refreshing, rows, fetchOnce, refresh } = useInformationList();
    const { deleteInformation } = useInformationService();

    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    useFocusEffect(
        useCallback(() => {
            fetchOnce();
        }, [fetchOnce])
    );

    const filteredRows = useMemo(() => {
        if (statusFilter === "active") return rows.filter((r: any) => r.is_active === true);
        if (statusFilter === "inactive") return rows.filter((r: any) => r.is_active === false);
        return rows;
    }, [rows, statusFilter]);

    const showBlocking = loading && rows.length === 0;

    const renderItem = useCallback(
        ({ item }: { item: any }) => (
            <View
                style={[
                    styles.card,
                    { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                    scheme === "light" ? S.shadow.light : S.shadow.dark,
                ]}
            >
                <View style={{ flex: 1 }}>
                    {/* Row title + status badge */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ color: C.text, fontSize: 14, fontWeight: "900", flex: 1 }} numberOfLines={2}>
                            {item.title}
                        </Text>
                        {/* ===== NEW: Badge status */}
                        <View
                            style={{
                                borderWidth: 1,
                                borderColor: item.is_active ? C.success ?? C.border : C.border,
                                backgroundColor: item.is_active ? C.surfaceSoft : C.surface,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 999,
                            }}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Ionicons
                                    name={item.is_active ? "eye-outline" : "eye-off-outline"}
                                    size={12}
                                    color={item.is_active ? (C.success ?? C.text) : C.icon}
                                />
                                <Text
                                    style={{
                                        fontSize: 11,
                                        fontWeight: "800",
                                        color: item.is_active ? C.text : C.textMuted,
                                    }}
                                >
                                    {item.is_active ? "Ditampilkan" : "Disembunyikan"}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <Text
                        style={{
                            color: C.textMuted,
                            fontSize: 12,
                            marginTop: 6,
                            lineHeight: 18,
                            fontFamily: Fonts.serif as any,
                        }}
                        numberOfLines={3}
                    >
                        {item.description}
                    </Text>

                    {item.note ? (
                        <View
                            style={{
                                marginTop: 8,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: C.border,
                                backgroundColor: C.surfaceSoft,
                                maxWidth: "100%",
                            }}
                        >
                            <Text style={{ color: C.textMuted, fontSize: 12 }} numberOfLines={2}>
                                {item.note}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.actions}>
                    <Pressable
                        onPress={() =>
                            router.push(`/(form)/information/InformationForm?informationId=${item.id}`)
                        }
                        style={({ pressed }) => [
                            styles.actionBtn,
                            { borderColor: C.border, backgroundColor: C.surfaceSoft, opacity: pressed ? 0.9 : 1 },
                        ]}
                    >
                        <Ionicons name="create-outline" size={16} color={C.text} />
                        <Text style={[styles.actionText, { color: C.text }]}>Ubah</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            Alert.alert("Hapus Informasi", "Yakin menghapus item ini?", [
                                { text: "Batal", style: "cancel" },
                                {
                                    text: "Hapus",
                                    style: "destructive",
                                    onPress: async () => {
                                        try {
                                            await deleteInformation(item.id);
                                            await refresh();
                                        } catch (e: any) {
                                            Alert.alert("Gagal", e?.message ?? "Tidak dapat menghapus data.");
                                        }
                                    },
                                },
                            ]);
                        }}
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
        ),
        [C, S, scheme, router, deleteInformation, refresh]
    );


    const header = useMemo(
        () => (
            <LinearGradient
                colors={[C.gradientFrom, C.gradientTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
            >
                <View style={styles.headerRow}>
                    <Text style={[styles.headerTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                        Informasi
                    </Text>
                    <View style={{ width: 36 }} />
                </View>

                <Pressable
                    onPress={() => router.push("/(form)/information/InformationForm")}
                    style={({ pressed }) => [
                        styles.addBtn,
                        { backgroundColor: C.tint, borderRadius: S.radius.xl, opacity: pressed ? 0.98 : 1 },
                    ]}
                >
                    <Ionicons name="add-circle-outline" size={18} color="#fff" />
                    <Text style={[styles.addText, { fontFamily: Fonts.rounded as any }]}>
                        Tambah Informasi
                    </Text>
                </Pressable>
            </LinearGradient>
        ),
        [C, S, router]
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            {header}
            {/* ===== NEW: Filter Chips + keterangan */}
            <View style={{ paddingHorizontal: S.spacing.lg, marginTop: S.spacing.lg }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                    <Chip label="Semua" active={statusFilter === "all"} onPress={() => setStatusFilter("all")} C={C} />
                    <Chip label="Tampilkan" active={statusFilter === "active"} onPress={() => setStatusFilter("active")} C={C} />
                    <Chip label="Sembunyikan" active={statusFilter === "inactive"} onPress={() => setStatusFilter("inactive")} C={C} />
                </View>
            </View>
            {showBlocking ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={C.tint} size="large" />
                    <Text style={{ marginTop: 8, color: C.textMuted }}>Menyiapkan data…</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredRows}
                    keyExtractor={(it) => it.id}
                    contentContainerStyle={{ padding: S.spacing.lg, paddingBottom: S.spacing.xl }}
                    ItemSeparatorComponent={() => <View style={{ height: S.spacing.md }} />}
                    refreshing={refreshing}
                    onRefresh={refresh}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        !loading ? (
                            <View
                                style={[
                                    styles.emptyWrap,
                                    { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                                    scheme === "light" ? S.shadow.light : S.shadow.dark,
                                ]}
                            >
                                <Ionicons name="information-circle-outline" size={24} color={C.icon} />
                                <Text style={{ color: C.textMuted, marginTop: 6 }}>Belum ada informasi.</Text>
                                <Pressable
                                    onPress={() => router.push("/(form)/information/InformationForm")}
                                    style={({ pressed }) => [
                                        styles.ctaEmpty,
                                        { backgroundColor: C.tint, opacity: pressed ? 0.95 : 1 },
                                    ]}
                                >
                                    <Ionicons name="add" size={16} color="#fff" />
                                    <Text style={{ color: "#fff", fontWeight: "800" }}>Tambah Informasi</Text>
                                </Pressable>
                            </View>
                        ) : null
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    addBtn: {
        marginTop: 8,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flexDirection: "row",
    },
    addText: { color: "#fff", fontSize: 14, fontWeight: "800" },

    card: {
        padding: 12,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
    },
    actions: { flexDirection: "column", gap: 8, marginLeft: 8 },
    actionBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, flexDirection: "row", gap: 4, alignItems: "center" },
    actionText: { fontSize: 11, fontWeight: "800" },
    emptyWrap: { alignItems: "center", justifyContent: "center", padding: 16, borderWidth: 1, marginTop: 12 },
    ctaEmpty: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: "row", gap: 6, alignItems: "center" },
});
