// CashForm.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

import ChemPanel from "@/components/ChemPanel";
import Chip from "@/components/Chip";
import ExtrasPanel, { ExtraRow } from "@/components/ExtrasPanel";
import FertilizerPanel from "@/components/FertilizerPanel";
import LaborOne from "@/components/LaborOne";
import RHFLineInput from "@/components/RHFLineInput";
import SectionButton from "@/components/SectionButton";
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useExpenseService } from "@/services/expenseService";
import { useSeasonService } from "@/services/seasonService";
import {
  CashFormValues,
  Category,
  ChemItem,
  LaborForm,
  SATUAN_KIMIA,
  SEED_UNIT_CHOICES,
  SEEDLING_UNIT_CHOICES,
  Unit,
  UNIT_FERTILIZER,
} from "@/types/expense";
import { calcLaborSubtotal, sumChem } from "@/utils/calculate";
import { currency } from "@/utils/currency";
import { daysInclusive } from "@/utils/date";
import {
  buildCashPayload,
  calcProrata,
  validateCashSeeds,
  validateChemRows,
} from "@/utils/expense-form-logic";
import { formatInputThousands, toNum } from "@/utils/number";

type Mode = "create" | "edit";

type SeedLine = {
  cropName: string;
  kind: "seed" | "seedling";
  qty: string;
  price: string;
  name?: string;
  unit?: Unit; // <-- TAMBAH: unit per baris
};

