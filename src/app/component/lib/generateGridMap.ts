import { EventType, LocationTheme, MapNode, TerrainEffect } from "@/app/component/types/game";
import { FloorBiome } from "@/app/component/data/floors";

type GridKind = "start" | "path" | "statuette" | "boss_prep" | "boss";

type TemplateCell = {
  row: number;
  col: number;
  kind: GridKind;
  required?: boolean;
};

type GenerateGridMapParams = {
  biome?: FloorBiome;
};

type GenerateGridMapResult = {
  nodes: MapNode[];
  width: number;
  height: number;
};

const CELL_SIZE = 110;
const OFFSET_X = 120;
const OFFSET_Y = 120;

type TransformMode =
  | "none"
  | "flipX"
  | "flipY"
  | "flipXY"
  | "rotate90"
  | "rotate180"
  | "rotate270";

function transformCell(
  cell: TemplateCell,
  mode: TransformMode,
  maxRow: number,
  maxCol: number
): TemplateCell {
  let row = cell.row;
  let col = cell.col;

  switch (mode) {
    case "none":
      break;

    case "flipX":
      col = maxCol - col;
      break;

    case "flipY":
      row = maxRow - row;
      break;

    case "flipXY":
      col = maxCol - col;
      row = maxRow - row;
      break;

    case "rotate90": {
      const newRow = col;
      const newCol = maxRow - row;
      row = newRow;
      col = newCol;
      break;
    }

    case "rotate180":
      row = maxRow - row;
      col = maxCol - col;
      break;

    case "rotate270": {
      const newRow = maxCol - col;
      const newCol = row;
      row = newRow;
      col = newCol;
      break;
    }
  }

  return {
    ...cell,
    row,
    col,
  };
}

function biomeToTheme(biome: FloorBiome): LocationTheme {
  if (biome === "forest") return "forest";
  if (biome === "ruins") return "ruins";
  if (biome === "swamp") return "swamp";
  if (biome === "crypt") return "crypt";
  if (biome === "mountain") return "mountain";
  if (biome === "cathedral") return "cathedral";
  if (biome === "cavern") return "cavern";
  if (biome === "ashlands") return "ashlands";
  return "forest";
}

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function toNodeType(kind: GridKind): MapNode["type"] {
  if (kind === "start") return "start";
  if (kind === "boss") return "boss";
  return "normal";
}

function toEventType(kind: GridKind): EventType {
  switch (kind) {
    case "start":
      return "none";
    case "statuette":
      return "statuette";
    case "boss":
      return "boss";
    case "boss_prep":
      return Math.random() < 0.7 ? "rest" : "scripted_shrine";
    default:
      return "battle";
  }
}

function toLabel(kind: GridKind): string {
  switch (kind) {
    case "start":
      return "Camp";
    case "statuette":
      return "Statuette";
    case "boss_prep":
      return "Dernier refuge";
    case "boss":
      return "Boss";
    default:
      return "";
  }
}

function keyOf(row: number, col: number) {
  return `${row}:${col}`;
}

function addCell(map: Map<string, TemplateCell>, cell: TemplateCell) {
  map.set(keyOf(cell.row, cell.col), cell);
}

function getDefaultTerrainEffects(
  biome: FloorBiome,
  eventType: EventType
): TerrainEffect[] {
  if (eventType === "rest") {
    return [{ type: "sacred_ground", value: 4, scope: "node" }];
  }

  if (biome === "swamp") {
    return [{ type: "toxic_fog", value: 3, scope: "node" }];
  }

  if (biome === "ashlands") {
    return [{ type: "ashen_heat", value: 4, scope: "node" }];
  }

  if (biome === "cathedral" && Math.random() < 0.35) {
    return [{ type: "mana_spring", value: 5, scope: "node" }];
  }

  if (Math.random() < 0.15) {
    return [{ type: "storm_field", value: 5, scope: "node" }];
  }

  return [];
}

function manhattan(
  a: { row: number; col: number },
  b: { row: number; col: number }
) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function buildNeighbors(cells: TemplateCell[]) {
  const neighbors = new Map<string, string[]>();

  for (const cell of cells) {
    neighbors.set(keyOf(cell.row, cell.col), []);
  }

  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i];
      const b = cells[j];

      if (manhattan(a, b) === 1) {
        const aKey = keyOf(a.row, a.col);
        const bKey = keyOf(b.row, b.col);

        neighbors.get(aKey)?.push(bKey);
        neighbors.get(bKey)?.push(aKey);
      }
    }
  }

  return neighbors;
}

