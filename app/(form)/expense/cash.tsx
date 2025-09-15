import { Colors, Fonts, Tokens } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ItemRow = {
    id: string;
    kategori: string;        // Pupuk / Insektisida / …
    satuan: string;          // gram / kilogram / liter
    jumlah: string;          // string untuk input
    harga: string;           // harga per satuan
};

const SATUAN_KIMIA = ["gram", "kilogram", "liter"];
const SATUAN_PUPUK = ["kilogram"];
const KATEGORI = [
    "Pupuk",
    "Insektisida",
    "Herbisida",
    "Fungisida",
    "Pesemaian",
    "Pengolahan Lahan",
    "Penanaman",
    "Pemupukan",
    "Penyiraman",
    "Penyemprotan",
    "Pengendalian Hama & Penyakit",
    "Panen",
    "Pasca Panen",
];

export default function ExpenseCashForm() {
    const { seasonId } = useLocalSearchParams<{ seasonId?: string }>();
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    // contoh default entri bibit
    const [bibitType, setBibitType] = useState<"Benih (gr)" | "Bibit (ikat)" | null>(null);
    const [items, setItems] = useState<ItemRow[]>([]);

    const addItem = (kategori: string) => {
        const defaultSatuan =
            kategori === "Pupuk" ? SATUAN_PUPUK[0] : SATUAN_KIMIA[0];
        setItems((prev) => [
            ...prev,
            {
                id: String(Date.now() + Math.random()),
                kategori,
                satuan: defaultSatuan,
                jumlah: "",
                harga: "",
            },
        ]);
    };

    const total = useMemo(() => {
        return items.reduce((acc, it) => {
            const j = parseFloat((it.jumlah || "0").replace(",", "."));
            const h = parseFloat((it.harga || "0").replace(",", "."));
            if (!isFinite(j) || !isFinite(h)) return acc;
            return acc + j * h;
        }, 0);
    }, [items]);

    const save = () => {
        // TODO: kirim ke backend
        console.log("SAVE CASH", { seasonId, bibitType, items, total });
        router.back();
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
                    <Pressable
                        onPress={() => router.replace("/(tabs)/expense")}
                        style={({ pressed }) => [
                            styles.iconBtn,
                            { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.9 : 1 },
                        ]}
                    >
                        <Ionicons name="arrow-back" size={18} color={C.text} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                        Pengeluaran | Tunai
                    </Text>
                    <View style={{ width: 36 }} />
                </View>
            </LinearGradient>

            <FlatList
                data={items}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ padding: S.spacing.lg, paddingBottom: 100 }}
                ListHeaderComponent={
                    <View style={{ gap: S.spacing.md }}>
                        {/* Bibit */}
                        <View
                            style={[
                                styles.card,
                                { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                                scheme === "light" ? S.shadow.light : S.shadow.dark,
                            ]}
                        >
                            <Text style={[styles.sectionTitle, { color: C.text }]}>Bibit</Text>
                            <View style={{ flexDirection: "row", gap: 10 }}>
                                {(["Benih (gr)", "Bibit (ikat)"] as const).map((opt) => {
                                    const active = bibitType === opt;
                                    return (
                                        <Pressable
                                            key={opt}
                                            onPress={() => setBibitType(opt)}
                                            style={({ pressed }) => [
                                                styles.chipBtn,
                                                {
                                                    borderColor: C.border,
                                                    backgroundColor: active ? C.tint + "1A" : C.surface,
                                                    opacity: pressed ? 0.95 : 1,
                                                },
                                            ]}
                                        >
                                            <Ionicons name="pricetag-outline" size={16} color={active ? C.tint : C.icon} />
                                            <Text style={{ color: active ? C.tint : C.text, fontWeight: "800" }}>{opt}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Tombol tambah kategori sesuai daftar */}
                        <View
                            style={[
                                styles.card,
                                { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                                scheme === "light" ? S.shadow.light : S.shadow.dark,
                            ]}
                        >
                            <Text style={[styles.sectionTitle, { color: C.text }]}>Tambah Item</Text>

                            {KATEGORI.map((k) => (
                                <Pressable
                                    key={k}
                                    onPress={() => addItem(k)}
                                    style={({ pressed }) => [
                                        styles.addLine,
                                        { borderColor: C.border, backgroundColor: C.surfaceSoft, opacity: pressed ? 0.96 : 1 },
                                    ]}
                                >
                                    <Ionicons name="add-circle-outline" size={18} color={C.tint} />
                                    <Text style={{ color: C.text, fontWeight: "800" }}>{`Tambah ${k}`}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                }
                renderItem={({ item, index }) => (
                    <View
                        style={[
                            styles.itemCard,
                            { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <Text style={{ color: C.text, fontWeight: "900" }}>{item.kategori}</Text>
                            <Pressable
                                onPress={() => setItems((prev) => prev.filter((p) => p.id !== item.id))}
                                hitSlop={8}
                            >
                                <Ionicons name="trash-outline" size={18} color={C.danger} />
                            </Pressable>
                        </View>

                        {/* form kecil per item */}
                        <View style={{ marginTop: 10, gap: 10 }}>
                            {/* Satuan */}
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                {(["gram", "kilogram", "liter"] as const).map((s) => {
                                    const active = item.satuan === s;
                                    return (
                                        <Pressable
                                            key={s}
                                            onPress={() =>
                                                setItems((prev) =>
                                                    prev.map((p) => (p.id === item.id ? { ...p, satuan: s } : p))
                                                )
                                            }
                                            style={[
                                                styles.smallChip,
                                                { borderColor: C.border, backgroundColor: active ? C.tint + "1A" : C.surface },
                                            ]}
                                        >
                                            <Text style={{ color: active ? C.tint : C.text }}>{s}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {/* jumlah & harga */}
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                <TextInput
                                    placeholder="Jumlah"
                                    placeholderTextColor={C.icon}
                                    keyboardType="numeric"
                                    value={item.jumlah}
                                    onChangeText={(t) =>
                                        setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, jumlah: t } : p)))
                                    }
                                    style={[styles.input, { borderColor: C.border, color: C.text }]}
                                />
                                <TextInput
                                    placeholder="Harga/satuan"
                                    placeholderTextColor={C.icon}
                                    keyboardType="numeric"
                                    value={item.harga}
                                    onChangeText={(t) =>
                                        setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, harga: t } : p)))
                                    }
                                    style={[styles.input, { borderColor: C.border, color: C.text }]}
                                />
                            </View>

                            {/* total kecil */}
                            <Text style={{ color: C.textMuted, fontSize: 12 }}>
                                Total item ≈{" "}
                                <Text style={{ color: C.success, fontWeight: "900" }}>
                                    {(() => {
                                        const j = parseFloat((item.jumlah || "0").replace(",", "."));
                                        const h = parseFloat((item.harga || "0").replace(",", "."));
                                        const v = !isFinite(j) || !isFinite(h) ? 0 : j * h;
                                        return v.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
                                    })()}
                                </Text>
                            </Text>
                        </View>
                    </View>
                )}
                ListFooterComponent={
                    <View style={{ marginTop: S.spacing.lg, gap: 12 }}>
                        <Text style={{ textAlign: "right", color: C.text }}>
                            Total semua:{" "}
                            <Text style={{ color: C.success, fontWeight: "900" }}>
                                {total.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}
                            </Text>
                        </Text>

                        <Pressable
                            onPress={save}
                            style={({ pressed }) => [
                                styles.saveBtn,
                                { backgroundColor: C.tint, opacity: pressed ? 0.98 : 1, borderRadius: S.radius.xl },
                            ]}
                        >
                            <Ionicons name="save-outline" size={18} color="#fff" />
                            <Text style={{ color: "#fff", fontWeight: "900" }}>Simpan</Text>
                        </Pressable>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    iconBtn: { width: 36, height: 36, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center" },

    card: { padding: 12, borderWidth: 1, gap: 10 },
    sectionTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },

    chipBtn: { flexDirection: "row", gap: 8, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
    addLine: { flexDirection: "row", gap: 8, alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },

    itemCard: { marginTop: 12, padding: 12, borderWidth: 1 },
    smallChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },

    input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    saveBtn: { paddingVertical: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
});
