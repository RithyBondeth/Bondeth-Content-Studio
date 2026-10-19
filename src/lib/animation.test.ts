import assert from "node:assert/strict";
import { test } from "node:test";
import { ENTRANCES } from "../spec/schema";
import { entranceStyle } from "./animation";

test("every entrance starts hidden and ends untouched", () => {
  for (const entrance of ENTRANCES) {
    const start = entranceStyle(entrance, 0, 20);
    const end = entranceStyle(entrance, 1, 20);
    assert.deepEqual(end, { opacity: 1 }, entrance);
    const hidden =
      start.opacity === 0 || String(start.clipPath).includes("100%");
    assert.ok(hidden, `${entrance} starts hidden`);
  }
});

test("entrances move the way their names say", () => {
  assert.match(
    String(entranceStyle("rise", 0.5, 20).transform),
    /translateY\(10px\)/,
  );
  assert.match(
    String(entranceStyle("slide", 0.5, 20).transform),
    /translateX\(-16px\)/,
  );
  assert.match(String(entranceStyle("pop", 0.5, 20).transform), /scale/);
  assert.match(String(entranceStyle("blur", 0.5, 20).filter), /blur\(5px\)/);
  assert.match(String(entranceStyle("typewriter", 0.25, 20).clipPath), /75%/);
});

test("progress before the start is treated as not started", () => {
  assert.deepEqual(entranceStyle("rise", -1, 20), entranceStyle("rise", 0, 20));
});
