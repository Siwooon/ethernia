import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  compareMobileEquipmentForPlayer,
  equipMobileInventoryItem,
  filterAndSortMobileInventory,
  getMobileForgePreview,
  getMobileInventoryPlayerSummaries,
  getMobileItemPowerScore,
  getMobileItemTypeLabel,
  MobileEquipmentComparison,
  MobileInventoryFilter,
  MobileInventorySort,
  presentMobileInventoryItem,
  unequipMobileInventorySlot,
  upgradeMobileEquipmentAtForge,
  useMobileInventoryItem,
} from "@/shared/engine/game/mobileInventoryEngine";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import { EquipmentSlot, InventoryItem, Player } from "@/shared/types/game";
import { MobilePressableButton } from "../components/MobilePressableButton";
import { mobileRunSaveSystem } from "../platform/mobileRunSaveSystem";
import { mobileTheme } from "../styles/theme";
import { getClassDisplayName } from "@/shared/engine/game/displayLabels";
import { attributeColors, getAttributeTone, type AttributeTone } from "../styles/statColors";

const EQUIPMENT_SLOTS: Array<{ slot: EquipmentSlot; label: string; icon: string }> = [
  { slot: "weapon", label: "Arme", icon: "⚔️" },
  { slot: "offhand", label: "Main gauche", icon: "🛡️" },
  { slot: "armor", label: "Armure", icon: "🥋" },
  { slot: "amulet", label: "Amulette", icon: "📿" },
  { slot: "ring", label: "Anneau", icon: "💍" },
  { slot: "relic", label: "Relique", icon: "🔮" },
];

const FILTERS: Array<{ id: MobileInventoryFilter; label: string }> = [
  { id: "all", label: "Tout" },
  { id: "equipment", label: "Équipement" },
  { id: "consumable", label: "Potions" },
  { id: "material", label: "Butin" },
  { id: "compatible", label: "Utile" },
];

const SORTS: Array<{ id: MobileInventorySort; label: string }> = [
  { id: "type", label: "Type" },
  { id: "power", label: "Puissance" },
  { id: "quantity", label: "Quantité" },
  { id: "name", label: "Nom" },
];

type MobileInventoryScreenProps = {
  initialRun: EtherniaRunSave;
  onClose: (run: EtherniaRunSave) => void;
};

