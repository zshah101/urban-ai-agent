import { NextResponse } from "next/server";
import { generateQuery, generateExplanation, normalizeResults } from "@/src/lib/openai";
import { runQuery } from "@/src/lib/databricks";
import { requireOwner, requireSameOrigin } from "@/src/lib/owner-auth";
import { readQuestion, RequestValidationError } from "@/src/lib/request-validation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // Authorize before reading the request body or spending any provider credits.
    requireOwner(request);
    requireSameOrigin(request);
    const question = await readQuestion(request);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(55_000)]);
    const query = await generateQuery(question, signal);
    const results = normalizeResults(await runQuery(query, signal));
    const answer = await generateExplanation(question, results, signal);
    return NextResponse.json({ results, answer }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "Query unavailable. Try a supported city, ZIP, or ranking question." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
