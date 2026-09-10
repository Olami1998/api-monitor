import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(200),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(200),
});

export const projectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
});

export const projectPatchSchema = projectSchema.partial();

const httpMethod = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export const createMonitorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().trim().max(2048),
  method: httpMethod.optional(),
  timeoutMs: z.number().int().min(500).max(30000).optional(),
  intervalSeconds: z.number().int().min(60).max(86400).optional(),
  enabled: z.boolean().optional(),
});

export const updateMonitorSchema = createMonitorSchema.partial();

const headerName = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => /^[\w-]+$/.test(value), "Invalid header name")
  .refine(
    (value) =>
      ![
        "host",
        "content-length",
        "transfer-encoding",
        "connection",
        "cookie",
        "set-cookie",
        "authorization",
        "proxy-authorization",
      ].includes(value.toLowerCase()),
    "Header is not allowed"
  );

export const requestConfigSchema = z.object({
  headers: z.record(headerName, z.string().max(4000)).optional().default({}),
  queryParams: z.record(z.string().max(100), z.string().max(2000)).optional().default({}),
  body: z.unknown().optional().nullable(),
});

export const authConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("NONE") }),
  z.object({ type: z.literal("BEARER"), token: z.string().min(1).max(4000) }),
  z.object({
    type: z.literal("API_KEY"),
    key: z
      .string()
      .min(1)
      .max(100)
      .refine((value) => /^[\w-]+$/.test(value), "Invalid header name"),
    value: z.string().min(1).max(4000),
  }),
  z.object({
    type: z.literal("BASIC"),
    username: z.string().min(1).max(200),
    password: z.string().min(1).max(400),
  }),
]);

export const assertionSchema = z.object({
  type: z.enum(["STATUS_CODE", "RESPONSE_TIME", "HEADER", "JSON"]),
  operator: z.enum([
    "EQUALS",
    "NOT_EQUALS",
    "CONTAINS",
    "NOT_CONTAINS",
    "EXISTS",
    "NOT_EXISTS",
    "LESS_THAN",
    "GREATER_THAN",
    "LESS_THAN_OR_EQUAL",
    "GREATER_THAN_OR_EQUAL",
    "TYPE_IS",
  ]),
  target: z.string().max(300).nullable().optional(),
  expectedValue: z.unknown().optional(),
});

export const incidentStatusSchema = z.enum(["OPEN", "RESOLVED"]);
export const testRunStatusSchema = z.enum(["QUEUED", "RUNNING", "PASSED", "FAILED", "ERROR", "TIMEOUT"]);

export function parseBody<T>(schema: z.ZodType<T>, value: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(value);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? "Invalid payload" };
  }
  return { ok: true, data: result.data };
}
