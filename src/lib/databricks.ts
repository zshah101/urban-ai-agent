import "server-only";
import { DBSQLClient } from "@databricks/sql";
import type IDBSQLSession from "@databricks/sql/dist/contracts/IDBSQLSession";
import type IOperation from "@databricks/sql/dist/contracts/IOperation";
import { MAX_RESULT_BYTES, MAX_RESULT_ROWS, type ApprovedQuery } from "./query-plan";

const QUERY_SECONDS = 25;

async function cleanup(action: () => Promise<unknown>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.resolve().then(action).catch(() => undefined),
      new Promise<void>(resolve => { timer = setTimeout(resolve, 750); }),
    ]);
  } finally { clearTimeout(timer); }
}

function bounded<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) { void pending.catch(() => undefined); return Promise.reject(new Error("Query timed out")); }
  return new Promise((resolve, reject) => {
    const aborted = () => reject(new Error("Query timed out"));
    signal.addEventListener("abort", aborted, { once: true });
    pending.then(resolve, reject).finally(() => signal.removeEventListener("abort", aborted));
  });
}

export async function runQuery(query: ApprovedQuery, callerSignal?: AbortSignal): Promise<Record<string, unknown>[]> {
  const host = process.env.DATABRICKS_HOST;
  const path = process.env.DATABRICKS_HTTP_PATH;
  const token = process.env.DATABRICKS_TOKEN;
  if (!host || !path || !token) throw new Error("Data service unavailable");
  const signal = AbortSignal.any([AbortSignal.timeout(QUERY_SECONDS * 1_000), ...(callerSignal ? [callerSignal] : [])]);
  if (signal.aborted) throw new Error("Query timed out");
  const client = new DBSQLClient({ logger: { log: () => undefined } });
  let session: IDBSQLSession | undefined;
  let timeoutOperation: IOperation | undefined;
  let operation: IOperation | undefined;
  let finished = false;
  const cancel = () => {
    if (operation) void cleanup(() => operation!.cancel());
    if (timeoutOperation) void cleanup(() => timeoutOperation!.cancel());
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    const connected = client.connect({ host, path, token, socketTimeout: 10_000, retryMaxAttempts: 1, retriesTimeout: 10_000, telemetryEnabled: false });
    void connected.then(() => { if (finished || signal.aborted) return cleanup(() => client.close()); }, () => undefined);
    await bounded(connected, signal);
    const opened = client.openSession({ initialCatalog: "workspace", initialSchema: "urban_ai", configuration: { STATEMENT_TIMEOUT: String(QUERY_SECONDS) } });
    void opened.then(late => { if (finished || signal.aborted) return cleanup(() => late.close()); }, () => undefined);
    session = await bounded(opened, signal);
    // queryTimeout only applies to compute clusters; SQL warehouses need this setting.
    const configured = session.executeStatement(`SET STATEMENT_TIMEOUT = ${QUERY_SECONDS}`, { maxRows: 1, queryTimeout: QUERY_SECONDS });
    void configured.then(async late => {
      if (finished || signal.aborted) { await cleanup(() => late.cancel()); await cleanup(() => late.close()); }
    }, () => undefined);
    timeoutOperation = await bounded(configured, signal);
    await bounded(timeoutOperation.finished(), signal);
    const submitted = session.executeStatement(query.sql, { namedParameters: query.parameters, runAsync: true, queryTimeout: QUERY_SECONDS, maxRows: MAX_RESULT_ROWS, useCloudFetch: false });
    // If submission resolves after a deadline, cancel its late operation too.
    void submitted.then(async late => {
      if (finished || signal.aborted) { await cleanup(() => late.cancel()); await cleanup(() => late.close()); }
    }, () => undefined);
    operation = await bounded(submitted, signal);
    const chunk = await bounded(operation.fetchChunk({ maxRows: MAX_RESULT_ROWS, disableBuffering: true }), signal);
    if (!Array.isArray(chunk) || chunk.length > query.limit || chunk.length > MAX_RESULT_ROWS) throw new Error("Data result exceeded limits");
    const rows = chunk.map(row => {
      if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("Invalid data result");
      return Object.fromEntries(Object.entries(row).map(([key, value]) => {
        if (key.length > 100 || typeof value === "string" && value.length > 512 || typeof value === "number" && !Number.isFinite(value) || value !== null && !["string", "number", "bigint", "boolean"].includes(typeof value)) throw new Error("Invalid data result");
        return [key, typeof value === "bigint" ? value.toString() : value];
      }));
    });
    if (Buffer.byteLength(JSON.stringify(rows)) > MAX_RESULT_BYTES) throw new Error("Data result exceeded limits");
    return rows;
  } finally {
    finished = true;
    signal.removeEventListener("abort", cancel);
    // Cleanup errors must not expose credentials or replace the safe route error.
    if (operation) await cleanup(() => operation!.close());
    if (timeoutOperation) await cleanup(() => timeoutOperation!.close());
    if (session) await cleanup(() => session!.close());
    await cleanup(() => client.close());
  }
}
