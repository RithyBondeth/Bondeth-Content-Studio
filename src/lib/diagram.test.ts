import assert from "node:assert/strict";
import { test } from "node:test";
import {
  arrivalAngle,
  getConnectorStarts,
  getDiagramGeometry,
  type DiagramSizes,
  type Point,
} from "./diagram";

const sizes: DiagramSizes = {
  width: 1000,
  height: 800,
  badge: 100,
  labelHeight: 60,
  labelWidth: 200,
  vertical: false,
};

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

test("a landscape flow spreads its steps across the width, joined in order", () => {
  const geometry = getDiagramGeometry("flow", 4, sizes);
  assert.deepEqual(
    geometry.nodes.map(({ x }) => x),
    [125, 375, 625, 875],
  );
  assert.ok(geometry.nodes.every(({ y }) => y === 50));
  assert.deepEqual(
    geometry.connectors.map(({ from, to }) => [from, to]),
    [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
  );
  assert.ok(geometry.labelSides.every((side) => side === "below"));
  assert.equal(geometry.height, 160);
});

test("a vertical flow stacks its steps without spreading them too far apart", () => {
  const geometry = getDiagramGeometry("flow", 3, { ...sizes, vertical: true });
  assert.deepEqual(
    geometry.nodes.map(({ y }) => y),
    [50, 260, 470],
  );
  assert.ok(geometry.labelSides.every((side) => side === "right"));
  assert.equal(geometry.height, 520);
});

test("connectors stop short of the badges they join", () => {
  const geometry = getDiagramGeometry("flow", 2, sizes);
  const [connector] = geometry.connectors;
  assert.ok(distance(connector!.start, geometry.nodes[0]!) > 50);
  assert.ok(distance(connector!.end, geometry.nodes[1]!) > 50);
  // Straight connectors arrive heading right, towards the next step.
  assert.ok(Math.abs(arrivalAngle(connector!)) < 1e-9);
});

test("a cycle starts at the top and closes back on its first step", () => {
  const geometry = getDiagramGeometry("cycle", 4, sizes);
  const [first] = geometry.nodes;
  assert.ok(geometry.nodes.every(({ y }) => y >= first!.y - 1e-9));
  assert.deepEqual(
    geometry.connectors.map(({ from, to }) => [from, to]),
    [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ],
  );
  // Every node fits inside the box with its badge.
  for (const { x, y } of geometry.nodes) {
    assert.ok(x - 50 >= 0 && x + 50 <= geometry.width);
    assert.ok(y - 50 >= -1e-9 && y + 50 <= geometry.height);
  }
});

test("loop labels point away from the middle, with room for them in the box", () => {
  const geometry = getDiagramGeometry("cycle", 4, sizes);
  assert.deepEqual(geometry.labelSides, ["above", "right", "below", "left"]);
  const [top, right, bottom, left] = geometry.nodes;
  assert.ok(top!.y - 50 - sizes.labelHeight >= -1e-9);
  assert.ok(bottom!.y + 50 + sizes.labelHeight <= geometry.height + 1e-9);
  assert.ok(left!.x - 50 - sizes.labelWidth >= -1e-9);
  assert.ok(right!.x + 50 + sizes.labelWidth <= geometry.width + 1e-9);
});

test("on narrow frames, loop labels go inside and hub labels above or below", () => {
  const narrow = { ...sizes, width: 900, height: 1000, vertical: true };
  assert.deepEqual(getDiagramGeometry("cycle", 4, narrow).labelSides, [
    "below",
    "left",
    "above",
    "right",
  ]);
  const hubSides = getDiagramGeometry("hub", 5, narrow).labelSides;
  assert.deepEqual(hubSides, ["below", "above", "below", "below", "above"]);
});

test("loops stretch into an ellipse to fill a wide box", () => {
  const geometry = getDiagramGeometry("cycle", 4, {
    ...sizes,
    width: 1600,
    height: 600,
  });
  const [top, right] = geometry.nodes;
  const centreX = geometry.width / 2;
  const centreY = geometry.nodes[1]!.y;
  assert.ok(right!.x - centreX > (centreY - top!.y) * 1.2);
});

test("a two-step cycle bows its connectors apart instead of drawing one line twice", () => {
  const geometry = getDiagramGeometry("cycle", 2, sizes);
  const [there, back] = geometry.connectors;
  assert.ok(distance(there!.control, back!.control) > 100);
});

test("a hub puts the first node in the middle, joined to every other node", () => {
  const geometry = getDiagramGeometry("hub", 5, sizes);
  const [centre, ...outer] = geometry.nodes;
  assert.equal(centre!.x, 500);
  const radii = outer.map((node) => distance(node, centre!));
  assert.ok(radii.every((radius) => Math.abs(radius - radii[0]!) < 1e-9));
  assert.deepEqual(
    geometry.connectors.map(({ from, to }) => [from, to]),
    [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
  );
  // With four outer nodes, none sits straight below the middle one's label.
  assert.ok(outer.every((node) => Math.abs(node.x - centre!.x) > 1));
});

test("connectors finish as the node they lead to appears", () => {
  const connectors = [
    { from: 0, to: 1 },
    { from: 1, to: 2 },
    { from: 2, to: 0 },
  ];
  assert.deepEqual(
    getConnectorStarts(connectors, [0, 40, 50], 14),
    [
      26,
      // Never before the node it leaves from.
      40,
      // Closing the loop: right after the last node appears.
      50,
    ],
  );
});
