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
  {
    id: "lib_black_bean_chili",
    title: "Smoky Black Bean Chili",
    description: "Big-batch, freezer-friendly, protein-packed.",
    calories: 410,
    timeMin: 35,
    ingredients: ["black beans", "cherry tomatoes", "bell peppers", "smoked paprika", "onion"],
  },
  {
    id: "lib_peanut_noodles",
    title: "Peanut Tofu Noodles",
    description: "Creamy peanut sauce over noodles and crisp veg.",
    calories: 520,
    timeMin: 20,
    ingredients: ["tofu", "rice noodles", "peanut butter", "soy sauce", "bell peppers"],
  },
  {
    id: "lib_chickpea_shawarma",
    title: "Chickpea Shawarma Bowl",
    description: "Spiced chickpeas, greens, and a lemon-tahini drizzle.",
    calories: 460,
    timeMin: 25,
    ingredients: ["chickpeas", "spinach", "quinoa", "tahini", "lemon"],
  },
  {
    id: "lib_tofu_scramble",
    title: "Savory Tofu Scramble",
    description: "High-protein breakfast that eats like eggs.",
    calories: 300,
    timeMin: 15,
    ingredients: ["tofu", "spinach", "bell peppers", "nutritional yeast", "turmeric"],
  },
  {
    id: "lib_pb_banana_smoothie",
    title: "Peanut Butter Banana Smoothie",
    description: "Post-workout protein in a glass, blends in 2 minutes.",
    calories: 350,
    timeMin: 5,
    ingredients: ["banana", "peanut butter", "rolled oats", "soy milk", "frozen berries"],
  },
  {
    id: "lib_red_lentil_dal",
    title: "Red Lentil Dal",
    description: "Cozy, creamy, one-pot — freezes beautifully.",
    calories: 380,
    timeMin: 30,
    ingredients: ["red lentils", "coconut milk", "spinach", "onion", "smoked paprika"],
  },
  {
    id: "lib_stuffed_peppers",
    title: "Quinoa-Stuffed Peppers",
    description: "Meal-prep staple — bake a tray, eat all week.",
    calories: 420,
    timeMin: 45,
    ingredients: ["bell peppers", "quinoa", "black beans", "cherry tomatoes", "onion"],
  },
  {
    id: "lib_edamame_rice_bowl",
    title: "Edamame Ginger Rice Bowl",
    description: "Fast, light, and loaded with plant protein.",
    calories: 410,
    timeMin: 20,
    ingredients: ["brown rice", "frozen edamame", "carrots", "soy sauce", "ginger"],
  },
  {
    id: "lib_minestrone",
    title: "Garden Minestrone",
    description: "High-volume vegetable soup, very low calorie.",
    calories: 260,
    timeMin: 35,
    ingredients: ["white beans", "zucchini", "cherry tomatoes", "spinach", "vegetable broth"],
  },
  {
    id: "lib_sweet_potato_curry",
    title: "Sweet Potato Chickpea Curry",
    description: "Golden coconut curry over rice — crowd-pleaser.",
    calories: 480,
    timeMin: 30,
    ingredients: ["sweet potatoes", "chickpeas", "coconut milk", "spinach", "onion"],
  },
  {
    id: "lib_avocado_toast",
    title: "Loaded Avocado Toast",
    description: "5-minute breakfast with white beans for staying power.",
    calories: 340,
    timeMin: 5,
    ingredients: ["whole grain bread", "avocado", "white beans", "cherry tomatoes", "lemon"],
  },
];

/** Pantry staples assumed always available for matching purposes. */
export const STAPLES = ["salt", "pepper", "oil", "olive oil", "water", "garlic", "onion"];
