// app/season/index.tsx
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { SeasonRow, useSeasonList, useSeasonService } from "@/services/seasonService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback } from "react";
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

  // Data list anti-spam (fetchOnce, refresh, filter tahun)
  const {
    loading,
    refreshing,
    data,
    years,
    year,
    setYear,
    fetchOnce,
    refresh,
  } = useSeasonList();

  // CRUD (hapus)
  const { deleteSeason } = useSeasonService();

  // buka/utup dropdown tahun
  const [openYearList, setOpenYearList] = React.useState(false);

  // initial fetch (idempotent)
  useFocusEffect(
    useCallback(() => {
      fetchOnce();
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
      router.push(`/(form)/season/seasonForm?seasonId=${item.id}`);
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
                await refresh(); // sinkron ulang tanpa ubah filter tahun user
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

  // loader blok awal
  const showBlockingLoader = loading && data.length === 0;

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
            onPress={() => router.push("/(tabs)")}
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
          onPress={() => router.push("/(form)/season/seasonForm")}
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

      {showBlockingLoader ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.tint} size={"large"} />
          <Text style={{ marginTop: 8, color: C.textMuted }}>Menyiapkan data…</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: S.spacing.lg, paddingBottom: S.spacing.xl }}
          ItemSeparatorComponent={() => <View style={{ height: S.spacing.md }} />}
          refreshing={refreshing}
          onRefresh={refresh}
          ListHeaderComponent={
            <View
              style={[
                styles.selectorCard,
                { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
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
                    {year === "all" ? "Semua" : year}
                  </Text>
                </View>
                <Ionicons name={openYearList ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
              </Pressable>

              {openYearList && (
                <View style={[styles.yearList, { borderColor: C.border }]}>
                  <Pressable
                    onPress={() => {
                      setYear("all"); // tidak akan di-override lagi oleh service
                      setOpenYearList(false);
                    }}
                    style={({ pressed }) => [
                      styles.yearItem,
                      {
                        backgroundColor: year === "all" ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent",
                        opacity: pressed ? 0.96 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: C.text, fontWeight: (year === "all" ? "800" : "600") as any }}>
                      Semua
                    </Text>
                  </Pressable>

                  {years.map((y) => (
                    <Pressable
                      key={y}
                      onPress={() => {
                        setYear(y);
                        setOpenYearList(false);
                      }}
                      style={({ pressed }) => [
                        styles.yearItem,
                        {
                          backgroundColor: y === year ? (scheme === "light" ? C.surfaceSoft : C.surface) : "transparent",
                          opacity: pressed ? 0.96 : 1,
                        },
                      ]}
                    >
                      <Text style={{ color: C.text, fontWeight: (y === year ? "800" : "600") as any }}>{y}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={{ alignItems: "center", marginTop: 32 }}>
                <Text style={{ color: C.textMuted }}>Belum ada data musim.</Text>
              </View>
            ) : null
          }
          renderItem={renderItem}
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
  selectorCard: { padding: 12, borderWidth: 1, marginBottom: 12 },
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
