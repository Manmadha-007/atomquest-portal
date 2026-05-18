import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { createAppUrl, getAppBaseUrl } from "@/lib/url";

const originalAppBaseUrl = process.env.APP_BASE_URL;

afterEach(() => {
  if (originalAppBaseUrl === undefined) {
    delete process.env.APP_BASE_URL;
    return;
  }

  process.env.APP_BASE_URL = originalAppBaseUrl;
});

describe("application URL helpers", () => {
  test("uses APP_BASE_URL and normalizes trailing and leading slashes", () => {
    process.env.APP_BASE_URL = "https://atomquest.example.com/";

    assert.equal(getAppBaseUrl(), "https://atomquest.example.com");
    assert.equal(
      createAppUrl("//dashboard//admin"),
      "https://atomquest.example.com/dashboard/admin",
    );
  });

  test("preserves query strings and hash fragments", () => {
    process.env.APP_BASE_URL = "https://atomquest.example.com";

    assert.equal(
      createAppUrl("/dashboard/manager/approvals?tab=open#goal-123"),
      "https://atomquest.example.com/dashboard/manager/approvals?tab=open#goal-123",
    );
  });

  test("falls back safely when APP_BASE_URL is missing or malformed", () => {
    delete process.env.APP_BASE_URL;
    assert.equal(createAppUrl("/dashboard"), "http://localhost:3000/dashboard");

    process.env.APP_BASE_URL = "not a url";
    assert.equal(createAppUrl("/dashboard"), "http://localhost:3000/dashboard");
  });

  test("rejects absolute URLs as application paths", () => {
    process.env.APP_BASE_URL = "https://atomquest.example.com";

    assert.throws(
      () => createAppUrl("https://malicious.example.com/dashboard"),
      /application-relative path/,
    );
  });
});
