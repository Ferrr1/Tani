import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

type Percent = `${number}%`;

type Props = {
    width: number | Percent;
    height: number;
    radius?: number;
    base?: string;
    highlight?: string;
    shimmerWidthRatio?: number;
    opacity?: number;
};

const AnimatedLG = Animated.createAnimatedComponent(LinearGradient);

export default function SkeletonBox({
    width,
    height,
    radius = 10,
    base = "#E6E8EC",
    highlight = "#F2F4F7",
    shimmerWidthRatio = 0.6,
    opacity = 0.6,
}: Props) {
    const x = useSharedValue(-100);

    useEffect(() => {
        x.value = withRepeat(
            withTiming(100, {
                duration: 1200,
                easing: Easing.inOut(Easing.quad),
            }),
            -1,
            true
        );
    }, [x]);

    const shimmerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: x.value }],
    }));

    const containerStyle: ViewStyle = {
        width,
        height,
        borderRadius: radius,
        overflow: "hidden",
        backgroundColor: base,
    };

    return (
        <View style={[styles.box, containerStyle]}>
            <AnimatedLG
                colors={[base, highlight, base]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[
                    styles.shimmer,
                    {
                        width: `${Math.min(Math.max(shimmerWidthRatio, 0.1), 1) * 100}%`,
                        opacity,
                    },
                    shimmerStyle,
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    box: {
        position: "relative",
    },
    shimmer: {
        position: "absolute",
        top: 0,
        bottom: 0,
    },
});
