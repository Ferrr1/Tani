// tests/__mocks__/expo.ts
// Mock minimum supaya modul yang (secara tak langsung) mengimpor `expo` tidak memicu winter/runtime
export default {};
export const Device = {};
export const Updates = {};
export const Linking = { addEventListener: () => ({ remove: () => {} }) };
export const Constants = { appOwnership: "standalone" };
