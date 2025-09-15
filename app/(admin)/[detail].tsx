import { Colors, Fonts, Tokens } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ——— sama seperti di list (bisa ganti fetch API)
type AppUser = {
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

const CROP_OPTIONS = ["Padi", "Jagung", "Kedelai", "Cabai", "Bawang Merah", "Kopi", "Kakao", "Tebu", "Sawit", "Tembakau"];

export default function AdminUserDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const original = useMemo(() => FAKE_USERS.find((u) => u.id === id), [id]);
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    // state form
    const [fullName, setFullName] = useState(original?.fullName ?? "");
    const [phone, setPhone] = useState(original?.phone ?? "");
    const [email, setEmail] = useState(original?.email ?? "");
    const [village, setVillage] = useState(original?.village ?? "");
    const [cropType, setCropType] = useState(original?.cropType ?? "");
    const [landAreaHa, setLandAreaHa] = useState(String(original?.landAreaHa ?? ""));
    const [showCrop, setShowCrop] = useState(false);

    const save = () => {
        // TODO: call API update user
        console.log("UPDATE USER", { id, fullName, phone, email, village, cropType, landAreaHa: parseFloat(landAreaHa) });
        Alert.alert("Tersimpan", "Profil pengguna berhasil diperbarui.");
        router.back();
    };

    const genTempPassword = () => {
        // sederhana: 8-10 char alfanumerik
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        let out = "";
        for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return out;
    };
    const onResetPassword = async () => {
        const temp = genTempPassword();
        // TODO: hit API reset password -> kirim temp password ke user via SMS/WA/email
        await Clipboard.setStringAsync(temp);
        Alert.alert("Password sementara dibuat", `Password: ${temp}\n\nSudah disalin ke clipboard.`);
    };

    if (!original) {
        return (
            <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <Text>Pengguna tidak ditemukan.</Text>
            </SafeAreaView>
        );
    }

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
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => [
                            styles.iconBtn,
                            { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.9 : 1 },
                        ]}
                    >
                        <Ionicons name="arrow-back" size={18} color={C.text} />
                    </Pressable>
                    <Text style={[styles.title, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                        Edit Pengguna
                    </Text>
                    <View style={{ width: 36 }} />
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={{ padding: S.spacing.lg, paddingBottom: 120 }}>
                {/* card profil */}
                <View
                    style={[
                        styles.card,
                        { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                        scheme === "light" ? S.shadow.light : S.shadow.dark,
                    ]}
                >
                    {/* Avatar + Nama */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={[styles.bigAvatar, { borderColor: C.border, backgroundColor: C.surfaceSoft }]}>
                            <Text style={{ color: C.text, fontSize: 18, fontWeight: "900" }}>
                                {original.fullName.split(" ").slice(0, 2).map(s => s[0]).join("").toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: C.textMuted, fontSize: 12 }}>ID #{original.id}</Text>
                            <Text style={{ color: C.text, fontSize: 16, fontWeight: "900" }}>{original.fullName}</Text>
                        </View>
                    </View>

                    {/* Form fields */}
                    <View style={{ marginTop: 12, gap: 10 }}>
                        <Field label="Nama Lengkap">
                            <TextInput
                                placeholder="Nama lengkap"
                                placeholderTextColor={C.icon}
                                value={fullName}
                                onChangeText={setFullName}
                                style={[styles.input, { borderColor: C.border, color: C.text }]}
                            />
                        </Field>

                        <Field label="Nomor HP">
                            <TextInput
                                placeholder="+62812xxxxxxx"
                                placeholderTextColor={C.icon}
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={setPhone}
                                style={[styles.input, { borderColor: C.border, color: C.text }]}
                            />
                        </Field>

                        <Field label="Email (opsional)">
                            <TextInput
                                placeholder="email@contoh.com"
                                placeholderTextColor={C.icon}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                                style={[styles.input, { borderColor: C.border, color: C.text }]}
                            />
                        </Field>

                        <Field label="Desa/Kelurahan">
                            <TextInput
                                placeholder="Nama desa"
                                placeholderTextColor={C.icon}
                                value={village}
                                onChangeText={setVillage}
                                style={[styles.input, { borderColor: C.border, color: C.text }]}
                            />
                        </Field>

                        <Field label="Jenis Tanaman">
                            <Pressable
                                onPress={() => setShowCrop((v) => !v)}
                                style={[
                                    styles.inputLike,
                                    { borderColor: C.border, backgroundColor: C.surface },
                                ]}
                            >
                                <Text style={{ color: cropType ? C.text : C.icon, fontWeight: "800" }}>
                                    {cropType || "Pilih jenis tanaman"}
                                </Text>
                                <Ionicons name={showCrop ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
                            </Pressable>
                            {showCrop && (
                                <View style={[styles.dropdown, { borderColor: C.border, backgroundColor: C.surface }]}>
                                    {CROP_OPTIONS.map((opt) => (
                                        <Pressable
                                            key={opt}
                                            onPress={() => {
                                                setCropType(opt);
                                                setShowCrop(false);
                                            }}
                                            style={({ pressed }) => [
                                                styles.dropdownItem,
                                                { backgroundColor: pressed ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent" },
                                            ]}
                                        >
                                            <Ionicons name="leaf-outline" size={14} color={C.tint} />
                                            <Text style={{ color: C.text, fontWeight: "700" }}>{opt}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </Field>

                        <Field label="Luas Lahan (ha)">
                            <TextInput
                                placeholder="mis. 1.5"
                                placeholderTextColor={C.icon}
                                keyboardType="decimal-pad"
                                value={landAreaHa}
                                onChangeText={setLandAreaHa}
                                style={[styles.input, { borderColor: C.border, color: C.text }]}
                            />
                        </Field>
                    </View>
                </View>

                {/* card actions */}
                <View
                    style={[
                        styles.card,
                        { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg, marginTop: S.spacing.md },
                        scheme === "light" ? S.shadow.light : S.shadow.dark,
                    ]}
                >
                    <Text style={{ color: C.text, fontSize: 14, fontWeight: "800", marginBottom: 8 }}>Aksi</Text>

                    <Pressable
                        onPress={onResetPassword}
                        style={({ pressed }) => [
                            styles.actionBtn,
                            { borderColor: C.border, backgroundColor: C.surfaceSoft, opacity: pressed ? 0.95 : 1 },
                        ]}
                    >
                        <Ionicons name="refresh-circle-outline" size={18} color={C.info} />
                        <Text style={{ color: C.info, fontWeight: "900" }}>Reset Password (buat sementara)</Text>
                    </Pressable>

                    <Pressable
                        onPress={save}
                        style={({ pressed }) => [
                            styles.saveBtn,
                            { backgroundColor: C.tint, opacity: pressed ? 0.98 : 1, borderRadius: S.radius.xl },
                        ]}
                    >
                        <Ionicons name="save-outline" size={18} color="#fff" />
                        <Text style={{ color: "#fff", fontWeight: "900" }}>Simpan Perubahan</Text>
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

/** Label + children */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    return (
        <View>
            <Text style={{ color: C.text, fontSize: 12, fontWeight: "800", marginBottom: 6 }}>{label}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { fontSize: 18, fontWeight: "800" },
    iconBtn: { width: 36, height: 36, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },

    card: { padding: 12, borderWidth: 1 },

    bigAvatar: { width: 56, height: 56, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },

    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
    inputLike: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

    dropdown: { borderWidth: 1, borderRadius: 12, overflow: "hidden", marginTop: 8 },
    dropdownItem: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10 },

    actionBtn: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 10, justifyContent: "center" },
    saveBtn: { paddingVertical: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
});
