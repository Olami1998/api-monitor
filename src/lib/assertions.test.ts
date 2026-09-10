import { describe, expect, it } from "vitest";
import { evaluateAssertions } from "./assertions";
import { isBlockedIpv4, isBlockedIp, isSafeHttpUrl } from "./ssrf";
import { encryptString, decryptString } from "./encryption";
import type { Assertion } from "@/generated/prisma/client";

const base = {
  id: "a1",
  monitorId: "m1",
  target: null,
  expectedValue: 200,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Assertion;

describe("assertions", () => {
  it("passes matching status codes", () => {
    const results = evaluateAssertions(
      [{ ...base, type: "STATUS_CODE", operator: "EQUALS", expectedValue: 200 }],
      { httpStatus: 200 }
    );
    expect(results[0]?.passed).toBe(true);
  });

  it("fails slow responses", () => {
    const results = evaluateAssertions(
      [{ ...base, type: "RESPONSE_TIME", operator: "LESS_THAN", expectedValue: 200 }],
      { responseTimeMs: 500 }
    );
    expect(results[0]?.passed).toBe(false);
  });

  it("reads nested json paths with indexes", () => {
    const results = evaluateAssertions(
      [{ ...base, type: "JSON", operator: "EQUALS", target: "$.items[0].id", expectedValue: "abc" }],
      { responseBody: { items: [{ id: "abc" }] } }
    );
    expect(results[0]?.passed).toBe(true);
  });
});

describe("ssrf", () => {
      it("blocks localhost variants and mapped loopback", () => {
    expect(isSafeHttpUrl("http://localhost/admin")).toBe(false);
    expect(isSafeHttpUrl("http://127.0.0.1")).toBe(false);
    expect(isSafeHttpUrl("http://10.0.0.4")).toBe(false);
    expect(isSafeHttpUrl("http://foo.localhost")).toBe(false);
    expect(isSafeHttpUrl("http://localhost.")).toBe(false);
    expect(isSafeHttpUrl("http://[::ffff:127.0.0.1]")).toBe(false);
    expect(isSafeHttpUrl("http://127.1")).toBe(false);
    expect(isSafeHttpUrl("http://2130706433")).toBe(false);
    expect(isSafeHttpUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeHttpUrl("https://example.com/health")).toBe(true);
  });

  it("blocks ipv6 link-local beyond fe80", () => {
    expect(isBlockedIp("fe80::1")).toBe(true);
    expect(isBlockedIp("fe81::1")).toBe(true);
    expect(isBlockedIp("[fea0::1]")).toBe(true);
    expect(isBlockedIp("febf::1")).toBe(true);
    expect(isSafeHttpUrl("http://[fe81::1]/")).toBe(false);
  });

  it("blocks rfc1918 ranges", () => {
    expect(isBlockedIpv4("192.168.1.1")).toBe(true);
    expect(isBlockedIpv4("8.8.8.8")).toBe(false);
    expect(isBlockedIp("::ffff:7f00:1")).toBe(true);
    expect(isBlockedIp("[::ffff:127.0.0.1]")).toBe(true);
  });
});

describe("encryption", () => {
  it("round-trips secrets", () => {
    process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const cipher = encryptString("super-secret");
    expect(cipher).not.toContain("super-secret");
    expect(decryptString(cipher)).toBe("super-secret");
  });
});
