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
  { id: "glass", label: "Glass", bg: "#E4EAF8", accent: "#786CF6", mode: "light" },
  { id: "cartoon", label: "Cartoon", bg: "#FFF7EA", accent: "#FF5E78", mode: "light" },
  { id: "daylight", label: "Daylight", bg: "#F7F8FA", accent: "#4056D8", mode: "light" },
  { id: "nocturne", label: "Nocturne", bg: "#0E0F1B", accent: "#968CFA", mode: "dark" },
  { id: "midnight", label: "Midnight", bg: "#0B0F13", accent: "#C8F04D", mode: "dark" },
];

export const DEFAULT_THEME = "glass";
export const THEME_STORAGE_KEY = "hub-theme";

/** Valid theme ids — used to migrate away from removed themes on load. */
export const THEME_IDS = THEMES.map((t) => t.id);
