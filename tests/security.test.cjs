/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness uses CommonJS provider stubs. */
/* Offline tests load the real TypeScript modules with provider-only stubs. */
const assert = require("node:assert/strict");
const { test, beforeEach, afterEach } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { setTimeout: delay } = require("node:timers/promises");

const root = path.resolve(__dirname, "..");
const TEST_CODE = "0123456789abcdefABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
const originalEnv = { ...process.env };
let state;
let cache;

function load(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = { exports: {} };
  cache.set(filename, loaded);
  const emitted = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  const localRequire = specifier => {
    if (specifier === "server-only") return {};
    if (specifier === "openai") return class {
      constructor(options) { state.openaiOptions = options; }
      chat = { completions: { create: async (options, requestOptions) => {
        state.model.push({ options, requestOptions });
        if (state.modelError) throw state.modelError;
        const content = options.response_format ? JSON.stringify(state.plan) : state.explanation;
        return { choices: [{ message: { content } }] };
      } } };
    };
    if (specifier === "@databricks/sql") return { DBSQLClient: class {
      async connect(options) {
        state.connections.push(options);
        if (state.connectError) throw state.connectError;
        if (state.connectPending) await state.connectPending.promise;
        return this;
      }
      async openSession(options) {
        state.sessions.push(options);
        if (state.sessionPending) await state.sessionPending.promise;
        return {
          executeStatement: async (sql, options) => {
            state.statements.push({ sql, options });
            if (state.databaseError) throw state.databaseError;
            if (state.statementPending) await state.statementPending.promise;
            return {
              finished: async () => { state.timeoutFinished = true; },
              fetchChunk: async options => {
                state.fetches.push(options);
                if (state.fetchPending) await state.fetchPending.promise;
                return state.rows;
              },
              cancel: async () => { state.cancels++; },
              close: async () => { state.operationCloses++; if (state.hangCleanup) await new Promise(() => {}); },
            };
          },
          close: async () => { state.sessionCloses++; if (state.hangCleanup) await new Promise(() => {}); },
        };
      }
      async close() { state.clientCloses++; if (state.hangCleanup) await new Promise(() => {}); }
    } };
    if (specifier.startsWith("@/")) return load(`${specifier.slice(2)}.ts`);
    if (specifier.startsWith(".")) return load(`${path.relative(root, path.resolve(path.dirname(filename), specifier))}.ts`);
    return require(specifier);
  };
  new Function("exports", "require", "module", emitted)(loaded.exports, localRequire, loaded);
  return loaded.exports;
}

function validPlan(overrides = {}) {
  return { dataset: "grocery_safety_index", orderBy: "risk", direction: "DESC", limit: 8, city: null, zipCodes: [], minPopulation: null, maxPopulation: null, ...overrides };
}
function deferred() {
  let resolve;
  const promise = new Promise(accept => { resolve = accept; });
  return { promise, resolve };
}
function authCookie(token) {
  const auth = load("src/lib/owner-auth.ts");
  return `${auth.ownerCookieName()}=${token ?? auth.issueOwnerSession()}`;
}
function request(body = { question: "Highest risk stores in Phoenix" }, options = {}) {
  const headers = { "content-type": "application/json", origin: "https://aura.test", ...options.headers };
  if (options.owner) headers.cookie = authCookie(options.token);
  return new Request("https://aura.test/api/query", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body), ...(options.signal ? { signal: options.signal } : {}) });
}
function providersUntouched() {
  assert.equal(state.model.length, 0);
  assert.equal(state.connections.length, 0);
}
beforeEach(() => {
  cache = new Map();
  state = { model: [], connections: [], sessions: [], statements: [], fetches: [], rows: [{ store_name: "Example store", city: "Phoenix", zip_code: "85004", total_crimes: 20, population: 1_000, priority_score: 5 }], plan: validPlan(), explanation: "Example explanation.", operationCloses: 0, sessionCloses: 0, clientCloses: 0, cancels: 0 };
  process.env.NODE_ENV = "production";
  process.env.AI_OWNER_ACCESS_CODE = TEST_CODE;
  process.env.OPENAI_API_KEY = "offline-provider-fixture";
  process.env.DATABRICKS_HOST = "offline.databricks.test";
  process.env.DATABRICKS_HTTP_PATH = "/sql/1.0/warehouses/offline";
  process.env.DATABRICKS_TOKEN = "offline-database-fixture";
});
afterEach(() => {
  for (const key of ["NODE_ENV", "AI_OWNER_ACCESS_CODE", "OPENAI_API_KEY", "DATABRICKS_HOST", "DATABRICKS_HTTP_PATH", "DATABRICKS_TOKEN"]) {
    if (originalEnv[key] === undefined) delete process.env[key]; else process.env[key] = originalEnv[key];
  }
});

