import { Pressable, Text } from "react-native";


export default function Chip({ label, active, onPress, C }: { label: string; active: boolean; onPress: () => void; C: any }) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                {
                    borderWidth: 1,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderColor: active ? C.tint : C.border,
                    backgroundColor: active ? C.surfaceSoft : C.surface,
                },
            ]}
        >
            <Text style={{ color: active ? C.tint : C.text, fontWeight: "800" }}>{label}</Text>
        </Pressable>
    );
}