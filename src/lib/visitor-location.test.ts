import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { readVisitorLocation } from "./visitor-location";

const headers = (values: Record<string, string>) => ({
  get: (name: string) => values[name.toLowerCase()] ?? null,
});

describe("visitor location", () => {
  test("Cloudflare request metadata wins and is normalised", () => {
    assert.deepEqual(
      readVisitorLocation(headers({}), { country: "gh", region: "Greater Accra", city: "Accra" }),
      { country: "GH", region: "Greater Accra" },
    );
  });

  test("the cf-ipcountry header is used when request metadata is absent", () => {
    assert.deepEqual(
      readVisitorLocation(headers({ "cf-ipcountry": "ng" }), undefined),
      { country: "NG", region: null },
    );
  });

  test("Cloudflare's unknown-location marker is not reported as a country", () => {
    assert.deepEqual(
      readVisitorLocation(headers({ "cf-ipcountry": "XX" }), undefined),
      { country: null, region: null },
    );
  });

  test("a non-two-letter country is rejected", () => {
    assert.deepEqual(
      readVisitorLocation(headers({ "cf-ipcountry": "Ghana" }), undefined),
      { country: null, region: null },
    );
  });

  test("long region names are cut to the column limit", () => {
    const out = readVisitorLocation(headers({}), { country: "GH", region: "X".repeat(90) });
    assert.equal(out.region?.length, 60);
  });

  test("no metadata and no header means no location", () => {
    assert.deepEqual(readVisitorLocation(headers({}), undefined), { country: null, region: null });
  });
});
