import { ChemItem, FERTILIZER_CHOICES, Unit } from "@/types/expense";
import { currency } from "@/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Chip from "./Chip";

export default function FertilizerPanel({
    schemeColors,
    onAdd,
    rows,
    setRows,
}: {
    schemeColors: { C: any; S: any };
    onAdd: (p: { name?: string; unit: Unit; qty: string; price: string }) => void;
    rows: ChemItem[];
    setRows: React.Dispatch<React.SetStateAction<ChemItem[]>>;
}) {
    const { C } = schemeColors;
    const [name, setName] = useState("");
    const [qty, setQty] = useState("");
    const [price, setPrice] = useState("");

    const add = () => {
        onAdd({ name: name.trim() || undefined, unit: "kilogram", qty, price });
        setName("");
        setQty("");
        setPrice("");
    };

    return (
        <View style={{ marginTop: 8, gap: 8 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {FERTILIZER_CHOICES.map((nm) => {
                    const active = name === nm;
                    return <Chip key={nm} label={nm} active={active} onPress={() => setName(nm)} C={C} />;
                })}
            </View>
            <TextInput
                placeholder="Nama pupuk (custom opsional)"
                placeholderTextColor={C.icon}
                value={name}
                onChangeText={setName}
                style={{ borderWidth: 1, borderColor: C.border, color: C.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                    placeholder="Jumlah (kg)"
                    placeholderTextColor={C.icon}
                    keyboardType="numeric"
                    value={qty}
                    onChangeText={setQty}
                    style={{ flex: 1, borderWidth: 1, borderColor: C.border, color: C.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
                />
                <TextInput
                    placeholder="Harga/kg"
                    placeholderTextColor={C.icon}
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                    style={{ flex: 1, borderWidth: 1, borderColor: C.border, color: C.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
                />
            </View>

            <Pressable
                onPress={add}
                style={({ pressed }) => [{ backgroundColor: C.tint + "33", borderWidth: 1, borderColor: C.tint, paddingVertical: 10, borderRadius: 999, alignItems: "center", opacity: pressed ? 0.96 : 1 }]}
            >
                <Text style={{ color: C.tint, fontWeight: "900" }}>Tambah Pupuk</Text>
            </Pressable>

            {rows.map((r) => (
                <View key={r.id} style={{ borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, marginTop: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: C.text, fontWeight: "800" }}>{r.name || "(tanpa nama)"}</Text>
                        <Pressable onPress={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}>
                            <Ionicons name="trash-outline" size={18} color={C.danger} />
                        </Pressable>
                    </View>
                    <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                        kilogram • {r.qty} × {currency(parseFloat(r.price || "0") || 0)}
                    </Text>
                </View>
            ))}
        </View>
    );
}
