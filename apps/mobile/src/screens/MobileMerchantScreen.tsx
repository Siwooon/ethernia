import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  buyMobileMerchantItem,
  createMobileMerchantSession,
  finishMobileMerchantVisit,
  sellMobileInventoryItem,
} from "@/shared/engine/game/mobileMerchantEngine";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import { InventoryItem } from "@/shared/types/game";
import { mobileRunSaveSystem } from "../platform/mobileRunSaveSystem";
import { mobileTheme } from "../styles/theme";

export type MobileMerchantLaunch = {
  nodeId: number;
  title: string;
  merchantType?: string;
};

type MobileMerchantScreenProps = {
  initialRun: EtherniaRunSave;
  merchant: MobileMerchantLaunch;
  onClose: (run: EtherniaRunSave) => void;
};

function formatPrice(value?: number) {
  return `${value ?? 0} or`;
}

function itemSubtitle(item: InventoryItem) {
  const chunks: string[] = [item.type];
  if (item.slot) chunks.push(item.slot);
  if (item.corrupted) chunks.push("corrompu");
  return chunks.join(" · ");
}

export function MobileMerchantScreen({ initialRun, merchant, onClose }: MobileMerchantScreenProps) {
  const [run, setRun] = useState(initialRun);
  const [message, setMessage] = useState<string | null>(null);

  const session = useMemo(
    () => createMobileMerchantSession(merchant.nodeId, merchant.merchantType),
    [merchant.nodeId, merchant.merchantType]
  );

  const player = run.players[run.currentPlayerIndex] ?? run.players[0];

  const persist = async (nextRun: EtherniaRunSave, nextMessage?: string) => {
    await mobileRunSaveSystem.saveRun(nextRun);
    setRun(nextRun);
    if (nextMessage) setMessage(nextMessage);
  };

  const buy = async (item: InventoryItem) => {
    const result = buyMobileMerchantItem(run, item);
    await persist(result.state, result.message);
  };

  const sell = async (itemId: string) => {
    const result = sellMobileInventoryItem(run, itemId);
    await persist(result.state, result.message);
  };

  const finishVisit = async () => {
    const result = finishMobileMerchantVisit(run, merchant.nodeId);
    await mobileRunSaveSystem.saveRun(result.state);
    onClose(result.state);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Boutique</Text>
          <Text style={styles.title}>{merchant.title}</Text>
          <Text style={styles.subtitle}>
            {player?.name ?? "Héros"} · {player?.gold ?? 0} or
          </Text>
        </View>
        <Pressable onPress={() => void finishVisit()} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Retour</Text>
        </Pressable>
      </View>

      {message ? <Text style={styles.feedback}>{message}</Text> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acheter</Text>
          {session.stock.map((item, index) => {
            const canBuy = Boolean(player && player.gold >= (item.buyPrice ?? 0));
            return (
              <View key={`${item.name}-${index}`} style={styles.card}>
                <View style={styles.cardText}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>{itemSubtitle(item)} · {formatPrice(item.buyPrice)}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                </View>
                <Pressable
                  onPress={() => void buy(item)}
                  disabled={!canBuy}
                  style={[styles.actionButton, !canBuy && styles.disabledButton]}
                >
                  <Text style={styles.actionButtonText}>Acheter</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vendre</Text>
          {player?.inventory.length ? (
            player.inventory.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardText}>
                  <Text style={styles.itemName}>{item.name} {item.quantity > 1 ? `x${item.quantity}` : ""}</Text>
                  <Text style={styles.itemMeta}>{itemSubtitle(item)} · {formatPrice(item.sellPrice)}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                </View>
                <Pressable onPress={() => void sell(item.id)} style={styles.sellButton}>
                  <Text style={styles.actionButtonText}>Vendre</Text>
                </Pressable>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Inventaire vide.</Text>
          )}
        </View>

        <Pressable onPress={() => void finishVisit()} style={styles.finishButton}>
          <Text style={styles.finishButtonText}>Terminer la visite</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
    padding: mobileTheme.spacing.md,
    gap: mobileTheme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.md,
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 3,
  },
  subtitle: {
    color: mobileTheme.colors.muted,
    marginTop: 5,
    fontWeight: "800",
  },
  ghostButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  ghostButtonText: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
  },
  feedback: {
    color: mobileTheme.colors.text,
    backgroundColor: "rgba(246,196,83,0.14)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.28)",
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.md,
    lineHeight: 20,
  },
  content: {
    gap: mobileTheme.spacing.md,
    paddingBottom: mobileTheme.spacing.lg,
  },
  section: {
    gap: mobileTheme.spacing.sm,
  },
  sectionTitle: {
    color: mobileTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.sm,
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.panel,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    color: mobileTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  itemMeta: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  itemDescription: {
    color: mobileTheme.colors.muted,
    lineHeight: 19,
  },
  actionButton: {
    minHeight: 46,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.accent,
    paddingHorizontal: mobileTheme.spacing.sm,
  },
  sellButton: {
    minHeight: 46,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    paddingHorizontal: mobileTheme.spacing.sm,
  },
  disabledButton: {
    opacity: 0.45,
  },
  actionButtonText: {
    color: "#1a1026",
    fontWeight: "900",
  },
  emptyText: {
    color: mobileTheme.colors.muted,
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  finishButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(34,197,94,0.20)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.36)",
  },
  finishButtonText: {
    color: "#bbf7d0",
    fontWeight: "900",
    fontSize: 16,
  },
});
