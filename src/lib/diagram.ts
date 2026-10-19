import type { DiagramLayout } from "../spec/schema";

export type Point = { x: number; y: number };

/** A connector between two nodes: a quadratic curve, or a straight line when `control` is its midpoint. */
export type Connector = {
  from: number;
  to: number;
  start: Point;
  control: Point;
  end: Point;
};

export type LabelSide = "above" | "below" | "left" | "right";

export type DiagramGeometry = {
  /** Centre of each node's icon badge, inside a box of `width` × `height`. */
  nodes: Point[];
  connectors: Connector[];
  /** Where each node's label sits relative to its badge. */
  labelSides: LabelSide[];
  width: number;
  height: number;
};

export type DiagramSizes = {
  /** Space available for the diagram. */
  width: number;
  height: number;
  /** Diameter of a node's icon badge. */
  badge: number;
  /** Height kept free above or below a badge for its label. */
  labelHeight: number;
  /** Width kept free beside a badge for its label, on loops and hubs. */
  labelWidth: number;
  /** Lay a flow out top to bottom instead of left to right. */
  vertical: boolean;
};

/** Gap between a connector's ends and the badges it joins. */
const CONNECTOR_GAP = 0.18;

const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

/** `from` moved `distance` towards `to`. */
const towards = (from: Point, to: Point, distance: number): Point => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: from.x + (dx / length) * distance,
    y: from.y + (dy / length) * distance,
  };
};

/** Joins two badges, stopping short of each so the line doesn't run under them. */
const connect = (
  nodes: Point[],
  from: number,
  to: number,
  badge: number,
  control?: Point,
): Connector => {
  const a = nodes[from]!;
  const b = nodes[to]!;
  const bend = control ?? midpoint(a, b);
  const trim = badge / 2 + badge * CONNECTOR_GAP;
  const start = towards(a, bend, trim);
  const end = towards(b, bend, trim);
  return {
    from,
    to,
    start,
    end,
    // A straight connector keeps its control on the trimmed line.
    control: control ?? midpoint(start, end),
  };
};

type Ring = { centre: Point; rx: number; ry: number };

const onRing = (
  { centre, rx, ry }: Ring,
  degrees: number,
  scale = 1,
): Point => {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: centre.x + Math.cos(radians) * rx * scale,
    y: centre.y + Math.sin(radians) * ry * scale,
  };
};

/**
 * How a ring's labels are placed:
 * - "outward": away from the middle, on whichever side faces out.
 * - "inward": towards the middle, inside a loop, which is free of arrows.
 * - "stacked": above the nodes in the top half and below the rest, so the
 *   ring can use the full width of a narrow frame.
 */
type LabelMode = "outward" | "inward" | "stacked";

const labelSideFor = (
  mode: LabelMode,
  { centre }: Ring,
  node: Point,
): LabelSide => {
  const flip = mode === "inward" ? -1 : 1;
  const dx = (node.x - centre.x) * flip;
  const dy = (node.y - centre.y) * flip;
  if (mode === "stacked" || Math.abs(dy) > Math.abs(dx)) {
    return dy < 0 ? "above" : "below";
  }
  return dx < 0 ? "left" : "right";
};

/**
 * Steps in a row (or a column on vertical videos), each joined to the next.
 * Columns pack their steps together rather than spreading them over the
 * whole height, so a short flow doesn't look sparse.
 */
const flow = (count: number, sizes: DiagramSizes): DiagramGeometry => {
  const { width, height, badge, labelHeight, vertical } = sizes;
  let nodes: Point[];
  let boxHeight: number;
  if (vertical) {
    const spacing =
      count > 1 ? Math.min((height - badge) / (count - 1), badge * 2.1) : 0;
    nodes = Array.from({ length: count }, (_, index) => ({
      x: badge / 2,
      y: badge / 2 + spacing * index,
    }));
    boxHeight = badge + spacing * (count - 1);
  } else {
    const column = width / count;
    nodes = Array.from({ length: count }, (_, index) => ({
      x: column * (index + 0.5),
      y: badge / 2,
    }));
    boxHeight = badge + labelHeight;
  }
  return {
    nodes,
    connectors: nodes
      .slice(1)
      .map((_, index) => connect(nodes, index, index + 1, badge)),
    labelSides: nodes.map(() => (vertical ? "right" : "below")),
    width,
    height: boxHeight,
  };
};

