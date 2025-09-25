import { Theme } from "@/types/report";
import { currency } from "@/utils/currency";
import { StyleSheet, Text, View } from "react-native";

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
    qty?: number;
    unit?: string | null;
    price?: number;
    value: number;
}) {
    return (
        <View style={[styles.tr, { borderColor: C.border }]}>
            <Text style={[styles.tdUraian, { color: C.text }]}>{label}</Text>
            <Text style={[styles.tdSmall, { color: C.text }]}>{qty != null ? qty : "-"}</Text>
            <Text style={[styles.tdSmall, { color: C.text }]}>{unit ?? "-"}</Text>
            <Text style={[styles.tdSmall, { color: C.text }]}>{price != null ? currency(price) : "-"}</Text>
            <Text style={[styles.tdRight, { color: C.text }]}>{currency(value)}</Text>
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
    tdUraian: { flex: 1.8, fontSize: 13 },
    tdSmall: { flex: 1, fontSize: 13 },
    tdRight: { width: 110, fontSize: 13, textAlign: "right", fontWeight: "800" },

});