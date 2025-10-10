/**
 * Pertanian Modern — All Cyan Theme
 * PRIMARY (Cyan)  : #15C1DF
 * PRIMARY_DARK    : #0E9DB9  (pressed/hover/selected)
 * ACCENT (Light)  : #9BF5FF  (badge/info/soft highlight)
 * SOFT surfaces   : #E6F9FE  (card/section lembut)
 */
import { Platform } from "react-native";

const FARM_PRIMARY = "#15C1DF"; // cyan utama
const FARM_PRIMARY_DARK = "#0E9DB9"; // cyan gelap (state aktif/pressed)
const FARM_SOFT = "#E6F9FE"; // cyan sangat muda (section/card lembut)
const FARM_SOFT_DARK = "#0B1416"; // padanan gelap bernuansa cyan
const FARM_ACCENT = "#9BF5FF"; // cyan muda (aksen sekunder)

export const Colors = {
  light: {
    text: "#0E2A33", // biru-tua kehijauan, kontras di atas putih
    textMuted: "#5A7680", // dingin netral (tetap readable)
    background: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceSoft: FARM_SOFT,
    border: "#D3E8EE", // garis halus bernuansa cyan
    tint: FARM_PRIMARY, // CTA/link = cyan
    icon: "#6E8C95",
    tabIconDefault: "#8AAAB3",
    tabIconSelected: FARM_PRIMARY,
    success: FARM_PRIMARY, // all-cyan: sukses pun cyan
    info: FARM_PRIMARY, // info cyan juga (seragam)
    danger: "#E23D28", // tetap merah biar jelas bahaya
    warning: "#F59E0B",
    gradientFrom: "#15C1DF", // gradien lembut cyan → putih kebiruan
    gradientTo: "#9BF5FF",
    accentSurface: "#F0FCFF", // alternatif soft utk badge (lebih putih)
  },

  dark: {
    text: "#E6F4F7",
    textMuted: "#A9C2C9",
    background: "#0A0F11",
    surface: "#10171A",
    surfaceSoft: FARM_SOFT_DARK,
    border: "#1A2A2E",
    tint: FARM_PRIMARY,
    icon: "#9DB8C0",
    tabIconDefault: "#7FA0A9",
    tabIconSelected: FARM_PRIMARY,
    success: FARM_PRIMARY, // all-cyan
    info: FARM_PRIMARY,
    danger: "#FF6B57",
    warning: "#FBBF24",
    gradientFrom: "#052a35ff",
    gradientTo: "#04232cff",
    accentSurface: "#052a35ff", // soft gelap utk badge
  },
} as const;

export const Tokens = {
  radius: { xs: 6, sm: 10, md: 12, lg: 16, xl: 22 },
  spacing: { xs: 6, sm: 10, md: 14, lg: 18, xl: 24 },
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
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
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
