import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

type WeatherNow = {
  temperature: number | null;
  windspeed: number | null;
  weathercode: number | null;
};

export function useWeatherByLocation() {
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: "temperature_2m,wind_speed_10m,weather_code",
      timezone: "auto",
    });
    const resp = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params.toString()}`
    );
    if (!resp.ok) throw new Error(`Weather fetch failed: ${resp.status}`);
    const json = await resp.json();

    const w: WeatherNow = {
      temperature: json?.current?.temperature_2m ?? null,
      windspeed: json?.current?.wind_speed_10m ?? null,
      weathercode: json?.current?.weather_code ?? null,
    };
    setWeather(w);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Izin lokasi ditolak.");
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = loc.coords.latitude;
      const lon = loc.coords.longitude;
      setCoords({ lat, lon });

      await fetchWeather(lat, lon);
    } catch (e: any) {
      setError(e?.message ?? "Gagal mengambil cuaca.");
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }, [fetchWeather]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { loading, error, coords, weather, refresh };
}
