import { getMerchantStock, MerchantType } from "@/shared/data/merchantStocks";
import { buyItem, sellItem } from "@/shared/lib/inventory";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import { finishMobileTurn } from "@/shared/engine/game/nodeEventEngine";
import { markNodeResolved } from "@/shared/engine/map/mapEngine";
import { InventoryItem, Player } from "@/shared/types/game";

export type MobileMerchantSession = {
  nodeId: number;
  merchantType: MerchantType;
  stock: InventoryItem[];
};

export type MobileMerchantResult = {
  state: EtherniaRunSave;
  message: string;
  success: boolean;
};

function normalizeMerchantType(type?: string): MerchantType {
  switch (type) {
    case "merchant_blacksmith":
    case "merchant_alchemist":
    case "merchant_mystic":
    case "merchant_blacksmith_corrupted":
    case "merchant_alchemist_corrupted":
    case "merchant_mystic_corrupted":
      return type;
    default:
      return "merchant_alchemist";
  }
}

function updateActivePlayer(state: EtherniaRunSave, nextPlayer: Player): EtherniaRunSave {
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === state.currentPlayerIndex ? nextPlayer : player
    ),
  };
}

export function createMobileMerchantSession(nodeId: number, merchantType?: string): MobileMerchantSession {
  const normalizedType = normalizeMerchantType(merchantType);

  return {
    nodeId,
    merchantType: normalizedType,
    stock: getMerchantStock(normalizedType),
  };
}

export function buyMobileMerchantItem(
  state: EtherniaRunSave,
  item: InventoryItem
): MobileMerchantResult {
  const player = state.players[state.currentPlayerIndex];
  if (!player) {
    return { state, success: false, message: "Aucun héros actif." };
  }

  const price = item.buyPrice ?? 0;
  if (player.gold < price) {
    return { state, success: false, message: `Il manque ${price - player.gold} or.` };
  }

  const nextPlayer = buyItem(player, item);
  return {
    state: updateActivePlayer(state, nextPlayer),
    success: true,
    message: `${player.name} achète ${item.name} pour ${price} or.`,
  };
}

export function sellMobileInventoryItem(
  state: EtherniaRunSave,
  itemId: string
): MobileMerchantResult {
  const player = state.players[state.currentPlayerIndex];
  if (!player) {
    return { state, success: false, message: "Aucun héros actif." };
  }

  const item = player.inventory.find((candidate) => candidate.id === itemId);
  if (!item) {
    return { state, success: false, message: "Objet introuvable." };
  }

  const value = item.sellPrice ?? 0;
  const nextPlayer = sellItem(player, itemId);
  return {
    state: updateActivePlayer(state, nextPlayer),
    success: true,
    message: `${player.name} vend ${item.name} pour ${value} or.`,
  };
}

export function finishMobileMerchantVisit(
  state: EtherniaRunSave,
  nodeId: number
): { state: EtherniaRunSave; logs: string[] } {
  const withResolvedNode: EtherniaRunSave = {
    ...state,
    nodes: markNodeResolved(state.nodes, nodeId, "Marchand visité"),
  };

  const ended = finishMobileTurn(withResolvedNode, nodeId);
  return {
    state: ended.state,
    logs: ended.logs.length > 0 ? ended.logs : ["Visite du marchand terminée."],
  };
}
