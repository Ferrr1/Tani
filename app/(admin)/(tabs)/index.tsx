import ButtonLogout from "@/components/ButtonLogout";
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useAdminUserList } from "@/services/adminUserService";
import { getInitialsName } from "@/utils/getInitialsName";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
    useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AppUser = {
    id: string;
    fullName: string;
    email?: string | null;
    village?: string | null;
    cropType?: string | null;
    landAreaHa?: number | null;
    avatar?: string | null;
};

export default function HomeAdminScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();
    const { profile, reloadProfile } = useAuth();
    const { rows, loading, refreshing, fetchOnce, refresh } = useAdminUserList();
    const users: AppUser[] = useMemo(
        () =>
            rows.map((r) => ({
                id: r.id,
                fullName: r.full_name ?? "—",
                email: r.email ?? null,
                village: r.nama_desa ?? null,
                landAreaHa: r.luas_lahan ?? null,
                avatar: (r as any).avatar_url ?? null,
            })),
        [rows]
    );

    const [q, setQ] = useState("");
    const filtered = useMemo(() => {
        const key = q.trim().toLowerCase();
        if (!key) return users;
        return users.filter((u) => {
            const bag = [
                u.fullName,
                u.email ?? "",
                u.village ?? "",
                u.cropType ?? "",
                (u.landAreaHa ?? "").toString(),
            ]
                .join(" ")
                .toLowerCase();
            return bag.includes(key);
        });
    }, [q, users]);

    const onRefresh = useCallback(async () => {
        await refresh();
    }, [refresh]);

    useFocusEffect(
        useCallback(() => {
            reloadProfile();
            fetchOnce();
        }, [fetchOnce, reloadProfile])
    );

    const renderItem = ({ item }: { item: AppUser }) => (
        <Pressable
            onPress={() => router.push({ pathname: "/(admin)/[detail]", params: { detail: item.id } })}
            style={({ pressed }) => [
                styles.row,
                {
                    backgroundColor: C.surface,
                    borderColor: C.border,
                    borderRadius: S.radius.lg,
                    opacity: pressed ? 0.96 : 1,
                },
                scheme === "light" ? S.shadow.light : S.shadow.dark,
            ]}
        >
            {/* avatar */}
            <View style={[styles.avatarWrap, { borderColor: C.border, backgroundColor: C.surfaceSoft }]}>
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                    <Text style={{ color: C.text, fontWeight: "900" }}>
                        {item.fullName
                            .split(" ")
                            .slice(0, 2)
                            .map((s) => s[0])
                            .join("")
                            .toUpperCase()}
                    </Text>
                )}
            </View>

            <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                    {item.fullName}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12 }} numberOfLines={1}>
                    {item.village}
                </Text>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    {!!item.cropType && (
                        <View style={[styles.badge, { borderColor: C.border, backgroundColor: C.surfaceSoft }]}>
                            <Ionicons name="leaf-outline" size={12} color={C.tint} />
                            <Text style={[styles.badgeText, { color: C.text }]}>{item.cropType}</Text>
                        </View>
                    )}
                    {item.landAreaHa != null && (
                        <View style={[styles.badge, { borderColor: C.border, backgroundColor: C.surfaceSoft }]}>
                            <Ionicons name="map-outline" size={12} color={C.info} />
                            <Text style={[styles.badgeText, { color: C.text }]}>{item.landAreaHa} ha</Text>
                        </View>
                    )}
                </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color={C.icon} />
        </Pressable>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            {/* Header gradient */}
            <LinearGradient
                colors={[C.gradientFrom, C.gradientTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
            >
                <View style={styles.headerRow}>
                    <Text style={[styles.title, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                        Kelola Pengguna
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <ButtonLogout colors={[C.danger, C.gradientTo]} />
                        <Pressable
                            onPress={() =>
                                router.push({
                                    pathname: "/(admin)/[detail]",
                                    params: { detail: profile?.id ?? "" },
                                })
                            }
                            style={[
                                styles.avatarWrap,
                                { borderColor: C.success, backgroundColor: C.surface },
                                scheme === "light" ? S.shadow.light : S.shadow.dark,
                            ]}
                        >
                            <Text style={{
                                textTransform: "uppercase",
                                color: C.text,
                                fontFamily: Fonts.rounded as any,
                                fontSize: 14,
                                fontWeight: "bold"
                            }}>
                                {getInitialsName(profile?.full_name ?? "")}
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* search */}
                <View style={[styles.search, { borderColor: C.border, backgroundColor: C.surface }]}>
                    <Ionicons name="search-outline" size={16} color={C.icon} />
                    <TextInput
                        placeholder="Cari nama, desa"
                        placeholderTextColor={C.icon}
                        value={q}
                        onChangeText={setQ}
                        style={{ flex: 1, color: C.text, paddingVertical: 8 }}
                    />
                </View>
            </LinearGradient>

            {loading && users.length === 0 ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator size="large" color={C.tint} />
                    <Text style={{ marginTop: 8, color: C.textMuted }}>Memuat data…</Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(u) => u.id}
                    contentContainerStyle={{ padding: S.spacing.lg, paddingBottom: S.spacing.xl, gap: S.spacing.md }}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={{ padding: 24, alignItems: "center" }}>
                            <Text style={{ color: C.textMuted }}>Tidak ada pengguna.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    title: { fontSize: 18, fontWeight: "800" },

    search: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },

    row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 1 },
    avatarWrap: {
        justifyContent: "center", alignItems: "center",
        width: 54, height: 54, borderRadius: 54, overflow: "hidden", borderWidth: 1
    },
    avatar: { width: "100%", height: "100%" },
    name: { fontSize: 14, fontWeight: "800" },
    badge: { flexDirection: "row", gap: 6, alignItems: "center", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { fontSize: 11, fontWeight: "700" },
});
