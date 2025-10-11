import "@testing-library/jest-native/extend-expect";

// Mock expo-router TANPA require()
import * as ExpoRouterTesting from "expo-router/testing-library";
jest.mock("expo-router", () => ExpoRouterTesting);

// Mock Supabase client (ESM) — biar bisa di-spy dari test
jest.mock("@/lib/supabase", () => {
  const mockInvoke = jest.fn().mockResolvedValue({ data: null, error: null });
  const mockFrom = jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    range: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
  }));

  const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
  const mockGetUser = jest.fn().mockResolvedValue({
    data: { user: { id: "u1" } },
    error: null,
  });

  return {
    supabase: {
      from: mockFrom,
      rpc: mockRpc,
      functions: { invoke: mockInvoke },
      auth: { getUser: mockGetUser },
    },
  };
});

// Mock AuthContext sederhana
jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1" },
    session: { user: { id: "u1" } },
    role: "superadmin",
    authReady: true,
  }),
}));

// Redam warning noisy
const _warn = console.warn;
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].includes("useNativeDriver"))
    return;
  _warn(...args);
};
