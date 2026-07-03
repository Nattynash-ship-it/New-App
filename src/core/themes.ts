/**
 * Built-in themes. Each theme sets the full token set as CSS variables in
 * globals.css under [data-theme="<id>"]; this module is the registry the
 * switcher renders from. Persisted under localStorage "hub-theme".
 */

export interface ThemeMeta {
  id: string;
  label: string;
  /** Swatch colors for the picker: background + accent. */
  bg: string;
  accent: string;
  mode: "dark" | "light";
}

export const THEMES: ThemeMeta[] = [
  { id: "midnight", label: "Midnight", bg: "#0B0F13", accent: "#C8F04D", mode: "dark" },
  { id: "daylight", label: "Daylight", bg: "#F7F8FA", accent: "#4056D8", mode: "light" },
  { id: "meadow", label: "Meadow", bg: "#F3F6F1", accent: "#1F7A4E", mode: "light" },
  { id: "aurora", label: "Aurora", bg: "#0D1020", accent: "#5EE0D8", mode: "dark" },
];

export const DEFAULT_THEME = "midnight";
export const THEME_STORAGE_KEY = "hub-theme";
