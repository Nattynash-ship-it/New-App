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
  { id: "nocturne", label: "Nocturne", bg: "#0E0F1B", accent: "#968CFA", mode: "dark" },
  { id: "midnight", label: "Midnight", bg: "#0B0F13", accent: "#C8F04D", mode: "dark" },
  { id: "aurora", label: "Aurora", bg: "#0D1020", accent: "#5EE0D8", mode: "dark" },
  { id: "ember", label: "Ember", bg: "#17110E", accent: "#E8927C", mode: "dark" },
  { id: "velvet", label: "Velvet", bg: "#1A0F17", accent: "#E97AA8", mode: "dark" },
  { id: "daylight", label: "Daylight", bg: "#F7F8FA", accent: "#4056D8", mode: "light" },
];

export const DEFAULT_THEME = "nocturne";
export const THEME_STORAGE_KEY = "hub-theme";

/** Valid theme ids — used to migrate away from removed themes on load. */
export const THEME_IDS = THEMES.map((t) => t.id);
