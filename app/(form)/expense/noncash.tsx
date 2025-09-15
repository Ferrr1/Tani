import { Colors, Fonts, Tokens } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
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

type Labor = { id: string; jenis: "borongan" | "harian"; jumlahOrang: string; catatan?: string };
type Tool = { id: string; nama: string; jumlah: string; catatan?: string };

const TOOL_SUGGEST = ["Cangkul", "Arit", "Parang/Golok", "Sprayer"];

export default function ExpenseNonCashForm() {
    const { seasonId } = useLocalSearchParams<{ seasonId?: string }>();
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    const [labors, setLabors] = useState<Labor[]>([]);
    const [tools, setTools] = useState<Tool[]>([]);
    const [laborType, setLaborType] = useState<"borongan" | "harian">("borongan");
    const [toolName, setToolName] = useState<string>("");

    const addLabor = () => {
        setLabors((prev) => [
            ...prev,
            { id: String(Date.now() + Math.random()), jenis: laborType, jumlahOrang: "" },
        ]);
    };
    const addTool = (nama?: string) => {
        setTools((prev) => [
            ...prev,
            { id: String(Date.now() + Math.random()), nama: nama ?? toolName, jumlah: "" },
        ]);
        if (nama === undefined) setToolName("");
    };

    const save = () => {
        console.log("SAVE NON-CASH", { seasonId, labors, tools });
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
                        Pengeluaran | Non Tunai
                    </Text>
                    <View style={{ width: 36 }} />
                </View>
            </LinearGradient>

            <FlatList
                data={[...labors.map((l) => ({ t: "labor" as const, row: l })), ...tools.map((t) => ({ t: "tool" as const, row: t }))]}
                keyExtractor={(x, idx) => (x.t === "labor" ? (x.row as Labor).id : (x.row as Tool).id)}
                contentContainerStyle={{ padding: S.spacing.lg, paddingBottom: 100, gap: S.spacing.md }}
                ListHeaderComponent={
                    <View style={{ gap: S.spacing.md }}>
                        {/* Tenaga kerja */}
                        <View
                            style={[
                                styles.card,
                                { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                                scheme === "light" ? S.shadow.light : S.shadow.dark,
                            ]}
                        >
                            <Text style={[styles.sectionTitle, { color: C.text }]}>Tenaga Kerja</Text>
                            <View style={{ flexDirection: "row", gap: 10 }}>
                                {(["borongan", "harian"] as const).map((opt) => {
                                    const active = laborType === opt;
                                    return (
                                        <Pressable
                                            key={opt}
                                            onPress={() => setLaborType(opt)}
                                            style={({ pressed }) => [
                                                styles.chipBtn,
                                                {
                                                    borderColor: C.border,
                                                    backgroundColor: active ? C.tint + "1A" : C.surface,
                                                    opacity: pressed ? 0.95 : 1,
                                                },
                                            ]}
                                        >
                                            <Ionicons name="people-outline" size={16} color={active ? C.tint : C.icon} />
                                            <Text style={{ color: active ? C.tint : C.text, fontWeight: "800" }}>
                                                {opt[0].toUpperCase() + opt.slice(1)}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>

                            <Pressable
                                onPress={addLabor}
                                style={({ pressed }) => [
                                    styles.addLine,
                                    { borderColor: C.border, backgroundColor: C.surfaceSoft, opacity: pressed ? 0.96 : 1 },
                                ]}
                            >
                                <Ionicons name="add-circle-outline" size={18} color={C.tint} />
                                <Text style={{ color: C.text, fontWeight: "800" }}>Tambah Tenaga Kerja</Text>
                            </Pressable>
                        </View>

                        {/* Alat */}
                        <View
                            style={[
                                styles.card,
                                { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                                scheme === "light" ? S.shadow.light : S.shadow.dark,
                            ]}
                        >
                            <Text style={[styles.sectionTitle, { color: C.text }]}>Alat</Text>

                            {/* quick suggestions */}
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                                {TOOL_SUGGEST.map((nm) => (
                                    <Pressable
                                        key={nm}
                                        onPress={() => addTool(nm)}
                                        style={[styles.smallChip, { borderColor: C.border, backgroundColor: C.surfaceSoft }]}
                                    >
                                        <Text style={{ color: C.text }}>{nm}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            {/* custom add */}
                            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                                <TextInput
                                    placeholder="Nama alat…"
                                    placeholderTextColor={C.icon}
                                    value={toolName}
                                    onChangeText={setToolName}
                                    style={[styles.input, { flex: 1, borderColor: C.border, color: C.text }]}
                                />
                                <Pressable
                                    onPress={() => addTool()}
                                    disabled={!toolName.trim()}
                                    style={[
                                        styles.smallChip,
                                        { backgroundColor: toolName.trim() ? C.tint : C.icon, borderColor: "transparent" },
                                    ]}
                                >
                                    <Text style={{ color: "#fff", fontWeight: "900" }}>Tambah</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                }
                renderItem={({ item }) =>
                    item.t === "labor" ? (
                        <View
                            style={[
                                styles.itemCard,
                                { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                                scheme === "light" ? S.shadow.light : S.shadow.dark,
                            ]}
                        >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                <Text style={{ color: C.text, fontWeight: "900" }}>
                                    Tenaga Kerja • {(item.row as Labor).jenis}
                                </Text>
                                <Pressable
                                    onPress={() => setLabors((prev) => prev.filter((x) => x.id !== (item.row as Labor).id))}
                                >
                                    <Ionicons name="trash-outline" size={18} color={C.danger} />
                                </Pressable>
                            </View>

                            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                                <TextInput
                                    placeholder="Jumlah orang"
                                    placeholderTextColor={C.icon}
                                    keyboardType="numeric"
                                    value={(item.row as Labor).jumlahOrang}
                                    onChangeText={(t) =>
                                        setLabors((prev) => prev.map((x) => (x.id === (item.row as Labor).id ? { ...x, jumlahOrang: t } : x)))
                                    }
                                    style={[styles.input, { borderColor: C.border, color: C.text }]}
                                />
                                <TextInput
                                    placeholder="Catatan (opsional)"
                                    placeholderTextColor={C.icon}
                                    value={(item.row as Labor).catatan ?? ""}
                                    onChangeText={(t) =>
                                        setLabors((prev) => prev.map((x) => (x.id === (item.row as Labor).id ? { ...x, catatan: t } : x)))
                                    }
                                    style={[styles.input, { borderColor: C.border, color: C.text }]}
                                />
                            </View>
                        </View>
                    ) : (
                        <View
                            style={[
                                styles.itemCard,
                                { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                                scheme === "light" ? S.shadow.light : S.shadow.dark,
                            ]}
                        >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                <Text style={{ color: C.text, fontWeight: "900" }}>
                                    Alat • {(item.row as Tool).nama}
                                </Text>
                                <Pressable
                                    onPress={() => setTools((prev) => prev.filter((x) => x.id !== (item.row as Tool).id))}
                                >
                                    <Ionicons name="trash-outline" size={18} color={C.danger} />
                                </Pressable>
                            </View>

                            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                                <TextInput
                                    placeholder="Jumlah"
                                    placeholderTextColor={C.icon}
                                    keyboardType="numeric"
                                    value={(item.row as Tool).jumlah}
                                    onChangeText={(t) =>
                                        setTools((prev) => prev.map((x) => (x.id === (item.row as Tool).id ? { ...x, jumlah: t } : x)))
                                    }
                                    style={[styles.input, { borderColor: C.border, color: C.text }]}
                                />
                                <TextInput
                                    placeholder="Catatan (opsional)"
                                    placeholderTextColor={C.icon}
                                    value={(item.row as Tool).catatan ?? ""}
                                    onChangeText={(t) =>
                                        setTools((prev) => prev.map((x) => (x.id === (item.row as Tool).id ? { ...x, catatan: t } : x)))
                                    }
                                    style={[styles.input, { borderColor: C.border, color: C.text }]}
                                />
                            </View>
                        </View>
                    )
                }
                ListFooterComponent={
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
    sectionTitle: { fontSize: 14, fontWeight: "800" },
    chipBtn: { flexDirection: "row", gap: 8, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
    smallChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
    addLine: { flexDirection: "row", gap: 8, alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 10 },

    input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    itemCard: { padding: 12, borderWidth: 1 },
    saveBtn: { marginTop: 12, paddingVertical: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
});
