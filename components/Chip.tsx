import { Pressable, Text } from "react-native";


export default function Chip({
    label,
    active,
    onPress,
    C,
    error,
    style,
    small,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
    C: any;
    error?: boolean;
    style?: any;
    small?: boolean;
}) {
    const borderColor = active ? C.tint : (error ? C.danger : C.border);
    const bgColor = active ? C.surfaceSoft : C.surface;
    const textColor = active ? C.tint : (error ? C.danger : C.text);

    return (
        <Pressable
            onPress={onPress}
            style={[
                {
                    borderWidth: 1,
                    borderRadius: 999,
                    paddingHorizontal: small ? 8 : 12,
                    paddingVertical: small ? 4 : 8,
                    borderColor,
                    backgroundColor: bgColor,
                },
                style,
            ]}
        >
            <Text
                style={{
                    color: textColor,
                    fontWeight: "800",
                    fontSize: small ? 10 : 12,
                }}
            >
                {label}
            </Text>
        </Pressable>
    );
}