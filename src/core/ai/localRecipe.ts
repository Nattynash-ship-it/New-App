/**
 * Deterministic on-device fallback for the Reverse Recipe Engine.
 * Used when ANTHROPIC_API_KEY isn't configured (or the API call fails), so
 * the feature always works. Biases vegan, high-volume / low-calorie, matching
 * the user's dietary defaults.
 */

import type { Recipe, RecipeIngredient } from "../types";

interface Template {
  title: (star: string) => string;
  description: string;
  method: string[];
  base: RecipeIngredient[];
  calories: number;
}

const TEMPLATES: Template[] = [
  {
    title: (star) => `High-Volume ${star} Power Bowl`,
    description:
      "A big, satisfying bowl built for volume eating — greens-heavy, plant-protein forward, under 500 calories.",
    method: [
      "Cook the grain according to package directions.",
      "Massage the greens with a pinch of salt and a squeeze of lemon.",
      "Roast or sauté the vegetables at high heat until browned, ~10 minutes.",
      "Pan-sear the protein with soy sauce and smoked paprika.",
      "Assemble over the grain, top with nutritional yeast, and serve warm.",
    ],
    base: [
      { name: "Lemon juice", quantity: "1 tbsp" },
      { name: "Nutritional yeast", quantity: "2 tbsp" },
    ],
    calories: 470,
  },
  {
    title: (star) => `${star} & Veggie Skillet Stir-Fry`,
    description:
      "One-pan, 20 minutes, maximum plate coverage. Sauce is light so the volume stays high and the calories stay low.",
    method: [
      "Heat a large skillet or wok over high heat with a small splash of oil.",
      "Stir-fry the firmest vegetables first, 4–5 minutes.",
      "Add the protein and remaining vegetables; keep everything moving.",
      "Deglaze with soy sauce, garlic, and a splash of vegetable broth.",
      "Serve immediately — over grains if you want it heartier.",
    ],
    base: [
      { name: "Garlic", quantity: "3 cloves" },
      { name: "Soy sauce", quantity: "2 tbsp" },
    ],
    calories: 420,
  },
  {
    title: (star) => `Cozy ${star} Stew`,
    description:
      "Simmered, spoonable, and enormous for its calories. Great for meal prep — flavors deepen overnight.",
    method: [
      "Sweat aromatics in a large pot until translucent.",
      "Add vegetables and spices; toast 2 minutes.",
      "Pour in vegetable broth, bring to a boil, then simmer 20 minutes.",
      "Stir in leafy greens at the end just to wilt.",
      "Portion into containers — makes 4 generous servings.",
    ],
    base: [
      { name: "Vegetable broth", quantity: "4 cups" },
      { name: "Smoked paprika", quantity: "1 tsp" },
    ],
    calories: 390,
  },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function generateLocalRecipe(ingredients: string[]): Omit<Recipe, "id" | "createdAt"> {
  const cleaned = ingredients.map((i) => i.trim()).filter(Boolean);
  const star = cleaned[0] ?? "Garden Vegetable";
  const template = TEMPLATES[hashString(cleaned.join("|")) % TEMPLATES.length] ?? TEMPLATES[0]!;

  const ingredientList: RecipeIngredient[] = [
    ...cleaned.map((name) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      quantity: "1–2 cups",
    })),
    ...template.base,
  ];

  return {
    title: template.title(star.charAt(0).toUpperCase() + star.slice(1)),
    description: template.description,
    ingredients: ingredientList,
    steps: template.method,
    calories: template.calories,
    volumeScore: "high",
    vegan: true,
    source: "local",
  };
}
