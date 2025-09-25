import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useSeasonFilter } from "@/context/SeasonFilterContext";
import { useReceiptList, useReceiptService } from "@/services/receiptService";
import { useSeasonList } from "@/services/seasonService";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function IncomeScreen() {
  const scheme = (useColorScheme() ?? "light") as "light" | "dark";
  const C = Colors[scheme];
  const S = Tokens;
  const router = useRouter();
  const { loading: seasonLoading, rows: seasonRows, fetchOnce: fetchSeasons } = useSeasonList();
  const { seasonId, setSeasonId, ready } = useSeasonFilter();
  const [openSeasonList, setOpenSeasonList] = useState(false);
  const seasons = useMemo(
    () =>
      [...seasonRows].sort(
        (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      ),
    [seasonRows]
  );
  useEffect(() => {
    if (!ready) return;
    if (seasonId != null) return;
    if (!seasons.length) return;
    setSeasonId(seasons[0].id);
  }, [ready, seasonId, seasons, setSeasonId]);

  const currentIdx = useMemo(
    () => (seasonId ? seasons.findIndex((s) => s.id === seasonId) : -1),
    [seasons, seasonId]
  );
  const currentSeason = currentIdx >= 0 ? seasons[currentIdx] : undefined;
  const {
    loading: receiptLoading,
    refreshing,
    data: receipts,
    refresh: refreshReceipts,
    grandTotal,
  } = useReceiptList(seasonId ?? undefined);

  const { deleteReceipt } = useReceiptService();
  useFocusEffect(
    useCallback(() => {
      fetchSeasons();
      setOpenSeasonList(false);
      if (ready && seasonId) {
        refreshReceipts({ force: true });
      }
      return () => setOpenSeasonList(false);
    }, [fetchSeasons, ready, seasonId, refreshReceipts])
  );
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatMoney = (n: number) =>
    `+${(Number(n) || 0).toLocaleString("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    })}`;

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/(form)/income/incomeForm?receiptId=${id}`);
    },
    [router]
  );

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert("Hapus Penerimaan", "Yakin menghapus data ini?", [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteReceipt(id);
              await refreshReceipts({ force: true });
            } catch (e: any) {
              Alert.alert("Gagal", e?.message ?? "Tidak dapat menghapus data.");
            }
          },
        },
      ]);
    },
    [deleteReceipt, refreshReceipts]
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
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
        {/* Badge kiri */}
        <View
          style={[
            styles.dateBadge,
            { backgroundColor: C.surfaceSoft, borderColor: C.border },
          ]}
        >
          <Text style={{ color: C.text, fontSize: 12, fontWeight: "700" }} numberOfLines={1}>
            {formatDate(item.created_at)}
          </Text>
          <Text
            style={{ color: C.textMuted, fontSize: 12, fontFamily: Fonts.serif as any }}
            numberOfLines={1}
          >
            {item.unit_type} × {Number(item.quantity)}
          </Text>
          <Text style={{ color: C.success, fontSize: 16, fontWeight: "900", marginTop: 2 }} numberOfLines={1}>
            {formatMoney(item.total)}
          </Text>
        </View>

        {/* Aksi kanan */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => handleEdit(item.id)}
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: C.border, backgroundColor: C.surfaceSoft, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="create-outline" size={16} color={C.text} />
            <Text style={[styles.actionText, { color: C.text }]}>Ubah</Text>
          </Pressable>

          <Pressable
            onPress={() => handleDelete(item.id)}
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

  if (!ready) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.tint} size="large" />
        <Text style={{ marginTop: 8, color: C.textMuted }}>Menyiapkan filter…</Text>
      </SafeAreaView>
    );
  }

  const showBlocking = (seasonLoading || receiptLoading) && (receipts?.length ?? 0) === 0;

  const canPrev = currentIdx >= 0 && currentIdx < seasons.length - 1;
  const canNext = currentIdx > 0;
  const goPrev = () => { if (canPrev) setSeasonId(seasons[currentIdx + 1].id); };
  const goNext = () => { if (canNext) setSeasonId(seasons[currentIdx - 1].id); };

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
          <Text style={[styles.headerTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
            Penerimaan
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <Pressable
          onPress={() =>
            router.push(`/(form)/income/incomeForm${seasonId ? `?seasonId=${seasonId}` : ""}`)
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

      {/* FILTER SEASON (fixed di luar list) */}
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            onPress={goPrev}
            disabled={!canPrev}
            style={({ pressed }) => [
              styles.navBtn,
              {
                borderColor: C.border,
                backgroundColor: canPrev ? C.surfaceSoft : C.surface,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={16} color={canPrev ? C.text : C.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => setOpenSeasonList((v) => !v)}
            style={({ pressed }) => [
              styles.seasonRow,
              { borderColor: C.border, opacity: pressed ? 0.96 : 1, flex: 1 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.seasonTitle, { color: C.text }]}>
                {currentSeason ? `Musim Ke-${currentSeason.season_no}` : "Pilih Musim"}
              </Text>
              {currentSeason && (
                <Text style={[styles.seasonRange, { color: C.textMuted }]}>
                  {formatDate(currentSeason.start_date)} — {formatDate(currentSeason.end_date)}
                </Text>
              )}
            </View>
            <Ionicons name={openSeasonList ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
          </Pressable>

          <Pressable
            onPress={goNext}
            disabled={!canNext}
            style={({ pressed }) => [
              styles.navBtn,
              {
                borderColor: C.border,
                backgroundColor: canNext ? C.surfaceSoft : C.surface,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="chevron-forward" size={16} color={canNext ? C.text : C.textMuted} />
          </Pressable>
        </View>

        {openSeasonList && (
          <View style={[styles.seasonList, { borderColor: C.border }]}>
            {seasons.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  setSeasonId(s.id);
                  setOpenSeasonList(false);
                }}
                style={({ pressed }) => [
                  styles.seasonItem,
                  {
                    backgroundColor:
                      s.id === seasonId
                        ? scheme === "light"
                          ? C.surfaceSoft
                          : C.surface
                        : "transparent",
                    opacity: pressed ? 0.96 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: C.text,
                    fontWeight: (s.id === seasonId ? "800" : "600") as any,
                  }}
                >
                  Musim Ke-{s.season_no}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>
                  {formatDate(s.start_date)} — {formatDate(s.end_date)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* LIST */}
      {showBlocking ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.tint} size={"large"} />
          <Text style={{ marginTop: 8, color: C.textMuted }}>Menyiapkan data…</Text>
        </View>
      ) : (
        <FlatList
          key={seasonId ?? "none"} // remount ketika filter berubah
          data={receipts}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: S.spacing.lg, paddingBottom: S.spacing.xl, paddingTop: S.spacing.md }}
          ItemSeparatorComponent={() => <View style={{ height: S.spacing.md }} />}
          refreshing={refreshing}
          onRefresh={() => refreshReceipts({ force: true })}
          onScrollBeginDrag={() => setOpenSeasonList(false)}
          renderItem={renderItem}
          ListFooterComponent={
            (receipts?.length ?? 0) > 0 ? (
              <View style={{ marginTop: 8, alignItems: "flex-end" }}>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>Total Penerimaan</Text>
                <Text style={{ color: C.success, fontSize: 16, fontWeight: "900" }}>
                  {formatMoney(grandTotal)}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !(seasonLoading || receiptLoading) ? (
              <View
                style={[
                  styles.emptyWrap,
                  { backgroundColor: C.surface, borderColor: C.border, borderRadius: S.radius.lg },
                  scheme === "light" ? S.shadow.light : S.shadow.dark,
                ]}
              >
                <Ionicons name="document-text-outline" size={24} color={C.icon} />
                <Text style={{ color: C.textMuted, marginTop: 6 }}>Belum ada data penerimaan.</Text>
                <Pressable
                  onPress={() =>
                    router.push(`/(form)/income/incomeForm${seasonId ? `?seasonId=${seasonId}` : ""}`)
                  }
                  style={({ pressed }) => [
                    styles.ctaEmpty,
                    { backgroundColor: C.tint, opacity: pressed ? 0.95 : 1 },
                  ]}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "800" }}>Tambah Data</Text>
                </Pressable>
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

  // Season selector
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
  navBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  // Row
  rowCard: {
    padding: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  dateBadge: {
    maxWidth: 175,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    gap: 6,
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

  // Empty state
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  ctaEmpty: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
});
