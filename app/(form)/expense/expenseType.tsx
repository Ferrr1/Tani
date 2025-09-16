// app/(form)/expense/index.tsx
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useSeasonList } from "@/services/seasonService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ExpenseForm() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    const { loading, data: seasons, fetchOnce, refresh } = useSeasonList();

    const [type, setType] = useState<"tunai" | "nontunai" | null>(null);
    const [seasonOpen, setSeasonOpen] = useState(false);
    const [seasonIdx, setSeasonIdx] = useState(0);

    React.useEffect(() => {
        fetchOnce();
    }, [fetchOnce]);

    const season = seasons[seasonIdx];
    const seasonRange = useMemo(() => {
        if (!season) return "";
        const f = (iso: string) =>
            new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
        return `${f(season.start_date)} — ${f(season.end_date)}`;
    }, [seasonIdx, seasons]);

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
                style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
            >
                <View style={styles.headerRow}>
                    <Pressable
                        onPress={() => router.push("/(tabs)/expense")}
                        style={({ pressed }) => [
                            styles.iconBtn,
                            { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.9 : 1 },
                        ]}
                    >
                        <Ionicons name="arrow-back" size={18} color={C.text} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>Pengeluaran</Text>
                    <View style={{ width: 36 }} />
                </View>
            </LinearGradient>

            {showLoader ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={C.tint} />
                    <Text style={{ marginTop: 8, color: C.textMuted }}>Memuat musim…</Text>
                </View>
            ) : (
                <View style={{ padding: S.spacing.lg, gap: S.spacing.md }}>
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
                                        { borderColor: C.border, backgroundColor: active ? C.tint + "1A" : C.surface, opacity: pressed ? 0.95 : 1 },
                                    ]}
                                >
                                    <Ionicons name={t === "tunai" ? "cash-outline" : "people-outline"} size={16} color={active ? C.tint : C.icon} />
                                    <Text style={{ color: active ? C.tint : C.text, fontWeight: "800" }}>{t === "tunai" ? "Tunai" : "Non Tunai"}</Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* Pilih Musim */}
                    <Text style={[styles.label, { color: C.text }]}>Pilih Musim</Text>
                    {seasons.length === 0 ? (
                        <View style={{ paddingVertical: 12 }}>
                            <Text style={{ color: C.textMuted, marginBottom: 8 }}>Belum ada musim. Buat dulu di menu Musim.</Text>
                            <Pressable
                                onPress={refresh}
                                style={({ pressed }) => [
                                    styles.cta,
                                    { backgroundColor: C.tint, opacity: pressed ? 0.98 : 1, borderRadius: S.radius.xl },
                                ]}
                            >
                                <Ionicons name="refresh-outline" size={18} color="#fff" />
                                <Text style={{ color: "#fff", fontWeight: "900" }}>Muat Ulang</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <>
                            <Pressable
                                onPress={() => setSeasonOpen((v) => !v)}
                                style={({ pressed }) => [
                                    styles.inputLike,
                                    { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.98 : 1 },
                                ]}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: C.text, fontWeight: "800" }}>
                                        Musim Ke-{seasons[seasonIdx]?.season_no ?? "-"}
                                    </Text>
                                    <Text style={{ color: C.textMuted, fontSize: 12 }}>{seasonRange}</Text>
                                </View>
                                <Ionicons name={seasonOpen ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
                            </Pressable>

                            {seasonOpen && (
                                <View style={[styles.dropdown, { borderColor: C.border, backgroundColor: C.surface }]}>
                                    {seasons.map((s, i) => (
                                        <Pressable
                                            key={s.id}
                                            onPress={() => {
                                                setSeasonIdx(i);
                                                setSeasonOpen(false);
                                            }}
                                            style={({ pressed }) => [
                                                styles.dropdownItem,
                                                {
                                                    backgroundColor: i === seasonIdx ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent",
                                                    opacity: pressed ? 0.96 : 1,
                                                },
                                            ]}
                                        >
                                            <Text style={{ color: C.text, fontWeight: i === seasonIdx ? "800" : "600" }}>
                                                Musim Ke-{s.season_no}
                                            </Text>
                                            <Text style={{ color: C.textMuted, fontSize: 12 }}>
                                                {new Date(s.start_date).toLocaleDateString("id-ID")} —{" "}
                                                {new Date(s.end_date).toLocaleDateString("id-ID")}
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
                        disabled={!type || seasons.length === 0}
                        style={({ pressed }) => [
                            styles.cta,
                            {
                                backgroundColor: !type || seasons.length === 0 ? C.icon : C.tint,
                                opacity: pressed ? 0.98 : 1,
                                borderRadius: S.radius.xl,
                            },
                        ]}
                    >
                        <Ionicons name="arrow-forward-circle-outline" size={18} color="#fff" />
                        <Text style={{ color: "#fff", fontWeight: "900" }}>Lanjut</Text>
                    </Pressable>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    iconBtn: { width: 36, height: 36, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    label: { fontSize: 12, fontWeight: "800" },
    chipBtn: { flexDirection: "row", gap: 8, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
    inputLike: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
    dropdown: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
    dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
    cta: { marginTop: 6, paddingVertical: 12, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
});
