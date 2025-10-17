import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ColorValue,
    Pressable,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";

type Min2<T> = [T, T];
type LogoutProps = {
    colors: Min2<ColorValue>;
    style?: ViewStyle;
};

export default function ButtonLogout({ colors, style }: LogoutProps) {
    const { signOut } = useAuth();
    const [isLogout, setLogoutting] = useState(false);

    const onLogout = async () => {
        const doLogout = async () => {
            try {
                setLogoutting(true);
                await signOut();
                router.replace("/(auth)");
            } finally {
                setLogoutting(false);
            }
        };

        // tampilkan dialog konfirmasi modern
        Alert.alert("Keluar Akun", "Anda yakin ingin keluar?", [
            { text: "Batal", style: "cancel" },
            { text: "Keluar", style: "destructive", onPress: doLogout },
        ]);
    };

    return (
        <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[logoutStyles.borderWrap, style]}
        >
            <Pressable
                onPress={onLogout}
                android_ripple={{ color: "rgba(255,255,255,0.15)" }}
                style={logoutStyles.inner}
                accessibilityRole="button"
                accessibilityLabel="Logout"
            >
                {isLogout ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <View style={logoutStyles.row}>
                        <Ionicons name="log-out-outline" size={16} color="#fff" />
                        <Text style={logoutStyles.text}>Keluar</Text>
                    </View>
                )}
            </Pressable>
        </LinearGradient>
    );
}

const logoutStyles = StyleSheet.create({
    borderWrap: {
        borderRadius: 999,
        padding: 1.5, // thin gradient ring
    },
    inner: {
        paddingHorizontal: 12,
        height: 34,
        borderRadius: 999,
        backgroundColor: "rgba(248, 0, 0, 0.57)", // glassy
        borderWidth: 1,
        borderColor: "rgba(248, 0, 0, 0.72)",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    text: {
        color: "#ffffff",
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 0.3,
    },
});
