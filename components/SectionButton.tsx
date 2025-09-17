import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export default function SectionButton({
    title,
    icon,
    open,
    onPress,
    C,
    S,
}: {
    title: string;
    icon: any;
    open: boolean;
    onPress: () => void;
    C: any;
    S: any;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                {
                    borderWidth: 1,
                    borderColor: open ? C.tint : C.border,
                    backgroundColor: open ? C.surfaceSoft : C.surface,
                    borderRadius: S.radius.lg,
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    opacity: pressed ? 0.96 : 1,
                },
                S.shadow.light,
            ]}
        >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 999,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: (C.tint + "1A") as any,
                        }}
                    >
                        <Ionicons name={icon} size={16} color={C.tint} />
                    </View>
                    <Text style={{ color: C.text, fontWeight: "900" }}>{title}</Text>
                </View>
                <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={C.icon} />
            </View>
        </Pressable>
    );
}