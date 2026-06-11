import { useEffect, useMemo, useRef, useState } from "react";
import { ImageBackground, ScrollView, StyleSheet, Text, View } from "react-native";
import { getNarrativeNodeState, isNodeCorrupted } from "@/shared/engine/map/mapEngine";
import { FloorBiome } from "@/shared/data/floors";
import { ClassType, MapNode } from "@/shared/types/game";
import { etherniaTheme } from "../../styles/etherniaTheme";
import { ETHERNIA_MAP_NODE_SIZE, EtherniaMapHeroMarker, EtherniaMapNode, EtherniaMapNodeLayout } from "./EtherniaMapNode";
import { getBiomeBackgroundSource } from "../../assets/mobileAssets";
import { getBiomeDisplayName } from "@/shared/engine/game/displayLabels";
import { EtherniaMapLink, EtherniaMapLinkLayout } from "./EtherniaMapLink";

type EtherniaMobileMapProps = {
  nodes: MapNode[];
  currentNodeId?: number | null;
  selectedNodeId?: number | null;
  reachableNodeIds: Set<number>;
  corruptedNodeIds: number[];
  onSelectNode: (node: MapNode) => void;
  biome: FloorBiome;
  diagnosticsMode?: boolean;
  heroes?: Array<{ playerId: number; name: string; classType: ClassType; level?: number; currentNode?: number | null }>;
  activePlayerId?: number | null;
};

type GraphLayout = {
  nodes: EtherniaMapNodeLayout[];
  links: EtherniaMapLinkLayout[];
  width: number;
  height: number;
};

const CELL_X = 124;
const CELL_Y = 98;
const PADDING_X = 44;
const PADDING_Y = 44;

function buildGraphLayout(nodes: MapNode[], currentNodeId: number | null | undefined, reachableNodeIds: Set<number>, corruptedNodeIds: number[]): GraphLayout {
  if (nodes.length === 0) {
    return { nodes: [], links: [], width: 340, height: 280 };
  }

  const visibleNodes = nodes.filter((node) => node.visibility !== "hidden");
  const minCol = Math.min(...nodes.map((node) => node.col));
  const maxCol = Math.max(...nodes.map((node) => node.col));
  const minRow = Math.min(...nodes.map((node) => node.row));
  const maxRow = Math.max(...nodes.map((node) => node.row));
  const layoutById = new Map<number, EtherniaMapNodeLayout>();
  const visibleById = new Map(visibleNodes.map((node) => [node.id, node]));
  const corruptedSet = new Set(corruptedNodeIds);

  for (const node of nodes) {
    const columnStagger = (node.col - minCol) % 2 === 0 ? 0 : 14;
    layoutById.set(node.id, {
      node,
      x: PADDING_X + (node.col - minCol) * CELL_X,
      y: PADDING_Y + (node.row - minRow) * CELL_Y + columnStagger,
    });
  }

  const links: EtherniaMapLinkLayout[] = [];
  const seen = new Set<string>();

  for (const node of visibleNodes) {
    const from = layoutById.get(node.id);
    if (!from) continue;

    for (const neighborId of node.neighbors) {
      if (!visibleById.has(neighborId)) continue;
      const to = layoutById.get(neighborId);
      const neighbor = visibleById.get(neighborId);
      if (!to || !neighbor) continue;

      const key = [node.id, neighborId].sort((a, b) => a - b).join(":");
      if (seen.has(key)) continue;
      seen.add(key);

      const fromX = from.x + ETHERNIA_MAP_NODE_SIZE / 2;
      const fromY = from.y + ETHERNIA_MAP_NODE_SIZE / 2;
      const toX = to.x + ETHERNIA_MAP_NODE_SIZE / 2;
      const toY = to.y + ETHERNIA_MAP_NODE_SIZE / 2;
      const dx = toX - fromX;
      const dy = toY - fromY;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;
      const active = node.id === currentNodeId || neighborId === currentNodeId || reachableNodeIds.has(node.id) || reachableNodeIds.has(neighborId);
      const corrupted = corruptedSet.has(node.id) || corruptedSet.has(neighborId);
      const resolved = getNarrativeNodeState(node, corruptedNodeIds) !== "occupied" && getNarrativeNodeState(neighbor, corruptedNodeIds) !== "occupied";

      links.push({
        id: key,
        x: midX - length / 2,
        y: midY - 8,
        length,
        angle,
        active,
        corrupted,
        resolved,
      });
    }
  }

  return {
    nodes: Array.from(layoutById.values()).filter((layoutNode) => layoutNode.node.visibility !== "hidden"),
    links,
    width: Math.max(380, PADDING_X * 2 + (maxCol - minCol + 1) * CELL_X),
    height: Math.max(330, PADDING_Y * 2 + (maxRow - minRow + 1) * CELL_Y + 20),
  };
}

