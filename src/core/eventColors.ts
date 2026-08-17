/**
 * Colour swatches for calendar events. Values are the fixed domain mid-tones
 * (validated for contrast on both light and dark surfaces), so an event can be
 * colour-coded independently of which module it came from.
 */
export interface EventColor {
  id: string;
  label: string;
  hex: string;
}

export const EVENT_COLORS: EventColor[] = [
  { id: "violet", label: "Violet", hex: "#8A5FD6" },
  { id: "blue", label: "Blue", hex: "#4E74E6" },
  { id: "teal", label: "Teal", hex: "#0E8AA6" },
  { id: "green", label: "Green", hex: "#167A42" },
  { id: "amber", label: "Amber", hex: "#C9702C" },
  { id: "pink", label: "Pink", hex: "#E25C82" },
];

export const DEFAULT_EVENT_COLOR = EVENT_COLORS[0]!.id;

export function eventColor(id?: string): EventColor | undefined {
  if (!id) return undefined;
  return EVENT_COLORS.find((c) => c.id === id);
}

/** Hex (#rrggbb) → rgba() string at the given alpha. */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
