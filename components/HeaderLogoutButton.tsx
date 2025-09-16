import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet } from "react-native";

type Props = {
    confirm?: boolean;
    color?: string;
    size?: number;
};

export default function HeaderLogoutButton({
    confirm = true,
    color,
    size = 18,
}: Props) {
    const { signOut, loading } = useAuth();
    const router = useRouter();

    const onLogout = async () => {
        const doLogout = async () => {
            try {
                await signOut();
            } finally {
                router.push("/(auth)/login");
            }
        };

        if (!confirm) {
            await doLogout();
            return;
        }

        Alert.alert("Keluar Akun", "Anda yakin ingin keluar?", [
            { text: "Batal", style: "cancel" },
            { text: "Keluar", style: "destructive", onPress: doLogout },
        ]);
    };

    const scheme: "light" | "dark" = "light";
    const C = Colors[scheme];

    return (
        <Pressable
            onPress={onLogout}
            disabled={loading}
            style={({ pressed }) => [
                styles.btn,
                {
                    borderColor: C.border,
                    backgroundColor: C.danger + "45",
                    opacity: loading ? 0.6 : pressed ? 0.9 : 1,
                },
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Logout"
        >
            {loading ? (
                <ActivityIndicator />
            ) : (
                <Ionicons
                    style={{ marginLeft: 4 }}
                    name="log-out-outline" size={size} color={color ?? C.danger} />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    btn: {
        // width: 36,
        // height: 36,
        borderRadius: 999,
        padding: 8,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
});