export default function CashForm({
  seasonId,
  mode = "create",
  expenseId,
}: {
  seasonId: string;
  mode?: Mode;
  expenseId?: string;
}) {
  const scheme = (useColorScheme() ?? "light") as "light" | "dark";
  const C = Colors[scheme];
  const S = Tokens;
  const router = useRouter();

  const {
    listCashMaterials,
    listCashLabors,
    listCashExtras,
    createCashExpense,
    updateCashExpense,
  } = useExpenseService();
  const { getSeasonById } = useSeasonService();

  // toggles
  const [openFertilizer, setOpenFertilizer] = useState(false);
  const [openInsect, setOpenInsect] = useState(false);
  const [openHerb, setOpenHerb] = useState(false);
  const [openFungi, setOpenFungi] = useState(false);
  const [openNursery, setOpenNursery] = useState(false);
  const [openLandPrep, setOpenLandPrep] = useState(false);
  const [openPlanting, setOpenPlanting] = useState(false);
  const [openFertLabor, setOpenFertLabor] = useState(false);
  const [openIrrigation, setOpenIrrigation] = useState(false);
  const [openWeeding, setOpenWeeding] = useState(false);
  const [openPestCtrl, setOpenPestCtrl] = useState(false);
  const [openHarvest, setOpenHarvest] = useState(false);
  const [openPostHarvest, setOpenPostHarvest] = useState(false);
  const [openExtras, setOpenExtras] = useState(false);
  const [openExtraCost, setOpenExtraCost] = useState(false);

  // kimia
  const [fertilizerItems, setFertilizerItems] = useState<ChemItem[]>([]);
  const [insectItems, setInsectItems] = useState<ChemItem[]>([]);
  const [herbItems, setHerbItems] = useState<ChemItem[]>([]);
  const [fungiItems, setFungiItems] = useState<ChemItem[]>([]);
  const [extraItems, setExtraItems] = useState<ExtraRow[]>([]);

  // season range (untuk prorata)
  const [seasonStart, setSeasonStart] = useState<string | null>(null);
  const [seasonEnd, setSeasonEnd] = useState<string | null>(null);

  const addChem = (setter: any, item: Omit<ChemItem, "id">) =>
    setter((prev: ChemItem[]) => [
      ...prev,
      { ...item, id: String(Date.now() + Math.random()) },
    ]);

  const defaultLabor = (): LaborForm => ({
    tipe: "harian",
    jumlahOrang: "",
    jumlahHari: "",
    jamKerja: "",
    upahHarian: "",
    hargaBorongan: "",
    upahBerlaku: "",
  });

  // ==== FORM ====
  const { control, handleSubmit, watch, setValue, formState: { isSubmitted } } = useForm<
    CashFormValues & { seeds: SeedLine[] }
  >({
    defaultValues: {
      seeds: [],
      extras: { tax: "", landRent: "", transport: "" },
      labor: {
        nursery: defaultLabor(),
        land_prep: defaultLabor(),
        planting: defaultLabor(),
        fertilizing: defaultLabor(),
        irrigation: defaultLabor(),
        weeding: defaultLabor(),
        pest_ctrl: defaultLabor(),
        harvest: defaultLabor(),
        postharvest: defaultLabor(),
      },
    },
    mode: "onChange",
  });

  const didHydrateEdit = useRef(false);
  const seedsHydrated = useRef(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(
    mode === "edit",
  );

  // ===== Ambil crops & tanggal season (sekali per seasonId)
  useEffect(() => {
    let alive = true;
    const init = async () => {
      if (seedsHydrated.current) return;
      try {
        const season = await getSeasonById(seasonId);
        if (!alive) return;

        // simpan tanggal season untuk prorata
        if (season?.start_date && season?.end_date) {
          setSeasonStart(season.start_date);
          setSeasonEnd(season.end_date);
        }
        const current = (watch("seeds") ?? []) as SeedLine[];
        if (current.length > 0) {
          seedsHydrated.current = true;
          return;
        }

        const raw = (season?.crop_type ?? "") as any;
        const names: string[] = Array.isArray(raw)
          ? raw
          : String(raw)
              .split(/[\/|,]+/)
              .map((s) => s.trim())
              .filter(Boolean);

        const seeds: SeedLine[] =
          names.length > 0
            ? names.map((nm) => ({
                cropName: nm,
                kind: "seed",
                name: "",
                qty: "",
                price: "",
                unit: undefined,
              }))
            : [
                {
                  cropName: "Tanaman",
                  kind: "seed",
                  name: "",
                  qty: "",
                  price: "",
                  unit: undefined,
                },
              ];

        setValue("seeds", seeds, { shouldDirty: false });
        seedsHydrated.current = true;
      } catch {
        const current = (watch("seeds") ?? []) as SeedLine[];
        if (current.length === 0) {
          setValue(
            "seeds",
            [{ cropName: "Tanaman", kind: "seed", qty: "", price: "" }],
            { shouldDirty: false },
          );
        }
        seedsHydrated.current = true;
      }
    };
    init();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId]);

  // ===== Prefill EDIT
  const toStr = (v: any) => {
    if (v === null || v === undefined) return "";
    return formatInputThousands(String(v));
  };

  useEffect(() => {
    let alive = true;
    const hydrateEdit = async () => {
      if (mode !== "edit" || !expenseId || didHydrateEdit.current) return;
      try {
        setInitialLoading(true);
        const [materials, labors, extras] = await Promise.all([
          listCashMaterials(expenseId),
          listCashLabors(expenseId),
          listCashExtras(expenseId),
        ]);
        if (!alive) return;

        // reset kimia & extras
        setFertilizerItems([]);
        setInsectItems([]);
        setHerbItems([]);
        setFungiItems([]);
        setValue("extras.tax", "");
        setValue("extras.landRent", "");
        setValue("extras.transport", "");

        // reset labor
        (
          [
            "nursery",
            "land_prep",
            "planting",
            "fertilizing",
            "irrigation",
            "weeding",
            "pest_ctrl",
            "harvest",
            "postharvest",
          ] as const
        ).forEach((k) => {
          const v = defaultLabor();
          setValue(`labor.${k}.tipe`, v.tipe);
          setValue(`labor.${k}.jumlahOrang`, v.jumlahOrang);
          setValue(`labor.${k}.jumlahHari`, v.jumlahHari);
          setValue(`labor.${k}.jamKerja`, v.jamKerja);
          setValue(`labor.${k}.upahHarian`, v.upahHarian);
          setValue(`labor.${k}.hargaBorongan`, v.hargaBorongan!);
          setValue(`labor.${k}.upahBerlaku`, v.upahBerlaku!);
        });

        // Prefill seeds
        const formSeeds = (watch("seeds") || []) as SeedLine[];
        const seedLike = (materials || []).filter(
          (m: any) => m?.category === "seed" || m?.category === "seedling",
        );
        const patched = formSeeds.map((s, i) => {
          const hit = seedLike[i];
          if (!hit) return s;
          const k: "seed" | "seedling" =
            hit.category === "seedling" ? "seedling" : "seed";
          const u: Unit | undefined = hit.unit as Unit | undefined;
          return {
            ...s,
            kind: k,
            qty: toStr(hit.quantity ?? s.qty),
            price: toStr(hit.unit_price ?? s.price),
            unit: u ?? s.unit,
          };
        });
        setValue("seeds", patched, { shouldDirty: false });

        // Prefill kimia lain
        (materials || []).forEach((m: any) => {
          const cat: Category | undefined = m?.category;
          const unit: Unit | undefined = (m?.unit as Unit) ?? "gram";
          const qty = toStr(m?.quantity);
          const price = toStr(m?.unit_price);
          const name = m?.item_name ?? m?.label ?? "";

          if (cat === "fertilizer") {
            setFertilizerItems((prev) => [
              ...prev,
              {
                id: String(Date.now() + Math.random()),
                category: "fertilizer",
                name,
                unit,
                qty,
                price,
              },
            ]);
          } else if (cat === "insecticide") {
            setInsectItems((prev) => [
              ...prev,
              {
                id: String(Date.now() + Math.random()),
                category: "insecticide",
                name,
                unit,
                qty,
                price,
              },
            ]);
          } else if (cat === "herbicide") {
            setHerbItems((prev) => [
              ...prev,
              {
                id: String(Date.now() + Math.random()),
                category: "herbicide",
                name,
                unit,
                qty,
                price,
              },
            ]);
          } else if (cat === "fungicide") {
            setFungiItems((prev) => [
              ...prev,
              {
                id: String(Date.now() + Math.random()),
                category: "fungicide",
                name,
                unit,
                qty,
                price,
              },
            ]);
          }
        });

        // Prefill extras
        (extras || []).forEach((e: any) => {
          const cat: Category = e?.metadata?.category;
          const kind = (e?.extra_kind || "").toString();
          const yearly =
            e?.metadata?.proratedFromYearly ??
            e?.metadata?.prorated_from_yearly ??
            null;

          if (cat === "tax") {
            // gunakan nilai tahunan untuk input, bukan amount (prorata)
            setValue("extras.tax", toStr(yearly ?? e?.amount));
          } else if (cat === "land_rent") {
            setValue("extras.landRent", toStr(yearly ?? e?.amount));
          } else if (cat === "transport") {
            // transport memang tidak diprorata ketika create → pakai amount langsung
            setValue("extras.transport", toStr(e?.amount));
          } else {
            setExtraItems((prev) => [
              ...prev,
              {
                id: String(Date.now() + Math.random()),
                label: e?.note || kind || "Biaya",
                amount: toStr(e?.amount ?? 0),
              },
            ]);
          }
        });

        // Prefill labor
        const map: Record<string, keyof CashFormValues["labor"]> = {
          labor_nursery: "nursery",
          labor_land_prep: "land_prep",
          labor_planting: "planting",
          labor_fertilizing: "fertilizing",
          labor_irrigation: "irrigation",
          labor_weeding: "weeding",
          labor_pest_ctrl: "pest_ctrl",
          labor_harvest: "harvest",
          labor_postharvest: "postharvest",
        };

        (labors || []).forEach((it: any) => {
          const key = map[it?.metadata?.category as string];
          if (!key) return;
          const type =
            it?.labor_type ||
            it?.metadata?.laborType ||
            it?.metadata?.labor_type;
          if (type === "contract") {
            const kontrak = Number(it?.contract_price ?? 0);
            const upahBerlaku = Number(it?.metadata?.prevailingWage ?? NaN);
            setValue(`labor.${key}.tipe`, "borongan");
            setValue(
              `labor.${key}.hargaBorongan`,
              kontrak ? toStr(kontrak) : "",
            );
            setValue(
              `labor.${key}.upahBerlaku`,
              Number.isFinite(upahBerlaku) ? String(upahBerlaku) : "",
            );
            setValue(`labor.${key}.jumlahOrang`, "");
            setValue(`labor.${key}.jumlahHari`, "");
            setValue(`labor.${key}.upahHarian`, "");
          } else {
            const people =
              Number(it?.people_count ?? it?.metadata?.peopleCount ?? 0) || 0;
            const days = Number(it?.days ?? it?.metadata?.days ?? 0) || 0;
            const wage = Number(it?.daily_wage ?? 0);
            setValue(`labor.${key}.tipe`, "harian");
            setValue(
              `labor.${key}.jumlahOrang`,
              String(people > 0 ? people : 0),
            );
            setValue(`labor.${key}.jumlahHari`, String(days > 0 ? days : 1));
            setValue(`labor.${key}.upahHarian`, toStr(wage));
            setValue(
              `labor.${key}.jamKerja`,
              it?.metadata?.jamKerja != null
                ? String(it.metadata.jamKerja)
                : "",
            );
            setValue(`labor.${key}.hargaBorongan`, "");
            setValue(`labor.${key}.upahBerlaku`, "");
          }
        });

        didHydrateEdit.current = true;
      } catch (e) {
        console.warn("CashForm prefill error", e);
      } finally {
        if (alive) setInitialLoading(false);
      }
    };

    hydrateEdit();
    return () => {
      alive = false;
    };
  }, [
    mode,
    expenseId,
    listCashMaterials,
    listCashLabors,
    listCashExtras,
    setValue,
    watch,
  ]);

  const L = watch("labor");
  const taxW = watch("extras.tax");
  const landRentW = watch("extras.landRent");
  const transportW = watch("extras.transport");
  const seedsW = watch("seeds") as SeedLine[];

  const chemOthersTotal =
    sumChem(fertilizerItems) +
    sumChem(insectItems) +
    sumChem(herbItems) +
    sumChem(fungiItems);

  const seedSubtotal = seedsW.reduce((acc, s) => {
    const q = toNum(s.qty);
    const p = toNum(s.price);
    return acc + (q > 0 && p >= 0 ? q * p : 0);
  }, 0);

  const laborTotal =
    calcLaborSubtotal(L.nursery) +
    calcLaborSubtotal(L.land_prep) +
    calcLaborSubtotal(L.planting) +
    calcLaborSubtotal(L.fertilizing) +
    calcLaborSubtotal(L.irrigation) +
    calcLaborSubtotal(L.weeding) +
    calcLaborSubtotal(L.pest_ctrl) +
    calcLaborSubtotal(L.harvest) +
    calcLaborSubtotal(L.postharvest);

  const seasonDays = useMemo(() => {
    if (!seasonStart || !seasonEnd) return 0;
    return daysInclusive(seasonStart, seasonEnd);
  }, [seasonStart, seasonEnd]);

  const taxSeason = useMemo(
    () => calcProrata(taxW, seasonDays),
    [taxW, seasonDays],
  );
  const landRentSeason = useMemo(
    () => calcProrata(landRentW, seasonDays),
    [landRentW, seasonDays],
  );

  const transportSeason = useMemo(() => toNum(transportW), [transportW]);

  const extrasSubtotal = landRentSeason + taxSeason + transportSeason;

  const extrasPanelSubtotal = useMemo(() => {
    return (extraItems || []).reduce((acc, r) => {
      const v = toNum(r.amount);
      return acc + (Number.isFinite(v) && v >= 0 ? v : 0);
    }, 0);
  }, [extraItems]);

  const total = useMemo(() => {
    return (
      seedSubtotal +
      chemOthersTotal +
      laborTotal +
      extrasSubtotal +
      extrasPanelSubtotal
    );
  }, [
    seedSubtotal,
    chemOthersTotal,
    laborTotal,
    extrasSubtotal,
    extrasPanelSubtotal,
  ]);

  // ===== Validasi
  const seedsValid = useCallback(() => validateCashSeeds(seedsW), [seedsW]);
  const allChemRowsValid = (rows: ChemItem[]) => validateChemRows(rows, true);
  const chemRowsValidIfAny = (rows: ChemItem[]) =>
    validateChemRows(rows, false);

  // ===== Build payload (gunakan nilai PRORATA untuk tax & land rent)
  const buildPayload = (fv: any) =>
    buildCashPayload(
      fv,
      fertilizerItems,
      insectItems,
      herbItems,
      fungiItems,
      extraItems,
      seasonDays,
    );

  // ===== Submit
  const [saving, setSaving] = useState(false);
  const onSubmit = async (fv: any) => {
    try {
      if (!seedsValid()) {
        Alert.alert(
          "Validasi",
          "Semua baris Bibit/Benih wajib diisi: pilih Benih/Bibit, isi nama, jumlah, dan harga satuan.",
        );
        return;
      }
      if (!allChemRowsValid(fertilizerItems)) {
        Alert.alert(
          "Validasi",
          "Pupuk minimal 1 item dan tiap baris harus lengkap.",
        );
        return;
      }
      const pestOk =
        chemRowsValidIfAny(insectItems) &&
        chemRowsValidIfAny(herbItems) &&
        chemRowsValidIfAny(fungiItems);
      if (!pestOk) {
        Alert.alert(
          "Validasi",
          "Jika isi pestisida, tiap baris harus lengkap.",
        );
        return;
      }

      const items = buildPayload(fv);
      if (!items.length) {
        Alert.alert("Validasi", "Isi minimal satu item yang valid.");
        return;
      }

      setSaving(true);
      if (mode === "edit" && expenseId) {
        await updateCashExpense(expenseId, { seasonId, items });
      } else {
        await createCashExpense({ seasonId, items });
      }
      router.replace("/(tabs)/expense");
    } catch (e: any) {
      console.warn("CASHFORM", e);
      Alert.alert("Gagal", e?.message ?? "Tidak dapat menyimpan pengeluaran.");
    } finally {
      setSaving(false);
    }
  };

  const showBlocking = initialLoading;

  // ===== Styles yang butuh C & S
  const cardStyle = {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: S.radius.lg,
    backgroundColor: C.surface,
    padding: S.spacing.md,
    gap: S.spacing.sm,
  } as const;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <LinearGradient
        colors={[C.gradientFrom, C.gradientTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                borderColor: C.border,
                backgroundColor: C.surface,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-back" size={18} color={C.text} />
          </Pressable>
          <Text
            style={[
              styles.headerTitle,
              { color: C.text, fontFamily: Fonts.rounded as any },
            ]}
          >
            Pengeluaran | Tunai
          </Text>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      {showBlocking ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: C.textMuted, marginBottom: S.spacing.xs }}>
            {mode === "edit" ? "Memuat data..." : "Menyiapkan form..."}
          </Text>
        </View>
      ) : (
        <KeyboardAwareScrollView
          enableOnAndroid
          extraScrollHeight={Platform.select({ ios: 20, android: 80 })}
          contentContainerStyle={{
            padding: S.spacing.lg,
            paddingBottom: S.spacing.xl * 3,
            gap: S.spacing.md,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ===== Bibit/Benih (Array) ===== */}
          {(seedsW as SeedLine[]).map((s, idx) => {
            const kind = s.kind ?? "seed";
            const setKind = (v: "seed" | "seedling") => {
              setValue(`seeds.${idx}.kind`, v as "seed" | "seedling", {
                shouldDirty: true,
              });
            };
            const seedRowSubtotal = Math.max(
              0,
              toNum(s.qty) * Math.max(0, toNum(s.price)),
            );

            return (
              <View key={`${s.cropName}-${idx}`} style={cardStyle}>
                <Text
                  style={{
                    textTransform: "capitalize",
                    color: C.textMuted,
                    fontWeight: "800",
                    fontFamily: Fonts.rounded as any,
                  }}
                >
                  {`Bibit/Benih | ${s.cropName} *`}
                </Text>

                {/* Chips */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: S.spacing.sm,
                    flexWrap: "wrap",
                  }}
                >
                  <Chip
                    label="Benih"
                    active={kind === "seed"}
                    onPress={() => setKind("seed")}
                    C={C}
                  />
                  <Chip
                    label="Bibit"
                    active={kind === "seedling"}
                    onPress={() => setKind("seedling")}
                    C={C}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    gap: S.spacing.sm,
                    flexWrap: "wrap",
                    marginTop: 6,
                  }}
                >
                  {kind === "seed"
                    ? SEED_UNIT_CHOICES.map((u) => (
                        <Chip
                          style={{ marginBottom: 6 }}
                          key={u}
                          label={u === "gram" ? "Gram" : "Kilogram"}
                          active={s.unit === u}
                          error={isSubmitted && !s.unit}
                          onPress={() =>
                            setValue(`seeds.${idx}.unit`, u as Unit, {
                              shouldDirty: true,
                            })
                          }
                          C={C}
                          small
                        />
                      ))
                    : SEEDLING_UNIT_CHOICES.map((u) => (
                        <Chip
                          style={{ marginBottom: 6 }}
                          key={u}
                          label={u === "ikat" ? "Ikat" : "Polybag"}
                          active={s.unit === u}
                          error={isSubmitted && !s.unit}
                          onPress={() =>
                            setValue(`seeds.${idx}.unit`, u as Unit, {
                              shouldDirty: true,
                            })
                          }
                          C={C}
                          small
                        />
                      ))}
                </View>

                <RHFLineInput
                  label="Jumlah"
                  name={`seeds.${idx}.qty`}
                  control={control}
                  C={C}
                  rules={{
                    required: "Wajib diisi",
                    validate: (v: any) =>
                      parseFloat(String(v).replace(",", ".")) > 0 ||
                      "Harus > 0",
                  }}
                />
                <RHFLineInput
                  label="Harga per satuan"
                  name={`seeds.${idx}.price`}
                  control={control}
                  C={C}
                  rules={{
                    required: "Wajib diisi",
                    validate: (v: any) => {
                      const x = parseFloat(String(v).replace(",", "."));
                      return (!Number.isNaN(x) && x >= 0) || "Harus angka ≥ 0";
                    },
                  }}
                />

                {/* Subtotal per baris seed */}
                <Text style={{ color: C.textMuted, fontSize: 12 }}>
                  Subtotal ≈{" "}
                  <Text style={{ color: C.success, fontWeight: "900" }}>
                    {currency(seedRowSubtotal || 0)}
                  </Text>
                </Text>
              </View>
            );
          })}

          {/* Subtotal semua Seeds */}
          <View style={{ alignItems: "flex-start" }}>
            <Text style={{ color: C.textMuted, fontSize: 12 }}>
              Subtotal Semua ≈{" "}
              <Text style={{ color: C.success, fontWeight: "900" }}>
                {currency(seedSubtotal || 0)}
              </Text>
            </Text>
          </View>

          {/* ===== Pupuk ===== */}
          <Text
            style={[
              styles.sectionTitle,
              { color: C.textMuted, fontFamily: Fonts.rounded as any },
            ]}
          >
            Pupuk
          </Text>
          <SectionButton
            title="Tambah Pupuk"
            icon="flask-outline"
            open={openFertilizer}
            onPress={() => setOpenFertilizer((v) => !v)}
            C={C}
            S={S}
          />
          {openFertilizer && (
            <FertilizerPanel
              schemeColors={{ C, S }}
              onAdd={(p) =>
                addChem(setFertilizerItems, {
                  ...p,
                  category: "fertilizer",
                  unit: UNIT_FERTILIZER,
                })
              }
              rows={fertilizerItems}
              setRows={setFertilizerItems}
            />
          )}

          {/* ===== Pestisida ===== */}
          <Text
            style={[
              styles.sectionTitle,
              { color: C.textMuted, fontFamily: Fonts.rounded as any },
            ]}
          >
            Pestisida
          </Text>
          <SectionButton
            title="Tambah Insektisida"
            icon="bug-outline"
            open={openInsect}
            onPress={() => setOpenInsect((v) => !v)}
            C={C}
            S={S}
          />
          {openInsect && (
            <ChemPanel
              schemeColors={{ C, S }}
              unitChoices={SATUAN_KIMIA}
              placeholderName="Nama insektisida"
              onAdd={(p) =>
                addChem(setInsectItems, { ...p, category: "insecticide" })
              }
              rows={insectItems}
              setRows={setInsectItems}
            />
          )}
          <SectionButton
            title="Tambah Herbisida"
            icon="leaf-outline"
            open={openHerb}
            onPress={() => setOpenHerb((v) => !v)}
            C={C}
            S={S}
          />
          {openHerb && (
            <ChemPanel
              schemeColors={{ C, S }}
              unitChoices={SATUAN_KIMIA}
              placeholderName="Nama herbisida"
              onAdd={(p) =>
                addChem(setHerbItems, { ...p, category: "herbicide" })
              }
              rows={herbItems}
              setRows={setHerbItems}
            />
          )}
          <SectionButton
            title="Tambah Fungisida"
            icon="medkit-outline"
            open={openFungi}
            onPress={() => setOpenFungi((v) => !v)}
            C={C}
            S={S}
          />
          {openFungi && (
            <ChemPanel
              schemeColors={{ C, S }}
              unitChoices={SATUAN_KIMIA}
              placeholderName="Nama fungisida"
              onAdd={(p) =>
                addChem(setFungiItems, { ...p, category: "fungicide" })
              }
              rows={fungiItems}
              setRows={setFungiItems}
            />
          )}

          {/* ===== Tenaga Kerja ===== */}
          <Text
            style={[
              styles.sectionTitle,
              { color: C.textMuted, fontFamily: Fonts.rounded as any },
            ]}
          >
            Tenaga Kerja
          </Text>

          <LaborOne
            title="Persemaian"
            icon="flower-outline"
            open={openNursery}
            onPress={() => setOpenNursery((v) => !v)}
            name="labor.nursery"
            control={control}
            C={C}
            S={S}
            setValue={setValue}
            subtotal={calcLaborSubtotal(watch("labor").nursery)}
          />
          <LaborOne
            title="Pengolahan Lahan"
            icon="construct-outline"
            open={openLandPrep}
            onPress={() => setOpenLandPrep((v) => !v)}
            name="labor.land_prep"
            control={control}
            C={C}
            S={S}
            setValue={setValue}
            subtotal={calcLaborSubtotal(watch("labor").land_prep)}
          />
          <LaborOne
            title="Penanaman"
            icon="leaf-outline"
            open={openPlanting}
            onPress={() => setOpenPlanting((v) => !v)}
            name="labor.planting"
            control={control}
            C={C}
            S={S}
            setValue={setValue}
            subtotal={calcLaborSubtotal(watch("labor").planting)}
          />
          <LaborOne
            title="Pemupukan"
            icon="flask-outline"
            open={openFertLabor}
            onPress={() => setOpenFertLabor((v) => !v)}
            name="labor.fertilizing"
            control={control}
            C={C}
            S={S}
            setValue={setValue}
            subtotal={calcLaborSubtotal(watch("labor").fertilizing)}
          />
          <LaborOne
            title="Penyiraman"
            icon="water-outline"
            open={openIrrigation}
            onPress={() => setOpenIrrigation((v) => !v)}
            name="labor.irrigation"
            control={control}
            C={C}
            S={S}
            setValue={setValue}
            subtotal={calcLaborSubtotal(watch("labor").irrigation)}
          />
          <LaborOne
            title="Penyiangan"
            icon="cut-outline"
            open={openWeeding}
            onPress={() => setOpenWeeding((v) => !v)}
            name="labor.weeding"
            control={control}
            C={C}
            S={S}
            setValue={setValue}
            subtotal={calcLaborSubtotal(watch("labor").weeding)}
          />
          <LaborOne
            title="Pengendalian Hama & Penyakit"
            icon="shield-checkmark-outline"
            open={openPestCtrl}
            onPress={() => setOpenPestCtrl((v) => !v)}
            name="labor.pest_ctrl"
            control={control}
            C={C}
            S={S}
            setValue={setValue}
            subtotal={calcLaborSubtotal(watch("labor").pest_ctrl)}
          />
          <LaborOne
            title="Panen"
            icon="basket-outline"
            open={openHarvest}
            onPress={() => setOpenHarvest((v) => !v)}
            name="labor.harvest"
            control={control}
            C={C}
            S={S}
            setValue={setValue}
            subtotal={calcLaborSubtotal(watch("labor").harvest)}
          />
          <LaborOne
            title="Pasca Panen"
            icon="archive-outline"
            open={openPostHarvest}
            onPress={() => setOpenPostHarvest((v) => !v)}
            name="labor.postharvest"
            control={control}
            C={C}
            S={S}
            setValue={setValue}
            subtotal={calcLaborSubtotal(watch("labor").postharvest)}
          />

          {/* ===== Pajak, Sewa Lahan, Transportasi ===== */}
          <Text
            style={[
              styles.sectionTitle,
              { color: C.textMuted, fontFamily: Fonts.rounded as any },
            ]}
          >
            Pajak, Sewa Lahan, Transportasi
          </Text>
          <SectionButton
            title="Pajak, Sewa Lahan, Transportasi"
            icon="pricetag-outline"
            open={openExtras}
            onPress={() => setOpenExtras((v) => !v)}
            C={C}
            S={S}
          />
          {openExtras && (
            <View>
              {/* input tetap “per Tahun” */}
              <RHFLineInput
                label={`Pajak (PBB) per Tahun`}
                placeholder="Dalam Rupiah"
                name="extras.tax"
                control={control}
                C={C}
              />
              <Text style={{ marginTop: 6, color: C.textMuted, fontSize: 12 }}>
                Dihitung prorata: {seasonDays} hari × (nilai tahunan ÷ 365)
              </Text>
              <Text
                style={{ marginBottom: 6, color: C.textMuted, fontSize: 12 }}
              >
                Pajak ≈{" "}
                <Text style={{ color: C.success, fontWeight: "900" }}>
                  {currency(taxSeason || 0)}
                </Text>
              </Text>
              <RHFLineInput
                label={`Sewa Lahan per Tahun`}
                name="extras.landRent"
                control={control}
                C={C}
              />
              <Text style={{ marginTop: 6, color: C.textMuted, fontSize: 12 }}>
                Dihitung prorata: {seasonDays} hari × (nilai tahunan ÷ 365)
              </Text>
              <Text
                style={{ marginBottom: 6, color: C.textMuted, fontSize: 12 }}
              >
                Sewa Lahan ≈{" "}
                <Text style={{ color: C.success, fontWeight: "900" }}>
                  {currency(landRentSeason || 0)}
                </Text>
              </Text>
              <RHFLineInput
                label="Transportasi"
                name="extras.transport"
                control={control}
                C={C}
              />
            </View>
          )}

          {/* ===== Biaya Lain ===== */}
          <Text style={{ color: C.textMuted, fontWeight: "800", marginTop: 8 }}>
            Biaya Lain
          </Text>
          <SectionButton
            title="Biaya Lain"
            icon="pricetag-outline"
            open={openExtraCost}
            onPress={() => setOpenExtraCost((v) => !v)}
            C={C}
            S={S}
          />
          {openExtraCost && (
            <>
              <ExtrasPanel
                schemeColors={{ C, S }}
                rows={extraItems}
                setRows={setExtraItems}
              />
              <Text style={{ color: C.textMuted, fontSize: 12 }}>
                Subtotal Biaya Lain ≈{" "}
                <Text style={{ color: C.success, fontWeight: "900" }}>
                  {currency(extrasPanelSubtotal || 0)}
                </Text>
              </Text>
            </>
          )}

          {/* ===== Footer ===== */}
          <View style={{ marginTop: S.spacing.md }}>
            <Text
              style={{
                textAlign: "right",
                color: C.text,
                marginBottom: S.spacing.xs,
              }}
            >
              Total:{" "}
              <Text
                style={{
                  color: C.success,
                  fontWeight: "900",
                  fontFamily: Fonts.rounded as any,
                }}
              >
                {currency(total)}
              </Text>
            </Text>
            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: C.tint,
                  opacity: pressed ? 0.98 : 1,
                  borderRadius: S.radius.xl,
                  paddingVertical: S.spacing.md,
                },
              ]}
            >
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "900",
                  fontFamily: Fonts.rounded as any,
                }}
              >
                {saving ? "Menyimpan…" : "Simpan"}
              </Text>
            </Pressable>
          </View>
        </KeyboardAwareScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", marginTop: 8 },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 4 },
  inputBase: {
    borderWidth: 1,
  },
  saveBtn: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
});
