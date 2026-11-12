import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { newAlerts } from "./notification-alerts";

describe("owner alert deduplication", () => {
  it("does not chime for history on first load", () => {
    assert.deepEqual(newAlerts(null, [{ id: "old" }]), []);
  });
  it("alerts only once for newly received booking and update IDs", () => {
    assert.deepEqual(newAlerts(new Set(["old"]), [{ id: "new-booking" }, { id: "old" }]), [{ id: "new-booking" }]);
    assert.deepEqual(newAlerts(new Set(["old", "new-booking"]), [{ id: "new-booking" }]), []);
  });
});