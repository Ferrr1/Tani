import { ChemItem, Unit } from "@/types/expense";
import { currency } from "@/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { Dispatch, SetStateAction, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Chip from "./Chip";

export default function ChemPanel({
    schemeColors,
    unitChoices,
    placeholderName,
    onAdd,
    rows,
    setRows,
}: {
    schemeColors: { C: any; S: any };
    unitChoices: Unit[];
    placeholderName: string;
    onAdd: (p: { name?: string; unit: Unit; qty: string; price: string }) => void;
    rows: ChemItem[];
    setRows: Dispatch<SetStateAction<ChemItem[]>>;
}) {
    const { C } = schemeColors;
    const [name, setName] = useState("");
    const [unit, setUnit] = useState<Unit>(unitChoices[0]);
    const [qty, setQty] = useState("");
    const [price, setPrice] = useState("");

    const add = () => {
        onAdd({ name: name.trim() || undefined, unit, qty, price });
        setName("");
        setQty("");
        setPrice("");
        setUnit(unitChoices[0]);
    };

    return (
        <View style={{ marginTop: 8, gap: 8 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {unitChoices.map((u) => {
                    const active = unit === u;
                    return <Chip key={u} label={u} active={active} onPress={() => setUnit(u)} C={C} />;
                })}
            </View>

            <TextInput
                placeholder={placeholderName}
                placeholderTextColor={C.icon}
                value={name}
                onChangeText={setName}
                style={{ borderWidth: 1, borderColor: C.border, color: C.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                    placeholder="Jumlah"
                    placeholderTextColor={C.icon}
                    keyboardType="numeric"
                    value={qty}
                    onChangeText={setQty}
                    style={{ flex: 1, borderWidth: 1, borderColor: C.border, color: C.text, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }}
                />
                <TextInput
                    placeholder="Harga/satuan"
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
                <Text style={{ color: C.tint, fontWeight: "900" }}>Tambah</Text>
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
                        {r.unit} | {r.qty} × {currency(parseFloat(r.price || "0") || 0)}
                    </Text>
                </View>
            ))}
        </View>
    );
}