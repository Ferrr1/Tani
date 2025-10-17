import { currency } from "@/utils/currency";
import { useEffect } from "react";
import { useWatch } from "react-hook-form";
import { Text, View } from "react-native";
import Chip from "./Chip";
import RHFLineInput from "./RHFLineInput";
import SectionButton from "./SectionButton";

type Tipe = "borongan" | "harian";

type ChipOption = {
    value: Tipe;
    label?: string;
};

export default function LaborOne({
    title,
    icon,
    open,
    onPress,
    name,
    control,
    setValue,
    subtotal,
    C,
    S,
    chipOptions = [
        { value: "borongan", label: "Borongan" },
        { value: "harian", label: "Harian" },
    ],
}: {
    title: string;
    icon: any;
    open: boolean;
    onPress: () => void;
    name: string;
    control: any;
    setValue: any;
    subtotal: number;
    C: any;
    S: any;
    /** Kustom chip yang ingin ditampilkan (urutan menentukan default) */
    chipOptions?: ChipOption[];
}) {
    const tipe: Tipe | undefined = useWatch({
        control,
        name: `${name}.tipe`,
    });

    // Pastikan nilai tipe valid terhadap chipOptions; kalau belum ada atau tidak valid -> set ke chip pertama
    useEffect(() => {
        const allowed = new Set(chipOptions.map((c) => c.value));
        if (!tipe || !allowed.has(tipe)) {
            const first = chipOptions[0]?.value;
            if (first) {
                setValue(`${name}.tipe`, first, { shouldDirty: true });
                // reset field saat inisialisasi tipe
                if (first === "borongan") {
                    setValue(`${name}.jumlahOrang`, "", { shouldDirty: true });
                    setValue(`${name}.jumlahHari`, "", { shouldDirty: true });
                    setValue(`${name}.jamKerja`, "", { shouldDirty: true });
                    setValue(`${name}.upahHarian`, "", { shouldDirty: true });
                } else {
                    setValue(`${name}.hargaBorongan`, "", { shouldDirty: true });
                    setValue(`${name}.upahBerlaku`, "", { shouldDirty: true });
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tipe, chipOptions]);

    const selectTipe = (t: Tipe) => {
        setValue(`${name}.tipe`, t, { shouldDirty: true });
        if (t === "borongan") {
            setValue(`${name}.jumlahOrang`, "", { shouldDirty: true });
            setValue(`${name}.jumlahHari`, "", { shouldDirty: true });
            setValue(`${name}.jamKerja`, "", { shouldDirty: true });
            setValue(`${name}.upahHarian`, "", { shouldDirty: true });
        } else {
            setValue(`${name}.hargaBorongan`, "", { shouldDirty: true });
            setValue(`${name}.upahBerlaku`, "", { shouldDirty: true });
        }
    };

    return (
        <>
            <SectionButton title={title} icon={icon} open={open} onPress={onPress} C={C} S={S} />

            {open && (
                <View style={{ marginTop: 8, gap: 10 }}>
                    {/* Chip tipe (kustom) */}
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                        {chipOptions.map(({ value, label }) => (
                            <Chip
                                key={value}
                                label={label ?? value[0].toUpperCase() + value.slice(1)}
                                active={tipe === value}
                                onPress={() => selectTipe(value)}
                                C={C}
                            />
                        ))}
                    </View>

                    {/* === Kondisional: BORONGAN === */}
                    {tipe === "borongan" && (
                        <View style={{ gap: 8 }}>
                            <RHFLineInput
                                label="Biaya Borongan"
                                name={`${name}.hargaBorongan`}
                                control={control}
                                C={C}
                                rules={{
                                    required: "Wajib diisi",
                                    validate: (v: string) =>
                                        parseFloat((v || "0").replace(",", ".")) >= 0 || "Harus ≥ 0",
                                }}
                            />
                            <RHFLineInput
                                label="Upah yang Berlaku"
                                name={`${name}.upahBerlaku`}
                                control={control}
                                C={C}
                                rules={{ required: "Wajib diisi" }}
                            />
                        </View>
                    )}

                    {/* === Kondisional: HARIAN === */}
                    {tipe === "harian" && (
                        <>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                <RHFLineInput
                                    label="Jumlah Orang"
                                    name={`${name}.jumlahOrang`}
                                    control={control}
                                    C={C}
                                    rules={{
                                        required: "Wajib diisi",
                                        validate: (v: string) =>
                                            parseFloat((v || "0").replace(",", ".")) > 0 || "Harus > 0",
                                    }}
                                />
                                <RHFLineInput
                                    label="Jumlah Hari"
                                    name={`${name}.jumlahHari`}
                                    control={control}
                                    C={C}
                                    rules={{
                                        required: "Wajib diisi",
                                        validate: (v: string) =>
                                            parseFloat((v || "0").replace(",", ".")) > 0 || "Harus > 0",
                                    }}
                                />
                            </View>

                            <View style={{ flexDirection: "row", gap: 8 }}>
                                <RHFLineInput
                                    label="Jumlah Jam Kerja"
                                    name={`${name}.jamKerja`}
                                    control={control}
                                    C={C}
                                    rules={{
                                        validate: (v: string) =>
                                            v === "" ||
                                            parseFloat((v || "0").replace(",", ".")) >= 0 ||
                                            "Tidak valid",
                                    }}
                                />
                                <RHFLineInput
                                    label="Upah Harian"
                                    name={`${name}.upahHarian`}
                                    control={control}
                                    C={C}
                                    rules={{
                                        required: "Wajib diisi",
                                        validate: (v: string) =>
                                            parseFloat((v || "0").replace(",", ".")) >= 0 || "Harus ≥ 0",
                                    }}
                                />
                            </View>
                        </>
                    )}

                    <Text style={{ color: C.textMuted, fontSize: 12 }}>
                        Subtotal ≈{" "}
                        <Text style={{ color: C.success, fontWeight: "900" }}>
                            {currency(subtotal || 0)}
                        </Text>
                    </Text>
                </View>
            )}
        </>
    );
}
