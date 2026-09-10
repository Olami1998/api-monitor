import http from "node:http";
import https from "node:https";
import { decryptString } from "@/lib/encryption";
import { assertSafeDestination, type ResolvedTarget } from "@/lib/ssrf";

const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_REDIRECTS = 5;

const FORBIDDEN_HEADERS = new Set([
  "host",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "te",
  "trailer",
  "proxy-authorization",
  "proxy-authenticate",
]);

type RequestConfig = {
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: unknown;
};

type AuthConfig = {
  type?: string;
  ciphertext?: string;
};

export type ExecutionResult = {
  status: "PASSED" | "ERROR" | "TIMEOUT";
  httpStatus?: number | null;
  responseTime?: number | null;
  responseSize?: number | null;
  errorMessage?: string | null;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
};

function isSafeHeaderName(name: string) {
  const key = name.trim().toLowerCase();
  if (!key || /[\r\n]/.test(name)) return false;
  return !FORBIDDEN_HEADERS.has(key);
}

function applyAuth(headers: Record<string, string>, auth: AuthConfig | null | undefined) {
  if (!auth?.type || auth.type === "NONE" || !auth.ciphertext) {
    return headers;
  }
  const secrets = JSON.parse(decryptString(auth.ciphertext)) as {
    token?: string;
    key?: string;
    value?: string;
    username?: string;
    password?: string;
  };
  if (auth.type === "BEARER" && secrets.token) {
    headers.authorization = `Bearer ${secrets.token}`;
  }
  if (auth.type === "API_KEY" && secrets.key && secrets.value && isSafeHeaderName(secrets.key)) {
    headers[secrets.key.toLowerCase()] = secrets.value;
  }
  if (auth.type === "BASIC" && secrets.username && secrets.password) {
    headers.authorization = `Basic ${Buffer.from(`${secrets.username}:${secrets.password}`).toString("base64")}`;
  }
  return headers;
}

function parseBody(buffer: Buffer, contentType: string | null) {
  const text = buffer.toString("utf8");
  if (contentType?.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function requestPinned(
  target: ResolvedTarget,
  input: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    timeoutMs: number;
  }
) {
  return new Promise<{
    status: number;
    headers: Record<string, string>;
    buffer: Buffer;
  }>((resolve, reject) => {
    const isHttps = target.url.protocol === "https:";
    const port = target.url.port ? Number(target.url.port) : isHttps ? 443 : 80;
    const options: https.RequestOptions = {
      protocol: target.url.protocol,
      hostname: target.address,
      port,
      path: `${target.url.pathname}${target.url.search}`,
      method: input.method,
      headers: {
        ...input.headers,
        host: target.url.host,
      },
      timeout: input.timeoutMs,
      servername: isHttps ? target.url.hostname : undefined,
    };

    const req = (isHttps ? https : http).request(options, (res) => {
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.byteLength;
        if (size > MAX_RESPONSE_BYTES) {
          req.destroy(new Error("Response exceeded maximum allowed size"));
          return;
        }
        chunks.push(chunk);
      });
      res.on("end", () => {
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          if (typeof value === "string") headers[key.toLowerCase()] = value;
          else if (Array.isArray(value)) headers[key.toLowerCase()] = value.join(", ");
        }
        resolve({
          status: res.statusCode ?? 0,
          headers,
          buffer: Buffer.concat(chunks),
        });
      });
    });
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", reject);
    if (input.body) req.write(input.body);
    req.end();
  });
}

export async function executeMonitorRequest(input: {
  url: string;
  method: string;
  timeoutMs: number;
  request?: RequestConfig | null;
  auth?: AuthConfig | null;
}): Promise<ExecutionResult> {
  const started = Date.now();
  try {
    let target = await assertSafeDestination(input.url);
    const query = input.request?.queryParams ?? {};
    for (const [key, value] of Object.entries(query)) {
      target.url.searchParams.set(key, value);
    }

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(input.request?.headers ?? {})) {
      if (!isSafeHeaderName(key) || /[\r\n]/.test(value)) continue;
      headers[key.toLowerCase()] = value;
    }
    applyAuth(headers, input.auth ?? undefined);

    let method = input.method;
    let body: string | undefined =
      method === "GET" || method === "HEAD" || method === "DELETE"
        ? undefined
        : input.request?.body == null
          ? undefined
          : typeof input.request.body === "string"
            ? input.request.body
            : JSON.stringify(input.request.body);

    if (body && Buffer.byteLength(body) > MAX_RESPONSE_BYTES) {
      return {
        status: "ERROR",
        errorMessage: "Request body exceeded maximum allowed size",
        responseTime: Date.now() - started,
      };
    }

    if (body && !headers["content-type"]) {
      headers["content-type"] = "application/json";
    }

    let redirects = 0;
    while (true) {
      const response = await requestPinned(target, {
        method,
        headers,
        body,
        timeoutMs: input.timeoutMs,
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.location;
        if (!location || redirects >= MAX_REDIRECTS) {
          return {
            status: "ERROR",
            httpStatus: response.status,
            responseTime: Date.now() - started,
            errorMessage: "Unsafe or excessive redirects",
          };
        }
        const next = new URL(location, target.url);
        target = await assertSafeDestination(next.toString());
        if (response.status === 303 || ((response.status === 301 || response.status === 302) && method !== "HEAD")) {
          method = "GET";
          body = undefined;
          delete headers["content-type"];
        }
        redirects += 1;
        continue;
      }

      return {
        status: "PASSED",
        httpStatus: response.status,
        responseTime: Date.now() - started,
        responseSize: response.buffer.byteLength,
        responseHeaders: response.headers,
        responseBody: parseBody(response.buffer, response.headers["content-type"] ?? null),
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    const timedOut = /timeout|abort/i.test(message);
    return {
      status: timedOut ? "TIMEOUT" : "ERROR",
      responseTime: Date.now() - started,
      errorMessage: timedOut ? "Request timed out" : message,
    };
  }
}
