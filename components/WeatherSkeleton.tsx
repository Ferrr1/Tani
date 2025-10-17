import { View } from "react-native";
import SkeletonBox from "./SkeletonBox";

export default function WeatherSkeleton({ C, S }: { C: any; S: any }) {
    return (
        <View style={{ padding: 16, gap: 16 }}>
            {/* Row atas: judul suhu + subjudul, dan ruang untuk icon/image */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1, gap: 8 }}>
                    <SkeletonBox width={140} height={34} radius={S.radius.md} base={C.surfaceSoft} highlight={C.surface} />
                    <SkeletonBox width={180} height={18} radius={S.radius.md} base={C.surfaceSoft} highlight={C.surface} />
                </View>
                <SkeletonBox width={56} height={56} radius={28} base={C.surfaceSoft} highlight={C.surface} />
            </View>

            {/* Chips */}
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <SkeletonBox width={120} height={20} radius={S.radius.lg} base={C.surfaceSoft} highlight={C.surface} />
                <SkeletonBox width={84} height={20} radius={S.radius.lg} base={C.surfaceSoft} highlight={C.surface} />
                <SkeletonBox width={160} height={20} radius={S.radius.lg} base={C.surfaceSoft} highlight={C.surface} />
            </View>
        </View>
    );
}