function computeDistances(cells: TemplateCell[], start: TemplateCell) {
    const neighbors = buildNeighbors(cells);
    const distances = new Map<string, number>();
    const startKey = keyOf(start.row, start.col);
    const queue: string[] = [startKey];

    distances.set(startKey, 0);

    while (queue.length > 0) {
        const current = queue.shift()!;
        const currentDist = distances.get(current)!;

        for (const next of neighbors.get(current) || []) {
        if (!distances.has(next)) {
            distances.set(next, currentDist + 1);
            queue.push(next);
        }
        }
    }

    return { distances, neighbors };
}

function keepOnlyReachableCells(cells: TemplateCell[], start: TemplateCell): TemplateCell[] {
    const { distances } = computeDistances(cells, start);

    return cells.filter((cell) => {
        if (cell.kind === "start") return true;
        return distances.has(keyOf(cell.row, cell.col));
    });
}

type PathMeta = {
  cell: TemplateCell;
  key: string;
  degree: number;
  distFromStart: number;
  distFromBossGate: number;
};

function pickOne(
  candidates: PathMeta[],
  used: Set<string>,
  predicate: (meta: PathMeta) => boolean
): PathMeta | null {
  const filtered = shuffle(
    candidates.filter((meta) => !used.has(meta.key) && predicate(meta))
  );
  return filtered[0] ?? null;
}

function pickMany(
  candidates: PathMeta[],
  used: Set<string>,
  count: number,
  predicate: (meta: PathMeta) => boolean
): PathMeta[] {
  const filtered = shuffle(
    candidates.filter((meta) => !used.has(meta.key) && predicate(meta))
  );

  const picked: PathMeta[] = [];
  for (const meta of filtered) {
    picked.push(meta);
    used.add(meta.key);
    if (picked.length >= count) break;
  }
  return picked;
}

      function assignPathEvents(
          cells: TemplateCell[],
          bossPrepCell?: TemplateCell
        ): Map<string, EventType> {
        const startCell = cells.find((c) => c.kind === "start");
        if (!startCell) return new Map();

        const { distances, neighbors } = computeDistances(cells, startCell);
        const pathCells = cells.filter((c) => c.kind === "path");

        const pathMeta: PathMeta[] = pathCells
        .filter((cell) => distances.has(keyOf(cell.row, cell.col)))
        .map((cell) => {
            const key = keyOf(cell.row, cell.col);
            return {
            cell,
            key,
            degree: neighbors.get(key)?.length ?? 0,
            distFromStart: distances.get(key) ?? -1,
            distFromBossGate: bossPrepCell ? manhattan(cell, bossPrepCell) : 99,
            };
        });

        const assignments = new Map<string, EventType>();
        const used = new Set<string>();

        // 1 repos : milieu d’étage, pas collé au boss
        const rest = pickOne(
            pathMeta,
            used,
            (meta) =>
            meta.distFromStart >= 3 &&
            meta.distFromStart <= 6 &&
            meta.distFromBossGate >= 2 &&
            meta.degree >= 2
        );
        if (rest) {
            assignments.set(rest.key, "rest");
            used.add(rest.key);
        }

        // 1 marchand : plutôt sur une branche
        const merchant = pickOne(
            pathMeta,
            used,
            (meta) =>
            meta.distFromStart >= 3 &&
            meta.distFromBossGate >= 2 &&
            meta.degree <= 2
        );
        if (merchant) {
            assignments.set(
            merchant.key,
            rand<EventType>([
                "merchant_blacksmith",
                "merchant_alchemist",
                "merchant_mystic",
            ])
            );
            used.add(merchant.key);
        }

        // 1 sanctuaire : loin du start, zone calme
        const shrine = pickOne(
            pathMeta,
            used,
            (meta) =>
            meta.distFromStart >= 4 &&
            meta.distFromBossGate >= 2 &&
            meta.degree >= 1
        );
        if (shrine) {
            assignments.set(shrine.key, "scripted_shrine");
            used.add(shrine.key);
        }

        // 1 élite : branche risquée, pas trop proche du départ ni du boss
        const elite = pickOne(
            pathMeta,
            used,
            (meta) =>
            meta.distFromStart >= 4 &&
            meta.distFromBossGate >= 2 &&
            meta.degree <= 2
        );
        if (elite) {
            assignments.set(elite.key, "elite");
            used.add(elite.key);
        }

        // 2 trésors : surtout cul-de-sac / branches
        const treasures = pickMany(
            pathMeta,
            used,
            2,
            (meta) =>
            meta.distFromStart >= 3 &&
            meta.distFromBossGate >= 2 &&
            meta.degree <= 2
        );
        treasures.forEach((meta) => assignments.set(meta.key, "treasure"));

        // 1 ou 2 random : zones secondaires
        const randomCount = Math.random() < 0.5 ? 1 : 2;
        const randoms = pickMany(
            pathMeta,
            used,
            randomCount,
            (meta) =>
            meta.distFromStart >= 2 &&
            meta.distFromBossGate >= 2
        );
        randoms.forEach((meta) => assignments.set(meta.key, "random"));

        // le reste = combat
        for (const meta of pathMeta) {
            if (!assignments.has(meta.key)) {
            assignments.set(meta.key, "battle");
            }
        }

        return assignments;
    }

