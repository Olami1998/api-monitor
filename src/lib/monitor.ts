import type { Monitor } from "@/generated/prisma/client";
import { encryptString, decryptString } from "@/lib/encryption";

export function publicAuth(auth: unknown) {
  if (!auth || typeof auth !== "object") {
    return { type: "NONE", configured: false };
  }
  const data = auth as Record<string, unknown>;
  const type = typeof data.type === "string" ? data.type : "NONE";
  return {
    type,
    configured: type !== "NONE" && Boolean(data.ciphertext),
  };
}

function isSensitiveName(name: string) {
  return /^(authorization|proxy-authorization|cookie|set-cookie|x-api-key|api-key|x-auth-token|x-access-token)$|token|secret|password|auth/i.test(
    name
  );
}

type RequestConfig = {
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: unknown;
};

export function persistRequestConfig(request: RequestConfig) {
  return { enc: encryptString(JSON.stringify(request)) };
}

export function readRequestConfig(request: unknown): RequestConfig {
  if (!request || typeof request !== "object") {
    return { headers: {}, queryParams: {}, body: null };
  }
  const data = request as Record<string, unknown>;
  if (typeof data.enc === "string") {
    try {
      const parsed = JSON.parse(decryptString(data.enc)) as RequestConfig;
      return {
        headers: parsed.headers ?? {},
        queryParams: parsed.queryParams ?? {},
        body: parsed.body ?? null,
      };
    } catch {
      return { headers: {}, queryParams: {}, body: null };
    }
  }
  return {
    headers: (data.headers as Record<string, string>) ?? {},
    queryParams: (data.queryParams as Record<string, string>) ?? {},
    body: data.body ?? null,
  };
}

export function publicRequest(request: unknown) {
  const data = readRequestConfig(request);
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(data.headers ?? {})) {
    if (typeof value !== "string") continue;
    headers[key] = isSensitiveName(key) ? "[REDACTED]" : value;
  }
  const queryParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(data.queryParams ?? {})) {
    if (typeof value !== "string") continue;
    queryParams[key] = isSensitiveName(key) ? "[REDACTED]" : value;
  }
  return {
    headers,
    queryParams,
    body: data.body ?? null,
  };
}

export function serializeMonitor(monitor: Monitor) {
  return {
    id: monitor.id,
    name: monitor.name,
    url: monitor.url,
    method: monitor.method,
    status: monitor.status,
    health: monitor.health,
    enabled: monitor.enabled,
    timeoutMs: monitor.timeoutMs,
    intervalSeconds: monitor.intervalSeconds,
    lastRunAt: monitor.lastRunAt,
    nextRunAt: monitor.nextRunAt,
    request: publicRequest(monitor.request),
    authentication: publicAuth(monitor.auth),
    createdAt: monitor.createdAt,
    updatedAt: monitor.updatedAt,
  };
}

export function defaultRequestConfig() {
  return persistRequestConfig({
    headers: {},
    queryParams: {},
    body: null,
  });
}

export function defaultAuthConfig() {
  return {
    type: "NONE",
  };
}

export function nextRunAt(intervalSeconds: number) {
  return new Date(Date.now() + intervalSeconds * 1000);
}

export function encryptAuthConfig(input: {
  type: "NONE" | "BEARER" | "API_KEY" | "BASIC";
  token?: string;
  key?: string;
  value?: string;
  username?: string;
  password?: string;
}) {
  if (input.type === "NONE") {
    return { type: "NONE" };
  }
  const secrets =
    input.type === "BEARER"
      ? { token: input.token }
      : input.type === "API_KEY"
        ? { key: input.key, value: input.value }
        : { username: input.username, password: input.password };
  return {
    type: input.type,
    ciphertext: encryptString(JSON.stringify(secrets)),
  };
}
