import { restoreSession } from "../authService";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

// The mock is automatically picked up from lib/__mocks__/supabase.ts
// but we need to cast it for type-safe assertions
const mockSupabase = supabase as any;
const mockAsyncStorage = AsyncStorage as any;

describe("services/authService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("restoreSession", () => {
        it("should return session if supabase already has it", async () => {
            const mockSession = { access_token: "abc", user: { id: "123" } };
            mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession }, error: null });

            const session = await restoreSession();

            expect(session).toEqual(mockSession);
            expect(mockSupabase.auth.getSession).toHaveBeenCalled();
        });

        it("should restore from AsyncStorage if supabase is empty", async () => {
            mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
            
            const storedSession = { access_token: "stored-token", refresh_token: "refresh-token" };
            mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedSession));
            
            mockSupabase.auth.setSession.mockResolvedValue({ data: { session: storedSession }, error: null });

            const session = await restoreSession();

            expect(session).toEqual(storedSession);
            expect(mockSupabase.auth.setSession).toHaveBeenCalledWith({
                access_token: "stored-token",
                refresh_token: "refresh-token"
            });
        });

        it("should return null if no session found anywhere", async () => {
            mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
            mockAsyncStorage.getItem.mockResolvedValue(null);

            const session = await restoreSession();

            expect(session).toBeNull();
        });

        it("should clear AsyncStorage if setSession fails", async () => {
             mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
             mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({ access_token: "bad" }));
             mockSupabase.auth.setSession.mockResolvedValue({ data: { session: null }, error: new Error("invalid") });

             await restoreSession();

             expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith("auth-token");
        });
    });
});
