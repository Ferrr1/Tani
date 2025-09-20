import { Colors } from "@/constants/theme";
import { Link } from "expo-router";
import { Text, useColorScheme, View } from "react-native";

export default function NotFound() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    return (
        <View style={{ backgroundColor: C.background, flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: C.text }}>Halaman tidak ditemukan</Text>
            <Link style={{ color: C.tint }} href="/(auth)">Ke Halaman Login</Link>
        </View>
    );
}
