import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useSeasonList, useSeasonService } from "@/services/seasonService";
import { SeasonRow } from "@/types/season";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SeasonScreen() {
  const scheme = (useColorScheme() ?? "light") as "light" | "dark";
  const router = useRouter();
  const C = Colors[scheme];
  const S = Tokens;
  const {
    loading,
    refreshing,
    rows,
    fetchOnce,
    refresh,
  } = useSeasonList();
  const { deleteSeason } = useSeasonService();

  const [openYearList, setOpenYearList] = useState(false);
  const [yearUI, setYearUI] = useState<number | "all">("all");
  const yearsUI = useMemo(() => {
    const ys = new Set<number>();
    for (const s of rows) {
      const a = new Date(s.start_date).getFullYear();
      const b = new Date(s.end_date).getFullYear();
      const minY = Math.min(a, b);
      const maxY = Math.max(a, b);
      for (let y = minY; y <= maxY; y++) ys.add(y);
    }
    return Array.from(ys).sort((a, b) => b - a); // desc
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (yearUI === "all") return rows;
    const Y = yearUI as number;
    return rows.filter((s) => {
      const yStart = new Date(s.start_date).getFullYear();
      const yEnd = new Date(s.end_date).getFullYear();
      return yStart === Y || yEnd === Y || (yStart < Y && yEnd > Y);
    });
  }, [rows, yearUI]);

  useFocusEffect(
    useCallback(() => {
      fetchOnce();
      setOpenYearList(false);
      return () => setOpenYearList(false);
    }, [fetchOnce])
  );

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const handleEdit = useCallback(
    (item: SeasonRow) => {
      router.replace(`/(form)/season/seasonForm?seasonId=${item.id}`);
    },
    [router]
  );

  const handleDelete = useCallback(
    (item: SeasonRow) => {
      Alert.alert(
        "Hapus Musim",
        `Yakin menghapus Musim ke-${item.season_no}?`,
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Hapus",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteSeason(item.id);
                await refresh(); // re-sync, tidak mengubah yearUI
              } catch (e: any) {
                Alert.alert("Gagal", e?.message ?? "Tidak dapat menghapus musim.");
              }
            },
          },
        ]
      );
    },
    [deleteSeason, refresh]
  );

  const renderItem = useCallback(
    ({ item }: { item: SeasonRow }) => (
      <View
        style={[
          styles.rowCard,
          { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
          scheme === "light" ? S.shadow.light : S.shadow.dark,
        ]}
      >
        {/* Badge tanggal */}
        <View
          style={[
            styles.dateBadge,
            { backgroundColor: C.surfaceSoft, borderColor: C.border },
          ]}
        >
          <Ionicons name="calendar-outline" size={14} color={C.icon} />
          <View>
            <Text style={{ color: C.text, fontSize: 11, fontWeight: "700" }}>
              {fmtDate(item.start_date)}
            </Text>
            <Text style={{ color: C.text, fontSize: 11, fontWeight: "700", marginTop: 2 }}>
              {fmtDate(item.end_date)}
            </Text>
          </View>
        </View>

        {/* Tengah */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: Fonts.serif as any }}>
            Musim
          </Text>
          <Text style={{ color: C.text, fontSize: 16, fontWeight: "900", marginTop: 2 }}>
            Ke-{item.season_no}
          </Text>
        </View>

        {/* Aksi */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => handleEdit(item)}
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: C.border, backgroundColor: C.surfaceSoft, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="create-outline" size={16} color={C.text} />
            <Text style={[styles.actionText, { color: C.text }]}>Ubah</Text>
          </Pressable>

          <Pressable
            onPress={() => handleDelete(item)}
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
    [C, S, scheme, handleEdit, handleDelete]
  );

  const showBlockingLoader = loading && rows.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      {/* Header */}
      <LinearGradient
        colors={[C.gradientFrom, C.gradientTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.replace("/(tabs)")}
            style={({ pressed }) => [
              styles.iconBtn,
              { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="arrow-back" size={18} color={C.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
            Musim
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <Pressable
          onPress={() => router.replace("/(form)/season/seasonForm")}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: C.tint, borderRadius: S.radius.xl, opacity: pressed ? 0.98 : 1 },
          ]}
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={[styles.addText, { fontFamily: Fonts.rounded as any }]}>
            Tambah Data Musim
          </Text>
        </Pressable>
      </LinearGradient>

      {/* === FILTER TAHUN (DI LUAR FLATLIST) === */}
      <View
        style={[
          styles.selectorCard,
          {
            backgroundColor: C.surface,
            borderColor: C.border,
            borderRadius: S.radius.lg,
            marginHorizontal: S.spacing.lg,
            marginTop: S.spacing.lg,
          },
          scheme === "light" ? S.shadow.light : S.shadow.dark,
        ]}
      >
        <Pressable
          onPress={() => setOpenYearList((v) => !v)}
          style={({ pressed }) => [
            styles.yearRow,
            { borderColor: C.border, opacity: pressed ? 0.96 : 1 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.yearTitle, { color: C.text }]}>Tahun</Text>
            <Text style={[styles.yearValue, { color: C.textMuted }]}>
              {yearUI === "all" ? "Semua" : yearUI}
            </Text>
          </View>
          <Ionicons name={openYearList ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
        </Pressable>

        {openYearList && (
          <View style={[styles.yearList, { borderColor: C.border }]}>
            <Pressable
              onPress={() => {
                setYearUI("all");
                setOpenYearList(false);
              }}
              style={({ pressed }) => [
                styles.yearItem,
                {
                  backgroundColor:
                    yearUI === "all" ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent",
                  opacity: pressed ? 0.96 : 1,
                },
              ]}
            >
              <Text style={{ color: C.text, fontWeight: (yearUI === "all" ? "800" : "600") as any }}>
                Semua
              </Text>
            </Pressable>

            {yearsUI.map((y) => (
              <Pressable
                key={y}
                onPress={() => {
                  setYearUI(y);
                  setOpenYearList(false);
                }}
                style={({ pressed }) => [
                  styles.yearItem,
                  {
                    backgroundColor:
                      y === yearUI ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent",
                    opacity: pressed ? 0.96 : 1,
                  },
                ]}
              >
                <Text style={{ color: C.text, fontWeight: (y === yearUI ? "800" : "600") as any }}>
                  {y}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {showBlockingLoader ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.tint} size={"large"} />
          <Text style={{ marginTop: 8, color: C.textMuted }}>Menyiapkan data…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRows} // <- pakai hasil filter UI
          keyExtractor={(it) => it.id}
          contentContainerStyle={{
            padding: S.spacing.lg,
            paddingBottom: S.spacing.xl,
            paddingTop: S.spacing.md,
          }}
          ItemSeparatorComponent={() => <View style={{ height: S.spacing.md }} />}
          refreshing={refreshing}
          onRefresh={refresh}
          onScrollBeginDrag={() => setOpenYearList(false)}
          renderItem={renderItem}
          ListEmptyComponent={
            !loading ? (
              <View style={{ alignItems: "center", marginTop: 32 }}>
                <Text style={{ color: C.textMuted }}>Belum ada data musim.</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Header
  header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
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

  // Year selector
  selectorCard: { padding: 12, borderWidth: 1 },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  yearTitle: { fontSize: 12, fontWeight: "800" },
  yearValue: { fontSize: 12, marginTop: 2 },
  yearList: { borderTopWidth: 1, borderRadius: 10, overflow: "hidden", marginTop: 10 },
  yearItem: { paddingHorizontal: 12, paddingVertical: 10 },

  // Row card (musim)
  rowCard: {
    padding: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  actions: { flexDirection: "column", gap: 8, marginLeft: 8 },
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