/**
 * The largest ellipse that fits the box with a badge, and room for a label
 * wherever `mode` puts them, at every point. Kept from getting much wider
 * than tall, or taller than wide, so a ring still reads as a loop.
 */
const fitRing = (
  sizes: DiagramSizes,
  mode: LabelMode,
): Ring & { height: number } => {
  const { width, height, badge, labelHeight, labelWidth } = sizes;
  // Space kept outside the ring, beyond the badges at its edges.
  const outsideX =
    mode === "outward"
      ? badge / 2 + labelWidth
      : mode === "stacked"
        ? Math.max(badge, labelWidth) / 2
        : badge / 2;
  const outsideY = mode === "inward" ? badge / 2 : badge / 2 + labelHeight;
  let rx = Math.max(badge, width / 2 - outsideX);
  let ry = Math.max(badge, height / 2 - outsideY);
  rx = Math.min(rx, ry * 2.2);
  ry = Math.min(ry, rx * 1.6);
  return {
    centre: { x: width / 2, y: outsideY + ry },
    rx,
    ry,
    height: (outsideY + ry) * 2,
  };
};

/**
 * Steps around a loop, clockwise from the top, with the last joined back to
 * the first. On narrow frames the labels go inside the loop, so it can be
 * as wide as the frame.
 */
const cycle = (count: number, sizes: DiagramSizes): DiagramGeometry => {
  const mode: LabelMode = sizes.vertical ? "inward" : "outward";
  const ring = fitRing(sizes, mode);
  const step = 360 / count;
  const nodes = Array.from({ length: count }, (_, index) =>
    onRing(ring, -90 + step * index),
  );
  // Each connector bows outwards along the loop, through a point past the arc's middle.
  const connectors = nodes.map((_, index) =>
    connect(
      nodes,
      index,
      (index + 1) % count,
      sizes.badge,
      onRing(ring, -90 + step * (index + 0.5), 1.25),
    ),
  );
  return {
    nodes,
    connectors,
    labelSides: nodes.map((node) => labelSideFor(mode, ring, node)),
    width: sizes.width,
    height: ring.height,
  };
};

/**
 * The first node in the middle, joined to the rest around it. With an even
 * number of outer nodes the ring is turned half a step, so none sits right
 * under the middle node's label. On narrow frames the outer labels sit above
 * and below their nodes, so the ring can be as wide as the frame.
 */
const hub = (count: number, sizes: DiagramSizes): DiagramGeometry => {
  const mode: LabelMode = sizes.vertical ? "stacked" : "outward";
  const ring = fitRing(sizes, mode);
  const outer = count - 1;
  const step = 360 / outer;
  const offset = outer % 2 === 0 ? step / 2 : 0;
  const nodes = [
    ring.centre,
    ...Array.from({ length: outer }, (_, index) =>
      onRing(ring, -90 + offset + step * index),
    ),
  ];
  return {
    nodes,
    connectors: nodes
      .slice(1)
      .map((_, index) => connect(nodes, 0, index + 1, sizes.badge)),
    labelSides: nodes.map((node, index) =>
      index === 0 ? "below" : labelSideFor(mode, ring, node),
    ),
    width: sizes.width,
    height: ring.height,
  };
};

/** Where each node and connector of a diagram goes. */
export const getDiagramGeometry = (
  layout: DiagramLayout,
  count: number,
  sizes: DiagramSizes,
): DiagramGeometry => {
  switch (layout) {
    case "flow":
      return flow(count, sizes);
    case "cycle":
      return cycle(count, sizes);
    case "hub":
      return hub(count, sizes);
  }
};

/**
 * The frame each connector starts drawing on. It finishes as the node it
 * leads to appears, but never starts before the node it leaves from. A
 * connector back to an earlier node, such as the one closing a cycle, draws
 * right after the later node appears.
 */
export const getConnectorStarts = (
  connectors: Pick<Connector, "from" | "to">[],
  nodeStarts: number[],
  drawFrames: number,
): number[] =>
  connectors.map(({ from, to }) =>
    Math.max(nodeStarts[from]!, nodeStarts[to]! - drawFrames),
  );

/** Direction, in degrees, a connector is heading as it reaches its end. */
export const arrivalAngle = ({ control, end }: Connector) =>
  (Math.atan2(end.y - control.y, end.x - control.x) * 180) / Math.PI;
