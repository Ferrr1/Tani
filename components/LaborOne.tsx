import { currency } from "@/utils/currency";
import { useWatch } from "react-hook-form";
import { Text, View } from "react-native";
import Chip from "./Chip";
import RHFLineInput from "./RHFLineInput";
import SectionButton from "./SectionButton";

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
}) {
    // Pantau tipe untuk conditional render
    const tipe: "borongan" | "harian" | undefined = useWatch({
        control,
        name: `${name}.tipe`,
    });

    const selectTipe = (t: "borongan" | "harian") => {
        setValue(`${name}.tipe`, t, { shouldDirty: true });
        if (t === "borongan") {
            // kosongkan field harian agar validasi gak ke-trigger
            setValue(`${name}.jumlahOrang`, "", { shouldDirty: true });
            setValue(`${name}.jumlahHari`, "", { shouldDirty: true });
            setValue(`${name}.jamKerja`, "", { shouldDirty: true });
            setValue(`${name}.upahHarian`, "", { shouldDirty: true });
        } else {
            // kosongkan field borongan
            setValue(`${name}.hargaBorongan`, "", { shouldDirty: true });
            setValue(`${name}.upahBerlaku`, "", { shouldDirty: true });
        }
    };

    return (
        <>
            <SectionButton title={title} icon={icon} open={open} onPress={onPress} C={C} S={S} />

            {open && (
                <View style={{ marginTop: 8, gap: 10 }}>
                    {/* Pilih tipe */}
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        {(["borongan", "harian"] as const).map((t) => (
                            <Chip
                                key={t}
                                label={t[0].toUpperCase() + t.slice(1)}
                                active={tipe === t}
                                onPress={() => selectTipe(t)}
                                C={C}
                            />
                        ))}
                    </View>

                    {/* === Kondisional: BORONGAN === */}
                    {tipe === "borongan" && (
                        <View style={{ gap: 8 }}>
                            <RHFLineInput
                                label="Harga Upah Borongan"
                                name={`${name}.hargaBorongan`}
                                control={control}
                                C={C}
                                rules={{
                                    required: "Wajib diisi",
                                    validate: (v: string) => parseFloat((v || "0").replace(",", ".")) >= 0 || "Harus ≥ 0",
                                }}
                            />
                            <RHFLineInput
                                label="Upah yang Berlaku"
                                name={`${name}.upahBerlaku`}
                                control={control}
                                C={C}
                                // Jika ingin opsional, hapus required
                                rules={{ required: "Wajib diisi" }}
                            />
                        </View>
                    )}

                    {/* === Kondisional: HARIAN (default) === */}
                    {(tipe === "harian" || !tipe) && (
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
                        <Text style={{ color: C.success, fontWeight: "900" }}>{currency(subtotal || 0)}</Text>
                    </Text>
                </View>
            )}
        </>
    );
}
