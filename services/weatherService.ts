import { codeToText } from "@/utils/weather";

export type WeatherNow = {
  tempC: number | null;
  weatherCode: number | null;
  conditionText: string;
  tzId: string;
  localIso: string;
  city?: string;
  region?: string;
};

export async function fetchWeather(lat: number, lon: number): Promise<WeatherNow> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,weather_code",
    timezone: "auto",
  });
  
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error(`Weather fetch failed: ${res.status}`);
  }
  
  const json = await res.json();
  const tempC = json?.current?.temperature_2m ?? null;
  const code = json?.current?.weather_code ?? null;
  const timeIso = json?.current?.time ?? new Date().toISOString();
  const tzId = json?.timezone ?? "Asia/Jakarta";

  return {
    tempC,
    weatherCode: code,
    conditionText: codeToText(code),
    tzId,
    localIso: timeIso,
  };
}

export const FALLBACK_WEATHER: WeatherNow = {
  tempC: 28,
  weatherCode: 2,
  conditionText: "Cerah berawan",
  tzId: "Asia/Jakarta",
  localIso: new Date().toISOString(),
  city: "Malang",
  region: "Jawa Timur",
};
