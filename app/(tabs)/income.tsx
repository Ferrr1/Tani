import { Colors, Fonts, Tokens } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ---- dummy data ----
type Season = { id: string; name: string; start: string; end: string };
type Income = { id: string; date: string; amount: number; seasonId: string };

const SEASONS: Season[] = [
  { id: "s1", name: "Musim 1", start: "2025-02-08", end: "2025-11-02" },
  { id: "s2", name: "Musim 2", start: "2026-02-01", end: "2026-10-30" },
];

const INCOMES: Income[] = [
  { id: "i1", date: "2025-11-12", amount: 50000, seasonId: "s1" },
  { id: "i2", date: "2025-11-01", amount: 50000, seasonId: "s1" },
  { id: "i3", date: "2025-11-13", amount: 25000, seasonId: "s1" },
  { id: "i4", date: "2026-03-01", amount: 120000, seasonId: "s2" },
  { id: "i5", date: "2026-03-12", amount: 80000, seasonId: "s2" },
];

export default function IncomeScreen() {
  const scheme = (useColorScheme() ?? "light") as "light" | "dark";
  const C = Colors[scheme];
  const S = Tokens;
  const router = useRouter();

  const [seasonIdx, setSeasonIdx] = useState(0);
  const [openSeasonList, setOpenSeasonList] = useState(false);

  const season = SEASONS[seasonIdx];

  const items = useMemo(() => {
    const filtered = INCOMES
      .filter((i) => i.seasonId === season.id)
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
    return filtered.slice(0, 3);
  }, [season.id]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatMoney = (n: number) =>
    `+${n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}`;

  const renderItem = useCallback(
    ({ item }: { item: Income }) => (
      <View
        style={[
          styles.rowCard,
          {
            backgroundColor: C.surface,
            borderColor: C.border,
            borderRadius: S.radius.lg,
          },
          scheme === "light" ? S.shadow.light : S.shadow.dark,
        ]}
      >
        {/* Kiri: tanggal badge */}
        <View
          style={[
            styles.dateBadge,
            { backgroundColor: C.surfaceSoft, borderColor: C.border },
          ]}
        >
          <Text style={{ color: C.text, fontSize: 12, fontWeight: "700" }}>
            {formatDate(item.date)}
          </Text>
          <Text
            style={{ color: C.textMuted, fontSize: 12, fontFamily: Fonts.serif as any }}
            numberOfLines={1}
          >
            Penerimaan
          </Text>
          <Text
            style={{ color: C.success, fontSize: 16, fontWeight: "900", marginTop: 2 }}
            numberOfLines={1}
          >
            {formatMoney(item.amount)}
          </Text>
        </View>

        {/* Aksi */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => console.log("Ubah", item.id)}
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: C.border, backgroundColor: C.surfaceSoft, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="create-outline" size={16} color={C.text} />
            <Text style={[styles.actionText, { color: C.text }]}>Ubah</Text>
          </Pressable>

          <Pressable
            onPress={() => console.log("Hapus", item.id)}
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: C.border, backgroundColor: C.surfaceSoft, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="trash-outline" size={16} color={C.danger} />
            <Text style={[styles.actionText, { color: C.danger }]}>Hapus</Text>
          </Pressable>
        </View>
      </View>
    ),
    [C, S, scheme]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header gradient + back + CTA tambah */}
      <LinearGradient
        colors={[C.gradientFrom, C.gradientTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
            Penerimaan
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <Pressable
          onPress={
            () => router.replace("/(form)/income/incomeForm")
          }
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: C.tint, borderRadius: S.radius.xl, opacity: pressed ? 0.98 : 1 },
          ]}
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={[styles.addText, { fontFamily: Fonts.rounded as any }]}>
            Tambah Data Penerimaan
          </Text>
        </Pressable>
      </LinearGradient>

      {/* ===== FlatList saja (header list + item card) ===== */}
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: S.spacing.lg, paddingBottom: S.spacing.xl }}
        ItemSeparatorComponent={() => <View style={{ height: S.spacing.md }} />}
        ListHeaderComponent={
          <View
            style={[
              styles.selectorCard,
              {
                backgroundColor: C.surface,
                borderColor: C.border,
                borderRadius: S.radius.lg,
                marginBottom: S.spacing.md,
              },
              scheme === "light" ? S.shadow.light : S.shadow.dark,
            ]}
          >
            {/* Selector Musim (dropdown sederhana) */}
            <Pressable
              onPress={() => setOpenSeasonList((v) => !v)}
              style={({ pressed }) => [
                styles.seasonRow,
                { borderColor: C.border, opacity: pressed ? 0.96 : 1 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.seasonTitle, { color: C.text }]}>{season.name}</Text>
                <Text style={[styles.seasonRange, { color: C.textMuted }]}>
                  {formatDate(season.start)} — {formatDate(season.end)}
                </Text>
              </View>
              <Ionicons name={openSeasonList ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
            </Pressable>

            {openSeasonList && (
              <View style={[styles.seasonList, { borderColor: C.border }]}>
                {SEASONS.map((s, i) => (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      setSeasonIdx(i);
                      setOpenSeasonList(false);
                    }}
                    style={({ pressed }) => [
                      styles.seasonItem,
                      {
                        backgroundColor:
                          i === seasonIdx ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent",
                        opacity: pressed ? 0.96 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: C.text, fontWeight: i === seasonIdx ? "800" as any : "600" as any }}>
                      {s.name}
                    </Text>
                    <Text style={{ color: C.textMuted, fontSize: 12 }}>
                      {formatDate(s.start)} — {formatDate(s.end)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        }
        renderItem={renderItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Header
  header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  addBtn: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexDirection: "row",
  },
  addText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // Season selector card
  selectorCard: { padding: 12, borderWidth: 1 },
  seasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  seasonTitle: { fontSize: 14, fontWeight: "800" },
  seasonRange: { fontSize: 12, marginTop: 2 },
  seasonList: { borderTopWidth: 1, borderRadius: 10, overflow: "hidden", marginTop: 10 },
  seasonItem: { paddingHorizontal: 12, paddingVertical: 10 },

  // List item row card
  rowCard: {
    padding: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateBadge: {
    width: 180,
    maxWidth: "50%",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actions: { flexDirection: "row", gap: 8, marginLeft: 8 },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  actionText: { fontSize: 11, fontWeight: "800" },
});
