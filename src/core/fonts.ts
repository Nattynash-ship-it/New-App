/**
 * Body-font choices (Settings › Display). Stacks are system/offline-safe — no
 * web-font downloads, so they work fully offline in the PWA. The chosen stack
 * is applied as the `--font-body-override` CSS variable on <html>.
 *
 * Keep this list in sync with the inline map in src/app/layout.tsx (the
 * pre-paint script can't import this module).
 */
export interface FontChoice {
  id: string;
  label: string;
  /** CSS font-family stack, or "" for the system default (no override). */
  stack: string;
}

export const FONTS: FontChoice[] = [
  { id: "system", label: "System", stack: "" },
  {
    id: "rounded",
    label: "Rounded",
    stack: 'ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", "Nunito", system-ui, sans-serif',
  },
  {
    id: "serif",
    label: "Serif",
    stack: '"Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif',
  },
  {
    id: "humanist",
    label: "Humanist",
    stack: '"Avenir Next", "Segoe UI", Optima, system-ui, sans-serif',
  },
  {
    id: "mono",
    label: "Mono",
    stack: 'ui-monospace, "SF Mono", "Cascadia Code", "Roboto Mono", monospace',
  },
];

export const DEFAULT_FONT = "system";
export const FONT_STORAGE_KEY = "hub-font";

export function fontStack(id: string): string {
  return FONTS.find((f) => f.id === id)?.stack ?? "";
}

/** Text-scale steps (multiplies the base rem). */
export interface TextSize {
  id: string;
  label: string;
  scale: number;
}

export const TEXT_SIZES: TextSize[] = [
  { id: "small", label: "Small", scale: 0.92 },
  { id: "default", label: "Default", scale: 1 },
  { id: "large", label: "Large", scale: 1.12 },
  { id: "xl", label: "XL", scale: 1.25 },
];

export const DEFAULT_TEXT_SIZE = "default";
export const TEXT_SIZE_STORAGE_KEY = "hub-textsize";

export function textScale(id: string): number {
  return TEXT_SIZES.find((t) => t.id === id)?.scale ?? 1;
}
