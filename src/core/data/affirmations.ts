/**
 * Daily affirmations + a rotation of themed 10-minute sessions. Text lines are
 * on-device; the "play 10 min" link opens a YouTube search for a guided session
 * in that theme (same search-URL approach the app uses for workout/recipe
 * videos — never a hardcoded video id, so links don't rot).
 */

export interface AffirmationTheme {
  id: string;
  label: string;
  icon: string;
  /** Tailwind soft-bg + text classes (reuses the app's domain palette). */
  soft: string;
  text: string;
  lines: string[];
}

export const AFFIRMATION_THEMES: AffirmationTheme[] = [
  {
    id: "beauty",
    label: "Beauty",
    icon: "🌸",
    soft: "bg-family-soft",
    text: "text-family-bright",
    lines: [
      "I am radiant, and my confidence makes me beautiful.",
      "I care for my body with love, and it glows back at me.",
      "I am comfortable and at home in my own skin.",
      "My beauty comes from within and shines outward.",
      "I deserve to feel gorgeous exactly as I am today.",
    ],
  },
  {
    id: "success",
    label: "Success",
    icon: "🚀",
    soft: "bg-work-soft",
    text: "text-work-bright",
    lines: [
      "I am capable of achieving everything I set my mind to.",
      "Every step I take moves me closer to my goals.",
      "I turn obstacles into opportunities to grow.",
      "I am focused, disciplined, and unstoppable.",
      "Success flows to me because I show up and do the work.",
    ],
  },
  {
    id: "health",
    label: "Health",
    icon: "🌿",
    soft: "bg-meals-soft",
    text: "text-meals-bright",
    lines: [
      "My body is strong, healthy, and full of energy.",
      "I nourish myself with good food, movement, and rest.",
      "Every day I grow healthier and more vibrant.",
      "I listen to my body and give it what it needs.",
      "I am grateful for a body that carries me through my day.",
    ],
  },
  {
    id: "wealth",
    label: "Wealth",
    icon: "💫",
    soft: "bg-school-soft",
    text: "text-school-bright",
    lines: [
      "I am open to receiving abundance in all its forms.",
      "Money flows to me easily and I manage it wisely.",
      "I am worthy of financial security and freedom.",
      "My work creates value, and I am rewarded for it.",
      "I build wealth steadily, one smart choice at a time.",
    ],
  },
  {
    id: "grades",
    label: "Good grades",
    icon: "🎓",
    soft: "bg-compass-soft",
    text: "text-compass-bright",
    lines: [
      "I learn quickly and remember what I study.",
      "I am focused and calm during exams and assignments.",
      "Every study session moves me toward my degree.",
      "I understand difficult concepts with patience and practice.",
      "I am a capable, dedicated student and my grades reflect it.",
    ],
  },
  {
    id: "confidence",
    label: "Confidence",
    icon: "🦋",
    soft: "bg-fitness-soft",
    text: "text-fitness-bright",
    lines: [
      "I trust myself and my decisions.",
      "I speak up with clarity and calm.",
      "I am enough, exactly as I am.",
      "I release comparison and honor my own path.",
      "I carry myself with quiet, steady confidence.",
    ],
  },
];

/** YouTube search for a guided 10-minute session in a theme. */
export function affirmationSessionUrl(label: string): string {
  const q = encodeURIComponent(`10 minute ${label} affirmations`);
  return `https://www.youtube.com/results?search_query=${q}`;
}

/** Stable day index from an ISO date (YYYY-MM-DD) — same all day, rotates daily. */
function dayIndex(dateISO: string): number {
  const digits = dateISO.replace(/\D/g, "");
  let n = 0;
  for (const ch of digits) n = n * 10 + (ch.charCodeAt(0) - 48);
  return n;
}

/** Today's affirmation + which theme it came from — deterministic per day. */
export function dailyAffirmation(dateISO: string): { theme: AffirmationTheme; line: string } {
  const idx = dayIndex(dateISO);
  const theme = AFFIRMATION_THEMES[idx % AFFIRMATION_THEMES.length]!;
  const line = theme.lines[idx % theme.lines.length]!;
  return { theme, line };
}
