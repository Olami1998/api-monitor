import type { Assertion, AssertionResult } from "@/generated/prisma/client";

type EvaluationContext = {
  httpStatus?: number | null;
  responseTimeMs?: number | null;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
};

function getJsonPathValue(path: string | null | undefined, value: unknown) {
  if (!path || !path.startsWith("$") || typeof value !== "object" || value === null) {
    return undefined;
  }

  const normalized = path.startsWith("$.") ? path.slice(2) : path.slice(1);
  const parts = normalized
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);

  let current: unknown = value;
  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    if (Array.isArray(current)) {
      const index = Number(part);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }
    if (!(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function compareNumeric(operator: string, expected: number, actual: number) {
  switch (operator) {
    case "LESS_THAN":
      return actual < expected;
    case "LESS_THAN_OR_EQUAL":
      return actual <= expected;
    case "GREATER_THAN":
      return actual > expected;
    case "GREATER_THAN_OR_EQUAL":
      return actual >= expected;
    case "EQUALS":
      return actual === expected;
    case "NOT_EQUALS":
      return actual !== expected;
    default:
      return false;
  }
}

function valueType(actual: unknown) {
  if (actual === null) return "null";
  if (Array.isArray(actual)) return "array";
  return typeof actual;
}

function evaluateAssertion(assertion: Assertion, context: EvaluationContext) {
  switch (assertion.type) {
    case "STATUS_CODE": {
      const expected = Number(assertion.expectedValue);
      const actual = Number(context.httpStatus ?? 0);
      return {
        passed: compareNumeric(assertion.operator, expected, actual),
        actual: String(actual),
        message: `Expected status ${assertion.operator} ${expected}, got ${actual}`,
      };
    }
    case "RESPONSE_TIME": {
      const expected = Number(assertion.expectedValue);
      const actual = Number(context.responseTimeMs ?? 0);
      return {
        passed: compareNumeric(assertion.operator, expected, actual),
        actual: String(actual),
        message: `Expected response time ${assertion.operator} ${expected}, got ${actual}`,
      };
    }
    case "HEADER": {
      const headerName = assertion.target ?? "";
      const actual = context.responseHeaders?.[headerName.toLowerCase()];
      const expected = String(assertion.expectedValue ?? "");
      switch (assertion.operator) {
        case "EXISTS":
          return { passed: actual !== undefined, actual: actual ?? null, message: `Header ${headerName} existence check` };
        case "NOT_EXISTS":
          return { passed: actual === undefined, actual: actual ?? null, message: `Header ${headerName} absence check` };
        case "CONTAINS":
          return { passed: typeof actual === "string" && actual.includes(expected), actual: actual ?? null, message: `Header ${headerName} should contain ${expected}` };
        case "NOT_CONTAINS":
          return { passed: typeof actual !== "string" || !actual.includes(expected), actual: actual ?? null, message: `Header ${headerName} should not contain ${expected}` };
        case "EQUALS":
          return { passed: actual === expected, actual: actual ?? null, message: `Header ${headerName} should equal ${expected}` };
        case "NOT_EQUALS":
          return { passed: actual !== expected, actual: actual ?? null, message: `Header ${headerName} should not equal ${expected}` };
        default:
          return { passed: false, actual: actual ?? null, message: `Unsupported header assertion operator ${assertion.operator}` };
      }
    }
    case "JSON": {
      const actual = getJsonPathValue(assertion.target, context.responseBody);
      const expected = assertion.expectedValue;
      switch (assertion.operator) {
        case "EXISTS":
          return { passed: actual !== undefined, actual: actual ?? null, message: `JSON path ${assertion.target} existence check` };
        case "NOT_EXISTS":
          return { passed: actual === undefined, actual: actual ?? null, message: `JSON path ${assertion.target} absence check` };
        case "EQUALS":
          return { passed: actual === expected, actual: actual ?? null, message: `JSON path ${assertion.target} should equal expected value` };
        case "NOT_EQUALS":
          return { passed: actual !== expected, actual: actual ?? null, message: `JSON path ${assertion.target} should not equal expected value` };
        case "CONTAINS":
          return {
            passed: typeof actual === "string" && String(actual).includes(String(expected)),
            actual: actual ?? null,
            message: `JSON path ${assertion.target} should contain expected value`,
          };
        case "NOT_CONTAINS":
          return {
            passed: typeof actual !== "string" || !String(actual).includes(String(expected)),
            actual: actual ?? null,
            message: `JSON path ${assertion.target} should not contain expected value`,
          };
        case "TYPE_IS":
          return {
            passed: valueType(actual) === String(expected).toLowerCase(),
            actual: actual ?? null,
            message: `JSON path ${assertion.target} should be type ${expected}`,
          };
        default:
          return { passed: false, actual: actual ?? null, message: `Unsupported JSON assertion operator ${assertion.operator}` };
      }
    }
    default:
      return { passed: false, actual: null, message: `Unsupported assertion type ${assertion.type}` };
  }
}

export function evaluateAssertions(assertions: Assertion[], context: EvaluationContext) {
  return assertions.map((assertion) => {
    const result = evaluateAssertion(assertion, context);
    return {
      assertionId: assertion.id,
      passed: result.passed,
      actual: result.actual == null ? null : String(result.actual),
      message: result.message,
      expected: assertion.expectedValue,
      actualValue: result.actual,
    } satisfies Partial<AssertionResult> & { assertionId: string };
  });
}

export function summarizeAssertionResults(results: Array<{ passed: boolean }>) {
  return results.length > 0 && results.every((result) => result.passed);
}
