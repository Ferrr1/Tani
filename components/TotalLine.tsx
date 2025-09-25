import { Theme } from "@/types/report";
import { currency } from "@/utils/currency";
import { StyleSheet, Text, View } from "react-native";

export default function TotalLine({
    C,
    label,
    value,
    valueStr,
    bold,
}: {
    C: Theme;
    label: string;
    value?: number;
    valueStr?: string;
    bold?: boolean;
}) {
    return (
        <View style={styles.totalRow}>
            <Text style={{ color: C.text, fontWeight: (bold ? "900" : "600") as any }}>
                {label}
            </Text>
            <Text style={{ color: C.text, fontWeight: (bold ? "900" : "600") as any }}>
                {valueStr ?? currency(value || 0)}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    totalRow: {
        marginTop: 6,
        flexDirection: "row",
        justifyContent: "space-between",
    },
});