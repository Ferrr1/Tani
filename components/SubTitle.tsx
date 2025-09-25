import { Theme } from "@/types/report";
import { Text } from "react-native";

export default function SubTitle({ text, C }: { text: string; C: Theme }) {
    return (
        <Text style={{ marginTop: 8, color: C.text, fontWeight: "700" as any }}>
            {text}
        </Text>
    );
}