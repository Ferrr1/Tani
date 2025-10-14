// ExtrasPanel.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { Dispatch, SetStateAction, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

export type ExtraRow = {
    id: string;
    label: string;     // nama bebas (dinamis)
    amount: string;    // string biar gampang input; konversi di payload
};

export default function ExtrasPanel({
    schemeColors,
    rows,
    setRows,
}: {
    schemeColors: { C: any; S: any };
    rows: ExtraRow[];
    setRows: Dispatch<SetStateAction<ExtraRow[]>>;
}) {
    const { C } = schemeColors;

    const [adding, setAdding] = useState(false);
    const [label, setLabel] = useState("");
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");

    const resetForm = () => {
        setLabel("");
        setAmount("");
        setNote("");
    };

    const add = () => {
        const amt = parseFloat((amount || "0").replace(",", "."));

        if (!label.trim()) {
            Alert.alert("Validasi", "Nama/label biaya wajib diisi.");
            return;
        }
        if (!(Number.isFinite(amt) && amt >= 0)) {
            Alert.alert("Validasi", "Nominal harus ≥ 0.");
            return;
        }

        setRows((prev) => [
            ...prev,
            {
                id: String(Date.now() + Math.random()),
                label: label.trim(),
                amount,
                note: note?.trim() ? note.trim() : null,
            },
        ]);

        resetForm();
        setAdding(false);
    };

    return (
        <View style={{ marginTop: 8, gap: 8 }}>
            {/* Toggle add form */}
            {!adding ? (
                <Pressable
                    onPress={() => setAdding(true)}
                    style={({ pressed }) => [
                        {
                            backgroundColor: C.tint + "33",
                            borderWidth: 1,
                            borderColor: C.tint,
                            paddingVertical: 10,
                            marginVertical: 8,
                            borderRadius: 999,
                            alignItems: "center",
                            opacity: pressed ? 0.96 : 1,
                        },
                    ]}
                >
                    <Text style={{ color: C.tint, fontWeight: "900" }}>Tambah Biaya</Text>
                </Pressable>
            ) : (
                <View
                    style={{
                        borderRadius: 12,
                        gap: 8,
                        marginVertical: 8,
                    }}
                >
                    <TextInput
                        placeholder="Nama biaya"
                        placeholderTextColor={C.icon}
                        value={label}
                        onChangeText={setLabel}
                        style={{
                            borderWidth: 1,
                            borderColor: C.border,
                            color: C.text,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                        }}
                    />
                    <TextInput
                        placeholder="Nominal Rupiah"
                        placeholderTextColor={C.icon}
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                        style={{
                            borderWidth: 1,
                            borderColor: C.border,
                            color: C.text,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                        }}
                    />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        <Pressable
                            onPress={add}
                            style={({ pressed }) => [
                                {
                                    flex: 1,
                                    backgroundColor: C.tint,
                                    paddingVertical: 10,
                                    borderRadius: 999,
                                    alignItems: "center",
                                    opacity: pressed ? 0.96 : 1,
                                },
                            ]}
                        >
                            <Text style={{ color: "#fff", fontWeight: "900" }}>Simpan</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => {
                                resetForm();
                                setAdding(false);
                            }}
                            style={({ pressed }) => [
                                {
                                    flex: 1,
                                    backgroundColor: C.surface,
                                    borderWidth: 1,
                                    borderColor: C.border,
                                    paddingVertical: 10,
                                    borderRadius: 999,
                                    alignItems: "center",
                                    opacity: pressed ? 0.96 : 1,
                                },
                            ]}
                        >
                            <Text style={{ color: C.text, fontWeight: "900" }}>Batal</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            {/* List rows */}
            {rows.map((r) => (
                <View
                    key={r.id}
                    style={{
                        borderWidth: 1,
                        borderColor: C.border,
                        borderRadius: 12,
                        padding: 10,
                        marginVertical: 4,
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <Text style={{ color: C.text, fontWeight: "800" }}>
                            {r.label}
                        </Text>
                        <Pressable
                            onPress={() =>
                                setRows((prev) => prev.filter((x) => x.id !== r.id))
                            }
                        >
                            <Ionicons name="trash-outline" size={18} color={C.danger} />
                        </Pressable>
                    </View>
                    <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                        Nominal: {r.amount}
                    </Text>
                </View>
            ))}
        </View>
    );
}
