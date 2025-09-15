// app/finance/income/form.tsx
import { Colors, Fonts, Tokens } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FormValues = {
    quantity: string;   // Kuantitas
    unit: string;       // Jenis Satuan
    price: string;      // Harga / satuan
    seasonId: string;   // Musim
};

const UNIT_OPTIONS = ["kg", "ton", "karung", "ikat", "liter", "buah"];
const SEASONS = [
    { id: "s1", name: "Musim 1 (2025)" },
    { id: "s2", name: "Musim 2 (2026)" },
];

export default function IncomeForm() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();

    const [saving, setSaving] = useState(false);
    const [openUnit, setOpenUnit] = useState(false);
    const [openSeason, setOpenSeason] = useState(false);

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<FormValues>({
        defaultValues: { quantity: "", unit: "", price: "", seasonId: "" },
        mode: "onChange",
    });

    const quantity = watch("quantity");
    const price = watch("price");

    const total = useMemo(() => {
        const q = parseFloat((quantity || "0").toString().replace(",", "."));
        const p = parseFloat((price || "0").toString().replace(",", "."));
        const sum = (Number.isFinite(q) ? q : 0) * (Number.isFinite(p) ? p : 0);
        if (!Number.isFinite(sum)) return 0;
        return sum;
    }, [quantity, price]);

    const totalText = useMemo(
        () => total.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }),
        [total]
    );

    const onSubmit = async (v: FormValues) => {
        if (!v.unit) return alert("Pilih jenis satuan dulu.");
        if (!v.seasonId) return alert("Pilih musim dulu.");

        const payload = {
            quantity: parseFloat(v.quantity.replace(",", ".")),
            unit: v.unit,
            price: parseFloat(v.price.replace(",", ".")),
            total,
            seasonId: v.seasonId,
        };

        try {
            setSaving(true);
            // TODO: panggil API simpan penerimaan di sini
            console.log("SAVE INCOME", payload);
            router.back();
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            {/* Header gradasi + back + title */}
            <LinearGradient
                colors={[C.gradientFrom, C.gradientTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
            >
                <View style={styles.headerRow}>
                    <Pressable
                        onPress={() => router.replace("/(tabs)/income")}
                        style={({ pressed }) => [
                            styles.iconBtn,
                            { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.9 : 1 },
                        ]}
                    >
                        <Ionicons name="arrow-back" size={18} color={C.text} />
                    </Pressable>

                    <Text style={[styles.headerTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                        Penerimaan
                    </Text>

                    <View style={{ width: 36 }} />
                </View>
            </LinearGradient>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <ScrollView
                    contentContainerStyle={{ padding: S.spacing.lg, paddingBottom: S.spacing.xl }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Kuantitas */}
                    <View
                        style={[
                            styles.inputWrap,
                            { backgroundColor: C.surface, borderColor: errors.quantity ? C.danger : C.border, borderRadius: S.radius.lg },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        <Text style={[styles.label, { color: C.textMuted }]}>Kuantitas</Text>
                        <Controller
                            control={control}
                            name="quantity"
                            rules={{
                                required: "Wajib diisi",
                                validate: (v) => {
                                    const n = parseFloat(v.replace(",", "."));
                                    return (!Number.isNaN(n) && n > 0) || "Harus angka > 0";
                                },
                            }}
                            render={({ field: { value, onChange, onBlur } }) => (
                                <TextInput
                                    placeholder="cth: 1000"
                                    placeholderTextColor={C.icon}
                                    keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    style={[styles.input, { color: C.text }]}
                                />
                            )}
                        />
                    </View>
                    {errors.quantity && (
                        <Text style={[styles.err, { color: C.danger }]}>{errors.quantity.message}</Text>
                    )}

                    {/* Jenis Satuan (dropdown) */}
                    <View
                        style={[
                            styles.inputWrap,
                            { backgroundColor: C.surface, borderColor: errors.unit ? C.danger : C.border, borderRadius: S.radius.lg },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        <Pressable
                            onPress={() => {
                                setOpenUnit((v) => !v);
                                setOpenSeason(false);
                            }}
                            style={styles.rowBetween}
                        >
                            <View>
                                <Text style={[styles.label, { color: C.textMuted }]}>Jenis Satuan</Text>
                                <Controller
                                    control={control}
                                    name="unit"
                                    rules={{ required: "Wajib dipilih" }}
                                    render={({ field: { value } }) => (
                                        <Text style={[styles.valueText, { color: value ? C.text : C.icon }]}>
                                            {value || "Pilih satuan"}
                                        </Text>
                                    )}
                                />
                            </View>
                            <Ionicons name={openUnit ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
                        </Pressable>

                        {openUnit && (
                            <View style={[styles.optionList, { borderTopColor: C.border }]}>
                                {UNIT_OPTIONS.map((u) => (
                                    <Pressable
                                        key={u}
                                        onPress={() => {
                                            setValue("unit", u, { shouldValidate: true });
                                            setOpenUnit(false);
                                        }}
                                        style={({ pressed }) => [
                                            styles.optionItem,
                                            { backgroundColor: pressed ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent" },
                                        ]}
                                    >
                                        <Text style={{ color: C.text }}>{u}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>
                    {errors.unit && <Text style={[styles.err, { color: C.danger }]}>{errors.unit.message}</Text>}

                    {/* Harga / satuan */}
                    <View
                        style={[
                            styles.inputWrap,
                            { backgroundColor: C.surface, borderColor: errors.price ? C.danger : C.border, borderRadius: S.radius.lg },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        <Text style={[styles.label, { color: C.textMuted }]}>Harga/satuan</Text>
                        <Controller
                            control={control}
                            name="price"
                            rules={{
                                required: "Wajib diisi",
                                validate: (v) => {
                                    const n = parseFloat(v.replace(",", "."));
                                    return (!Number.isNaN(n) && n >= 0) || "Harus angka ≥ 0";
                                },
                            }}
                            render={({ field: { value, onChange, onBlur } }) => (
                                <TextInput
                                    placeholder="cth: 4500"
                                    placeholderTextColor={C.icon}
                                    keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    style={[styles.input, { color: C.text }]}
                                />
                            )}
                        />
                    </View>
                    {errors.price && <Text style={[styles.err, { color: C.danger }]}>{errors.price.message}</Text>}

                    {/* Total (otomatis) */}
                    <View
                        style={[
                            styles.inputWrap,
                            { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        <View style={styles.rowBetween}>
                            <Text style={[styles.label, { color: C.textMuted }]}>Total</Text>
                            <Text style={{ color: "#E23D28", fontSize: 11, fontWeight: "700" }}>otomatis terisi</Text>
                        </View>
                        <TextInput
                            editable={false}
                            value={totalText}
                            style={[styles.input, { color: C.text }]}
                        />
                    </View>

                    {/* Pilih Musim (dropdown) */}
                    <View
                        style={[
                            styles.inputWrap,
                            { backgroundColor: C.surface, borderColor: errors.seasonId ? C.danger : C.border, borderRadius: S.radius.lg },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        <Pressable
                            onPress={() => {
                                setOpenSeason((v) => !v);
                                setOpenUnit(false);
                            }}
                            style={styles.rowBetween}
                        >
                            <View>
                                <Text style={[styles.label, { color: C.textMuted }]}>Pilih Musim</Text>
                                <Controller
                                    control={control}
                                    name="seasonId"
                                    rules={{ required: "Wajib dipilih" }}
                                    render={({ field: { value } }) => {
                                        const sel = SEASONS.find((s) => s.id === value)?.name;
                                        return (
                                            <Text style={[styles.valueText, { color: sel ? C.text : C.icon }]}>
                                                {sel || "Pilih musim"}
                                            </Text>
                                        );
                                    }}
                                />
                            </View>
                            <Ionicons name={openSeason ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
                        </Pressable>

                        {openSeason && (
                            <View style={[styles.optionList, { borderTopColor: C.border }]}>
                                {SEASONS.map((s) => (
                                    <Pressable
                                        key={s.id}
                                        onPress={() => {
                                            setValue("seasonId", s.id, { shouldValidate: true });
                                            setOpenSeason(false);
                                        }}
                                        style={({ pressed }) => [
                                            styles.optionItem,
                                            { backgroundColor: pressed ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent" },
                                        ]}
                                    >
                                        <Text style={{ color: C.text }}>{s.name}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>
                    {errors.seasonId && (
                        <Text style={[styles.err, { color: C.danger }]}>{errors.seasonId.message}</Text>
                    )}

                    {/* Tombol Simpan */}
                    <Pressable
                        onPress={handleSubmit(onSubmit)}
                        disabled={saving}
                        style={({ pressed }) => [
                            styles.saveBtn,
                            { backgroundColor: saving ? C.tint + "B3" : C.tint, borderRadius: S.radius.xl, opacity: pressed ? 0.98 : 1 },
                        ]}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={[styles.saveText, { fontFamily: Fonts.rounded as any }]}>Simpan</Text>
                        )}
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerTitle: { fontSize: 18, fontWeight: "800" },
    iconBtn: {
        width: 36, height: 36, borderRadius: 999, borderWidth: 1,
        alignItems: "center", justifyContent: "center",
    },

    inputWrap: { padding: 12, borderWidth: 1, marginBottom: 12 },
    label: { fontSize: 11, fontWeight: "800", marginBottom: 6 },
    input: { fontSize: 15, fontWeight: "600" },
    err: { fontSize: 11, marginTop: -8, marginBottom: 10 },

    rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    valueText: { fontSize: 15, fontWeight: "700" },

    optionList: { borderTopWidth: 1, marginTop: 10 },
    optionItem: { paddingVertical: 10 },

    saveBtn: {
        marginTop: 6, paddingVertical: 12, alignItems: "center", justifyContent: "center",
    },
    saveText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
