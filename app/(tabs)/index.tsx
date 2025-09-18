import HeaderLogoutButton from "@/components/HeaderLogoutButton";
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { getInitialsName } from "@/utils/getInitialsName";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type WeatherApi = {
  location: { name: string; region: string; country: string; tz_id: string; localtime: string };
  current: { temp_c: number; condition: { text: string; icon: string } };
};

const TZ_ABBR: Record<string, string> = {
  "Asia/Jakarta": "WIB",
  "Asia/Makassar": "WITA",
  "Asia/Jayapura": "WIT",
};

export default function HomeScreen() {
  const scheme = (useColorScheme() ?? "light") as "light" | "dark";
  const router = useRouter();
  const { profile } = useAuth();
  const C = Colors[scheme];
  const S = Tokens;

  // ====== Greeting & user
  const displayName = profile?.full_name ?? "Pengunjung";
  const greet = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11) return "Selamat pagi 🌤";
    if (h < 15) return "Selamat siang ☀";
    if (h < 18) return "Selamat sore 🔆";
    return "Selamat malam";
  }, []);

  // ====== WeatherAPI (ambil suhu, kondisi, tanggal, tz)
  const [wx, setWx] = useState<WeatherApi | null>(null);
  const [loading, setLoading] = useState(true);
  const API_KEY = process.env.EXPO_PUBLIC_WEATHER_API_KEY as string;
  const QUERY = (process.env.EXPO_PUBLIC_WEATHER_QUERY as string) || "auto:ip";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const url = `https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${encodeURIComponent(
          QUERY
        )}&aqi=no`;
        const res = await fetch(url);
        const data: WeatherApi = await res.json();
        if (!cancelled) setWx(data);
      } catch {
        if (!cancelled)
          setWx({
            location: {
              name: "Malang",
              region: "Jawa Timur",
              country: "Indonesia",
              tz_id: "Asia/Jakarta",
              localtime: new Date()
                .toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" })
                .replace("T", " "),
            },
            current: { temp_c: 28, condition: { text: "Cerah berawan", icon: "" } },
          });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const dateText = useMemo(() => {
    if (!wx) return "";
    const d = new Date(wx.location.localtime.replace(" ", "T"));
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [wx]);

  const tzAbbr = useMemo(() => {
    if (!wx) return "WIB";
    return TZ_ABBR[wx.location.tz_id] ?? (wx.location.tz_id.split("/").pop() || "WIB");
  }, [wx]);

  const menus = [
    { key: "season", label: "Musim", icon: "calendar-outline", color: C.success, href: "/season" },
    { key: "income", label: "Penerimaan", icon: "arrow-down-circle-outline", color: C.success, href: "/income" },
    { key: "expense", label: "Pengeluaran", icon: "arrow-up-circle-outline", color: C.danger, href: "/expense" },
    { key: "chart", label: "Chart", icon: "stats-chart-outline", color: C.info, href: "/chart" },
    { key: "report", label: "Report", icon: "document-text-outline", color: C.tint, href: "/report" },
  ] as const;
  console.log(profile)
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: S.spacing.xl }} showsVerticalScrollIndicator={false}>
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
              <Text style={[styles.greetName, { color: C.text, fontFamily: Fonts.sans as any }]}>{displayName}</Text>
              <Text style={[styles.greetSub, { color: C.textMuted, fontFamily: Fonts.serif as any }]}>
                Semoga panenmu subur dan melimpah.
              </Text>
            </View>

            <HeaderLogoutButton size={28} confirm={true} />

            <Pressable
              onPress={() => router.push("/(sub)/profile")}
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

        <View style={{ paddingHorizontal: S.spacing.lg }}>
          {/* ====== CARD UTAMA (gradient sama seperti header, TANPA JAM) */}
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
              <View style={{ paddingVertical: 12, alignItems: "center" }}>
                <ActivityIndicator color={C.tint} size={"large"} />
              </View>
            ) : (
              <>
                <View style={styles.mainRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mainTitle, { color: C.text, fontFamily: Fonts.rounded as any }]}>
                      {wx?.current?.temp_c ?? "-"}°
                    </Text>
                    <Text style={[styles.mainSub, { color: C.text, fontFamily: Fonts.sans as any }]}>
                      {wx?.current?.condition?.text ?? "-"}
                    </Text>
                  </View>
                  <Ionicons name="leaf-outline" size={44} color={C.tint} />
                </View>

                <View style={styles.chipsRow}>
                  <View style={[styles.chip, { borderColor: C.tint, backgroundColor: C.surface }]}>
                    <Ionicons name="calendar-outline" size={14} color={C.textMuted} />
                    <Text style={[styles.chipText, { color: C.text }]}>{dateText}</Text>
                  </View>
                  <View style={[styles.chip, { borderColor: C.tint, backgroundColor: C.surface }]}>
                    <Ionicons name="time-outline" size={14} color={C.textMuted} />
                    <Text style={[styles.chipText, { color: C.text }]}>{tzAbbr}</Text>
                  </View>
                  <View style={[styles.chip, { borderColor: C.tint, backgroundColor: C.surface }]}>
                    <Ionicons name="location-outline" size={14} color={C.textMuted} />
                    <Text style={[styles.chipText, { color: C.text }]}>
                      {wx?.location?.name ?? ""}{wx?.location?.region ? `, ${wx.location.region}` : ""}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </LinearGradient>

          <View style={{ marginTop: S.spacing.lg, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            {menus.map((m, i) => (
              <Link style={{ justifyContent: "center", alignItems: "center" }} key={m.key} href={m.href} asChild>
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

  // Header
  header: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  greet: { fontSize: 14, opacity: 0.9 },
  greetName: { fontSize: 22, fontWeight: "800", marginTop: 2 },
  greetSub: { fontSize: 12, marginTop: 2 },
  avatarWrap: {
    justifyContent: "center", alignItems: "center",
    width: 54, height: 54, borderRadius: 54, overflow: "hidden", borderWidth: 1
  },
  avatar: { width: "100%", height: "100%" },

  // Main card (gradient sama dengan header)
  mainCard: { marginTop: 16, padding: 16, borderWidth: 1 },
  mainRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mainTitle: { fontSize: 42, fontWeight: "900", letterSpacing: 1 },
  mainSub: { fontSize: 13, marginTop: 2 },

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

  // Square menu (2 per baris)
  square: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  squareIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  squareLabel: { fontSize: 12, fontWeight: "800", textAlign: "center" },
});
