import { currency } from "@/utils/currency";
import { Controller } from "react-hook-form";
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
    return (
        <>
            <SectionButton title={title} icon={icon} open={open} onPress={onPress} C={C} S={S} />
            {open && (
                <View style={{ marginTop: 8, gap: 10 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                        {(["borongan", "harian"] as const).map((t) => (
                            <Controller
                                key={t}
                                control={control}
                                name={`${name}.tipe`}
                                render={({ field: { value } }) => (
                                    <Chip
                                        label={t[0].toUpperCase() + t.slice(1)}
                                        active={value === t}
                                        onPress={() => setValue(`${name}.tipe`, t, { shouldDirty: true })}
                                        C={C}
                                    />
                                )}
                            />
                        ))}
                    </View>

                    <View style={{ flexDirection: "row", gap: 8 }}>
                        <RHFLineInput
                            label="Jumlah Orang"
                            name={`${name}.jumlahOrang`}
                            control={control}
                            C={C}
                            rules={{
                                required: "Wajib diisi",
                                validate: (v: string) => parseFloat((v || "0").replace(",", ".")) > 0 || "Harus > 0",
                            }}
                        />
                        <RHFLineInput
                            label="Jumlah Hari"
                            name={`${name}.jumlahHari`}
                            control={control}
                            C={C}
                            rules={{
                                required: "Wajib diisi",
                                validate: (v: string) => parseFloat((v || "0").replace(",", ".")) > 0 || "Harus > 0",
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
                                    v === "" || parseFloat((v || "0").replace(",", ".")) >= 0 || "Tidak valid",
                            }}
                        />
                        <RHFLineInput
                            label="Upah Harian"
                            name={`${name}.upahHarian`}
                            control={control}
                            C={C}
                            rules={{
                                required: "Wajib diisi",
                                validate: (v: string) => parseFloat((v || "0").replace(",", ".")) >= 0 || "Harus ≥ 0",
                            }}
                        />
                    </View>

                    <Text style={{ color: C.textMuted, fontSize: 12 }}>
                        Subtotal ≈ <Text style={{ color: C.success, fontWeight: "900" }}>{currency(subtotal || 0)}</Text>
                    </Text>
                </View>
            )}
        </>
    );
}