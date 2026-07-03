/**
 * Built-in vegan recipe library powering "cook with what you have"
 * (SuperCook-style ingredient matching). All entries follow the user's
 * dietary defaults: vegan, high-volume, moderate calories.
 */

export interface LibraryRecipe {
  id: string;
  title: string;
  description: string;
  calories: number; // per serving
  timeMin: number;
  ingredients: string[]; // names only — quantities stay flexible
}

export const RECIPE_LIBRARY: LibraryRecipe[] = [
  {
    id: "lib_chickpea_curry",
    title: "Chickpea & Spinach Curry",
    description: "Creamy tomato-based curry, huge portions.",
    calories: 430,
    timeMin: 25,
    ingredients: ["chickpeas", "spinach", "cherry tomatoes", "vegetable broth", "smoked paprika"],
  },
  {
    id: "lib_lentil_soup",
    title: "Hearty Lentil Soup",
    description: "One-pot, meal-prep friendly, freezes well.",
    calories: 380,
    timeMin: 35,
    ingredients: ["lentils", "vegetable broth", "bell peppers", "smoked paprika"],
  },
  {
    id: "lib_tofu_stirfry",
    title: "Crispy Tofu Stir-Fry",
    description: "High-protein weeknight standby over rice.",
    calories: 460,
    timeMin: 20,
    ingredients: ["tofu", "soy sauce", "bell peppers", "mushrooms", "brown rice"],
  },
  {
    id: "lib_buddha_bowl",
    title: "Quinoa Buddha Bowl",
    description: "Grain bowl with roasted vegetables and greens.",
    calories: 490,
    timeMin: 30,
    ingredients: ["quinoa", "sweet potatoes", "kale", "chickpeas", "cashews"],
  },
  {
    id: "lib_tempeh_tacos",
    title: "Smoky Tempeh Tacos",
    description: "Crumbled tempeh with charred peppers.",
    calories: 440,
    timeMin: 25,
    ingredients: ["tempeh", "bell peppers", "smoked paprika", "soy sauce"],
  },
  {
    id: "lib_cauli_fried_rice",
    title: "Cauliflower Fried Rice",
    description: "High-volume, low-calorie takeout replacement.",
    calories: 320,
    timeMin: 20,
    ingredients: ["cauliflower", "frozen edamame", "soy sauce", "mushrooms"],
  },
  {
    id: "lib_zucchini_pasta",
    title: "Zucchini Ribbon Pasta",
    description: "Light cashew-cream sauce, giant plateful.",
    calories: 350,
    timeMin: 25,
    ingredients: ["zucchini", "cherry tomatoes", "cashews", "nutritional yeast"],
  },
  {
    id: "lib_overnight_oats",
    title: "Berry Overnight Oats",
    description: "Zero-effort breakfast, assembles in 5 minutes.",
    calories: 390,
    timeMin: 5,
    ingredients: ["rolled oats", "frozen berries", "cashews"],
  },
  {
    id: "lib_sweet_potato_bowl",
    title: "Loaded Sweet Potato Bowl",
    description: "Roasted sweet potato with edamame and greens.",
    calories: 470,
    timeMin: 35,
    ingredients: ["sweet potatoes", "frozen edamame", "spinach", "soy sauce"],
  },
  {
    id: "lib_mushroom_lentil_stew",
    title: "Mushroom Lentil Stew",
    description: "Deep umami stew — better the next day.",
    calories: 400,
    timeMin: 40,
    ingredients: ["mushrooms", "lentils", "vegetable broth", "kale"],
  },
];

/** Pantry staples assumed always available for matching purposes. */
export const STAPLES = ["salt", "pepper", "oil", "olive oil", "water", "garlic", "onion"];
