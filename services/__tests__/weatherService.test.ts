import { fetchWeather } from "../weatherService";

// @ts-ignore
const mockFetch = global.fetch as jest.Mock;

describe("weatherService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should fetch weather from Open Meteo", async () => {
        const mockResponse = {
            current: {
                temperature_2m: 30,
                weather_code: 0,
                time: "2024-01-01T12:00:00Z",
            },
            timezone: "Asia/Jakarta",
        };

        mockFetch.mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue(mockResponse),
        });

        const result = await fetchWeather(-7, 112);

        expect(result.tempC).toBe(30);
        expect(result.conditionText).toBe("Cerah");
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("open-meteo.com"));
    });

    it("should throw error if fetch fails", async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 500,
        });

        await expect(fetchWeather(-7, 112)).rejects.toThrow("Weather fetch failed: 500");
    });
});
