import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

type Ctx = {
    seasonId: string | null;
    setSeasonId: (id: string) => void;
    ready: boolean;
};

const SeasonFilterCtx = createContext<Ctx | undefined>(undefined);

export function SeasonFilterProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [seasonId, _setSeasonId] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    const storageKey = user ? `seasonFilter:${user.id}` : "seasonFilter:anon";

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const v = await AsyncStorage.getItem(storageKey);
                if (!mounted) return;
                _setSeasonId(v ?? null);
            } finally {
                setReady(true);
            }
        })();
        return () => { mounted = false; };
    }, [storageKey]);

    const setSeasonId = (id: string) => {
        _setSeasonId(id);
        AsyncStorage.setItem(storageKey, id).catch(() => { });
    };

    return (
        <SeasonFilterCtx.Provider value={{ seasonId, setSeasonId, ready }}>
            {children}
        </SeasonFilterCtx.Provider>
    );
}

export const useSeasonFilter = () => {
    const ctx = useContext(SeasonFilterCtx);
    if (!ctx) throw new Error("useSeasonFilter must be used within SeasonFilterProvider");
    return ctx;
};
