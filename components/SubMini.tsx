import { Theme } from "@/types/report";
import { Text } from "react-native";

export default function SubMini({ text, C }: { text: string; C: Theme }) {
    return <Text style={{ marginTop: 6, color: C.textMuted }}>{text}</Text>;
}