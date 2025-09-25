import { Theme } from "@/types/report";
import { Text } from "react-native";

export default function SectionTitle({ text, C }: { text: string; C: Theme }) {
    return (
        <Text style={{ marginTop: 14, marginBottom: 6, color: C.text, fontWeight: "800" as any }}>
            {text}
        </Text>
    );
}