function StatPill({ label, value, tone }: { label: string; value: string | number; tone?: AttributeTone }) {
  const resolvedTone = tone ?? getAttributeTone(label);
  const palette = resolvedTone ? attributeColors[resolvedTone] : null;
  return (
    <View style={[styles.statPill, palette && { backgroundColor: palette.soft, borderColor: palette.border }]}>
      <Text style={[styles.statLabel, palette && { color: palette.color }]}>
        {palette ? `${palette.icon} ` : ""}{label}
      </Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function DeltaText({ delta }: { delta: number }) {
  const sign = delta > 0 ? "+" : "";
  return (
    <Text style={[styles.deltaText, delta > 0 && styles.deltaPositive, delta < 0 && styles.deltaNegative]}>
      {sign}{delta}
    </Text>
  );
}

function getItemRarityLabel(item: InventoryItem): string {
  if (item.corrupted) return "Corrompu";
  if (item.type === "relic" || item.slot === "relic") return "Relique";
  const power = getMobileItemPowerScore(item);
  if (power >= 12) return "Rare";
  if (power >= 7) return "Renforcé";
  return "Commun";
}

function getItemRarityStyle(item: InventoryItem) {
  if (item.corrupted) return styles.rarityCorrupted;
  if (item.type === "relic" || item.slot === "relic") return styles.rarityRelic;
  const power = getMobileItemPowerScore(item);
  if (power >= 12) return styles.rarityRare;
  if (power >= 7) return styles.rarityStrong;
  return styles.rarityCommon;
}

function getSlotPowerDelta(player: Player, item: InventoryItem): number {
  const comparison = compareMobileEquipmentForPlayer(player, item);
  if (!comparison) return getMobileItemPowerScore(item);
  return Math.round(comparison.powerDelta);
}

function getBestCandidateForSlot(player: Player, slot: EquipmentSlot): InventoryItem | null {
  const candidates = (player.inventory ?? []).filter(
    (item) => item.type === "equipment" && item.slot === slot,
  );
  if (!candidates.length) return null;
  return [...candidates].sort((a, b) => {
    const deltaDiff = getSlotPowerDelta(player, b) - getSlotPowerDelta(player, a);
    if (deltaDiff !== 0) return deltaDiff;
    return getMobileItemPowerScore(b) - getMobileItemPowerScore(a);
  })[0] ?? null;
}

function getShortEffectLines(item: InventoryItem | null | undefined, limit = 3): string[] {
  if (!item) return [];
  const presentation = presentMobileInventoryItem(item);
  return presentation.effectLines.length ? presentation.effectLines.slice(0, limit) : [presentation.description];
}

function ComparisonBlock({ comparison }: { comparison: MobileEquipmentComparison }) {
  const changedStats = comparison.statComparisons.filter((stat) => stat.delta !== 0);
  const displayedStats = changedStats.length ? changedStats : comparison.statComparisons.slice(0, 3);

  return (
    <View style={styles.comparisonBox}>
      <View style={styles.comparisonHeader}>
        <View>
          <Text style={styles.comparisonTitle}>Comparaison</Text>
          <Text style={styles.comparisonMeta}>
            Remplace : {comparison.currentItemName ?? "emplacement vide"}
          </Text>
        </View>
        <View style={[styles.powerDeltaBadge, comparison.powerDelta > 0 && styles.powerDeltaGood, comparison.powerDelta < 0 && styles.powerDeltaBad]}>
          <Text style={styles.powerDeltaLabel}>Score</Text>
          <DeltaText delta={Math.round(comparison.powerDelta)} />
        </View>
      </View>
      <Text style={styles.comparisonSummary}>{comparison.summary}</Text>
      <View style={styles.compareGrid}>
        {displayedStats.map((stat) => (
          <View key={stat.key} style={[styles.compareCell, stat.delta > 0 && styles.compareCellGood, stat.delta < 0 && styles.compareCellBad]}>
            <Text style={styles.compareLabel}>{stat.label}</Text>
            <Text style={styles.compareValue}>{stat.current} → {stat.next}</Text>
            <DeltaText delta={stat.delta} />
          </View>
        ))}
      </View>
    </View>
  );
}

function ItemCard({
  item,
  player,
  selected,
  onSelect,
  onEquip,
  onUse,
}: {
  item: InventoryItem;
  player: Player;
  selected: boolean;
  onSelect: (itemId: string) => void;
  onEquip: (itemId: string) => void;
  onUse: (itemId: string) => void;
}) {
  const presentation = presentMobileInventoryItem(item);
  const comparison = compareMobileEquipmentForPlayer(player, item);
  const power = getMobileItemPowerScore(item);

  return (
    <Pressable onPress={() => onSelect(item.id)} style={[styles.itemCard, selected && styles.itemCardSelected]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemText}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemName} numberOfLines={1}>{presentation.title}</Text>
            <View style={[styles.rarityPill, getItemRarityStyle(item)]}>
              <Text style={styles.rarityText}>{getItemRarityLabel(item)}</Text>
            </View>
          </View>
          <Text style={styles.itemMeta}>
            {getMobileItemTypeLabel(item)} · {item.quantity > 1 ? `x${item.quantity} · ` : ""}⚙️ {power}
          </Text>
        </View>
        <Text style={styles.expandHint}>{selected ? "−" : "+"}</Text>
      </View>

      {selected ? <Text style={styles.itemDescription}>{presentation.description}</Text> : null}

      {selected && presentation.effectLines.length > 0 ? (
        <View style={styles.effectList}>
          {presentation.effectLines.map((line) => (
            <Text key={line} style={styles.effectText}>• {line}</Text>
          ))}
        </View>
      ) : null}

      {selected && comparison ? <ComparisonBlock comparison={comparison} /> : null}

      {selected ? (
        <View style={styles.itemActions}>
          {presentation.canEquip ? (
            <MobilePressableButton label="Équiper" onPress={() => onEquip(item.id)} style={styles.actionFlex} />
          ) : null}
          {presentation.canUse ? (
            <MobilePressableButton label="Utiliser" tone="secondary" onPress={() => onUse(item.id)} style={styles.actionFlex} />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function EquipmentSlotCard({
  player,
  slot,
  label,
  icon,
  bestCandidate,
  onUnequip,
  onInspectCandidate,
  onOpenBag,
}: {
  player: Player;
  slot: EquipmentSlot;
  label: string;
  icon: string;
  bestCandidate: InventoryItem | null;
  onUnequip: (slot: EquipmentSlot) => void;
  onInspectCandidate: (itemId: string) => void;
  onOpenBag: () => void;
}) {
  const item = player.equipment?.[slot];
  const presentation = item ? presentMobileInventoryItem(item) : null;
  const bestComparison = bestCandidate ? compareMobileEquipmentForPlayer(player, bestCandidate) : null;
  const bestDelta = bestComparison ? Math.round(bestComparison.powerDelta) : 0;
  const effectLines = getShortEffectLines(item, 3);

  return (
    <View style={styles.equipmentCard}>
      <View style={styles.equipmentHeader}>
        <Text style={styles.equipmentIcon}>{icon}</Text>
        <View style={styles.equipmentTitleBlock}>
          <Text style={styles.equipmentLabel}>{label}</Text>
          <Text style={styles.equipmentName} numberOfLines={1}>{item?.name ?? "Vide"}</Text>
          {item ? (
            <View style={[styles.rarityPill, getItemRarityStyle(item)]}>
              <Text style={styles.rarityText}>{getItemRarityLabel(item)} · ⚙️ {getMobileItemPowerScore(item)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {presentation ? (
        <>
          <View style={styles.equipmentEffects}>
            {effectLines.map((line) => (
              <Text key={line} style={styles.equipmentEffectLine} numberOfLines={1}>• {line}</Text>
            ))}
          </View>
          <MobilePressableButton label="Retirer" tone="ghost" onPress={() => onUnequip(slot)} />
        </>
      ) : (
        <Text style={styles.emptyInline}>Aucun objet équipé.</Text>
      )}

      {bestCandidate ? (
        <Pressable
          onPress={() => onInspectCandidate(bestCandidate.id)}
          style={[styles.bestCandidateBox, bestDelta > 0 && styles.bestCandidateGood]}
        >
          <View style={styles.bestCandidateText}>
            <Text style={styles.bestCandidateLabel}>{bestDelta > 0 ? "Meilleure pièce trouvée" : "Option dans le sac"}</Text>
            <Text style={styles.bestCandidateName} numberOfLines={1}>{bestCandidate.name}</Text>
          </View>
          <View style={styles.bestCandidateDelta}>
            <Text style={styles.bestCandidateDeltaLabel}>Score</Text>
            <DeltaText delta={bestDelta} />
          </View>
        </Pressable>
      ) : (
        <Pressable onPress={onOpenBag} style={styles.bestCandidateBox}>
          <Text style={styles.bestCandidateLabel}>Aucune pièce compatible dans le sac.</Text>
          <Text style={styles.bestCandidateName}>Voir le sac</Text>
        </Pressable>
      )}
    </View>
  );
}


function ForgeSlotCard({
  player,
  slot,
  label,
  icon,
  onForge,
}: {
  player: Player;
  slot: EquipmentSlot;
  label: string;
  icon: string;
  onForge: (slot: EquipmentSlot) => void;
}) {
  const preview = getMobileForgePreview(player, slot);

  if (!preview) {
    return (
      <View style={styles.forgeCard}>
        <View style={styles.equipmentHeader}>
          <Text style={styles.equipmentIcon}>{icon}</Text>
          <View style={styles.equipmentTitleBlock}>
            <Text style={styles.equipmentLabel}>{label}</Text>
            <Text style={styles.equipmentName}>Vide</Text>
          </View>
        </View>
        <Text style={styles.emptyInline}>Équipe une pièce pour la renforcer.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.forgeCard, preview.canUpgrade && styles.forgeCardReady]}>
      <View style={styles.equipmentHeader}>
        <Text style={styles.equipmentIcon}>{icon}</Text>
        <View style={styles.equipmentTitleBlock}>
          <Text style={styles.equipmentLabel}>{label}</Text>
          <Text style={styles.equipmentName} numberOfLines={1}>{preview.item.name}</Text>
          <Text style={styles.forgeMeta}>Rang +{preview.currentLevel}/{preview.maxLevel} · ⚙️ {preview.beforePower} → {preview.afterPower}</Text>
        </View>
      </View>

      <View style={styles.forgeGainRow}>
        {(preview.gainedLines.length ? preview.gainedLines : ["Rang maximum atteint."]).slice(0, 3).map((line) => (
          <Text key={line} style={styles.forgeGainPill}>{line}</Text>
        ))}
      </View>

      <View style={styles.forgeFooter}>
        <View>
          <Text style={styles.forgeCostLabel}>Coût</Text>
          <Text style={[styles.forgeCostValue, !preview.canUpgrade && styles.forgeCostBlocked]}>
            {preview.currentLevel >= preview.maxLevel ? "Max" : `${preview.cost} or`}
          </Text>
        </View>
        <MobilePressableButton
          label={preview.currentLevel >= preview.maxLevel ? "Maximum" : "Forger"}
          tone={preview.canUpgrade ? "primary" : "ghost"}
          disabled={!preview.canUpgrade}
          onPress={() => onForge(slot)}
          style={styles.forgeButton}
        />
      </View>

      {preview.reason ? <Text style={styles.forgeReason}>{preview.reason}</Text> : null}
    </View>
  );
}


type InventoryPanel = "equipment" | "bag" | "forge";

export function MobileInventoryScreen({ initialRun, onClose }: MobileInventoryScreenProps) {
  const [run, setRun] = useState(initialRun);
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(initialRun.currentPlayerIndex ?? 0);
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<MobileInventoryFilter>("all");
  const [sort, setSort] = useState<MobileInventorySort>("type");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [panel, setPanel] = useState<InventoryPanel>("equipment");

  const summaries = useMemo(() => getMobileInventoryPlayerSummaries(run), [run]);
  const selectedSummary = summaries[selectedPlayerIndex] ?? summaries[0];
  const selectedPlayer = selectedSummary?.player;

  const visibleItems = useMemo(() => {
    if (!selectedPlayer) return [];
    return filterAndSortMobileInventory(selectedPlayer, filter, sort);
  }, [filter, selectedPlayer, sort]);

  const persist = async (nextRun: EtherniaRunSave, nextMessage: string) => {
    await mobileRunSaveSystem.saveRun(nextRun);
    setRun(nextRun);
    setMessage(nextMessage);
  };

  const equipItemNow = async (itemId: string) => {
    const result = equipMobileInventoryItem(run, selectedPlayerIndex, itemId);
    setSelectedItemId(null);
    await persist(result.state, result.message);
  };

  const equipItem = async (itemId: string) => {
    const player = selectedPlayer;
    const item = player?.inventory?.find((candidate) => candidate.id === itemId);
    const comparison = player && item ? compareMobileEquipmentForPlayer(player, item) : null;

    if (comparison?.currentItemName) {
      Alert.alert(
        "Remplacer l’équipement ?",
        `${item?.name} va remplacer ${comparison.currentItemName}.\n\n${comparison.summary}`,
        [
          { text: "Annuler", style: "cancel" },
          { text: "Équiper", onPress: () => void equipItemNow(itemId) },
        ]
      );
      return;
    }

    await equipItemNow(itemId);
  };

  const unequipSlotNow = async (slot: EquipmentSlot) => {
    const result = unequipMobileInventorySlot(run, selectedPlayerIndex, slot);
    await persist(result.state, result.message);
  };

  const unequipSlot = async (slot: EquipmentSlot) => {
    const itemName = selectedPlayer?.equipment[slot]?.name;
    if (!itemName) {
      await unequipSlotNow(slot);
      return;
    }

    Alert.alert("Retirer l’équipement ?", `${itemName} retournera dans le sac de ce héros.`, [
      { text: "Annuler", style: "cancel" },
      { text: "Retirer", onPress: () => void unequipSlotNow(slot) },
    ]);
  };

  const useItemNow = async (itemId: string) => {
    const result = useMobileInventoryItem(run, selectedPlayerIndex, itemId);
    setSelectedItemId(null);
    await persist(result.state, result.message);
  };

  const useItem = async (itemId: string) => {
    const item = selectedPlayer?.inventory?.find((candidate) => candidate.id === itemId);
    Alert.alert("Utiliser l’objet ?", `${item?.name ?? "Cet objet"} sera consommé.`, [
      { text: "Annuler", style: "cancel" },
      { text: "Utiliser", onPress: () => void useItemNow(itemId) },
    ]);
  };

  const forgeSlotNow = async (slot: EquipmentSlot) => {
    const result = upgradeMobileEquipmentAtForge(run, selectedPlayerIndex, slot);
    await persist(result.state, result.message);
  };

  const forgeSlot = async (slot: EquipmentSlot) => {
    const player = selectedPlayer;
    if (!player) return;
    const preview = getMobileForgePreview(player, slot);
    if (!preview) {
      setMessage("Aucun équipement à forger.");
      return;
    }
    if (!preview.canUpgrade) {
      setMessage(preview.reason ?? "Forge impossible.");
      return;
    }

    Alert.alert(
      "Renforcer l’objet ?",
      `${preview.item.name} passera au rang +${preview.nextLevel}.\nCoût : ${preview.cost} or.\n${preview.gainedLines.join(" · ") || "Score amélioré."}`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Forger", onPress: () => void forgeSlotNow(slot) },
      ],
    );
  };

  const inspectBagItem = (itemId: string) => {
    setPanel("bag");
    setSelectedItemId(itemId);
    setFilter("all");
  };

  const openBagForSlot = () => {
    setPanel("bag");
    setFilter("equipment");
    setSelectedItemId(null);
  };

  const usefulConsumables = selectedPlayer
    ? (selectedPlayer.inventory ?? []).filter((item) => item.type === "consumable" && item.effects).slice(0, 3)
    : [];

  const strongestEquipment = selectedPlayer
    ? (selectedPlayer.inventory ?? [])
        .filter((item) => item.type === "equipment")
        .sort((a, b) => getMobileItemPowerScore(b) - getMobileItemPowerScore(a))
        .slice(0, 3)
    : [];

  const goBack = () => onClose(run);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Sac de campagne</Text>
          <Text style={styles.title}>Inventaire</Text>
          <Text style={styles.subtitle}>Équipe, compare et utilise sans ouvrir trois écrans.</Text>
        </View>
        <MobilePressableButton label="Carte" tone="ghost" onPress={goBack} />
      </View>

      {message ? <Text style={styles.feedback}>{message}</Text> : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.segmentedRow}>
          <FilterChip label="Équipement" active={panel === "equipment"} onPress={() => setPanel("equipment")} />
          <FilterChip label="Sac" active={panel === "bag"} onPress={() => setPanel("bag")} />
          <FilterChip label="Forge" active={panel === "forge"} onPress={() => setPanel("forge")} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroTabs}>
          {summaries.map((summary, index) => (
            <Pressable
              key={summary.player.id}
              onPress={() => {
                setSelectedPlayerIndex(index);
                setSelectedItemId(null);
              }}
              style={[styles.heroTab, selectedPlayerIndex === index && styles.heroTabActive]}
            >
              <Text style={styles.heroTabName}>{summary.player.name}</Text>
              <Text style={styles.heroTabMeta}>{getClassDisplayName(summary.player.classType)} · Nv {summary.player.level}</Text>
              <Text style={styles.heroTabMeta}>🎒 {summary.inventoryCount} · ⚙️ {summary.equipmentPower}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {selectedPlayer && selectedSummary ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{selectedPlayer.name}</Text>
              <Text style={styles.sectionSubtitle}>{getClassDisplayName(selectedPlayer.classType)} · {selectedPlayer.gold} or · XP {selectedPlayer.xp}/{selectedPlayer.xpToNextLevel}</Text>
              <View style={styles.statGrid}>
                <StatPill label="PV" value={`${selectedPlayer.stats.hp}/${selectedSummary.derivedStats.maxHp}`} />
                <StatPill label="Mana" value={`${selectedPlayer.stats.mana}/${selectedSummary.derivedStats.maxMana}`} />
                <StatPill label="Force" value={selectedSummary.derivedStats.strength} />
                <StatPill label="Magie" value={selectedSummary.derivedStats.magic} />
                <StatPill label="Défense" value={selectedSummary.derivedStats.defense} />
                <StatPill label="Vitesse" value={selectedSummary.derivedStats.speed} />
              </View>
            </View>

            {panel === "equipment" ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Équipement actuel</Text>
                    <Text style={styles.sectionSubtitle}>Chaque emplacement indique la meilleure option trouvée dans le sac.</Text>
                  </View>
                  <Pressable onPress={openBagForSlot} style={styles.openBagButton}>
                    <Text style={styles.openBagButtonText}>Sac</Text>
                  </Pressable>
                </View>
                {strongestEquipment.length ? (
                  <View style={styles.quickShelf}>
                    {strongestEquipment.map((item) => (
                      <Pressable key={item.id} onPress={() => inspectBagItem(item.id)} style={styles.quickItem}>
                        <Text style={styles.quickItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.quickItemMeta}>{getMobileItemTypeLabel(item)} · ⚙️ {getMobileItemPowerScore(item)}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <View style={styles.equipmentGrid}>
                  {EQUIPMENT_SLOTS.map((slotInfo) => (
                    <EquipmentSlotCard
                      key={slotInfo.slot}
                      player={selectedPlayer}
                      slot={slotInfo.slot}
                      label={slotInfo.label}
                      icon={slotInfo.icon}
                      bestCandidate={getBestCandidateForSlot(selectedPlayer, slotInfo.slot)}
                      onUnequip={(slot) => void unequipSlot(slot)}
                      onInspectCandidate={inspectBagItem}
                      onOpenBag={openBagForSlot}
                    />
                  ))}
                </View>
              </View>
             ) : panel === "forge" ? (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Forge</Text>
                    <Text style={styles.sectionSubtitle}>Renforce l’équipement porté avec l’or du héros.</Text>
                  </View>
                </View>
                <View style={styles.forgeIntroBox}>
                  <Text style={styles.forgeIntroTitle}>Règle simple</Text>
                  <Text style={styles.forgeIntroText}>Chaque rang ajoute un bonus lié à l’emplacement. Rang max : +5.</Text>
                </View>
                <View style={styles.equipmentGrid}>
                  {EQUIPMENT_SLOTS.map((slotInfo) => (
                    <ForgeSlotCard
                      key={slotInfo.slot}
                      player={selectedPlayer}
                      slot={slotInfo.slot}
                      label={slotInfo.label}
                      icon={slotInfo.icon}
                      onForge={(slot) => void forgeSlot(slot)}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Sac</Text>
                    <Text style={styles.sectionSubtitle}>{visibleItems.length}/{selectedPlayer.inventory?.length ?? 0} objets affichés</Text>
                  </View>
                </View>

                <Text style={styles.controlLabel}>Filtrer</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {FILTERS.map((candidate) => (
                    <FilterChip
                      key={candidate.id}
                      label={candidate.label}
                      active={filter === candidate.id}
                      onPress={() => {
                        setFilter(candidate.id);
                        setSelectedItemId(null);
                      }}
                    />
                  ))}
                </ScrollView>

                <Text style={styles.controlLabel}>Trier</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {SORTS.map((candidate) => (
                    <FilterChip
                      key={candidate.id}
                      label={candidate.label}
                      active={sort === candidate.id}
                      onPress={() => setSort(candidate.id)}
                    />
                  ))}
                </ScrollView>

                {usefulConsumables.length && filter === "all" ? (
                  <View style={styles.quickUseBox}>
                    <Text style={styles.quickUseTitle}>Objets utiles</Text>
                    <View style={styles.quickShelf}>
                      {usefulConsumables.map((item) => (
                        <Pressable key={item.id} onPress={() => setSelectedItemId(item.id)} style={styles.quickItem}>
                          <Text style={styles.quickItemName} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.quickItemMeta}>{getShortEffectLines(item, 1)[0] ?? "Utilisable"}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                {visibleItems.length ? (
                  visibleItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      player={selectedPlayer}
                      selected={selectedItemId === item.id}
                      onSelect={(itemId) => setSelectedItemId((current) => current === itemId ? null : itemId)}
                      onEquip={(itemId) => void equipItem(itemId)}
                      onUse={(itemId) => void useItem(itemId)}
                    />
                  ))
                ) : (
                  <Text style={styles.emptyText}>Aucun objet ne correspond à ce filtre.</Text>
                )}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.emptyText}>Aucun héros disponible.</Text>
        )}
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
    lineHeight: 19,
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
  segmentedRow: {
    flexDirection: "row",
    gap: mobileTheme.spacing.sm,
  },
  heroTabs: {
    gap: mobileTheme.spacing.sm,
    paddingRight: mobileTheme.spacing.md,
  },
  heroTab: {
    minWidth: 124,
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    gap: 4,
  },
  heroTabActive: {
    backgroundColor: "rgba(246,196,83,0.16)",
    borderColor: mobileTheme.colors.accent,
  },
  heroTabName: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    fontSize: 15,
  },
  heroTabMeta: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    gap: mobileTheme.spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: mobileTheme.colors.text,
    fontSize: 19,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: mobileTheme.colors.muted,
    lineHeight: 19,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  statPill: {
    minWidth: "30%",
    flexGrow: 1,
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.panel,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  statLabel: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statValue: {
    color: mobileTheme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 3,
  },
  equipmentGrid: {
    gap: mobileTheme.spacing.sm,
  },
  equipmentCard: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.panel,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    gap: mobileTheme.spacing.sm,
  },
  equipmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.sm,
  },
  equipmentIcon: {
    fontSize: 27,
  },
  equipmentTitleBlock: {
    flex: 1,
  },
  equipmentLabel: {
    color: mobileTheme.colors.accent,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  equipmentName: {
    color: mobileTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  emptyInline: {
    color: mobileTheme.colors.muted,
  },
  controlLabel: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: mobileTheme.spacing.xs,
  },
  chipRow: {
    gap: mobileTheme.spacing.sm,
    paddingRight: mobileTheme.spacing.md,
  },
  chip: {
    minHeight: 38,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  chipActive: {
    backgroundColor: "rgba(246,196,83,0.18)",
    borderColor: mobileTheme.colors.accent,
  },
  chipText: {
    color: mobileTheme.colors.muted,
    fontWeight: "900",
    fontSize: 12,
  },
  chipTextActive: {
    color: mobileTheme.colors.text,
  },
  itemCard: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.panel,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    gap: mobileTheme.spacing.sm,
  },
  itemCardSelected: {
    borderColor: mobileTheme.colors.accent,
    backgroundColor: "rgba(246,196,83,0.10)",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: mobileTheme.spacing.sm,
  },
  itemText: {
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
  expandHint: {
    color: mobileTheme.colors.text,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },
  itemDescription: {
    color: mobileTheme.colors.muted,
    lineHeight: 19,
  },
  effectList: {
    marginTop: 4,
    gap: 2,
  },
  effectText: {
    color: mobileTheme.colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  itemActions: {
    flexDirection: "row",
    gap: mobileTheme.spacing.sm,
  },
  actionFlex: {
    flex: 1,
  },
  comparisonBox: {
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    gap: 6,
  },
  comparisonTitle: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
  },
  comparisonMeta: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
  },
  comparisonSummary: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },
  compareGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.xs,
  },
  compareCell: {
    minWidth: "31%",
    flexGrow: 1,
    padding: 8,
    borderRadius: mobileTheme.radius.sm,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  compareLabel: {
    color: mobileTheme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  compareValue: {
    color: mobileTheme.colors.text,
    fontWeight: "800",
    marginTop: 2,
  },
  deltaText: {
    color: mobileTheme.colors.muted,
    fontWeight: "900",
    marginTop: 2,
  },
  deltaPositive: {
    color: "#86efac",
  },
  deltaNegative: {
    color: "#fca5a5",
  },

  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.sm,
  },
  rarityPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  rarityCommon: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  rarityStrong: {
    backgroundColor: "rgba(103,232,249,0.10)",
    borderColor: "rgba(103,232,249,0.28)",
  },
  rarityRare: {
    backgroundColor: "rgba(246,196,83,0.12)",
    borderColor: "rgba(246,196,83,0.32)",
  },
  rarityRelic: {
    backgroundColor: "rgba(167,139,250,0.13)",
    borderColor: "rgba(167,139,250,0.32)",
  },
  rarityCorrupted: {
    backgroundColor: "rgba(190,24,93,0.16)",
    borderColor: "rgba(244,114,182,0.32)",
  },
  rarityText: {
    color: mobileTheme.colors.text,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
    includeFontPadding: false,
  },
  comparisonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.sm,
  },
  powerDeltaBadge: {
    minWidth: 58,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  powerDeltaGood: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.26)",
  },
  powerDeltaBad: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.26)",
  },
  powerDeltaLabel: {
    color: mobileTheme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  compareCellGood: {
    backgroundColor: "rgba(34,197,94,0.10)",
  },
  compareCellBad: {
    backgroundColor: "rgba(239,68,68,0.10)",
  },
  equipmentEffects: {
    gap: 3,
  },
  equipmentEffectLine: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  bestCandidateBox: {
    marginTop: 2,
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.sm,
  },
  bestCandidateGood: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderColor: "rgba(34,197,94,0.25)",
  },
  bestCandidateText: {
    flex: 1,
    gap: 2,
  },
  bestCandidateLabel: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  bestCandidateName: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
  },
  bestCandidateDelta: {
    minWidth: 48,
    alignItems: "center",
  },
  bestCandidateDeltaLabel: {
    color: mobileTheme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  openBagButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(246,196,83,0.14)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.26)",
  },
  openBagButtonText: {
    color: mobileTheme.colors.accent,
    fontWeight: "900",
  },
  quickShelf: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  quickItem: {
    minWidth: "31%",
    flexGrow: 1,
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  quickItemName: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    fontSize: 12,
  },
  quickItemMeta: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  quickUseBox: {
    gap: mobileTheme.spacing.sm,
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.035)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  quickUseTitle: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },


  forgeIntroBox: {
    gap: 3,
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(246,196,83,0.08)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.18)",
  },
  forgeIntroTitle: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  forgeIntroText: {
    color: mobileTheme.colors.muted,
    lineHeight: 18,
  },
  forgeCard: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.panel,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    gap: mobileTheme.spacing.sm,
  },
  forgeCardReady: {
    backgroundColor: "rgba(246,196,83,0.08)",
    borderColor: "rgba(246,196,83,0.24)",
  },
  forgeMeta: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3,
  },
  forgeGainRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  forgeGainPill: {
    color: mobileTheme.colors.text,
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  forgeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.sm,
  },
  forgeCostLabel: {
    color: mobileTheme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  forgeCostValue: {
    color: mobileTheme.colors.accent,
    fontSize: 18,
    fontWeight: "900",
  },
  forgeCostBlocked: {
    color: mobileTheme.colors.muted,
  },
  forgeButton: {
    minWidth: 120,
  },
  forgeReason: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },

  emptyText: {
    color: mobileTheme.colors.muted,
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
});
