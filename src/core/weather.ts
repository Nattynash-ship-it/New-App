/**
 * Weather via Open-Meteo — free, no API key, CORS-friendly, so it works on a
 * local-first build with nothing to configure. Pure helpers here (URL builders
 * + WMO code → label/icon) so they're testable; the card does the fetching.
 */

export interface WeatherLocation {
  zip: string;
  lat: number;
  lon: number;
  /** Human-readable place, e.g. "Brooklyn, NY". */
  place?: string;
}

/** Zip 11218 — Brooklyn, NY. */
export const DEFAULT_WEATHER_LOCATION: WeatherLocation = {
  zip: "11218",
  lat: 40.6435,
  lon: -73.9766,
  place: "Brooklyn, NY",
};

export function forecastUrl(loc: WeatherLocation): string {
  const p = new URLSearchParams({
    latitude: String(loc.lat),
    longitude: String(loc.lon),
    current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: "auto",
    forecast_days: "3",
  });
  return `https://api.open-meteo.com/v1/forecast?${p}`;
}

export function geocodeUrl(query: string): string {
  const p = new URLSearchParams({ name: query.trim(), count: "1", language: "en", format: "json" });
  return `https://geocoding-api.open-meteo.com/v1/search?${p}`;
}

/** WMO weather interpretation codes → icon + label. */
export function weatherMeta(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: "☀️", label: "Clear" };
  if (code === 1) return { icon: "🌤️", label: "Mostly clear" };
  if (code === 2) return { icon: "⛅", label: "Partly cloudy" };
  if (code === 3) return { icon: "☁️", label: "Overcast" };
  if (code === 45 || code === 48) return { icon: "🌫️", label: "Fog" };
  if (code >= 51 && code <= 57) return { icon: "🌦️", label: "Drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { icon: "🌧️", label: "Rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: "🌨️", label: "Snow" };
  if (code >= 95) return { icon: "⛈️", label: "Thunderstorm" };
  return { icon: "🌡️", label: "Weather" };
}
