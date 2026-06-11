import { FloorBiome } from "@/shared/data/floors";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import { MapNode } from "@/shared/types/game";

export type LoreTone = "veil" | "anchor" | "blackSea" | "heart" | "aureom";

export type LoreFragment = {
  id: string;
  title: string;
  text: string;
  tone: LoreTone;
};

const NODE_LORE: Record<string, { calm: string[]; corrupted: string[] }> = {
  treasure: {
    calm: [
      "Une serrure porte un soleil incomplet.",
      "Sous la poussière, un fil d’or forme un cercle brisé.",
      "Le métal garde une chaleur trop ancienne.",
    ],
    corrupted: [
      "La serrure respire dans le mauvais sens.",
      "Un dépôt noir coule entre les charnières.",
      "Le coffre semble plein de ce qu’il rejette.",
    ],
  },
  rest: {
    calm: [
      "Des marques de camp entourent une ancienne ancre.",
      "Quelqu’un a gravé : tenir, encore.",
      "La pierre garde un chant très bas.",
    ],
    corrupted: [
      "Le refuge tient, mais il filtre mal.",
      "La lumière ici a le goût du sel noir.",
      "Les murs suintent une paix artificielle.",
    ],
  },
  random: {
    calm: [
      "Une trace s’arrête devant rien.",
      "Le sol répète des pas qui ne sont plus là.",
      "Un mot revient dans les débris : Voile.",
    ],
    corrupted: [
      "Le trouble ne vient pas d’ici.",
      "La plaie semble être une sortie.",
      "Une mémoire étrangère traverse la boue.",
    ],
  },
  scripted_shrine: {
    calm: [
      "L’autel ne prie aucun dieu connu.",
      "Six noms sont effacés, sauf le seuil.",
      "La flamme blanche ne projette pas d’ombre.",
    ],
    corrupted: [
      "L’autel filtre encore quelque chose.",
      "La flamme blanche cache une veine noire.",
      "Un serment ancien se déforme sous la pierre.",
    ],
  },
  statuette: {
    calm: [
      "La figure regarde une porte fermée.",
      "Dans son socle : un fragment de mémoire.",
      "Trois mains ont façonné ce silence.",
    ],
    corrupted: [
      "La figure sourit sans visage.",
      "Son socle bat comme un petit cœur.",
      "Elle retient plus qu’elle ne protège.",
    ],
  },
  merchant: {
    calm: [
      "Le camp garde des pièces frappées d’un royaume absent.",
      "Le marchand évite de nommer la lumière blanche.",
      "Une balance porte le signe d’un seuil.",
    ],
    corrupted: [
      "Les prix changent quand personne ne regarde.",
      "Le camp sent l’or et la marée noire.",
      "Le marchand parle bas : pas une entrée, une sortie.",
    ],
  },
  battle: {
    calm: [
      "Les ennemis gardent moins une route qu’une fuite.",
      "Leurs armes portent des prières rayées.",
      "Leurs yeux cherchent quelque chose derrière toi.",
    ],
    corrupted: [
      "La corruption les pousse hors de la faille.",
      "Ils ne défendent pas le lieu. Ils débordent.",
      "Leur chair hésite entre deux lois.",
    ],
  },
  boss: {
    calm: [
      "Le gardien tient un verrou ancien.",
      "Sous son pas, une ancre gronde.",
      "Il protège une plaie que nul n’a nommée.",
    ],
    corrupted: [
      "Le gardien ne ferme plus. Il évacue.",
      "L’ancre sous lui tremble comme une gorge.",
      "Sa colère couvre un ordre plus vieux.",
    ],
  },
};

const BIOME_ECHOES: Partial<Record<FloorBiome, string[]>> = {
  forest: [
    "Les racines connaissent le nom de Myrrha.",
    "La sève tourne autour d’un soleil manquant.",
  ],
  ruins: [
    "Les murs parlent d’une porte devenue trône.",
    "Le marbre garde la trace d’un peuple trop sûr de lui.",
  ],
  swamp: [
    "L’eau noire n’est pas profonde. Elle est ailleurs.",
    "Les bulles montent comme des souvenirs rejetés.",
  ],
  crypt: [
    "Les morts ici ne dorment pas : ils se répètent.",
    "Un nom royal revient sous la poussière.",
  ],
  mountain: [
    "La pierre refuse de choisir une seule forme.",
    "Chaque fissure pointe vers le même seuil.",
  ],
  cavern: [
    "L’écho répond avant la voix.",
    "La roche résonne comme une chambre de mémoire.",
  ],
  cathedral: [
    "La lumière est trop pure pour être vraie.",
    "Les vitraux montrent des visages sans faute.",
  ],
  ashlands: [
    "Les cendres gardent une chaleur sacrée.",
    "Même brûlée, la route sent l’or blanc.",
  ],
};

