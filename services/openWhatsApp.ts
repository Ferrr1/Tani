import { Alert, Linking } from "react-native";

export async function openWhatsApp(opts?: { phone?: string; text?: string }) {
  const phone = (opts?.phone ?? "6282244882045").replace(/\D/g, "");
  const text = encodeURIComponent(opts?.text ?? "Halo, saya ingin daftar.");

  const appUrl = `whatsapp://send?phone=${phone}&text=${text}`;
  const webUrl = `https://wa.me/${phone}?text=${text}`;

  try {
    const supported = await Linking.canOpenURL(appUrl);
    if (supported) return Linking.openURL(appUrl);
    return Linking.openURL(webUrl);
  } catch (e) {
    console.log("WA error", e);
    Alert.alert("Tidak bisa membuka WhatsApp", "Coba lagi atau chat via web.", [
      { text: "Buka via web", onPress: () => Linking.openURL(webUrl) },
      { text: "Tutup" },
    ]);
  }
}
