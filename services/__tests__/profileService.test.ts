import { getMyProfile, updateMyProfile } from "../profileService";
import { supabase } from "@/lib/supabase";

const mockSupabase = supabase as any;

describe("services/profileService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getMyProfile", () => {
        it("should fetch profile correctly", async () => {
            const mockProfile = { id: "123", full_name: "Test User" };
            const mockAuthUser = { id: "123" };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockAuthUser },
                error: null,
            });

            mockSupabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                maybeSingle: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
            });

            const profile = await getMyProfile();

            expect(profile).toEqual(mockProfile);
            expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
        });

        it("should return null if no user found in auth", async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: null,
            });

            const profile = await getMyProfile();

            expect(profile).toBeNull();
        });
    });

    describe("updateMyProfile", () => {
        it("should update profile correctly", async () => {
            const mockAuthUser = { id: "123" };
            const updates = { full_name: "New Name" };

            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockAuthUser },
                error: null,
            });

            mockSupabase.from.mockReturnValue({
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                maybeSingle: jest.fn().mockResolvedValue({ data: { ...updates, id: "123" }, error: null }),
            });

            const result = await updateMyProfile(updates);

            expect(result.full_name).toBe("New Name");
            expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
        });

        it("should throw error if user missing during update", async () => {
             mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: null,
            });

            await expect(updateMyProfile({ full_name: "Error" }))
                .rejects.toThrow("Not authenticated");
        });
    });
});
