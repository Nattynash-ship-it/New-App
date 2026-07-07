"use client";

import { useEffect, useState } from "react";
import { Card } from "./ui";
import { useHub } from "@/core/store/hub";
import { forecastUrl, geocodeUrl, weatherMeta } from "@/core/weather";

interface Forecast {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
}

function dayLabel(iso: string, idx: number): string {
  if (idx === 0) return "Today";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
}

/** Live weather for the saved zip — Open-Meteo, no API key needed. */
export function WeatherCard() {
  const loc = useHub((s) => s.weatherLocation);
  const setWeatherLocation = useHub((s) => s.setWeatherLocation);
  const [data, setData] = useState<Forecast | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [zipDraft, setZipDraft] = useState(loc.zip);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setFailed(false);
    fetch(forecastUrl(loc))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: Forecast) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [loc]);

  async function saveZip() {
    const zip = zipDraft.trim();
    if (!zip) return;
    setStatus("Looking up…");
    try {
      const res = await fetch(geocodeUrl(zip));
      const json = (await res.json()) as {
        results?: Array<{ latitude: number; longitude: number; name: string; admin1?: string }>;
      };
      const hit = json.results?.[0];
      if (!hit) {
        setStatus(`Couldn't find "${zip}" — try a zip or a city name.`);
        return;
      }
      setWeatherLocation({
        zip,
        lat: hit.latitude,
        lon: hit.longitude,
        place: [hit.name, hit.admin1].filter(Boolean).join(", "),
      });
      setStatus("");
      setEditing(false);
    } catch {
      setStatus("Couldn't reach the location service — check your connection.");
    }
  }

  const meta = data ? weatherMeta(data.current.weather_code) : null;

  return (
    <Card className="relative overflow-hidden !py-4">
      <div className="flex items-center justify-between gap-3">
        {data && meta ? (
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>
              {meta.icon}
            </span>
            <div>
              <p className="font-display text-2xl leading-none">
                {Math.round(data.current.temperature_2m)}°
                <span className="ml-2 text-sm font-normal text-muted">{meta.label}</span>
              </p>
              <p className="mt-1 text-[11px] text-muted">
                feels {Math.round(data.current.apparent_temperature)}° · wind{" "}
                {Math.round(data.current.wind_speed_10m)} mph
              </p>
            </div>
          </div>
        ) : failed ? (
          <p className="text-sm text-muted">Couldn&apos;t load the weather — it&apos;ll retry next visit.</p>
        ) : (
          <div className="h-10 w-40 animate-pulse rounded-lg bg-ink/[0.06]" aria-label="Loading weather" />
        )}

        <button
          onClick={() => {
            setEditing(!editing);
            setZipDraft(loc.zip);
            setStatus("");
          }}
          className="shrink-0 text-right text-[11px] text-muted hover:text-ink"
          title="Change location"
        >
          📍 {loc.place ?? loc.zip}
          <span className="ml-1 opacity-60">✎</span>
        </button>
      </div>

      {editing ? (
        <form
          className="animate-slide-in mt-2 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void saveZip();
          }}
        >
          <input
            value={zipDraft}
            onChange={(e) => setZipDraft(e.target.value)}
            placeholder="Zip or city"
            className="input !w-36 !py-1.5 text-xs"
            aria-label="Zip or city"
          />
          <button type="submit" className="btn-primary !px-3 !py-1.5 text-xs">
            Save
          </button>
          {status ? <span className="text-[11px] text-muted">{status}</span> : null}
        </form>
      ) : null}

      {data ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {data.daily.time.map((d, i) => {
            const m = weatherMeta(data.daily.weather_code[i] ?? 0);
            return (
              <div key={d} className="rounded-xl bg-paper px-2 py-1.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {dayLabel(d, i)}
                </p>
                <p className="text-lg leading-tight" aria-hidden>
                  {m.icon}
                </p>
                <p className="text-[11px] tabular-nums">
                  <span className="font-semibold">{Math.round(data.daily.temperature_2m_max[i] ?? 0)}°</span>
                  <span className="text-muted"> / {Math.round(data.daily.temperature_2m_min[i] ?? 0)}°</span>
                </p>
                {(data.daily.precipitation_probability_max[i] ?? 0) >= 25 ? (
                  <p className="text-[10px] text-work-bright">💧 {data.daily.precipitation_probability_max[i]}%</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}
