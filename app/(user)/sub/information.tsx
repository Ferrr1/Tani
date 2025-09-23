// app/(tabs)/information.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    LayoutAnimation,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useColorScheme
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useInformationList } from "@/services/informationService";
import { useFocusEffect, useRouter } from "expo-router";

export default function InformationScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    const { loading, refreshing, rows, fetchOnce, refresh } = useInformationList();

    useFocusEffect(
        useCallback(() => {
            fetchOnce();
        }, [fetchOnce])
    );

    // === Search & filter aktif ===
    const [q, setQ] = useState("");
    const activeRows = useMemo(
        () => rows.filter((r: any) => r.is_active === true),
        [rows]
    );
    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return activeRows;
        return activeRows.filter((r: any) => {
            const title = (r.title ?? "").toLowerCase();
            const desc = (r.description ?? "").toLowerCase();
            const note = (r.note ?? "").toLowerCase();
            return title.includes(s) || desc.includes(s) || note.includes(s);
        });
    }, [q, activeRows]);

    const showBlocking = loading && rows.length === 0;

    // === Accordion state (single expand) ===
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const toggleExpand = useCallback((id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId((prev) => (prev === id ? null : id));
    }, []);

    // Tutup ekspansi saat daftar berubah (misal selesai refresh)
    useEffect(() => {
        setExpandedId(null);
    }, [q, rows.length]);

    const renderItem = useCallback(
        ({ item }: { item: any }) => {
            const expanded = expandedId === item.id;
            return (
                <View
                    style={[
                        styles.card,
                        { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                        scheme === "light" ? S.shadow.light : S.shadow.dark,
                    ]}
                >
                    {/* Header accordion */}
                    <Pressable
                        onPress={() => toggleExpand(item.id)}
                        style={({ pressed }) => [
                            styles.row,
                            { opacity: pressed ? 0.96 : 1 },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ expanded }}
                        accessibilityLabel={`Informasi: ${item.title}`}
                    >
                        <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text
                                style={{ color: C.text, fontSize: 14, fontWeight: "900", fontFamily: Fonts.rounded as any }}
                                numberOfLines={expanded ? 3 : 2}
                            >
                                {item.title}
                            </Text>
                            {!expanded && (
                                <Text
                                    style={{
                                        color: C.textMuted,
                                        fontSize: 12,
                                        marginTop: 4,
                                        lineHeight: 18,
                                        fontFamily: Fonts.serif as any,
                                    }}
                                    numberOfLines={2}
                                >
                                    {item.description}
                                </Text>
                            )}
                        </View>

                        <View
                            style={[
                                styles.chevWrap,
                                { borderColor: C.border, backgroundColor: C.surfaceSoft },
                            ]}
                        >
                            <Ionicons
                                name="chevron-down"
                                size={16}
                                color={C.text}
                                style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
                            />
                        </View>
                    </Pressable>

                    {/* Body accordion */}
                    {expanded && (
                        <View style={{ marginTop: 10 }}>
                            <Text
                                style={{
                                    color: C.text,
                                    fontSize: 13,
                                    lineHeight: 20,
                                    fontFamily: Fonts.serif as any,
                                }}
                            >
                                {item.description}
                            </Text>

                            {!!item.note && (
                                <View
                                    style={{
                                        marginTop: 10,
                                        paddingHorizontal: 10,
                                        paddingVertical: 6,
                                        borderRadius: 10,
                                        borderWidth: 1,
                                        borderColor: C.border,
                                        backgroundColor: C.surfaceSoft,
                                    }}
                                >
                                    <Text style={{ color: C.textMuted, fontSize: 12 }}>{item.note}</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            );
        },
        [C, S, scheme, expandedId, toggleExpand]
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            {/* Header */}
            <LinearGradient
                colors={[C.gradientFrom, C.gradientTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
            >
                <Pressable
                    onPress={() => router.replace("/(tabs)")}
                    style={({ pressed }) => [
                        styles.iconBtn,
                        { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.9 : 1 },
                    ]}
                >
                    <Ionicons name="arrow-back" size={18} color={C.text} />
                </Pressable>
                <View>
                    <Text style={[styles.headerTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                        Informasi
                    </Text>
                    <Text style={[styles.headerSub, { color: C.textMuted, fontFamily: Fonts.serif as any }]}>
                        Panduan & pengumuman untuk pengguna.
                    </Text>
                </View>
            </LinearGradient>

            {/* Search */}
            <View
                style={[
                    styles.searchWrap,
                    { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg, marginHorizontal: S.spacing.lg },
                ]}
            >
                <Ionicons name="search-outline" size={16} color={C.icon} />
                <TextInput
                    placeholder="Cari informasi…"
                    placeholderTextColor={C.icon}
                    value={q}
                    onChangeText={setQ}
                    style={[styles.searchInput, { color: C.text }]}
                    autoCorrect={false}
                    autoCapitalize="none"
                />
                {!!q && (
                    <Pressable onPress={() => setQ("")} style={styles.clearBtn}>
                        <Ionicons name="close-circle" size={16} color={C.icon} />
                    </Pressable>
                )}
            </View>

            {/* List */}
            {showBlocking ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={C.tint} size="large" />
                    <Text style={{ marginTop: 8, color: C.textMuted }}>Menyiapkan data…</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
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
                                <Text style={{ color: C.textMuted, marginTop: 6, textAlign: "center" }}>
                                    Belum ada informasi aktif.
                                </Text>
                            </View>
                        ) : null
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    headerSub: { fontSize: 12, marginTop: 4 },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    searchWrap: {
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    searchInput: { flex: 1, fontSize: 14 },
    clearBtn: { padding: 4 },

    card: { padding: 14, borderWidth: 1 },

    row: { flexDirection: "row", alignItems: "center" },

    chevWrap: {
        width: 28,
        height: 28,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    emptyWrap: {
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        borderWidth: 1,
        marginTop: 12,
    },
});