test("missing/obviously weak owner configuration fails closed before body or providers", async () => {
  const route = load("app/api/query/route.ts");
  for (const code of [undefined, "short", " ".repeat(40), "a".repeat(40), "change-me-0123456789-ABCDEFGHIJKLM"]) {
    if (code === undefined) delete process.env.AI_OWNER_ACCESS_CODE; else process.env.AI_OWNER_ACCESS_CODE = code;
    const response = await route.POST({ headers: new Headers(), url: "https://aura.test/api/query", get body() { throw new Error("Body must not be read"); } });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    providersUntouched();
  }
});

test("unauthorized and malformed/duplicate/tampered/expired sessions never reach providers", async () => {
  const auth = load("src/lib/owner-auth.ts");
  const route = load("app/api/query/route.ts");
  const valid = auth.issueOwnerSession();
  const expired = auth.issueOwnerSession(Date.now() - 3_601_000);
  const future = auth.issueOwnerSession(Date.now() + 120_000);
  for (const cookie of ["", authCookie("broken"), authCookie(`${valid.slice(0, -1)}${valid.endsWith("x") ? "y" : "x"}`), authCookie(expired), authCookie(future), `${authCookie(valid)}; ${authCookie(valid)}`]) {
    const response = await route.POST({ headers: new Headers({ cookie }), url: "https://aura.test/api/query", get body() { throw new Error("Body must not be read"); } });
    assert.equal(response.status, 401);
    providersUntouched();
  }
});

test("signed sessions are bound to purpose and changing the configured code revokes them", () => {
  const { createHmac } = require("node:crypto");
  const auth = load("src/lib/owner-auth.ts");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ purpose: "granola-owner-session-v1", issued: now, expires: now + 3600, nonce: "a".repeat(24) })).toString("base64url");
  const token = `${payload}.${createHmac("sha256", TEST_CODE).update(`aura-owner-session-v1.${payload}`).digest("base64url")}`;
  assert.throws(() => auth.requireOwner(request({}, { owner: true, token })), /Owner access required/);
  const previouslyValid = request({}, { owner: true });
  process.env.AI_OWNER_ACCESS_CODE = [...TEST_CODE].reverse().join("");
  assert.throws(() => auth.requireOwner(previouslyValid), /Owner access required/);
});

test("valid owner must still use same-origin requests", async () => {
  const route = load("app/api/query/route.ts");
  for (const origin of ["https://attacker.test", "null", ""]) {
    assert.equal((await route.POST(request({}, { owner: true, headers: { origin } }))).status, 403);
    providersUntouched();
  }
});

test("origin guard uses the browser-facing host through the Next adapter and rejects malformed origins", () => {
  const { requireSameOrigin } = load("src/lib/owner-auth.ts");
  const make = headers => ({ url: "http://localhost:8781/api/query", headers: new Headers(headers) });
  requireSameOrigin(make({ host: "aura.test", "x-forwarded-proto": "https", origin: "https://aura.test" }));
  requireSameOrigin(make({ host: "127.0.0.1:8781", "x-forwarded-proto": "http", origin: "http://127.0.0.1:8781" }));
  for (const headers of [
    { host: "aura.test", "x-forwarded-proto": "https,http", origin: "https://aura.test" },
    { host: "aura.test@attacker.test", origin: "http://attacker.test" },
    { host: "aura.test/anything", origin: "http://aura.test" },
    { host: "aura.test", origin: "http://aura.test/" },
    { host: "aura.test", origin: "http://aura.test", "sec-fetch-site": "cross-site" },
  ]) assert.throws(() => requireSameOrigin(make(headers)), /not allowed/);
});

test("owner input bounds reject wrong content type, invalid JSON, arrays, nonstrings and oversized requests", async () => {
  const route = load("app/api/query/route.ts");
  const fixtures = [
    [request({}, { owner: true, headers: { "content-type": "text/plain" } }), 415],
    [request("{", { owner: true }), 400], [request([], { owner: true }), 400],
    [request({ question: true }, { owner: true }), 400], [request({ question: "  " }, { owner: true }), 400],
    [request({ question: "x".repeat(2001) }, { owner: true }), 400],
    [request("x".repeat(8193), { owner: true }), 413],
    [request({}, { owner: true, headers: { "content-length": "9000" } }), 413],
  ];
  for (const [input, status] of fixtures) { assert.equal((await route.POST(input)).status, status); providersUntouched(); }
});

