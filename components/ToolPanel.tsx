import { ToolForm } from "@/types/expense";
import { currency } from "@/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export default function ToolPanel({
    C,
    tools,
    setTools,
}: {
    C: any;
    tools: ToolForm[];
    setTools: React.Dispatch<React.SetStateAction<ToolForm[]>>;
}) {
    const [nama, setNama] = useState("");
    const [jumlah, setJumlah] = useState("");
    const [hargaBeli, setHargaBeli] = useState("");
    const [umurThn, setUmurThn] = useState("");
    const [nilaiSisa, setNilaiSisa] = useState("");

    const add = () => {
        setTools((prev) => [
            ...prev,
            {
                id: String(Date.now() + Math.random()),
                nama: nama.trim(),
                jumlah,
                hargaBeli,
                umurThn,
                nilaiSisa,
            },
        ]);
        setNama("");
        setJumlah("");
        setHargaBeli("");
        setUmurThn("");
        setNilaiSisa("");
    };

    return (
        <View style={{ marginTop: 8, gap: 8 }}>
            <TextInput
                placeholder="Nama alat"
                placeholderTextColor={C.icon}
                value={nama}
                onChangeText={setNama}
                style={{ borderWidth: 1, borderColor: C.border, color: C.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                    placeholder="Jumlah"
                    placeholderTextColor={C.icon}
                    keyboardType="numeric"
                    value={jumlah}
                    onChangeText={setJumlah}
                    style={{ flex: 1, borderWidth: 1, borderColor: C.border, color: C.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
                />
                <TextInput
                    placeholder="Harga beli"
                    placeholderTextColor={C.icon}
                    keyboardType="numeric"
                    value={hargaBeli}
                    onChangeText={setHargaBeli}
                    style={{ flex: 1, borderWidth: 1, borderColor: C.border, color: C.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
                />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                    placeholder="Umur ekonomis (tahun) — opsional"
                    placeholderTextColor={C.icon}
                    keyboardType="numeric"
                    value={umurThn}
                    onChangeText={setUmurThn}
                    style={{ flex: 1, borderWidth: 1, borderColor: C.border, color: C.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
                />
                <TextInput
                    placeholder="Nilai sisa — opsional"
                    placeholderTextColor={C.icon}
                    keyboardType="numeric"
                    value={nilaiSisa}
                    onChangeText={setNilaiSisa}
                    style={{ flex: 1, borderWidth: 1, borderColor: C.border, color: C.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
                />
            </View>
            <Pressable
                onPress={add}
                style={({ pressed }) => [
                    { backgroundColor: C.tint + "33", borderWidth: 1, borderColor: C.tint, paddingVertical: 10, borderRadius: 999, alignItems: "center", opacity: pressed ? 0.96 : 1 },
                ]}
            >
                <Text style={{ color: C.tint, fontWeight: "900" }}>Tambah Alat</Text>
            </Pressable>

            {(tools || []).map((r) => (
                <View key={r.id} style={{ borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, marginTop: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: C.text, fontWeight: "800" }}>{r.nama || "(tanpa nama)"}</Text>
                        <Pressable onPress={() => setTools((prev) => prev.filter((x) => x.id !== r.id))}>
                            <Ionicons name="trash-outline" size={18} color={C.danger} />
                        </Pressable>
                    </View>
                    <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                        {r.jumlah} unit • {currency(parseFloat(r.hargaBeli || "0") || 0)}
                        {r.umurThn ? ` • umur ${r.umurThn} th` : ""}
                        {r.nilaiSisa ? ` • nilai sisa ${currency(parseFloat(r.nilaiSisa || "0") || 0)}` : ""}
                    </Text>
                </View>
            ))}
        </View>
    );
}