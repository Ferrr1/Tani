import { Controller } from "react-hook-form";
import { Text, TextInput, View } from "react-native";

export default function RHFLineInput({
    label,
    name,
    control,
    C,
    rules,
}: {
    label: string;
    name: any;
    control: any;
    C: any;
    rules?: any;
}) {
    return (
        <View style={{ gap: 6, flex: 1 }}>
            <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: "800" }}>{label}</Text>
            <Controller
                control={control}
                name={name}
                rules={rules}
                render={({ field: { value, onChange }, fieldState: { error } }) => (
                    <>
                        <TextInput
                            placeholder={label}
                            placeholderTextColor={C.icon}
                            value={value}
                            onChangeText={onChange}
                            keyboardType="numeric"
                            style={{
                                borderWidth: 1,
                                borderColor: error ? C.danger : C.border,
                                color: C.text,
                                borderRadius: 10,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                            }}
                        />
                        {!!error && (
                            <Text style={{ color: C.danger, fontSize: 11 }}>
                                {String(error.message || "Input tidak valid")}
                            </Text>
                        )}
                    </>
                )}
            />
        </View>
    );
}
