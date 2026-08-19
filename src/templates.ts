import type { ColorKey, Diagram, DiagramEdge, DiagramNode, Shape } from "./types";

let seq = 0;
const nid = () => `t${(seq++).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

function makeNodes(
  defs: Array<[string, number, number, ColorKey, Shape]>,
): DiagramNode[] {
  return defs.map(([label, x, y, color, shape]) => ({
    id: nid(),
    label,
    x,
    y,
    color,
    shape,
  }));
}

function chain(nodes: DiagramNode[], arrow: boolean): DiagramEdge[] {
  const out: DiagramEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    out.push({ id: nid(), from: nodes[i].id, to: nodes[i + 1].id, arrow });
  }
  return out;
}

const at = (deg: number, r: number) => ({
  x: Math.round(Math.cos((deg * Math.PI) / 180) * r),
  y: Math.round(Math.sin((deg * Math.PI) / 180) * r),
});

/* ------------------------------------------------------------------ */

function mindMap(): Diagram {
  const center: DiagramNode = { id: nid(), label: "Aurora Launch", x: 0, y: 0, color: "sun", shape: "circle" };
  const branches: Array<[string, number, ColorKey, string[]]> = [
    ["Research", -90, "teal", ["User interviews", "Market sizing"]],
    ["Design", -18, "sky", ["Brand kit", "Figma flow"]],
    ["Engineering", 54, "iris", ["API sprint", "Beta build"]],
    ["Marketing", 126, "rose", ["Teaser site", "Launch film"]],
    ["Ops", 198, "coral", ["Pricing", "Support plan"]],
  ];
  const nodes: DiagramNode[] = [center];
  const edges: DiagramEdge[] = [];
  for (const [label, deg, color, leaves] of branches) {
    const p = at(deg, 235);
    const branch: DiagramNode = { id: nid(), label, x: p.x, y: p.y, color, shape: "rect" };
    nodes.push(branch);
    edges.push({ id: nid(), from: center.id, to: branch.id, arrow: false });
    leaves.forEach((leaf, i) => {
      const lp = at(deg + (i === 0 ? -17 : 17), 445);
      const ln: DiagramNode = { id: nid(), label: leaf, x: lp.x, y: lp.y, color, shape: "pill" };
      nodes.push(ln);
      edges.push({ id: nid(), from: branch.id, to: ln.id, arrow: false });
    });
  }
  return { title: "Aurora Launch — Mind Map", nodes, edges };
}

function orgChart(): Diagram {
  const defs: Array<[string, number, number, ColorKey, Shape]> = [
    ["Dana · CEO", 0, 0, "sun", "pill"],
    ["VP Product", -280, 150, "coral", "rect"],
    ["VP Engineering", 0, 150, "sky", "rect"],
    ["VP Sales", 280, 150, "teal", "rect"],
    ["PM · Core", -350, 300, "coral", "rect"],
    ["PM · Growth", -215, 300, "coral", "rect"],
    ["Platform", -68, 300, "sky", "rect"],
    ["Mobile", 68, 300, "sky", "rect"],
    ["EMEA", 215, 300, "teal", "rect"],
    ["APAC", 350, 300, "teal", "rect"],
  ];
  const n = makeNodes(defs);
  const edges: DiagramEdge[] = [];
  const link = (a: number, b: number) =>
    edges.push({ id: nid(), from: n[a].id, to: n[b].id, arrow: true });
  link(0, 1); link(0, 2); link(0, 3);
  link(1, 4); link(1, 5); link(2, 6); link(2, 7); link(3, 8); link(3, 9);
  return { title: "Acme — Org Chart", nodes: n, edges };
}

function flowChart(): Diagram {
  const defs: Array<[string, number, number, ColorKey, Shape]> = [
    ["Order placed", 0, 0, "lime", "pill"],
    ["Pick items", 0, 115, "sky", "rect"],
    ["Checkout", 0, 230, "sky", "rect"],
    ["In stock?", 0, 350, "sun", "diamond"],
    ["Charge card", 0, 480, "sky", "rect"],
    ["Offer alternative", 275, 350, "coral", "rect"],
    ["Ship order", 0, 595, "sky", "rect"],
    ["Delivered", 0, 705, "teal", "pill"],
  ];
  const n = makeNodes(defs);
  const pairs: Array<[number, number]> = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 6], [6, 7], [3, 5], [5, 1],
  ];
  const edges = pairs.map(([a, b]) => ({ id: nid(), from: n[a].id, to: n[b].id, arrow: true }));
  return { title: "Order Flow — Flowchart", nodes: n, edges };
}

function network(): Diagram {
  const center: DiagramNode = { id: nid(), label: "Core NAS", x: 0, y: 0, color: "fog", shape: "rect" };
  const spokes: Array<[string, number, ColorKey]> = [
    ["Render node", -90, "iris"],
    ["Edit bay 1", -30, "sky"],
    ["Edit bay 2", 30, "sky"],
    ["Color suite", 90, "rose"],
    ["Sound room", 150, "teal"],
    ["Backup LTO", 210, "sun"],
  ];
  const nodes = [center];
  const edges: DiagramEdge[] = [];
  for (const [label, deg, color] of spokes) {
    const p = at(deg, 250);
    const n: DiagramNode = { id: nid(), label, x: p.x, y: p.y, color, shape: "circle" };
    nodes.push(n);
    edges.push({ id: nid(), from: center.id, to: n.id, arrow: false });
  }
  edges.push({ id: nid(), from: nodes[1].id, to: nodes[2].id, arrow: false });
  edges.push({ id: nid(), from: nodes[6].id, to: nodes[4].id, arrow: false });
  return { title: "Studio Network — Topology", nodes, edges };
}

function repoTree(): Diagram {
  const defs: Array<[string, number, number, ColorKey, Shape]> = [
    ["acme-web", 0, 0, "iris", "rect"],
    ["src", -170, 135, "sky", "rect"],
    ["public", 30, 135, "fog", "rect"],
    ["docs", 200, 135, "fog", "rect"],
    ["components", -265, 270, "teal", "rect"],
    ["hooks", -120, 270, "teal", "rect"],
    ["img", 30, 270, "teal", "rect"],
    ["guides", 200, 270, "teal", "rect"],
  ];
  const n = makeNodes(defs);
  const edges = [
    { id: nid(), from: n[0].id, to: n[1].id, arrow: true },
    { id: nid(), from: n[0].id, to: n[2].id, arrow: true },
    { id: nid(), from: n[0].id, to: n[3].id, arrow: true },
    { id: nid(), from: n[1].id, to: n[4].id, arrow: true },
    { id: nid(), from: n[1].id, to: n[5].id, arrow: true },
    { id: nid(), from: n[2].id, to: n[6].id, arrow: true },
    { id: nid(), from: n[3].id, to: n[7].id, arrow: true },
  ];
  return { title: "acme-web — Repo Tree", nodes: n, edges };
}

function flywheel(): Diagram {
  const steps: Array<[string, ColorKey]> = [
    ["Discover", "sky"],
    ["Trial", "lime"],
    ["Adopt", "sun"],
    ["Expand", "coral"],
    ["Advocate", "iris"],
  ];
  const nodes = steps.map(([label, color], i) => {
    const p = at(-90 + i * 72, 215);
    return { id: nid(), label, x: p.x, y: p.y, color, shape: "circle" as Shape };
  });
  const edges = nodes.map((n, i) => ({
    id: nid(),
    from: n.id,
    to: nodes[(i + 1) % nodes.length].id,
    arrow: true,
  }));
  return { title: "Growth Flywheel — Cycle", nodes, edges };
}

function timeline(): Diagram {
  const stops: Array<[string, ColorKey]> = [
    ["Q1 · Research", "sky"],
    ["Q1 · Prototype", "teal"],
    ["Q2 · Beta", "sun"],
    ["Q3 · Launch", "coral"],
    ["Q4 · Scale", "iris"],
    ["27 · Platform", "fog"],
  ];
  const nodes = stops.map(([label, color], i) => ({
    id: nid(),
    label,
    x: -425 + i * 170,
    y: i % 2 === 0 ? -65 : 65,
    color,
    shape: "pill" as Shape,
  }));
  return { title: "Roadmap '26 — Timeline", nodes, edges: chain(nodes, true) };
}

function funnel(): Diagram {
  const stops: Array<[string, ColorKey]> = [
    ["Visitors · 48k", "sky"],
    ["Signups · 12k", "teal"],
    ["Activated · 6.1k", "lime"],
    ["Paying · 1.9k", "sun"],
    ["Retained · 1.2k", "coral"],
  ];
  const nodes = stops.map(([label, color], i) => ({
    id: nid(),
    label,
    x: 0,
    y: i * 115,
    color,
    shape: "pill" as Shape,
  }));
  return { title: "Growth Funnel — Pipeline", nodes, edges: chain(nodes, true) };
}

function fishbone(): Diagram {
  const head: DiagramNode = { id: nid(), label: "Churn −8%", x: 340, y: 0, color: "coral", shape: "pill" };
  const tail: DiagramNode = { id: nid(), label: "causes", x: -300, y: 0, color: "fog", shape: "circle" };
  const j1: DiagramNode = { id: nid(), label: "", x: -120, y: 0, color: "fog", shape: "circle" };
  const j2: DiagramNode = { id: nid(), label: "", x: 110, y: 0, color: "fog", shape: "circle" };
  const cats: DiagramNode[] = [
    { id: nid(), label: "Pricing", x: -225, y: -160, color: "sun", shape: "rect" },
    { id: nid(), label: "Onboarding", x: -20, y: 165, color: "teal", shape: "rect" },
    { id: nid(), label: "Support", x: 20, y: -160, color: "sky", shape: "rect" },
    { id: nid(), label: "Product gaps", x: 235, y: 165, color: "iris", shape: "rect" },
  ];
  const nodes = [tail, j1, j2, head, ...cats];
  const edges: DiagramEdge[] = [
    { id: nid(), from: tail.id, to: j1.id, arrow: false },
    { id: nid(), from: j1.id, to: j2.id, arrow: false },
    { id: nid(), from: j2.id, to: head.id, arrow: true },
    { id: nid(), from: cats[0].id, to: j1.id, arrow: false },
    { id: nid(), from: cats[1].id, to: j1.id, arrow: false },
    { id: nid(), from: cats[2].id, to: j2.id, arrow: false },
    { id: nid(), from: cats[3].id, to: j2.id, arrow: false },
  ];
  return { title: "Churn Analysis — Fishbone", nodes, edges };
}

function mesh(): Diagram {
  const names: Array<[string, ColorKey]> = [
    ["Ava", "coral"],
    ["Ben", "sky"],
    ["Cleo", "sun"],
    ["Dev", "teal"],
    ["Eli", "iris"],
    ["Fay", "rose"],
    ["Gus", "lime"],
    ["Hal", "fog"],
  ];
  const nodes = names.map(([label, color], i) => {
    const p = at(i * 45 - 90, 235);
    return { id: nid(), label, x: p.x, y: p.y, color, shape: "circle" as Shape };
  });
  const pairs: Array<[number, number]> = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
    [0, 3], [1, 4], [2, 5], [6, 3],
  ];
  const edges = pairs.map(([a, b]) => ({
    id: nid(),
    from: nodes[a].id,
    to: nodes[b].id,
    arrow: false,
  }));
  return { title: "Squad Mesh — Collaboration", nodes, edges };
}

function swot(): Diagram {
  const center: DiagramNode = { id: nid(), label: "Koffee Kart", x: 0, y: 12, color: "sun", shape: "circle" };
  const defs: Array<[string, number, number, ColorKey]> = [
    ["Strengths", -240, -135, "lime"],
    ["Weaknesses", 240, -135, "coral"],
    ["Opportunities", -240, 165, "sky"],
    ["Threats", 240, 165, "rose"],
  ];
  const groups = defs.map(([label, x, y, color]) => ({
    id: nid(), label, x, y, color, shape: "rect" as Shape,
  }));
  const details: Array<[string, number, number, ColorKey, number]> = [
    ["House roastery", -370, -20, "lime", 0],
    ["Quiet weekdays", 370, -20, "coral", 1],
    ["Catering ops", -370, 285, "sky", 2],
    ["Chain next door", 370, 285, "rose", 3],
  ];
  const detailNodes = details.map(([label, x, y, color]) => ({
    id: nid(), label, x, y, color, shape: "pill" as Shape,
  }));
  const edges: DiagramEdge[] = [
    ...groups.map((g) => ({ id: nid(), from: center.id, to: g.id, arrow: false })),
    ...details.map((d, i) => ({ id: nid(), from: groups[d[4]].id, to: detailNodes[i].id, arrow: true })),
  ];
  return { title: "Koffee Kart — SWOT", nodes: [center, ...groups, ...detailNodes], edges };
}

/* ------------------------------------------------------------------ */

export interface TemplateMeta {
  key: string;
  name: string;
  blurb: string;
  make: () => Diagram;
}

export const MINDMAP_TEMPLATE: TemplateMeta = {
  key: "mindmap",
  name: "Mind map",
  blurb: "Radial branches",
  make: mindMap,
};

export const TEN_GRAPHS: TemplateMeta[] = [
  { key: "org", name: "Org chart", blurb: "Command chain", make: orgChart },
  { key: "flow", name: "Flowchart", blurb: "Decision path", make: flowChart },
  { key: "network", name: "Network", blurb: "Hub & spokes", make: network },
  { key: "tree", name: "Tree", blurb: "Folder lineage", make: repoTree },
  { key: "cycle", name: "Cycle", blurb: "Closed loop", make: flywheel },
  { key: "timeline", name: "Timeline", blurb: "Roadmap spine", make: timeline },
  { key: "funnel", name: "Funnel", blurb: "Stage decay", make: funnel },
  { key: "fishbone", name: "Fishbone", blurb: "Cause & effect", make: fishbone },
  { key: "mesh", name: "Mesh", blurb: "Peer lattice", make: mesh },
  { key: "swot", name: "SWOT", blurb: "Four quadrants", make: swot },
];

export function blankDiagram(): Diagram {
  return { title: "Untitled canvas", nodes: [], edges: [] };
}

export function makeTemplate(key: string): Diagram | null {
  if (key === "mindmap") return mindMap();
  if (key === "blank") return blankDiagram();
  const t = TEN_GRAPHS.find((g) => g.key === key);
  return t ? t.make() : null;
}
