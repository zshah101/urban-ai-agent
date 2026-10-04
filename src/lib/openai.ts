import "server-only";
import OpenAI from "openai";
import { buildPrompt, buildExplanationPrompt } from "./prompts";
import { compileQueryPlan, QUERY_PLAN_SCHEMA, type ApprovedQuery } from "./query-plan";

let openai: OpenAI | undefined;
function getOpenAI(): OpenAI {
  return openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 15_000, maxRetries: 0 });
}

// ─────────────────────────────────────────────────────────────
//  Normalize ANY table's result into the card format the
//  frontend expects: store_name, city, zip_code,
//                    total_crimes, population, priority_score
// ─────────────────────────────────────────────────────────────
export type NormalizedResult = { store_name: string | null; city: string; zip_code: string; total_crimes: number; population: number; priority_score: number };
type DataRow = Record<string, unknown>;
const text = (value: unknown, fallback: string | null = null): string | null => typeof value === "string" ? value : fallback;
const numeric = (value: unknown, fallback = 0): number => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function normalizeResults(results: DataRow[]): NormalizedResult[] {
  if (!results || results.length === 0) return [];

  return results.map((row) => {
    // ── grocery_safety_index / urban_priority_index ─────────
    // Real data ranges:
    //   priority_score: 0.17 (safest) → ~3030 (most dangerous)
    //   urban_priority_index priority_score: up to ~864
    // Normalize to 0–100 using log scale so mid-range scores
    // aren't all squashed at the bottom
    if (row.priority_score !== undefined || row.safety_score !== undefined) {
      const raw = Math.max(0, numeric(row.priority_score));
      // Log scale: log(1 + score) / log(1 + 3030) * 100
      // This gives: 0.17→0, 139→53, 530→72, 858→79, 3030→100
      const MAX_SCORE = 3030;
      const normalized = raw === 0
        ? 0
        : Math.min(100, Math.round((Math.log(1 + raw) / Math.log(1 + MAX_SCORE)) * 100));
      return {
        store_name:     text(row.store_name),
        city:           text(row.city, "Unknown")!,
        zip_code:       String(row.zip_code ?? ""),
        total_crimes:   numeric(row.total_crimes),
        population:     numeric(row.population),
        priority_score: normalized,
      };
    }

    // ── zip_crime_summary ────────────────────────────────────
    if (row.crimes_per_1000_residents !== undefined || (row.zip_code && row.total_crimes !== undefined && row.store_name === undefined)) {
      const pop = numeric(row.population, 1);
      const crimes = numeric(row.total_crimes);
      // Normalise to 0-100 scale: 200 crimes per 1000 = 100 score
      const riskScore = pop > 0 ? Math.max(0, Math.min(100, Math.round((crimes / pop) * 5000))) : 0;
      return {
        store_name:     null,
        city:           text(row.city, "Unknown")!,
        zip_code:       String(row.zip_code ?? ""),
        total_crimes:   crimes,
        population:     pop,
        priority_score: riskScore,
      };
    }

    // ── svi_clean ────────────────────────────────────────────
    if (row.vulnerability_score !== undefined || row.RPL_THEMES !== undefined) {
      const svi = numeric(row.vulnerability_score ?? row.RPL_THEMES);
      return {
        store_name:     text(row.LOCATION ?? row.location),
        city:           text(row.COUNTY ?? row.county, "Unknown")!,
        zip_code:       String(row.FIPS ?? row.fips ?? ""),
        total_crimes:   Math.round(numeric(row.pct_poverty ?? row.EP_POV150)),
        population:     numeric(row.population ?? row.E_TOTPOP),
        priority_score: Math.min(100, Math.round(svi * 100)),
      };
    }

    // ── snap_retailers ───────────────────────────────────────
    if (row.store_name !== undefined && row.store_type !== undefined) {
      return {
        store_name:     text(row.store_name),
        city:           text(row.city, "Unknown")!,
        zip_code:       String(row.zip_code ?? ""),
        total_crimes:   0,
        population:     0,
        priority_score: 0,
      };
    }

    // ── census_clean ─────────────────────────────────────────
    if (row.median_income !== undefined) {
      return {
        store_name:     null,
        city:           text(row.city, "Unknown")!,
        zip_code:       String(row.zip_code ?? ""),
        total_crimes:   0,
        population:     numeric(row.population),
        priority_score: Math.min(100, Math.round(numeric(row.poverty_rate) * 2)),
      };
    }

    // ── Generic fallback ─────────────────────────────────────
    return {
      store_name:     text(row.store_name),
      city:           text(row.city, "Unknown")!,
      zip_code:       String(row.zip_code ?? ""),
      total_crimes:   numeric(row.total_crimes),
      population:     numeric(row.population),
      priority_score: numeric(row.priority_score),
    };
  });
}

// ─────────────────────────────────────────────────────────────
//  The model plans intent; the server owns the SQL.
// ─────────────────────────────────────────────────────────────
export async function generateQuery(question: string, signal?: AbortSignal): Promise<ApprovedQuery> {
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      store: false,
      messages: [{ role: "system", content: buildPrompt() }, { role: "user", content: question }],
      temperature: 0,
      max_completion_tokens: 600,
      response_format: { type: "json_schema", json_schema: { name: "aura_query_plan", strict: true, schema: QUERY_PLAN_SCHEMA } },
    }, { signal });
    const message = completion.choices[0]?.message;
    if (!message?.content || message.refusal) throw new Error("No approved query plan");
    return compileQueryPlan(JSON.parse(message.content));
  } catch {
    throw new Error("AURA could not create a supported query. Try a city, ZIP, or ranking question.");
  }
}

// ─────────────────────────────────────────────────────────────
//  Explanation Generation
// ─────────────────────────────────────────────────────────────
export async function generateExplanation(question: string, results: NormalizedResult[], signal?: AbortSignal): Promise<string> {
  if (!results || results.length === 0) {
    return "No data matched that query. Try being more specific — include a city name like 'Phoenix', or use phrases like 'highest risk', 'safest areas', or 'most vulnerable ZIP codes'.";
  }

  try {
    const prompt = buildExplanationPrompt(question, results);
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      store: false,
      messages: [{ role: "system", content: prompt }],
      temperature: 0.35,
      max_completion_tokens: 400,
    }, { signal });
    return (completion.choices[0]?.message.content ?? "Analysis complete.").slice(0, 4_000);
  } catch {
    return "Data retrieved successfully.";
  }
}