test("login only accepts same-origin JSON and issues an expiring secure host-only HttpOnly cookie", async () => {
  const route = load("app/api/owner-session/route.ts");
  const make = (code, origin = "https://aura.test") => new Request("https://aura.test/api/owner-session", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ code }) });
  assert.equal((await route.POST(make(TEST_CODE, "https://attacker.test"))).status, 403);
  assert.equal((await route.POST(make("incorrect"))).status, 401);
  const response = await route.POST(make(TEST_CODE));
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /^__Host-aura_owner=/);
  for (const attribute of ["HttpOnly", "Secure", "SameSite=strict", "Path=/", "Max-Age=3600"]) assert.ok(cookie.includes(attribute), attribute);
  assert.ok(!cookie.includes("Domain="));
  assert.ok(!cookie.includes(TEST_CODE));
  const body = await response.text();
  assert.ok(!body.includes(TEST_CODE));
  providersUntouched();
  const status = await route.GET(new Request("https://aura.test/api/owner-session", { headers: { cookie: cookie.split(";")[0] } }));
  assert.deepEqual(await status.json(), { authenticated: true });
  const logout = await route.DELETE(new Request("https://aura.test/api/owner-session", { method: "DELETE", headers: { cookie: cookie.split(";")[0], origin: "https://aura.test" } }));
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
});

test("six known datasets compile to server-owned SQL, with city/ZIP/numeric filters bound separately", () => {
  const { compileQueryPlan, DATASET_NAMES } = load("src/lib/query-plan.ts");
  for (const dataset of DATASET_NAMES) {
    const query = compileQueryPlan(validPlan({ dataset, orderBy: dataset === "snap_retailers" ? "name" : "risk" }));
    assert.match(query.sql, new RegExp(`FROM workspace\\.urban_ai\\.${dataset} `));
    assert.match(query.sql, /LIMIT :row_limit$/);
    assert.deepEqual(query.parameters, { row_limit: 8 });
    assert.ok(!/\bJOIN\b|;|\bUNION\b/.test(query.sql));
  }
  const city = "Phoenix' UNION SELECT secret FROM private.accounts --";
  const query = compileQueryPlan(validPlan({ city, zipCodes: ["85004", "85034"], minPopulation: 20_000, maxPopulation: 90_000 }));
  assert.ok(!query.sql.includes(city));
  assert.match(query.sql, /LOWER\(city\) = LOWER\(:city\)/);
  assert.deepEqual(query.parameters, { row_limit: 8, city, zip_0: "85004", zip_1: "85034", minPopulation: 20_000, maxPopulation: 90_000 });
});

test("invalid/model-injected identifiers, extra properties, limit/filter/prototype cases are rejected", () => {
  const { compileQueryPlan } = load("src/lib/query-plan.ts");
  const fixtures = [null, [], "SELECT private", validPlan({ dataset: "private.accounts" }), validPlan({ dataset: "constructor" }), validPlan({ dataset: "grocery_safety_index; DELETE" }), validPlan({ orderBy: "priority_score; DROP" }), validPlan({ direction: "DESC; SELECT" }), validPlan({ limit: 21 }), validPlan({ limit: 0 }), validPlan({ limit: "8" }), validPlan({ limit: 1.2 }), validPlan({ joins: [] }), validPlan({ zipCodes: ["85004');--"] }), validPlan({ zipCodes: Array(11).fill("85004") }), validPlan({ city: "x".repeat(101) }), validPlan({ city: {} }), validPlan({ minPopulation: -1 }), validPlan({ maxPopulation: Number.MAX_VALUE }), validPlan({ minPopulation: 100, maxPopulation: 1 }), validPlan({ dataset: "svi_clean", zipCodes: ["85004"] }), validPlan({ dataset: "census_clean", city: "Phoenix" }), validPlan({ dataset: "snap_retailers", orderBy: "risk" }), Object.create(validPlan())];
  const polluted = JSON.parse(JSON.stringify(validPlan()).replace('"city":null', '"city":null,"__proto__":{"dataset":"private"}'));
  fixtures.push(polluted);
  for (const fixture of fixtures) assert.throws(() => compileQueryPlan(fixture));
});

