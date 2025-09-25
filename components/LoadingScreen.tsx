import { Colors, Fonts } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { ActivityIndicator, Text, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
    title?: string;
    subtitle?: string;
    showSpinner?: boolean;
    progress?: number;
};

export default function LoadingScreen({
    title = "Memuat…",
    subtitle,
    showSpinner = true,
    progress,
}: Props) {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const insets = useSafeAreaInsets();

    const pct = useMemo(() => {
        if (typeof progress !== "number") return undefined;
        if (progress < 0) return 0;
        if (progress > 1) return 1;
        return progress;
    }, [progress]);

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: C.background,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
            }}
        >
            <LinearGradient
                colors={[C.gradientFrom, C.gradientTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: "absolute", inset: 0, opacity: 0.18 }}
            />

            <View
                style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 14,
                    paddingHorizontal: 24,
                }}
            >
                {showSpinner && <ActivityIndicator color={C.tint} size="large" />}

                <Text
                    style={{
                        color: C.text,
                        fontFamily: Fonts.sans,
                        fontSize: 18,
                    }}
                >
                    {title}
                </Text>

                {!!subtitle && (
                    <Text
                        style={{
                            color: C.textMuted,
                            fontFamily: Fonts.sans,
                            fontSize: 14,
                            textAlign: "center",
                            lineHeight: 20,
                        }}
                    >
                        {subtitle}
                    </Text>
                )}

                {typeof pct === "number" && (
                    <View style={{ width: "70%", marginTop: 8, gap: 8 }}>
                        <View
                            style={{
                                height: 8,
                                borderRadius: 999,
                                backgroundColor: C.border,
                                overflow: "hidden",
                            }}
                        >
                            <View
                                style={{
                                    width: `${pct * 100}%`,
                                    height: "100%",
                                    backgroundColor: C.tint,
                                }}
                            />
                        </View>
                        <Text
                            style={{
                                color: C.textMuted,
                                fontFamily: Fonts.sans,
                                fontSize: 12,
                                textAlign: "center",
                            }}
                        >
                            {Math.round(pct * 100)}%
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}
