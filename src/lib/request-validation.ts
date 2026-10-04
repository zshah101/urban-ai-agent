export const MAX_QUESTION_LENGTH = 2_000;
export const MAX_REQUEST_BYTES = 8_192;

export class RequestValidationError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

export async function readJsonBody(request: Request, maxBytes = MAX_REQUEST_BYTES): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new RequestValidationError("Send an application/json request.", 415);
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestValidationError("Request body is too large.", 413);
  }
  if (!request.body) throw new RequestValidationError("Request body required.");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new RequestValidationError("Request body timed out.", 408));
      void reader.cancel().catch(() => undefined);
    }, 5_000);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        void reader.cancel().catch(() => undefined);
        throw new RequestValidationError("Request body is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new RequestValidationError("Invalid JSON request.");
  }
}

export async function readQuestion(request: Request): Promise<string> {
  const body = await readJsonBody(request);
  if (!body || typeof body !== "object" || Array.isArray(body) || !("question" in body)) {
    throw new RequestValidationError("Question required.");
  }
  const question = (body as { question: unknown }).question;
  if (typeof question !== "string" || !question.trim()) {
    throw new RequestValidationError("Question must be a non-empty string.");
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    throw new RequestValidationError(`Question must be at most ${MAX_QUESTION_LENGTH} characters.`);
  }
  return question.trim();
}
