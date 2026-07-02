import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { generateLocalRecipe } from "@/core/ai/localRecipe";

export const runtime = "nodejs";
export const maxDuration = 60;

const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "string" },
        },
        required: ["name", "quantity"],
        additionalProperties: false,
      },
    },
    steps: { type: "array", items: { type: "string" } },
    calories: { type: "integer" },
    volumeScore: { type: "string", enum: ["high", "medium", "low"] },
    vegan: { type: "boolean" },
  },
  required: ["title", "description", "ingredients", "steps", "calories", "volumeScore", "vegan"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are the recipe engine inside a personal life-management app.
The user is vegan and prefers high-volume, low-calorie meal prep (big satisfying
portions, roughly 350-550 calories per serving). Given a list of ingredients the
user has on hand, design ONE realistic recipe that uses primarily those
ingredients. You may assume basic staples (oil, salt, pepper, water) and add at
most 2-3 common extras. Keep steps concise and practical for a busy parent.`;

interface RecipeRequestBody {
  ingredients?: unknown;
}

export async function POST(request: Request) {
  let ingredients: string[];
  try {
    const body = (await request.json()) as RecipeRequestBody;
    if (!Array.isArray(body.ingredients) || body.ingredients.length === 0) {
      return NextResponse.json(
        { error: "Provide a non-empty `ingredients` string array." },
        { status: 400 },
      );
    }
    ingredients = body.ingredients.map(String).slice(0, 40);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // No API key configured → deterministic on-device engine (app still works).
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ recipe: generateLocalRecipe(ingredients), engine: "local" });
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: RECIPE_SCHEMA } },
      messages: [
        {
          role: "user",
          content: `Ingredients on hand: ${ingredients.join(", ")}. Create one recipe.`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ recipe: generateLocalRecipe(ingredients), engine: "local" });
    }

    const text = response.content.find((b) => b.type === "text")?.text;
    if (!text) throw new Error("Empty model response");
    const recipe = JSON.parse(text) as ReturnType<typeof generateLocalRecipe>;
    return NextResponse.json({ recipe: { ...recipe, source: "ai" }, engine: "claude" });
  } catch (err) {
    console.error("Recipe engine falling back to local:", err);
    return NextResponse.json({ recipe: generateLocalRecipe(ingredients), engine: "local" });
  }
}