test("valid owner route works with provider stubs and binds the structured plan", async () => {
  state.plan = validPlan({ city: "Phoenix", limit: 5 });
  const route = load("app/api/query/route.ts");
  const response = await route.POST(request(undefined, { owner: true }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ["answer", "results"]);
  assert.equal(body.answer, "Example explanation.");
  assert.equal(body.results[0].store_name, "Example store");
  assert.equal(state.model.length, 2);
  assert.equal(state.model[0].options.max_completion_tokens, 600);
  assert.equal(state.model[1].options.max_completion_tokens, 400);
  assert.equal(state.openaiOptions.maxRetries, 0);
  assert.equal(state.openaiOptions.timeout, 15000);
  assert.equal(state.connections[0].retryMaxAttempts, 1);
  assert.equal(state.connections[0].telemetryEnabled, false);
  assert.equal(state.statements[0].sql, "SET STATEMENT_TIMEOUT = 25");
  assert.equal(state.timeoutFinished, true);
  assert.deepEqual(state.statements[1].options.namedParameters, { city: "Phoenix", row_limit: 5 });
  assert.equal(state.statements[1].options.useCloudFetch, false);
  assert.equal(state.fetches[0].maxRows, 20);
  assert.equal(state.operationCloses, 2);
  assert.equal(state.sessionCloses, 1);
  assert.equal(state.clientCloses, 1);
});

test("model-injected plan cannot reach the database, and provider errors never echo private markers", async () => {
  const route = load("app/api/query/route.ts");
  state.plan = validPlan({ dataset: "private.accounts" });
  assert.equal((await route.POST(request(undefined, { owner: true }))).status, 502);
  assert.equal(state.connections.length, 0);
  state.plan = validPlan();
  state.databaseError = new Error("PRIVATE_MARKER offline-database-fixture SELECT private.accounts");
  const logs = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args) => logs.push(args);
  console.error = (...args) => logs.push(args);
  try {
    const response = await route.POST(request(undefined, { owner: true }));
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes("PRIVATE_MARKER"));
    assert.deepEqual(logs, []);
  } finally { console.log = originalLog; console.error = originalError; }
});

test("database rejects oversized, nested, nonfinite and invalid rows", async () => {
  const { compileQueryPlan } = load("src/lib/query-plan.ts");
  const { runQuery } = load("src/lib/databricks.ts");
  const query = compileQueryPlan(validPlan());
  for (const rows of [Array(21).fill({ city: "Phoenix" }), [{ city: "x".repeat(513) }], [{ city: { nested: "value" } }], [null], [{ population: Infinity }], [true]]) {
    state.rows = rows;
    await assert.rejects(runQuery(query), /Invalid data result|exceeded limits/);
  }
});

test("database abort closes late connection/session/statement handles", async () => {
  const { compileQueryPlan } = load("src/lib/query-plan.ts");
  const { runQuery } = load("src/lib/databricks.ts");
  const query = compileQueryPlan(validPlan());
  for (const field of ["connectPending", "sessionPending", "statementPending"]) {
    const pending = deferred();
    state[field] = pending;
    const controller = new AbortController();
    const work = runQuery(query, controller.signal);
    await delay(5);
    controller.abort();
    await assert.rejects(work, /timed out/);
    const closes = state.clientCloses + state.sessionCloses + state.operationCloses;
    pending.resolve();
    await delay(10);
    assert.ok(state.clientCloses + state.sessionCloses + state.operationCloses > closes);
    state[field] = undefined;
  }
});

test("hung database cleanup cannot hold an aborted request indefinitely", async () => {
  const { compileQueryPlan } = load("src/lib/query-plan.ts");
  const { runQuery } = load("src/lib/databricks.ts");
  state.fetchPending = deferred();
  state.hangCleanup = true;
  const controller = new AbortController();
  const work = runQuery(compileQueryPlan(validPlan()), controller.signal);
  await delay(5);
  const started = Date.now();
  controller.abort();
  await assert.rejects(work, /timed out/);
  assert.ok(Date.now() - started < 4000);
  assert.ok(state.cancels > 0);
  state.fetchPending.resolve();
});

test("normalizer handles nonfinite-looking strings and zero population safely", () => {
  const { normalizeResults } = load("src/lib/openai.ts");
  for (const row of [{ priority_score: "Infinity", total_crimes: "9".repeat(512), population: "NaN" }, { zip_code: "85004", total_crimes: 1, population: 0 }, { vulnerability_score: "Infinity", population: 0 }, { median_income: 1, poverty_rate: "NaN" }]) {
    const result = normalizeResults([row])[0];
    for (const field of ["priority_score", "total_crimes", "population"]) assert.ok(Number.isFinite(result[field]));
  }
});

test("map popup treats every attacker-looking field as text, never nested HTML", () => {
  const { buildMapPopup } = load("src/lib/map-popup.ts");
  const elements = [];
  const document = { createElement(tag) {
    const element = { tag, style: {}, children: [], appendChild(child) { this.children.push(child); }, textContent: "" };
    Object.defineProperty(element, "innerHTML", { set() { throw new Error("Unsafe HTML sink used"); } });
    elements.push(element);
    return element;
  } };
  const payload = '<img src=x onerror="alert(1)"><b>marker</b>';
  const popup = buildMapPopup({ store_name: payload, city: payload, zip_code: payload, priority_score: 20 }, document);
  assert.equal(popup.children[1].textContent, payload);
  assert.ok(popup.children[2].textContent.includes(payload));
  assert.ok(elements.every(element => element.tag === "div"));
});
