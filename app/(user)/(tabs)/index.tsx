import ButtonLogout from "@/components/ButtonLogout";
import WeatherSkeleton from "@/components/WeatherSkeleton";
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useWeather } from "@/hooks/useWeather";
import { getInitialsName } from "@/utils/getInitialsName";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const scheme = (useColorScheme() ?? "light") as "light" | "dark";
  const router = useRouter();
  const { profile, reloadProfile } = useAuth();
  const { weather, loading } = useWeather();
  const C = Colors[scheme];
  const S = Tokens;

  const displayName = profile?.full_name ?? "Pengunjung";
  const greet = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return "Selamat pagi 🌤";
    if (h < 15) return "Selamat siang ☀";
    if (h < 18) return "Selamat sore 🔆";
    return "Selamat malam";
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadProfile();
    }, [reloadProfile])
  );

  const dateText = useMemo(() => {
    const iso = weather?.localIso;
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [weather?.localIso]);

  const menus = [
    { key: "season", label: "Musim", icon: "calendar-outline", color: C.tint, href: "/sub/season" },
    { key: "income", label: "Penerimaan", icon: "arrow-down-circle-outline", color: C.tint, href: "/income" },
    { key: "expense", label: "Pengeluaran", icon: "arrow-up-circle-outline", color: C.tint, href: "/expense" },
    { key: "chart", label: "Chart", icon: "stats-chart-outline", color: C.tint, href: "/chart" },
    { key: "report", label: "Report", icon: "document-text-outline", color: C.tint, href: "/report" },
    { key: "informasi", label: "Panduan", icon: "information-circle-outline", color: C.tint, href: "/sub/information" },
  ] as const;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
      {/* HEADER (gradient) */}
      <LinearGradient
        colors={[C.gradientFrom, C.gradientTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingHorizontal: S.spacing.lg, paddingVertical: S.spacing.lg }]}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greet, { color: C.text, fontFamily: Fonts.rounded as any }]}>{greet}</Text>
            <Text style={[styles.greetName, { color: C.text, fontFamily: Fonts.sans as any }]}
              numberOfLines={1}
            >{displayName}</Text>
            <Text style={[styles.greetSub, { color: C.textMuted, fontFamily: Fonts.serif as any }]}>
              Semoga panenmu subur dan melimpah.
            </Text>
          </View>

          <ButtonLogout colors={[C.danger, C.gradientTo]} />

          <Pressable
            onPress={() => router.push("/(form)/sub/profile")}
            style={[
              styles.avatarWrap,
              { borderColor: C.success, backgroundColor: C.surface },
              scheme === "light" ? S.shadow.light : S.shadow.dark,
            ]}
          >
            <Text style={{
              color: C.text,
              fontFamily: Fonts.rounded as any,
              fontSize: 16,
              fontWeight: "bold"
            }}>
              {getInitialsName(profile?.full_name ?? "")}
            </Text>
          </Pressable>
        </View>
      </LinearGradient>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >

        <View style={{ paddingHorizontal: S.spacing.lg }}>
          {/* ====== CARD UTAMA */}
          <LinearGradient
            colors={[C.gradientFrom, C.gradientTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.mainCard,
              { borderRadius: S.radius.lg, borderColor: C.border },
              scheme === "light" ? S.shadow.light : S.shadow.dark,
            ]}
          >
            {loading ? (
              <WeatherSkeleton C={C} S={S} />
            ) : (
              <>
                <Image
                  source={require("@/assets/images/logo.png")}
                  style={[
                    styles.bgImage,
                    { tintColor: C.tint, opacity: 0.9 },
                  ]}
                  resizeMode="contain"
                />

                <View style={styles.mainRow}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.mainTitle,
                        { color: C.text, fontFamily: Fonts.rounded as any, fontWeight: "900" },
                      ]}
                    >
                      {weather?.tempC != null ? Math.round(weather.tempC) : "-"}°
                    </Text>
                    <Text
                      style={[
                        styles.mainSub,
                        { color: C.text, fontFamily: Fonts.sans as any, fontWeight: "700" },
                      ]}
                    >
                      {weather?.conditionText ?? "-"}
                    </Text>
                  </View>
                </View>

                <View style={styles.chipsRow}>
                  <View style={[styles.chip, { borderColor: C.tint, backgroundColor: C.surface }]}>
                    <Ionicons name="calendar-outline" size={14} color={C.textMuted} />
                    <Text style={[styles.chipText, { color: C.text }]}>{dateText}</Text>
                  </View>
                  <View style={[styles.chip, { borderColor: C.tint, backgroundColor: C.surface }]}>
                    <Ionicons name="location-outline" size={14} color={C.textMuted} />
                    <Text style={[styles.chipText, { color: C.text }]}>
                      {(weather?.city ?? "") + (weather?.region ? `, ${weather.region}` : "")}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </LinearGradient>

          <View style={[styles.grid, { marginTop: S.spacing.lg }]}>
            {menus.map((m) => (
              <Link
                key={m.key}
                href={m.href}
                asChild
                style={{ alignItems: "center" }}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.square,
                    {
                      backgroundColor: C.surface,
                      borderColor: C.border,
                      borderRadius: S.radius.md,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                    scheme === "light" ? S.shadow.light : S.shadow.dark,
                  ]}
                >
                  <View
                    style={[
                      styles.squareIconWrap,
                      { backgroundColor: m.color + "1A", borderColor: C.border },
                    ]}
                  >
                    <Ionicons name={m.icon as any} size={26} color={m.color} />
                  </View>
                  <Text style={[styles.squareLabel, { color: C.text, fontFamily: Fonts.sans as any }]}>
                    {m.label}
                  </Text>
                </Pressable>
              </Link>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  greet: { fontSize: 14, opacity: 0.9 },
  greetName: { fontSize: 22, fontWeight: "800", marginTop: 2 },
  greetSub: { fontSize: 12, marginTop: 2 },
  avatarWrap: {
    justifyContent: "center", alignItems: "center",
    width: 54, height: 54, borderRadius: 54, overflow: "hidden", borderWidth: 1
  },
  mainCard: { marginTop: 16, padding: 16, borderWidth: 1 },
  mainTitle: { fontSize: 42, fontWeight: "900", letterSpacing: 1 },
  mainSub: { fontSize: 13, marginTop: 2 },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 1,
  },

  chipsRow: { flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { fontSize: 12, fontWeight: "700" },

  bgImage: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 100,
    height: 100,
    zIndex: 0,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 28,
  },
  square: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexBasis: "48%",
    marginBottom: 12,
    aspectRatio: 1,
    padding: 12,
  },
  squareIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  squareLabel: { fontSize: 12, fontWeight: "800", textAlign: "center" },
});
