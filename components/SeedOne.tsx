import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo } from "react";
import { useWatch } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import { SEED_UNIT, SEEDLING_UNIT } from "@/types/expense";
import { currency } from "@/utils/currency";
import RHFLineInput from "./RHFLineInput";

type Props = {
    // prefix form field, contoh: "seed"
    name: string;
    control: any;
    setValue: any;
    C: any;
    S: any;
};

export default function SeedOne({ name, control, setValue, C, S }: Props) {
    // "seed" | "seedling"
    const kind: "seed" | "seedling" | undefined = useWatch({
        control,
        name: `${name}.kind`,
    });

    const qtyStr = useWatch({ control, name: `${name}.qty` }) ?? "";
    const priceStr = useWatch({ control, name: `${name}.price` }) ?? "";

    // default-kan kind ke "seed" bila kosong
    useEffect(() => {
        if (!kind) {
            setValue(`${name}.kind`, "seed", { shouldDirty: true });
        }
    }, [kind, name, setValue]);

    const unit = (kind === "seedling" ? SEEDLING_UNIT : SEED_UNIT) as string;

    const selectKind = (k: "seed" | "seedling") => {
        setValue(`${name}.kind`, k, { shouldDirty: true, shouldValidate: true });
        // reset supaya validasinya jelas saat berpindah jenis
        setValue(`${name}.name`, "", { shouldDirty: true });
        setValue(`${name}.qty`, "", { shouldDirty: true });
        setValue(`${name}.price`, "", { shouldDirty: true });
    };

    const toNum = (s?: string) => {
        const v = parseFloat((s || "0").replace(",", "."));
        return Number.isFinite(v) ? v : 0;
    };

    const subtotal = useMemo(() => {
        const q = toNum(qtyStr);
        const p = toNum(priceStr);
        return q > 0 && p >= 0 ? q * p : 0;
    }, [qtyStr, priceStr]);

    return (
        <View style={{ marginTop: 8, gap: 10 }}>
            {/* Chip Benih/Bibit */}
            <View style={{ flexDirection: "row", gap: 8 }}>
                {([
                    { k: "seed", label: "Benih", icon: "leaf-outline" },
                    { k: "seedling", label: "Bibit", icon: "flower-outline" },
                ] as const).map(({ k, label, icon }) => {
                    const active = (kind ?? "seed") === k;
                    return (
                        <Pressable
                            key={k}
                            onPress={() => selectKind(k)}
                            style={({ pressed }) => [
                                {
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 6,
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderWidth: 1,
                                    borderColor: active ? C.tint : C.border,
                                    backgroundColor: active ? C.surfaceSoft : C.surface,
                                    borderRadius: 999,
                                    opacity: pressed ? 0.9 : 1,
                                },
                            ]}
                        >
                            <Ionicons name={icon as any} size={16} color={active ? C.tint : C.textMuted} />
                            <Text style={{ color: active ? C.tint : C.textMuted, fontWeight: "800" }}>
                                {label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Unit (info, bukan chip) */}
            <View
                style={{
                    alignSelf: "flex-start",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderWidth: 1,
                    borderColor: C.border,
                    backgroundColor: C.surface,
                    borderRadius: 999,
                }}
            >
                <Text style={{ color: C.textMuted, fontWeight: "800" }}>
                    Satuan: <Text style={{ color: C.text }}>{unit}</Text>
                </Text>
            </View>

            {/* Input wajib */}
            <RHFLineInput
                label={(kind ?? "seed") === "seed" ? "Nama Benih" : "Nama Bibit"}
                name={`${name}.name`}
                control={control}
                C={C}
                rules={{ required: "Wajib diisi" }}
                placeholder={(kind ?? "seed") === "seed" ? "Contoh: Padi Varietas X" : "Contoh: Bibit Cabai"}
            />

            <View style={{ flexDirection: "row", gap: 8 }}>
                <RHFLineInput
                    label="Jumlah"
                    name={`${name}.qty`}
                    control={control}
                    C={C}
                    rules={{
                        required: "Wajib diisi",
                        validate: (v: string) => {
                            const n = toNum(v);
                            return n > 0 || "Harus > 0";
                        },
                    }}
                    placeholder="Masukkan jumlah"
                />
                <RHFLineInput
                    label="Harga Satuan"
                    name={`${name}.price`}
                    control={control}
                    C={C}
                    rules={{
                        required: "Wajib diisi",
                        validate: (v: string) => {
                            const n = toNum(v);
                            return n >= 0 || "Harus ≥ 0";
                        },
                    }}
                    placeholder="Rp ..."
                />
            </View>

            <Text style={{ color: C.textMuted, fontSize: 12 }}>
                Subtotal ≈{" "}
                <Text style={{ color: C.success, fontWeight: "900" }}>
                    {currency(subtotal)}
                </Text>
            </Text>
        </View>
    );
}
