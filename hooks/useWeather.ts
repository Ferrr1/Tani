import { fetchWeather, FALLBACK_WEATHER, WeatherNow } from "@/services/weatherService";
import * as Location from "expo-location";
import { useEffect, useState, useCallback } from "react";

export function useWeather() {
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWeather = useCallback(async () => {
    let cancelled = false;
    try {
      setLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Izin lokasi ditolak.");
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude: lat, longitude: lon } = pos.coords;

      // Reverse Geocode
      let city: string | undefined;
      let region: string | undefined;
      try {
        const rg = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (rg?.[0]) {
          city = rg[0].city || rg[0].subregion || rg[0].district || rg[0].name || undefined;
          region = rg[0].region || rg[0].subregion || undefined;
        }
      } catch (e) {
        console.warn("Reverse geocode failed", e);
      }

      const data = await fetchWeather(lat, lon);
      if (!cancelled) {
        setWeather({ ...data, city, region });
      }
    } catch (e: any) {
      console.warn("useWeather error:", e?.message);
      if (!cancelled) {
        setWeather(FALLBACK_WEATHER);
        setError(e?.message || "Gagal mengambil data cuaca");
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  return { weather, loading, error, refresh: loadWeather };
}
