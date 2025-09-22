import { useWeatherByLocation } from "@/hooks/useWeatherByLocation";
import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

function WeatherWidget({ tint, text }: { tint: string; text: string }) {
    const { loading, error, coords, weather, refresh } = useWeatherByLocation();

    if (loading) {
        return (
            <View style={{ marginTop: 12, alignItems: "center" }}>
                <ActivityIndicator color={tint} />
                <Text style={{ color: text, marginTop: 6 }}>Mengambil cuaca…</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={{ marginTop: 12 }}>
                <Text style={{ color: text, marginBottom: 8 }}>Cuaca: {error}</Text>
                <Pressable
                    onPress={refresh}
                    style={{ alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: tint }}
                >
                    <Text style={{ color: "#fff", fontWeight: "700" }}>Coba lagi</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={{ marginTop: 12 }}>
            <Text style={{ color: text }}>
                Lokasi: {coords ? `${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)}` : "-"}
            </Text>
            <Text style={{ color: text }}>
                Suhu saat ini: {weather?.temperature != null ? `${weather.temperature}°C` : "-"}
            </Text>
            <Text style={{ color: text }}>
                Angin: {weather?.windspeed != null ? `${weather.windspeed} m/s` : "-"}
            </Text>
            <Pressable
                onPress={refresh}
                style={{ alignSelf: "flex-start", marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: tint }}
            >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Gunakan lokasi saya</Text>
            </Pressable>
        </View>
    );
}

export default WeatherWidget;