const CODEX_FRAGMENTS: LoreFragment[] = [
  {
    id: "first-wound",
    title: "Plaie",
    text: "La faille ne s’ouvre pas seulement vers vous. Quelque chose en sort.",
    tone: "blackSea",
  },
  {
    id: "anchor",
    title: "Ancre",
    text: "Certains lieux tiennent le monde comme des clous dans une toile.",
    tone: "anchor",
  },
  {
    id: "veil",
    title: "Voile",
    text: "Un nom revient dans les traces : une voix ancienne. Un avertissement, pas une prière.",
    tone: "veil",
  },
  {
    id: "heart",
    title: "Cœur",
    text: "Le système ne hait pas les mondes. Il respire à travers eux.",
    tone: "heart",
  },
  {
    id: "aureom",
    title: "Aureom",
    text: "Ils cherchaient le royaume au-dessus des mondes. Ils ont trouvé l’espace entre les portes.",
    tone: "aureom",
  },
];

function pick(lines: string[], seed: number) {
  if (lines.length === 0) return "";
  return lines[Math.abs(seed) % lines.length];
}

export function getLoreNodeWhisper(node: MapNode, corrupted: boolean, biome?: FloorBiome): string {
  const merchant = node.eventType.startsWith("merchant_") ? "merchant" : null;
  const key = merchant ?? (node.type === "boss" || node.eventType === "boss" ? "boss" : node.eventType);
  const pool = NODE_LORE[key]?.[corrupted ? "corrupted" : "calm"];
  const biomePool = biome ? BIOME_ECHOES[biome] : null;
  const base = pool ? pick(pool, node.id + (corrupted ? 7 : 0)) : "";
  const echo = biomePool && (node.id + (corrupted ? 1 : 0)) % 4 === 0 ? pick(biomePool, node.id) : "";

  return [base, echo].filter(Boolean).join(" ");
}

export function getLoreResolutionWhisper(choiceId: string, corrupted: boolean): string {
  switch (choiceId) {
    case "take_statue":
      return "Un fragment de mémoire se tait.";
    case "purify_statue":
      return "Le Voile tremble, puis se referme.";
    case "absorb_statue":
      return "La mémoire entre sans demander la permission.";
    case "treasure_leave":
    case "shrine_leave":
    case "random_ignore":
      return corrupted ? "La plaie perd un souffle." : "Le lieu garde son secret.";
    case "shrine_bless":
    case "shrine_offer":
      return corrupted ? "La lumière répond trop vite." : "Une vieille formule reprend forme.";
    case "class_analyze":
      return "Le mot Voile apparaît sous les signes.";
    case "class_purify":
      return "Une ancre cesse de vibrer.";
    case "class_pact":
      return "La Mer Noire écoute.";
    default:
      return corrupted ? "Quelque chose recule, sans disparaître." : "Un indice reste dans la poussière.";
  }
}

export function getBossDefeatLore(floor: number): string {
  if (floor >= 4) {
    return "Le Cœur-Monde cesse de rejeter sa douleur. une voix ancienne avait raison : il fallait recoudre, pas briser.";
  }

  const fragments = [
    "Le verrou tombe. Derrière lui, la plaie respire encore.",
    "Ce gardien ne protégeait pas une entrée.",
    "Une ancre cède. La route remonte vers la source.",
    "La lumière blanche couvre une mécanique plus ancienne.",
    "Un nom royal traverse le silence : un roi oublié.",
    "Une voix brisée répète : pas le trône, la porte.",
    "Le Cœur-Monde bat loin devant.",
    "La dernière faille ne mène pas dehors.",
  ];
  return fragments[Math.max(0, Math.min(floor - 1, fragments.length - 1))];
}

export function getVisibleLoreFragments(run: EtherniaRunSave): LoreFragment[] {
  const explored = run.nodes.filter((node) => node.visibility === "visited" || node.isConsumed).length;
  const unlocked = 1 + Math.floor(explored / 6) + Math.floor(run.currentFloor / 2) + Math.floor(run.corruptionLevel / 2);
  return CODEX_FRAGMENTS.slice(0, Math.min(CODEX_FRAGMENTS.length, unlocked));
}
