import { Theme } from "@/types/report";
import { currency } from "@/utils/currency";
import { StyleSheet, Text, View } from "react-native";

function isFiniteNumber(n: unknown): n is number {
    return typeof n === "number" && Number.isFinite(n);
}

export default function RowView({
    C,
    label,
    qty,
    unit,
    price,
    value,
}: {
    C: Theme;
    label: string;
    qty?: number | undefined;
    unit?: string | null;
    price?: number;
    value: number;
}) {
    const qtyStr = isFiniteNumber(qty) ? String(Math.round(qty)) : "-";
    const unitStr = unit ?? "-";
    const priceStr = isFiniteNumber(price) ? currency(price) : "-";
    const valueStr = isFiniteNumber(value) ? currency(value) : "-";

    return (
        <View style={[styles.tr, { borderColor: C.border, gap: 4 }]}>
            <Text style={[styles.tdUraian, { color: C.text }]}>{label}</Text>
            <Text style={[styles.tdSmall, { color: C.text }]}>{qtyStr}</Text>
            <Text style={[styles.tdSmall, { color: C.text }]}>{unitStr}</Text>
            <Text style={[styles.tdPrice, { color: C.text }]}>{priceStr}</Text>
            <Text style={[styles.tdRight, { color: C.text }]}>{valueStr}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    tr: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    tdUraian: { textTransform: "capitalize", flex: 1.7, fontSize: 13 },
    tdSmall: { flex: 0.8, fontSize: 13 },
    tdPrice: { flex: 1, fontSize: 13 },
    tdRight: { width: 110, fontSize: 13, textAlign: "right", fontWeight: "800" },
});
