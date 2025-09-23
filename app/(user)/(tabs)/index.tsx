import HeaderLogoutButton from "@/components/HeaderLogoutButton";
import { Colors, Fonts, Tokens } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { getInitialsName } from "@/utils/getInitialsName";
import { codeToText } from "@/utils/weather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
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

type WeatherNow = {
  tempC: number | null;
  weatherCode: number | null;
  conditionText: string;
  tzId: string;               // e.g. "Asia/Jakarta"
  localIso: string;           // ISO string like "2025-09-19T10:30"
  city?: string;
  region?: string;
};

const TZ_ABBR: Record<string, string> = {
  "Asia/Jakarta": "WIB",
  "Asia/Makassar": "WITA",
  "Asia/Jayapura": "WIT",
};

// map kode Open-Meteo → teks sederhana (ID)


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

  // ====== Cuaca (tanpa API key, pakai Open-Meteo + lokasi perangkat)
  const [wx, setWx] = useState<WeatherNow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      try {
        setLoading(true);

        // 1) Minta izin lokasi
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") throw new Error("Izin lokasi ditolak.");

        // 2) Ambil posisi & reverse geocode untuk nama kota/region
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude: lat, longitude: lon } = pos.coords;

        let city: string | undefined;
        let region: string | undefined;
        try {
          const rg = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
          if (rg?.[0]) {
            city = rg[0].city || rg[0].subregion || rg[0].district || rg[0].name || undefined;
            region = rg[0].region || rg[0].subregion || undefined;
          }
        } catch {
          // abaikan kesalahan reverse geocode
        }

        const params = new URLSearchParams({
          latitude: String(lat),
          longitude: String(lon),
          current: "temperature_2m,weather_code",
          timezone: "auto",
        });
        const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
        const json = await res.json();

        const tempC = json?.current?.temperature_2m ?? null;
        const code = json?.current?.weather_code ?? null;
        const timeIso = json?.current?.time ?? new Date().toISOString();
        const tzId = json?.timezone ?? "Asia/Jakarta";

        if (!cancelled) {
          setWx({
            tempC,
            weatherCode: code,
            conditionText: codeToText(code),
            tzId,
            localIso: timeIso,
            city,
            region,
          });
        }
      } catch {
        if (!cancelled) {
          const tz = "Asia/Jakarta";
          const nowJakarta = new Date().toLocaleString("sv-SE", { timeZone: tz }).replace(" ", "T");
          setWx({
            tempC: 28,
            weatherCode: 2,
            conditionText: "Cerah berawan",
            tzId: tz,
            localIso: nowJakarta,
            city: "Malang",
            region: "Jawa Timur",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWeather();
    return () => {
      cancelled = true;
    };
  }, []);

  const dateText = useMemo(() => {
    const iso = wx?.localIso;
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [wx?.localIso]);

  const tzAbbr = useMemo(() => {
    const tz = wx?.tzId;
    if (!tz || typeof tz !== "string") return "WIB";
    const mapped = TZ_ABBR[tz];
    if (mapped) return mapped;
    const last = tz.includes("/") ? tz.split("/").pop() : tz;
    return last || "WIB";
  }, [wx?.tzId]);

  const menus = [
    { key: "season", label: "Musim", icon: "calendar-outline", color: C.success, href: "/sub/season" },
    { key: "income", label: "Penerimaan", icon: "arrow-down-circle-outline", color: C.success, href: "/income" },
    { key: "expense", label: "Pengeluaran", icon: "arrow-up-circle-outline", color: C.danger, href: "/expense" },
    { key: "chart", label: "Chart", icon: "stats-chart-outline", color: C.info, href: "/chart" },
    { key: "report", label: "Report", icon: "document-text-outline", color: C.tint, href: "/report" },
    { key: "informasi", label: "Panduan", icon: "information-circle-outline", color: C.tint, href: "/sub/information" },
  ] as const;

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
              <Text style={[styles.greetName, { color: C.text, fontFamily: Fonts.sans as any }]}
                numberOfLines={1}
              >{displayName}</Text>
              <Text style={[styles.greetSub, { color: C.textMuted, fontFamily: Fonts.serif as any }]}>
                Semoga panenmu subur dan melimpah.
              </Text>
            </View>

            <HeaderLogoutButton size={28} confirm={true} />

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
                    {/* Weight cuaca: suhu sangat tebal, deskripsi medium */}
                    <Text style={[
                      styles.mainTitle,
                      { color: C.text, fontFamily: Fonts.rounded as any, fontWeight: "900" }
                    ]}>
                      {wx?.tempC != null ? Math.round(wx.tempC) : "-"}°
                    </Text>
                    <Text style={[
                      styles.mainSub,
                      { color: C.text, fontFamily: Fonts.sans as any, fontWeight: "700" }
                    ]}>
                      {wx?.conditionText ?? "-"}
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
                      {(wx?.city ?? "") + (wx?.region ? `, ${wx.region}` : "")}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </LinearGradient>

          {/* Ganti container grid-mu jadi pakai styles.grid */}
          <View style={[styles.grid, { marginTop: S.spacing.lg }]}>
            {menus.map((m) => (
              <Link
                key={m.key}
                href={m.href}
                asChild
                style={{ justifyContent: "center", alignItems: "center" }}
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

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    gap: 12, // bikin 2 kolom dengan gap horizontal
  },
  square: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexBasis: "48%",   // ~2 kolom
    marginBottom: 12,   // jarak vertikal antar baris
    aspectRatio: 1,     // kotak
    padding: 12,        // ruang dalam item
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
