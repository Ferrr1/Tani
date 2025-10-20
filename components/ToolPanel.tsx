import { ToolForm } from "@/types/expense";
import { currency } from "@/utils/currency";
import { formatInputThousands, parseThousandsToNumber } from "@/utils/number";
import { Ionicons } from "@expo/vector-icons";
import React, { Dispatch, SetStateAction, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

export default function ToolPanel({
    C,
    tools,
    setTools,
}: {
    C: any;
    tools: ToolForm[];
    setTools: Dispatch<SetStateAction<ToolForm[]>>;
}) {
    const [nama, setNama] = useState("");
    const [jumlah, setJumlah] = useState("");
    const [hargaBeli, setHargaBeli] = useState("");
    const [umurThn, setUmurThn] = useState("");
    const [nilaiSisa, setNilaiSisa] = useState("");

    const add = () => {
        const q = parseThousandsToNumber(jumlah);
        const p = parseThousandsToNumber(hargaBeli);
        const life = umurThn.trim() ? parseThousandsToNumber(umurThn) : undefined;
        const residual = nilaiSisa.trim() ? parseThousandsToNumber(nilaiSisa) : undefined;

        if (!nama.trim()) {
            Alert.alert("Validasi", "Nama alat wajib diisi.");
            return;
        }
        if (!(Number.isFinite(q) && q > 0)) {
            Alert.alert("Validasi", "Jumlah harus > 0.");
            return;
        }
        if (!(Number.isFinite(p) && p >= 0)) {
            Alert.alert("Validasi", "Harga beli harus ≥ 0.");
            return;
        }
        if (life !== undefined && !(Number.isFinite(life) && life > 0)) {
            Alert.alert("Validasi", "Umur ekonomis (tahun) harus > 0.");
            return;
        }
        if (residual !== undefined && !(Number.isFinite(residual) && residual >= 0)) {
            Alert.alert("Validasi", "Nilai sisa harus ≥ 0.");
            return;
        }
        if (residual !== undefined && residual > p) {
            Alert.alert("Validasi", "Nilai sisa tidak boleh melebihi harga beli.");
            return;
        }

        setTools((prev) => [
            ...prev,
            {
                id: String(Date.now() + Math.random()),
                nama: nama.trim(),
                // simpan string bertitik agar konsisten dengan UI
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
                <TextInput
                    placeholder="Jumlah"
                    placeholderTextColor={C.icon}
                    keyboardType="numeric"
                    value={jumlah}
                    onChangeText={(t) => setJumlah(formatInputThousands(t))} // ← live format ribuan
                    style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: C.border,
                        color: C.text,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                    }}
                />
                <TextInput
                    placeholder="Harga beli"
                    placeholderTextColor={C.icon}
                    keyboardType="numeric"
                    value={hargaBeli}
                    onChangeText={(t) => setHargaBeli(formatInputThousands(t))} // ← live format ribuan
                    style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: C.border,
                        color: C.text,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                    }}
                />
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                    placeholder="Umur ekonomis (tahun)"
                    placeholderTextColor={C.icon}
                    keyboardType="numeric"
                    value={umurThn}
                    onChangeText={(t) => setUmurThn(formatInputThousands(t))} // boleh ribuan juga
                    style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: C.border,
                        color: C.text,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                    }}
                />
                <TextInput
                    placeholder="Nilai sisa"
                    placeholderTextColor={C.icon}
                    keyboardType="numeric"
                    value={nilaiSisa}
                    onChangeText={(t) => setNilaiSisa(formatInputThousands(t))} // ← live format ribuan
                    style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: C.border,
                        color: C.text,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                    }}
                />
            </View>

            <Pressable
                onPress={add}
                style={({ pressed }) => [
                    {
                        backgroundColor: C.tint + "33",
                        borderWidth: 1,
                        borderColor: C.tint,
                        paddingVertical: 10,
                        borderRadius: 999,
                        alignItems: "center",
                        opacity: pressed ? 0.96 : 1,
                    },
                ]}
            >
                <Text style={{ color: C.tint, fontWeight: "900" }}>Tambah</Text>
            </Pressable>

            {(tools || []).map((r) => {
                const q = parseThousandsToNumber(String(r.jumlah ?? ""));
                const p = parseThousandsToNumber(String(r.hargaBeli ?? ""));
                const life = r.umurThn?.trim() ? parseThousandsToNumber(String(r.umurThn)) : undefined;
                const residual = r.nilaiSisa?.trim() ? parseThousandsToNumber(String(r.nilaiSisa)) : undefined;

                return (
                    <View
                        key={r.id}
                        style={{
                            borderWidth: 1,
                            borderColor: C.border,
                            borderRadius: 12,
                            padding: 10,
                            marginTop: 8,
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
                                {r.nama?.trim() || "(tanpa nama)"}
                            </Text>
                            <Pressable onPress={() => setTools((prev) => prev.filter((x) => x.id !== r.id))}>
                                <Ionicons name="trash-outline" size={18} color={C.danger} />
                            </Pressable>
                        </View>

                        <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                            {Number.isFinite(q) && q > 0 ? q : "-"} unit | {currency(Number.isFinite(p) ? p : 0)}
                            {life ? ` | umur ${life} th` : ""}
                            {Number.isFinite(residual ?? NaN) ? ` | nilai sisa ${currency(residual!)}` : ""}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}
