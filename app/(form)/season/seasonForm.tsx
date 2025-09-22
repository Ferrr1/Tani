import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useSeasonService } from "@/services/seasonService";
import { SeasonFormValues } from "@/types/season";
import { fmtDMY, fromISOtoDMY, parseDMY, toISO } from "@/utils/date";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useColorScheme,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SeasonForm() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const S = Tokens;
    const router = useRouter();
    const { seasonId } = useLocalSearchParams<{ seasonId?: string }>();
    const isEdit = !!seasonId;
    const { getSeasonById, createSeason, updateSeason } = useSeasonService();
    const [initialLoading, setInitialLoading] = useState<boolean>(isEdit);
    const [saving, setSaving] = useState(false);

    const [openStart, setOpenStart] = useState(false);
    const [openEnd, setOpenEnd] = useState(false);

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm<SeasonFormValues>({
        defaultValues: { seasonNo: "", startDate: "", endDate: "" },
        mode: "onChange",
    });

    const start = watch("startDate");
    const end = watch("endDate");
    const dStart = parseDMY(start);
    const dEnd = parseDMY(end);

    const hasFetchedRef = useRef(false);

    useEffect(() => {
        let alive = true;
        const hydrateEditOnce = async () => {
            if (!isEdit || !seasonId) {
                setInitialLoading(false);
                return;
            }
            if (hasFetchedRef.current) return;

            hasFetchedRef.current = true;
            try {
                setInitialLoading(true);
                const row = await getSeasonById(seasonId);
                if (!alive) return;
                if (!row) {
                    Alert.alert("Tidak ditemukan", "Data musim tidak ditemukan.");
                    router.replace("/(form)/sub/season");
                    return;
                }
                reset({
                    seasonNo: String(row.season_no),
                    startDate: fromISOtoDMY(row.start_date),
                    endDate: fromISOtoDMY(row.end_date),
                });
            } catch (e: any) {
                if (!alive) return;
                Alert.alert("Gagal", e?.message ?? "Tidak dapat memuat data musim.");
                router.replace("/(form)/sub/season");
            } finally {
                if (alive) setInitialLoading(false);
            }
        };

        hydrateEditOnce();
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, seasonId, reset]);

    const durationText = useMemo(() => {
        if (!dStart || !dEnd) return "";
        const ms = dEnd.getTime() - dStart.getTime();
        if (ms < 0) return "";
        const days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
        return `${days} hari`;
    }, [dStart, dEnd]);

    const onSubmit = async (v: SeasonFormValues) => {
        const d1 = parseDMY(v.startDate);
        const d2 = parseDMY(v.endDate);
        const n = parseInt((v.seasonNo || "").toString().replace(",", "."), 10);

        if (!Number.isFinite(n) || n < 1) {
            Alert.alert("Validasi", "Musim ke- harus angka ≥ 1.");
            return;
        }
        if (!d1) {
            Alert.alert("Validasi", "Tanggal mulai tidak valid (format dd/mm/yyyy).");
            return;
        }
        if (!d2) {
            Alert.alert("Validasi", "Tanggal selesai tidak valid (format dd/mm/yyyy).");
            return;
        }
        if (d2.getTime() < d1.getTime()) {
            Alert.alert("Validasi", "Tanggal selesai harus setelah/sama dengan tanggal mulai.");
            return;
        }

        try {
            setSaving(true);
            if (isEdit && seasonId) {
                await updateSeason({
                    id: seasonId,
                    seasonNo: n,
                    startDate: toISO(d1),
                    endDate: toISO(d2),
                });
            } else {
                await createSeason({
                    seasonNo: n,
                    startDate: toISO(d1),
                    endDate: toISO(d2),
                });
            }
            router.replace("/(form)/sub/season");
        } catch (e: any) {
            console.warn("SEASONFORM", e.code);
            if (e.code === "23505") {
                Alert.alert("Validasi", "Musim ke-" + n + " sudah ada.");
            } else {
                Alert.alert(
                    "Gagal",
                    (isEdit ? "Tidak dapat memperbarui musim." : "Tidak dapat membuat musim.")
                );
            }

        } finally {
            setSaving(false);
        }
    };

    const openStartPicker = () => {
        setOpenStart(true);
        setOpenEnd(false);
    };
    const openEndPicker = () => {
        setOpenEnd(true);
        setOpenStart(false);
    };

    const onChangeStart = (e: DateTimePickerEvent, date?: Date) => {
        if (Platform.OS === "android") setOpenStart(false);
        if ((e as any)?.type === "dismissed") return;
        const next = date ?? dStart ?? new Date();
        setValue("startDate", fmtDMY(next), { shouldValidate: true, shouldDirty: true });
        // sinkron end minimal = start
        const endDateObj = parseDMY(watch("endDate"));
        if (!endDateObj || endDateObj.getTime() < next.getTime()) {
            setValue("endDate", fmtDMY(next), { shouldValidate: true, shouldDirty: true });
        }
    };

    const onChangeEnd = (e: DateTimePickerEvent, date?: Date) => {
        if (Platform.OS === "android") setOpenEnd(false);
        if ((e as any)?.type === "dismissed") return;
        const next = date ?? dEnd ?? (dStart ?? new Date());
        const min = dStart ?? next;
        const finalDate = next.getTime() < min.getTime() ? min : next;
        setValue("endDate", fmtDMY(finalDate), { shouldValidate: true, shouldDirty: true });
    };

    const showBlockingLoader = initialLoading;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
            <LinearGradient
                colors={[C.gradientFrom, C.gradientTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
            >
                <View style={{ flexDirection: "row", justifyContent: "flex-start", gap: 12, alignItems: "center" }}>
                    <Pressable
                        onPress={() => router.replace("/(form)/sub/season")}
                        style={({ pressed }) => [
                            styles.iconBtn,
                            { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.9 : 1 },
                        ]}
                    >
                        <Ionicons name="arrow-back" size={18} color={C.text} />
                    </Pressable>
                    <View>
                        <Text style={[styles.title, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                            {isEdit ? "Edit Musim" : "Tambah Musim"}
                        </Text>
                        <Text style={[styles.subtitle, { color: C.textMuted, fontFamily: Fonts.serif as any }]}>
                            Tentukan periode tanam untuk pelacakan.
                        </Text>
                    </View>
                </View>
            </LinearGradient>

            {showBlockingLoader ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={C.tint} size={"large"} />
                    <Text style={{ marginTop: 8, color: C.textMuted }}>
                        {"Memuat musim…"}
                    </Text>
                </View>
            ) : (
                <KeyboardAwareScrollView
                    contentContainerStyle={{ padding: S.spacing.lg, paddingBottom: S.spacing.xl + 64 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    enableOnAndroid
                    enableAutomaticScroll
                    extraScrollHeight={Platform.select({ ios: 80, android: 120 })}
                >
                    <View
                        style={[
                            styles.card,
                            { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        {/* Musim ke- */}
                        <Text style={[styles.label, { color: C.text }]}>Musim</Text>
                        <Controller
                            control={control}
                            name="seasonNo"
                            rules={{
                                required: "Wajib diisi",
                                validate: (v) => {
                                    const n = parseInt((v || "").toString().replace(",", "."), 10);
                                    return (Number.isFinite(n) && n >= 1) || "Harus angka ≥ 1";
                                },
                            }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    placeholder="contoh: 1"
                                    placeholderTextColor={C.icon}
                                    keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    style={[
                                        styles.input,
                                        {
                                            color: C.text,
                                            borderColor: errors.seasonNo ? C.danger : C.border,
                                            borderRadius: S.radius.md,
                                        },
                                    ]}
                                />
                            )}
                        />
                        {errors.seasonNo && <Text style={[styles.err, { color: C.danger }]}>{errors.seasonNo.message as string}</Text>}

                        {/* Tanggal Mulai */}
                        <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Tanggal Mulai</Text>
                        <Pressable
                            onPress={openStartPicker}
                            style={[
                                styles.selectInput,
                                {
                                    borderColor: errors.startDate ? C.danger : C.border,
                                    backgroundColor: C.surface,
                                    borderRadius: S.radius.md,
                                    paddingHorizontal: S.spacing.md,
                                    paddingVertical: 12,
                                },
                            ]}
                        >
                            <Text
                                style={{
                                    color: start ? C.text : C.icon,
                                    fontFamily: Fonts.sans as any,
                                    fontSize: 15,
                                    fontWeight: "800",
                                }}
                            >
                                {start || "Pilih tanggal mulai"}
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <View style={[styles.badge, { backgroundColor: scheme === "light" ? "#00000010" : "#ffffff20" }]}>
                                    <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
                                    <Text style={{ fontSize: 10, fontWeight: "800", color: C.textMuted }}>dd/mm/yyyy</Text>
                                </View>
                                <Ionicons name={openStart ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
                            </View>
                        </Pressable>
                        {errors.startDate && <Text style={[styles.err, { color: C.danger }]}>{errors.startDate.message as string}</Text>}

                        {openStart && (
                            <View style={{ marginTop: 8 }}>
                                <DateTimePicker
                                    value={parseDMY(start) ?? new Date()}
                                    mode="date"
                                    display={Platform.OS === "ios" ? "spinner" : "default"}
                                    onChange={onChangeStart}
                                    minimumDate={new Date(2000, 0, 1)}
                                    maximumDate={new Date(2100, 11, 31)}
                                    themeVariant={scheme === "dark" ? "dark" : "light"}
                                />
                            </View>
                        )}

                        {/* Tanggal Selesai */}
                        <Text style={[styles.label, { color: C.text, marginTop: S.spacing.md }]}>Tanggal Selesai</Text>
                        <Pressable
                            onPress={openEndPicker}
                            style={[
                                styles.selectInput,
                                {
                                    borderColor: errors.endDate ? C.danger : C.border,
                                    backgroundColor: C.surface,
                                    borderRadius: S.radius.md,
                                    paddingHorizontal: S.spacing.md,
                                    paddingVertical: 12,
                                },
                            ]}
                        >
                            <Text
                                style={{
                                    color: end ? C.text : C.icon,
                                    fontFamily: Fonts.sans as any,
                                    fontSize: 15,
                                    fontWeight: "800",
                                }}
                            >
                                {end || "Pilih tanggal selesai"}
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <View style={[styles.badge, { backgroundColor: scheme === "light" ? "#00000010" : "#ffffff20" }]}>
                                    <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
                                    <Text style={{ fontSize: 10, fontWeight: "800", color: C.textMuted }}>dd/mm/yyyy</Text>
                                </View>
                                <Ionicons name={openEnd ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
                            </View>
                        </Pressable>
                        {errors.endDate && <Text style={[styles.err, { color: C.danger }]}>{errors.endDate.message as string}</Text>}

                        {openEnd && (
                            <View style={{ marginTop: 8 }}>
                                <DateTimePicker
                                    value={parseDMY(end) ?? parseDMY(start) ?? new Date()}
                                    mode="date"
                                    display={Platform.OS === "ios" ? "spinner" : "default"}
                                    onChange={onChangeEnd}
                                    minimumDate={parseDMY(start) ?? new Date(2000, 0, 1)}
                                    maximumDate={new Date(2100, 11, 31)}
                                    themeVariant={scheme === "dark" ? "dark" : "light"}
                                />
                            </View>
                        )}

                        {!!durationText && (
                            <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
                                Perkiraan durasi: <Text style={{ fontWeight: "800" }}>{durationText}</Text>
                            </Text>
                        )}
                    </View>

                    {/* Tombol Simpan (gaya profile) */}
                    <Pressable
                        onPress={handleSubmit(onSubmit)}
                        disabled={saving || showBlockingLoader}
                        style={({ pressed }) => [
                            styles.saveBtn,
                            {
                                backgroundColor: saving ? C.tint + "CC" : C.tint,
                                borderRadius: S.radius.lg,
                                opacity: pressed ? 0.98 : 1,
                            },
                            scheme === "light" ? S.shadow.light : S.shadow.dark,
                        ]}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="save-outline" size={18} color="#fff" />
                                <Text style={[styles.saveText, { fontFamily: Fonts.rounded as any }]}>
                                    {isEdit ? "Simpan Perubahan" : "Simpan"}
                                </Text>
                            </>
                        )}
                    </Pressable>
                </KeyboardAwareScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    iconBtn: {
        width: 36, height: 36, borderRadius: 999, borderWidth: 1, alignItems: "center", justifyContent: "center",
    },
    title: { fontSize: 22, fontWeight: "800" },
    subtitle: { fontSize: 12, marginTop: 2 },
    card: { padding: 16, borderWidth: 1 },

    label: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
    input: {
        borderWidth: 1, fontSize: 15, paddingHorizontal: 12,
        paddingVertical: Platform.select({ ios: 10, android: 8 }) as number,
        backgroundColor: "transparent",
    },
    err: { marginTop: 6, fontSize: 12 },
    selectInput: {
        borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    badge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
    },
    saveBtn: {
        marginTop: 16, paddingVertical: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8,
    },
    saveText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
