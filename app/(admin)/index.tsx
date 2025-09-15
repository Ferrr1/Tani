import { Colors, Fonts, Tokens } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ===== Dummy data user (bisa ganti dari API) =====
export type AppUser = {
    id: string;
    fullName: string;
    phone: string;
    email?: string;
    village: string;
    cropType: string;
    landAreaHa: number;
    avatar?: string;
};
const FAKE_USERS: AppUser[] = [
    { id: "u1", fullName: "Fersetya Putra", phone: "+6281234567890", email: "fer@example.com", village: "Medangan", cropType: "Padi", landAreaHa: 1.8 },
    { id: "u2", fullName: "Siti Rahma", phone: "+6281122233344", email: "siti@example.com", village: "Sukamaju", cropType: "Kopi", landAreaHa: 0.7 },
    { id: "u3", fullName: "Budi Santoso", phone: "+6281399988877", email: "budi@example.com", village: "Karangrejo", cropType: "Cabai", landAreaHa: 1.2 },
    { id: "u4", fullName: "Wayan Adi", phone: "+6285647382910", email: "wayan@example.com", village: "Tegalrejo", cropType: "Jagung", landAreaHa: 2.4 },
];

export default function HomeAdminScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    const [q, setQ] = useState("");

    const data = useMemo(() => {
        const key = q.trim().toLowerCase();
        if (!key) return FAKE_USERS;
        return FAKE_USERS.filter(
            (u) =>
                u.fullName.toLowerCase().includes(key) ||
                u.phone.toLowerCase().includes(key) ||
                u.village.toLowerCase().includes(key) ||
                u.cropType.toLowerCase().includes(key)
        );
    }, [q]);

    const renderItem = ({ item }: { item: AppUser }) => (
        <Pressable
            onPress={() => router.push({ pathname: "/(admin)/[detail]", params: { id: item.id } })}
            style={({ pressed }) => [
                styles.row,
                { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg, opacity: pressed ? 0.96 : 1 },
                scheme === "light" ? S.shadow.light : S.shadow.dark,
            ]}
        >
            {/* avatar */}
            <View style={[styles.avatarWrap, { borderColor: C.border, backgroundColor: C.surfaceSoft }]}>
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                    <Text style={{ color: C.text, fontWeight: "900" }}>
                        {item.fullName.split(" ").slice(0, 2).map(s => s[0]).join("").toUpperCase()}
                    </Text>
                )}
            </View>

            <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>{item.fullName}</Text>
                <Text style={{ color: C.textMuted, fontSize: 12 }} numberOfLines={1}>
                    {item.phone} • {item.village}
                </Text>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <View style={[styles.badge, { borderColor: C.border, backgroundColor: C.surfaceSoft }]}>
                        <Ionicons name="leaf-outline" size={12} color={C.tint} />
                        <Text style={[styles.badgeText, { color: C.text }]}>{item.cropType}</Text>
                    </View>
                    <View style={[styles.badge, { borderColor: C.border, backgroundColor: C.surfaceSoft }]}>
                        <Ionicons name="map-outline" size={12} color={C.info} />
                        <Text style={[styles.badgeText, { color: C.text }]}>{item.landAreaHa} ha</Text>
                    </View>
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
                    <Text style={[styles.title, { color: C.text, fontFamily: Fonts.rounded as any }]}>Kelola Pengguna</Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* search */}
                <View style={[styles.search, { borderColor: C.border, backgroundColor: C.surface }]}>
                    <Ionicons name="search-outline" size={16} color={C.icon} />
                    <TextInput
                        placeholder="Cari nama, HP, desa, atau komoditas…"
                        placeholderTextColor={C.icon}
                        value={q}
                        onChangeText={setQ}
                        style={{ flex: 1, color: C.text, paddingVertical: 8 }}
                    />
                </View>
            </LinearGradient>

            <FlatList
                data={data}
                keyExtractor={(u) => u.id}
                contentContainerStyle={{ padding: S.spacing.lg, paddingBottom: S.spacing.xl, gap: S.spacing.md }}
                renderItem={renderItem}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    title: { fontSize: 18, fontWeight: "800" },

    search: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },

    row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 1 },
    avatarWrap: { width: 44, height: 44, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatar: { width: "100%", height: "100%" },
    name: { fontSize: 14, fontWeight: "800" },
    badge: { flexDirection: "row", gap: 6, alignItems: "center", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { fontSize: 11, fontWeight: "700" },
});