export function generateGridMap({
  biome = "forest",
}: GenerateGridMapParams = {}): GenerateGridMapResult {
  const theme = biomeToTheme(biome);
  const cellMap = new Map<string, TemplateCell>();

  const core: TemplateCell[] = [
    { row: 3, col: 0, kind: "start", required: true },

    { row: 3, col: 1, kind: "path", required: true },
    { row: 4, col: 1, kind: "path", required: true },
    { row: 5, col: 1, kind: "path", required: true },

    { row: 5, col: 2, kind: "path", required: true },
    { row: 5, col: 3, kind: "path", required: true },
    { row: 5, col: 4, kind: "path", required: true },

    { row: 4, col: 4, kind: "path", required: true },
    { row: 3, col: 4, kind: "path", required: true },
    { row: 3, col: 5, kind: "boss_prep", required: true },
    { row: 3, col: 6, kind: "boss", required: true },
  ];

  core.forEach((cell) => addCell(cellMap, cell));

  const optionalCells: TemplateCell[] = [
    { row: 2, col: 1, kind: "path" },
    { row: 2, col: 2, kind: "path" },
    { row: 2, col: 3, kind: "path" },
    { row: 2, col: 4, kind: "path" },

    { row: 4, col: 2, kind: "path" },
    { row: 4, col: 3, kind: "path" },

    { row: 6, col: 1, kind: "path" },
    { row: 6, col: 2, kind: "path" },
    { row: 6, col: 3, kind: "path" },
    { row: 6, col: 4, kind: "path" },

    { row: 7, col: 2, kind: "path" },
    { row: 7, col: 3, kind: "path" },

    { row: 4, col: 5, kind: "path" },
    { row: 5, col: 5, kind: "path" },
  ];

  optionalCells.forEach((cell) => {
    if (Math.random() < 0.7) {
      addCell(cellMap, cell);
    }
  });

    const safetyCells: TemplateCell[] = [
    { row: 2, col: 1, kind: "path", required: true },
    { row: 6, col: 1, kind: "path", required: true },
    ];
  safetyCells.forEach((cell) => addCell(cellMap, cell));

const rawCells = Array.from(cellMap.values()).sort((a, b) =>
  a.row === b.row ? a.col - b.col : a.row - b.row
);

const startCell = rawCells.find((c) => c.kind === "start");
if (!startCell) {
  throw new Error("Start cell not found");
}

const cells = keepOnlyReachableCells(rawCells, startCell).sort((a, b) =>
  a.row === b.row ? a.col - b.col : a.row - b.row
);

const { distances, neighbors } = computeDistances(cells, startCell);

  const bossPrepCell = cells.find((c) => c.kind === "boss_prep");
  const bossCell = cells.find((c) => c.kind === "boss");

  const candidates = cells.filter((cell) => {
    const key = keyOf(cell.row, cell.col);
    const degree = neighbors.get(key)?.length ?? 0;
    const distFromStart = distances.get(key) ?? -1;

    if (cell.kind !== "path") return false;
    if (distFromStart < 4) return false;
    if (degree > 2) return false;

    if (bossPrepCell && manhattan(cell, bossPrepCell) <= 1) return false;
    if (bossCell && manhattan(cell, bossCell) <= 1) return false;

    return true;
  });

  let chosenStatues: TemplateCell[] = [];
  const shuffledCandidates = shuffle(candidates);

  for (const candidate of shuffledCandidates) {
    if (chosenStatues.length === 0) {
      chosenStatues.push(candidate);
      continue;
    }

    const tooClose = chosenStatues.some(
      (chosen) => manhattan(chosen, candidate) < 4
    );
    if (!tooClose) {
      chosenStatues.push(candidate);
    }

    if (chosenStatues.length >= 2) break;
  }

  if (chosenStatues.length < 2) {
    const fallbackCandidates = shuffle(
      cells.filter((cell) => {
        const distFromStart = distances.get(keyOf(cell.row, cell.col)) ?? -1;

        if (cell.kind !== "path") return false;
        if (distFromStart < 3) return false;
        if (bossPrepCell && manhattan(cell, bossPrepCell) <= 1) return false;
        if (bossCell && manhattan(cell, bossCell) <= 1) return false;

        return true;
      })
    );

    for (const candidate of fallbackCandidates) {
      const alreadyChosen = chosenStatues.some(
        (chosen) =>
          chosen.row === candidate.row && chosen.col === candidate.col
      );
      const tooClose = chosenStatues.some(
        (chosen) => manhattan(chosen, candidate) < 3
      );

      if (!alreadyChosen && !tooClose) {
        chosenStatues.push(candidate);
      }

      if (chosenStatues.length >= 2) break;
    }
  }

  const statueKeys = new Set(chosenStatues.map((cell) => keyOf(cell.row, cell.col)));

  const finalCells = cells.map((cell) => {
    if (statueKeys.has(keyOf(cell.row, cell.col))) {
      return {
        ...cell,
        kind: "statuette" as GridKind,
      };
    }
    return cell;
  });

  const rawMaxRow = Math.max(...finalCells.map((c) => c.row));
  const rawMaxCol = Math.max(...finalCells.map((c) => c.col));

  const transformModes: TransformMode[] = [
    "none",
    "flipX",
    "flipY",
    "flipXY",
    "rotate90",
    "rotate180",
    "rotate270",
  ];
  const chosenTransform = rand(transformModes);

  const transformedCells = finalCells.map((cell) =>
    transformCell(cell, chosenTransform, rawMaxRow, rawMaxCol)
  );

  const transformedMaxRow = Math.max(...transformedCells.map((c) => c.row));
  const transformedMaxCol = Math.max(...transformedCells.map((c) => c.col));

  const transformedBossPrepCell = transformedCells.find((c) => c.kind === "boss_prep");
  const pathAssignments = assignPathEvents(transformedCells, transformedBossPrepCell);

  const nodes: MapNode[] = transformedCells.map((cell, index) => {
    const eventType =
      cell.kind === "path"
        ? pathAssignments.get(keyOf(cell.row, cell.col)) ?? "battle"
        : toEventType(cell.kind);

    return {
      id: index,
      row: cell.row,
      col: cell.col,
      kind: cell.kind,
      terrainEffects: getDefaultTerrainEffects(biome, eventType),
      x: OFFSET_X + cell.col * CELL_SIZE,
      y: OFFSET_Y + cell.row * CELL_SIZE,
      lane: 1,
      depth: cell.col,
      label: toLabel(cell.kind),
      type: toNodeType(cell.kind),
      eventType,
      locationTheme: theme,
      neighbors: [],
      isConsumed: false,
      visibility: "hidden",
    };
  });

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];

      if (Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1) {
        a.neighbors.push(b.id);
        b.neighbors.push(a.id);
      }
    }
  }

  return {
    nodes,
    width: OFFSET_X * 2 + (transformedMaxCol + 1) * CELL_SIZE,
    height: OFFSET_Y * 2 + (transformedMaxRow + 1) * CELL_SIZE,
  };
}