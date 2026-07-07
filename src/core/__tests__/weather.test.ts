import { describe, expect, it } from "vitest";
import { DEFAULT_WEATHER_LOCATION, forecastUrl, geocodeUrl, weatherMeta } from "../weather";

describe("weather", () => {
  it("defaults to zip 11218 (Brooklyn)", () => {
    expect(DEFAULT_WEATHER_LOCATION.zip).toBe("11218");
    expect(DEFAULT_WEATHER_LOCATION.lat).toBeCloseTo(40.64, 1);
  });

  it("builds a keyless Open-Meteo forecast URL in Fahrenheit", () => {
    const url = forecastUrl(DEFAULT_WEATHER_LOCATION);
    expect(url).toContain("api.open-meteo.com/v1/forecast");
    expect(url).toContain("temperature_unit=fahrenheit");
    expect(url).toContain("latitude=40.6435");
    expect(url).not.toContain("key=");
  });

  it("builds a geocode URL for a zip", () => {
    expect(geocodeUrl(" 11218 ")).toContain("name=11218");
  });

  it("maps WMO codes to sensible conditions", () => {
    expect(weatherMeta(0).label).toBe("Clear");
    expect(weatherMeta(3).label).toBe("Overcast");
    expect(weatherMeta(63).label).toBe("Rain");
    expect(weatherMeta(73).label).toBe("Snow");
    expect(weatherMeta(96).label).toBe("Thunderstorm");
  });
});
