// Mock global fetch
// @ts-ignore
global.fetch = jest.fn();

// Mock React Native Alert/Linking
jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
  Platform: {
    OS: "ios",
    select: jest.fn((obj) => obj.ios),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo Constants
jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: {
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
}));

// MOCK THE SUPABASE CLIENT GLOBALLY
// This prevents ANY test from loading the real lib/supabase.ts with its native dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn(),
      refreshSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      setSession: jest.fn(),
      updateUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    })),
    rpc: jest.fn().mockReturnThis(),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

// Provide globals if missing
if (typeof global.setImmediate === 'undefined') {
  // @ts-ignore
  global.setImmediate = (fn) => setTimeout(fn, 0);
}
