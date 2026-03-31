import { openWhatsApp } from "../openWhatsApp";
import { Alert, Linking } from "react-native";

describe("openWhatsApp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should open WhatsApp with default message if no opts", async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);

    await openWhatsApp();

    expect(Linking.canOpenURL).toHaveBeenCalledWith(expect.stringContaining("whatsapp://send"));
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining("whatsapp://send"));
  });

  it("should open web URL if WhatsApp app is not supported", async () => {
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);

    await openWhatsApp({ phone: "08123", text: "Test message" });

    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining("https://wa.me/08123"));
  });

  it("should handle error and show Alert", async () => {
    (Linking.canOpenURL as jest.Mock).mockRejectedValue(new Error("Fail"));

    await openWhatsApp();

    expect(Alert.alert).toHaveBeenCalledWith(
      "Tidak bisa membuka WhatsApp",
      "Coba lagi atau chat via web.",
      expect.any(Array)
    );
  });
});
