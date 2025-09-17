import { Colors } from "@/constants/theme";
import { useExpenseService } from "@/services/expenseService";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, useColorScheme, View } from "react-native";
import CashForm from "./CashForm";
import NonCashForm from "./NonCashForm";

export default function TypeCostScreen() {
    const scheme = (useColorScheme() ?? "light") as "light" | "dark";
    const C = Colors[scheme];
    const { type, seasonId: qsSeasonId, expenseId } =
        useLocalSearchParams<{ type?: string; seasonId?: string; expenseId?: string }>();

    const { getExpenseById } = useExpenseService();
    const [resolved, setResolved] = useState<{ isCash: boolean; seasonId: string } | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!expenseId) {
                const isCash = (type ?? "tunai") === "tunai";
                if (alive) setResolved({ isCash, seasonId: qsSeasonId ?? "" });
                return;
            }
            const row = await getExpenseById(String(expenseId));
            if (!alive) return;

            if (!row) {
                setResolved({ isCash: (type ?? "tunai") === "tunai", seasonId: qsSeasonId ?? "" });
                return;
            }
            setResolved({
                isCash: row.type === "cash",
                seasonId: row.season_id,
            });
        })();

        return () => {
            alive = false;
        };
    }, [expenseId, type, qsSeasonId, getExpenseById]);

    if (!resolved) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator color={C.tint} size={"large"} />
            </View>
        );
    }

    return resolved.isCash ? (
        <CashForm
            seasonId={resolved.seasonId}
            mode={expenseId ? "edit" : "create"}
            expenseId={expenseId ? String(expenseId) : undefined}
        />
    ) : (
        <NonCashForm
            seasonId={resolved.seasonId}
            mode={expenseId ? "edit" : "create"}
            expenseId={expenseId ? String(expenseId) : undefined}
        />
    );
}