function getBiomeWhisper(biome: FloorBiome) {
  switch (biome) {
    case "forest":
      return "Les branches se referment derrière l'expédition.";
    case "crypt":
      return "Chaque couloir garde l'écho d'un serment ancien.";
    case "ruins":
      return "La pierre cassée dessine des routes qui n'existaient pas hier.";
    case "swamp":
      return "La brume avale les traces et rend les retours incertains.";
    case "mountain":
      return "Le vent taille les chemins à flanc de roche.";
    case "cavern":
      return "Sous terre, la carte respire comme une bête endormie.";
    case "cathedral":
      return "Les vitraux noirs observent chaque détour.";
    case "ashlands":
      return "La cendre recouvre les pas avant même qu'ils refroidissent.";
    default:
      return "La route change de visage à mesure que l'équipe avance.";
  }
}

export function EtherniaMobileMap({ nodes, currentNodeId, selectedNodeId, reachableNodeIds, corruptedNodeIds, onSelectNode, biome, diagnosticsMode = false, heroes = [], activePlayerId = null }: EtherniaMobileMapProps) {
  const layout = useMemo(
    () => buildGraphLayout(nodes, currentNodeId, reachableNodeIds, corruptedNodeIds),
    [nodes, currentNodeId, reachableNodeIds, corruptedNodeIds]
  );
  const horizontalScrollRef = useRef<ScrollView>(null);
  const verticalScrollRef = useRef<ScrollView>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!currentNodeId || viewportSize.width <= 0 || viewportSize.height <= 0) return;
    const activeLayout = layout.nodes.find((nodeLayout) => nodeLayout.node.id === currentNodeId);
    if (!activeLayout) return;

    const targetX = Math.max(0, activeLayout.x + ETHERNIA_MAP_NODE_SIZE / 2 - viewportSize.width / 2);
    const targetY = Math.max(0, activeLayout.y + ETHERNIA_MAP_NODE_SIZE / 2 - viewportSize.height / 2);
    const maxX = Math.max(0, layout.width - viewportSize.width);
    const maxY = Math.max(0, layout.height - viewportSize.height);

    const timeoutId = setTimeout(() => {
      horizontalScrollRef.current?.scrollTo({ x: Math.min(targetX, maxX), animated: true });
      verticalScrollRef.current?.scrollTo({ y: Math.min(targetY, maxY), animated: true });
    }, 80);

    return () => clearTimeout(timeoutId);
  }, [activePlayerId, currentNodeId, layout, viewportSize.height, viewportSize.width]);

  const backgroundSource = getBiomeBackgroundSource(biome);
  const heroesByNode = useMemo(() => {
    const map = new Map<number, EtherniaMapHeroMarker[]>();
    for (const hero of heroes) {
      if (hero.currentNode === null || hero.currentNode === undefined) continue;
      const markers = map.get(hero.currentNode) ?? [];
      markers.push({
        playerId: hero.playerId,
        name: hero.name,
        classType: hero.classType,
        level: hero.level,
        isActive: hero.playerId === activePlayerId,
      });
      map.set(hero.currentNode, markers);
    }
    return map;
  }, [heroes, activePlayerId]);

  const exploredCount = useMemo(() => nodes.filter((node) => node.visibility === "visited" || node.isConsumed).length, [nodes]);
  const corruptedVisibleCount = useMemo(() => nodes.filter((node) => isNodeCorrupted(node, corruptedNodeIds) && node.visibility !== "hidden").length, [nodes, corruptedNodeIds]);

  return (
    <View style={styles.frame}>
      <View style={styles.background}>
        <View style={styles.frameHeader}>
          <View style={styles.frameHeaderText}>
            <Text style={styles.kicker}>Carte d'expédition</Text>
            <Text style={styles.title}>{getBiomeDisplayName(biome)}</Text>
            {diagnosticsMode ? <Text style={styles.hint}>{getBiomeWhisper(biome)}</Text> : null}
          </View>
          {diagnosticsMode ? (
            <View style={styles.counterStack}>
              <Text style={styles.counter}>{exploredCount}/{nodes.length}</Text>
              {corruptedVisibleCount > 0 ? <Text style={styles.corruptionCounter}>{corruptedVisibleCount} instable</Text> : null}
            </View>
          ) : null}
        </View>

        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          showsHorizontalScrollIndicator={diagnosticsMode}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.horizontalContent}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setViewportSize((size) => (size.width === width && size.height === height ? size : { width, height }));
          }}
        >
          <ScrollView ref={verticalScrollRef} nestedScrollEnabled showsVerticalScrollIndicator={diagnosticsMode} contentContainerStyle={styles.verticalContent}>
            <View style={[styles.canvas, { width: layout.width, height: layout.height }]}>
              <ImageBackground source={backgroundSource} style={styles.canvasBackground} imageStyle={styles.canvasBackgroundImage}>
                <View style={styles.vignette} />
              </ImageBackground>
              <View style={styles.canvasMistA} />
              <View style={styles.canvasMistB} />
              {diagnosticsMode ? <View style={styles.canvasGrid} /> : null}
              {layout.links.map((link) => <EtherniaMapLink key={link.id} link={link} />)}
              {layout.nodes.map((nodeLayout) => (
                <EtherniaMapNode
                  key={nodeLayout.node.id}
                  layout={nodeLayout}
                  current={nodeLayout.node.id === currentNodeId}
                  selected={nodeLayout.node.id === selectedNodeId}
                  reachable={reachableNodeIds.has(nodeLayout.node.id)}
                  corrupted={isNodeCorrupted(nodeLayout.node, corruptedNodeIds)}
                  diagnosticsMode={diagnosticsMode}
                  heroMarkers={heroesByNode.get(nodeLayout.node.id) ?? []}
                  onPress={onSelectNode}
                />
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    minHeight: 0,
    borderRadius: etherniaTheme.radius.xl,
    backgroundColor: "rgba(5, 3, 10, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(242, 193, 91, 0.34)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.42,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  background: {
    flex: 1,
    minHeight: 0,
    padding: etherniaTheme.spacing.xs,
    gap: etherniaTheme.spacing.xs,
  },
  canvasBackground: {
    ...StyleSheet.absoluteFill,
  },
  canvasBackgroundImage: {
    opacity: 0.50,
    resizeMode: "cover",
  },
  vignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(5,3,10,0.28)",
  },
  frameHeader: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: etherniaTheme.spacing.sm,
    paddingHorizontal: etherniaTheme.spacing.xs,
    paddingTop: etherniaTheme.spacing.xs,
  },
  frameHeaderText: {
    flex: 1,
  },
  kicker: {
    color: etherniaTheme.colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: etherniaTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
    textTransform: "capitalize",
  },
  hint: {
    color: etherniaTheme.colors.textDim,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  counterStack: {
    alignItems: "flex-end",
    gap: 5,
  },
  counter: {
    color: etherniaTheme.colors.text,
    fontWeight: "900",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
  },
  corruptionCounter: {
    color: "#fecaca",
    fontSize: 11,
    fontWeight: "900",
    backgroundColor: "rgba(255,94,115,0.15)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    overflow: "hidden",
  },
  horizontalScroll: {
    flex: 1,
    minHeight: 0,
    borderRadius: etherniaTheme.radius.lg,
    backgroundColor: "rgba(2, 1, 8, 0.26)",
  },
  horizontalContent: {
    flexGrow: 1,
    paddingRight: etherniaTheme.spacing.sm,
  },
  verticalContent: {
    flexGrow: 1,
    paddingBottom: 176,
  },
  canvas: {
    position: "relative",
    borderRadius: etherniaTheme.radius.lg,
    overflow: "hidden",
    backgroundColor: "rgba(6, 4, 14, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,247,232,0.16)",
  },
  canvasMistA: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    left: -70,
    top: 30,
    backgroundColor: "rgba(103,232,249,0.055)",
  },
  canvasMistB: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    right: -80,
    bottom: -30,
    backgroundColor: "rgba(242,193,91,0.050)",
  },
  canvasGrid: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.035)",
    margin: 18,
    borderRadius: etherniaTheme.radius.md,
  },
});
