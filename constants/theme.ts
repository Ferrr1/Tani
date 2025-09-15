/**
 * Pertanian Modern Design Theme:
 * - Aksen hijau segar (#1BA85F) + variasi soft
 * - Warna netral yang kontras & nyaman dibaca
 * - Token tambahan: border, radius, spacing, shadow
 */
import { Platform } from "react-native";

const FARM_PRIMARY = "#1BA85F"; // hijau daun (utama)
const FARM_PRIMARY_DARK = "#167F49";
const FARM_SOFT = "#EAF7F0"; // hijau sangat muda (card/bg lembut)
const FARM_SOFT_DARK = "#0E1A14"; // versi gelap untuk dark mode
const FARM_ACCENT = "#0A7EA4"; // biru-ijo air/irigasi (aksen sekunder)

export const Colors = {
  light: {
    text: "#102A1C", // teks utama (hijau tua netral)
    textMuted: "#5C6F66", // teks sekunder
    background: "#FFFFFF", // latar utama
    surface: "#FFFFFF", // card
    surfaceSoft: FARM_SOFT, // card lembut/section
    border: "#DCE6E1", // garis halus
    tint: FARM_PRIMARY, // warna aksen utama (link/CTA)
    icon: "#6B7E75", // ikon sekunder
    tabIconDefault: "#8AA299",
    tabIconSelected: FARM_PRIMARY,
    success: FARM_PRIMARY,
    info: FARM_ACCENT,
    danger: "#E23D28",
    // gradient opsional
    gradientFrom: "#E7F6EE",
    gradientTo: "#F7FFFA",
  },

  dark: {
    text: "#EAF2ED",
    textMuted: "#AFC2B8",
    background: "#0D1110", // latar gelap netral
    surface: "#141A18", // card
    surfaceSoft: FARM_SOFT_DARK,
    border: "#1F2A25",
    tint: FARM_PRIMARY,
    icon: "#9BB4A9",
    tabIconDefault: "#7C9489",
    tabIconSelected: FARM_PRIMARY,
    success: FARM_PRIMARY,
    info: FARM_ACCENT,
    danger: "#FF6B57",
    gradientFrom: "#0E1A14",
    gradientTo: "#0C1410",
  },
} as const;

export const Tokens = {
  radius: {
    xs: 6,
    sm: 10,
    md: 12,
    lg: 16,
    xl: 22,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  shadow: {
    light: {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    dark: {
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
