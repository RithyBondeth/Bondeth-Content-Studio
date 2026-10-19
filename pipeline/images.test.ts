import assert from "node:assert/strict";
import { test } from "node:test";
import { openverseCredit } from "./images";

test("Openverse credits name the work, its creator and its license", () => {
  assert.equal(
    openverseCredit({
      title: "Brooding sunset sky",
      creator: "Peggy",
      license: "by",
      license_version: "2.0",
    }),
    '"Brooding sunset sky" by Peggy (CC BY 2.0)',
  );
  assert.equal(
    openverseCredit({
      title: null,
      creator: null,
      license: "by-sa",
      license_version: "4.0",
    }),
    "Photo (CC BY-SA 4.0)",
  );
});

test("public domain and CC0 images are credited by name", () => {
  assert.equal(
    openverseCredit({ title: "Moon", creator: "NASA", license: "pdm" }),
    '"Moon" by NASA (Public domain)',
  );
  assert.equal(
    openverseCredit({ title: " ", creator: "Ann", license: "cc0" }),
    "Photo by Ann (CC0)",
  );
});
