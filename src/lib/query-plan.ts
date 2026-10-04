import "server-only";

export const MAX_RESULT_ROWS = 20;
export const MAX_RESULT_BYTES = 65_536;
export const DATASET_NAMES = ["grocery_safety_index", "urban_safety_index", "zip_crime_summary", "svi_clean", "snap_retailers", "census_clean"] as const;
const ORDER_NAMES = ["risk", "crime", "population", "poverty", "income", "unemployment", "uninsured", "no_vehicle", "name"] as const;
type Dataset = typeof DATASET_NAMES[number];
type Order = typeof ORDER_NAMES[number];

type DatasetDefinition = { columns: string; orders: Partial<Record<Order, string>>; city?: string; zip?: string; population?: string };
const DATASETS: Record<Dataset, DatasetDefinition> = {
  grocery_safety_index: {
    columns: "store_name, city, zip_code, total_crimes, population, priority_score",
    orders: { risk: "priority_score", crime: "total_crimes", population: "population", name: "store_name" }, city: "city", zip: "zip_code", population: "population",
  },
  urban_safety_index: {
    columns: "zip_code, total_crimes, population, crimes_per_1000_residents",
    orders: { risk: "crimes_per_1000_residents", crime: "total_crimes", population: "population", name: "zip_code" }, zip: "zip_code", population: "population",
  },
  zip_crime_summary: { columns: "zip_code, total_crimes", orders: { risk: "total_crimes", crime: "total_crimes", name: "zip_code" }, zip: "zip_code" },
  svi_clean: {
    columns: "LOCATION, COUNTY, E_TOTPOP AS population, EP_POV150 AS pct_poverty, EP_UNEMP AS pct_unemployed, EP_UNINSUR AS pct_uninsured, EP_NOVEH AS pct_no_vehicle, RPL_THEMES AS vulnerability_score",
    orders: { risk: "RPL_THEMES", population: "E_TOTPOP", poverty: "EP_POV150", unemployment: "EP_UNEMP", uninsured: "EP_UNINSUR", no_vehicle: "EP_NOVEH", name: "LOCATION" }, population: "E_TOTPOP",
  },
  snap_retailers: {
    columns: "`Store Name` AS store_name, `Store Type` AS store_type, `City` AS city, `Zip Code` AS zip_code",
    orders: { name: "`Store Name`" }, city: "`City`", zip: "`Zip Code`",
  },
  census_clean: {
    columns: "zip_code, population, median_income, poverty_rate",
    orders: { risk: "poverty_rate", poverty: "poverty_rate", income: "median_income", population: "population", name: "zip_code" }, zip: "zip_code", population: "population",
  },
};

export const QUERY_PLAN_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    dataset: { type: "string", enum: DATASET_NAMES },
    orderBy: { type: "string", enum: ORDER_NAMES },
    direction: { type: "string", enum: ["ASC", "DESC"] },
    limit: { type: "integer", minimum: 1, maximum: MAX_RESULT_ROWS },
    city: { type: ["string", "null"] },
    zipCodes: { type: "array", items: { type: "string" }, maxItems: 10 },
    minPopulation: { type: ["integer", "null"] },
    maxPopulation: { type: ["integer", "null"] },
  },
  required: ["dataset", "orderBy", "direction", "limit", "city", "zipCodes", "minPopulation", "maxPopulation"],
} as const;

export type ApprovedQuery = { sql: string; parameters: Record<string, string | number>; limit: number };

// No model-generated identifiers, SQL fragments, expressions, or functions enter SQL.
export function compileQueryPlan(input: unknown): ApprovedQuery {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid query plan");
  const plan = input as Record<string, unknown>;
  const keys = QUERY_PLAN_SCHEMA.required;
  if (Object.keys(plan).length !== keys.length || keys.some(key => !Object.hasOwn(plan, key))) throw new Error("Invalid query plan");
  if (typeof plan.dataset !== "string" || !DATASET_NAMES.includes(plan.dataset as Dataset)) throw new Error("Unsupported dataset");
  const definition = DATASETS[plan.dataset as Dataset];
  if (typeof plan.orderBy !== "string" || !ORDER_NAMES.includes(plan.orderBy as Order) || !definition.orders[plan.orderBy as Order]) throw new Error("Unsupported sort");
  if (plan.direction !== "ASC" && plan.direction !== "DESC") throw new Error("Unsupported direction");
  if (!Number.isInteger(plan.limit) || (plan.limit as number) < 1 || (plan.limit as number) > MAX_RESULT_ROWS) throw new Error("Invalid result limit");
  const clauses: string[] = [];
  const parameters: Record<string, string | number> = { row_limit: plan.limit as number };
  if (plan.city !== null) {
    if (!definition.city || typeof plan.city !== "string" || !plan.city.trim() || plan.city.length > 100) throw new Error("Unsupported city filter");
    parameters.city = plan.city.trim();
    clauses.push(`LOWER(${definition.city}) = LOWER(:city)`);
  }
  if (!Array.isArray(plan.zipCodes) || plan.zipCodes.length > 10 || plan.zipCodes.some(zip => typeof zip !== "string" || !/^\d{5}$/.test(zip))) throw new Error("Invalid ZIP filter");
  if (plan.zipCodes.length) {
    if (!definition.zip) throw new Error("Unsupported ZIP filter");
    const placeholders = plan.zipCodes.map((zip, index) => { parameters[`zip_${index}`] = zip; return `:zip_${index}`; });
    clauses.push(`CAST(${definition.zip} AS STRING) IN (${placeholders.join(", ")})`);
  }
  for (const [field, comparison] of [["minPopulation", ">="], ["maxPopulation", "<="]] as const) {
    const value = plan[field];
    if (value !== null) {
      if (!definition.population || typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 100_000_000) throw new Error("Invalid population filter");
      parameters[field] = value;
      clauses.push(`${definition.population} ${comparison} :${field}`);
    }
  }
  if (typeof plan.minPopulation === "number" && typeof plan.maxPopulation === "number" && plan.minPopulation > plan.maxPopulation) throw new Error("Invalid population range");
  const sql = `SELECT ${definition.columns} FROM workspace.urban_ai.${plan.dataset}${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""} ORDER BY ${definition.orders[plan.orderBy as Order]} ${plan.direction} LIMIT :row_limit`;
  return { sql, parameters, limit: plan.limit as number };
}
