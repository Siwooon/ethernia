import { useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  getMobileTeamHeroSummaries,
  getMobileTeamRunOverview,
} from "@/shared/engine/game/mobileTeamEngine";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import type { ClassType, EquipmentItem, EquipmentSlot, PlayerBuildChoice } from "@/shared/types/game";
import { MobileProgressBar } from "../components/MobileProgressBar";
import { MobileFeedbackBanner } from "../components/MobileFeedbackBanner";
import { ClassIcon } from "../components/ClassIcon";
import {
  CLASS_TALENT_TREES,
  getAvailableTalentPoints,
  getSpentTalentPoints,
  getTalentNodes,
  getTalentNodeCondition,
  getTalentNodeMilestoneText,
  getTalentNodeRoleText,
  getTalentNodeTechnicalText,
  getTalentPointsForLevel,
  isTalentNodeAvailable,
  isTalentNodeUnlocked,
  type TalentNode,
} from "@/shared/engine/game/classTalentTrees";
import { mobileTheme } from "../styles/theme";
import { MobileMasteryTree } from "../components/mastery/MobileMasteryTree";
import { applyLevelUpChoiceToPlayer, getLevelUpChoiceOptionById } from "@/shared/lib/levelUpChoices";
import { getClassFullbodySource } from "../assets/mobileAssets";
import { getClassDisplayName } from "@/shared/engine/game/displayLabels";
import { mobileRunSaveSystem } from "../platform/mobileRunSaveSystem";
import {
  attributeColors,
  getAttributeTone,
  type AttributeTone,
} from "../styles/statColors";

type MobileTeamScreenProps = {
  run: EtherniaRunSave;
  onClose: () => void;
  onOpenInventory?: (run: EtherniaRunSave) => void;
  onRunChanged?: (run: EtherniaRunSave) => void;
};

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: AttributeTone;
}) {
  const resolvedTone = tone ?? getAttributeTone(label);
  const palette = resolvedTone ? attributeColors[resolvedTone] : null;
  return (
    <View
      style={[
        styles.statBox,
        palette && {
          backgroundColor: palette.soft,
          borderColor: palette.border,
        },
      ]}
    >
      <Text style={[styles.statLabel, palette && { color: palette.color }]}>
        {palette ? `${palette.icon} ` : ""}
        {label}
      </Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

type TeamPanel = "resume" | "skills" | "talents" | "effects";

const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: "Arme",
  offhand: "Main libre",
  armor: "Armure",
  amulet: "Amulette",
  ring: "Anneau",
  relic: "Relique",
};

const EQUIPMENT_SLOT_ICONS: Record<EquipmentSlot, string> = {
  weapon: "⚔",
  offhand: "▣",
  armor: "◈",
  amulet: "◇",
  ring: "○",
  relic: "✦",
};

const EQUIPMENT_SLOTS: EquipmentSlot[] = ["weapon", "offhand", "armor", "amulet", "ring", "relic"];

function formatSignedStat(label: string, value: number | undefined) {
  if (!value) return null;
  return `${value > 0 ? "+" : ""}${value} ${label}`;
}

function getEquipmentBonusLines(item: EquipmentItem | null | undefined) {
  if (!item) return [];
  const effects = item.effects ?? {};
  const curseEffects = item.curseEffects ?? {};
  return [
    formatSignedStat("PV", effects.maxHp),
    formatSignedStat("Mana", effects.maxMana),
    formatSignedStat("Force", effects.strength),
    formatSignedStat("Magie", effects.magic),
    formatSignedStat("Défense", effects.defense),
    formatSignedStat("Vitesse", effects.speed),
    formatSignedStat("PV", curseEffects.maxHp),
    formatSignedStat("Mana", curseEffects.maxMana),
    formatSignedStat("Force", curseEffects.strength),
    formatSignedStat("Magie", curseEffects.magic),
    formatSignedStat("Défense", curseEffects.defense),
    formatSignedStat("Vitesse", curseEffects.speed),
  ].filter((line): line is string => Boolean(line)).slice(0, 3);
}

function getEquipmentTone(item: EquipmentItem | null | undefined) {
  if (!item) return "Vide";
  if (item.corrupted) return "Corrompu";
  const bonusCount = getEquipmentBonusLines(item).length;
  if (bonusCount >= 3) return "Rare";
  if (bonusCount >= 2) return "Renforcé";
  return "Commun";
}

function getNextTalentHint(
  branches: { label: string; nodes: TalentNode[] }[],
  classType: ClassType,
  level: number,
  choices: PlayerBuildChoice[] | undefined,
) {
  for (const branch of branches) {
    const available = branch.nodes.find((node) =>
      isTalentNodeAvailable(node, classType, level, choices),
    );
    if (available) return `${available.label} · ${branch.label}`;
  }

  const locked = branches
    .flatMap((branch) => branch.nodes.map((node) => ({ branch, node })))
    .filter(({ node }) => !isTalentNodeUnlocked(node, choices))
    .sort((a, b) => a.node.requiredLevel - b.node.requiredLevel)[0];

  if (!locked) return "Tous les talents visibles sont gravés.";
  return `${locked.node.label} · niv. ${locked.node.requiredLevel}`;
}

function getLastTalentLabels(classType: ClassType, choices: PlayerBuildChoice[] | undefined) {
  const talentChoiceIds = new Set(getTalentNodes(classType).map((node) => node.choiceId));
  return (choices ?? [])
    .filter((choice) => talentChoiceIds.has(choice.id))
    .slice(-4)
    .map((choice) => `Niv.${choice.level} · ${choice.label}`);
}


export function MobileTeamScreen({
  run,
  onClose,
  onOpenInventory,
  onRunChanged,
}: MobileTeamScreenProps) {
  const [localRun, setLocalRun] = useState(run);
  useEffect(() => setLocalRun(run), [run]);

  const summaries = useMemo(() => getMobileTeamHeroSummaries(localRun), [localRun]);
  const overview = useMemo(() => getMobileTeamRunOverview(localRun), [localRun]);
  const [selectedIndex, setSelectedIndex] = useState(
    run.currentPlayerIndex ?? 0,
  );
  const [panel, setPanel] = useState<TeamPanel>("resume");
  const selected = summaries[selectedIndex] ?? summaries[0];
  const player = selected?.player;
  const talentBranches = player ? CLASS_TALENT_TREES[player.classType] ?? [] : [];
  const [selectedTalent, setSelectedTalent] = useState<{ branchId: string; branchLabel: string; node: TalentNode } | null>(null);
  const [talentFeedback, setTalentFeedback] = useState<string | null>(null);
  const [newlyGravedTalentKey, setNewlyGravedTalentKey] = useState<string | null>(null);
  const totalTalentPoints = player ? getTalentPointsForLevel(player.level) : 0;
  const spentTalentPoints = player ? getSpentTalentPoints(player.classType, player.buildChoices) : 0;
  const availableTalentPoints = player ? getAvailableTalentPoints(player.classType, player.level, player.buildChoices) : 0;
  useEffect(() => {
    if (!talentFeedback) return;
    const timeout = setTimeout(() => setTalentFeedback(null), 2200);
    return () => clearTimeout(timeout);
  }, [talentFeedback]);

  useEffect(() => {
    if (!newlyGravedTalentKey) return;
    const timeout = setTimeout(() => setNewlyGravedTalentKey(null), 2600);
    return () => clearTimeout(timeout);
  }, [newlyGravedTalentKey]);


  const validateTalentNode = async (node: TalentNode, branchId?: string) => {
    if (!player) return;
    if (!isTalentNodeAvailable(node, player.classType, player.level, player.buildChoices)) return;

    const choiceOption = getLevelUpChoiceOptionById(player.classType, node.choiceId);
    if (!choiceOption) return;

    const nextRun: EtherniaRunSave = {
      ...localRun,
      players: localRun.players.map((candidate) =>
        candidate.id === player.id
          ? applyLevelUpChoiceToPlayer(candidate, choiceOption, player.level)
          : candidate,
      ),
    };

    const talentKey = branchId ? `${branchId}:${node.id}` : null;

    setLocalRun(nextRun);
    onRunChanged?.(nextRun);
    setTalentFeedback(`Talent gravé : ${node.label}.`);
    if (talentKey) setNewlyGravedTalentKey(talentKey);
    setSelectedTalent(null);
    await mobileRunSaveSystem.saveRun(nextRun);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Groupe</Text>
          <Text style={styles.title}>Héros</Text>
        </View>
        <Pressable onPress={onClose} style={styles.ghostButton}>
          <Text numberOfLines={1} style={styles.ghostButtonText}>
            Carte
          </Text>
        </Pressable>
      </View>

      <View style={styles.overviewGrid}>
        <StatBox
          label="Vivants"
          value={`${overview.alive}/${overview.total}`}
        />
        <StatBox label="Or" value={overview.totalGold} tone="gold" />
        <StatBox label="Objets" value={overview.totalInventory} />
        <StatBox
          label="Corruption"
          value={overview.corruption}
          tone="corruption"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.heroTabs}
      >
        {summaries.map((summary, index) => (
          <Pressable
            key={summary.player.id}
            onPress={() => setSelectedIndex(index)}
            style={[
              styles.heroTab,
              selectedIndex === index && styles.heroTabActive,
              summary.player.isDead && styles.heroTabDead,
            ]}
          >
            <ClassIcon
              classType={summary.player.classType}
              variant="state"
              size="sm"
              active={selectedIndex === index}
              style={styles.heroTabClassIcon}
            />
            <Text style={styles.heroTabName} numberOfLines={1}>
              {summary.player.name}
            </Text>
            <Text style={styles.heroTabMeta}>Niv. {summary.player.level}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.segmentedRow}>
        <Pressable
          onPress={() => setPanel("resume")}
          style={[
            styles.segmentButton,
            panel === "resume" && styles.segmentButtonActive,
          ]}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.76}
            style={[
              styles.segmentText,
              panel === "resume" && styles.segmentTextActive,
            ]}
          >
            Résumé
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setPanel("skills")}
          style={[
            styles.segmentButton,
            panel === "skills" && styles.segmentButtonActive,
          ]}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[
              styles.segmentText,
              panel === "skills" && styles.segmentTextActive,
            ]}
          >
            Compétences
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setPanel("talents")}
          style={[
            styles.segmentButton,
            panel === "talents" && styles.segmentButtonActive,
          ]}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[
              styles.segmentText,
              panel === "talents" && styles.segmentTextActive,
            ]}
          >
            Talents
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setPanel("effects")}
          style={[
            styles.segmentButton,
            panel === "effects" && styles.segmentButtonActive,
          ]}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.76}
            style={[
              styles.segmentText,
              panel === "effects" && styles.segmentTextActive,
            ]}
          >
            Effets
          </Text>
        </Pressable>
      </View>

      <MobileFeedbackBanner message={talentFeedback} tone="success" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {selected && player ? (
          <>
            {panel === "resume" ? (
              <View style={styles.heroCard}>
                <View style={styles.heroTitleRow}>
                  <View style={styles.heroIdentityRow}>
                    <ClassIcon
                      classType={player.classType}
                      variant="portrait"
                      size="lg"
                      active
                    />
                    <View style={styles.heroTitleBlock}>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.78}
                        style={styles.heroName}
                      >
                        {player.name}
                      </Text>
                      <Text
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        style={styles.heroRole}
                      >
                        {getClassDisplayName(player.classType)} · Niv. {player.level}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.heroFullbodyFrame}>
                    <Image
                      source={getClassFullbodySource(player.classType)}
                      style={styles.heroFullbodyImage}
                      resizeMode="contain"
                    />
                  </View>
                </View>
                <View style={styles.resourceBlock}>
                  <MobileProgressBar
                    label="PV"
                    value={player.stats.hp}
                    max={selected.derivedStats.maxHp}
                    tone="danger"
                  />
                  <MobileProgressBar
                    label="Mana"
                    value={player.stats.mana}
                    max={selected.derivedStats.maxMana}
                    tone="mana"
                  />
                  <MobileProgressBar
                    label="XP"
                    value={player.xp}
                    max={player.xpToNextLevel}
                    tone="success"
                  />
                </View>
              </View>
            ) : null}

            {panel === "resume" ? (
              <>
                <View style={styles.progressPanel}>
                  <View style={styles.progressHeaderRow}>
                    <View>
                      <Text style={styles.sectionTitle}>Progression</Text>
                      <Text style={styles.mutedLine}>
                        {Math.max(0, player.xpToNextLevel - player.xp)} XP avant le prochain niveau.
                      </Text>
                    </View>
                    <Pressable onPress={() => setPanel("talents")} style={styles.smallAccentButton}>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        style={styles.smallAccentButtonText}
                      >
                        Talents
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.progressGrid}>
                    <View style={styles.progressTile}>
                      <Text style={styles.progressTileLabel}>Niveau</Text>
                      <Text style={styles.progressTileValue}>{player.level}</Text>
                    </View>
                    <View style={styles.progressTile}>
                      <Text style={styles.progressTileLabel}>Maîtrise</Text>
                      <Text style={styles.progressTileValue}>{availableTalentPoints}</Text>
                    </View>
                    <View style={styles.progressTileWide}>
                      <Text style={styles.progressTileLabel}>Prochain talent</Text>
                      <Text style={styles.progressTileText} numberOfLines={2}>
                        {getNextTalentHint(talentBranches, player.classType, player.level, player.buildChoices)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.sectionCompact}>
                  <Text style={styles.sectionTitle}>Stats</Text>
                  <View style={styles.statsGridCompact}>
                    <StatBox label="PV max" value={selected.derivedStats.maxHp} />
                    <StatBox label="Mana" value={selected.derivedStats.maxMana} />
                    <StatBox label="Force" value={selected.derivedStats.strength} />
                    <StatBox label="Magie" value={selected.derivedStats.magic} />
                    <StatBox label="Défense" value={selected.derivedStats.defense} />
                    <StatBox label="Vitesse" value={selected.derivedStats.speed} />
                  </View>
                </View>

                <View style={styles.sectionCompact}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Équipement</Text>
                    <Pressable onPress={() => onOpenInventory?.(localRun)} style={styles.smallAccentButton}>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.74}
                        style={styles.smallAccentButtonText}
                      >
                        Inventaire
                      </Text>
                    </Pressable>
                  </View>
                  <View style={styles.equipmentGrid}>
                    {EQUIPMENT_SLOTS.map((slot) => {
                      const item = player.equipment?.[slot] ?? null;
                      const bonusLines = getEquipmentBonusLines(item);
                      return (
                        <View key={slot} style={[styles.equipmentCard, item?.corrupted && styles.equipmentCardCorrupted]}>
                          <View style={styles.equipmentTopRow}>
                            <Text style={styles.equipmentIcon}>{EQUIPMENT_SLOT_ICONS[slot]}</Text>
                            <View style={styles.equipmentNameBlock}>
                              <Text style={styles.equipmentSlot}>{EQUIPMENT_SLOT_LABELS[slot]}</Text>
                              <Text style={styles.equipmentName} numberOfLines={1}>
                                {item?.name ?? "Vide"}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.equipmentTone, item?.corrupted && styles.equipmentToneCorrupted]}>
                            {getEquipmentTone(item)}
                          </Text>
                          {bonusLines.length ? (
                            <Text style={styles.equipmentBonus} numberOfLines={2}>
                              {bonusLines.join(" · ")}
                            </Text>
                          ) : (
                            <Text style={styles.equipmentBonusMuted}>Aucun bonus.</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  <Text style={styles.mutedLine}>
                    Sac : {selected.inventoryCount} objet(s) · Or personnel : {player.gold}.
                  </Text>
                </View>

                <View style={styles.sectionCompact}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Talents & effets</Text>
                    <Text style={styles.masterySmallText}>{spentTalentPoints}/{totalTalentPoints} pris</Text>
                  </View>
                  {getLastTalentLabels(player.classType, player.buildChoices).length ? (
                    <View style={styles.tagRow}>
                      {getLastTalentLabels(player.classType, player.buildChoices).map((label) => (
                        <Text key={label} style={styles.tag}>{label}</Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>Aucun talent gravé.</Text>
                  )}
                  {[...selected.statusBadges, ...selected.mapEffectLines].length ? (
                    <View style={styles.effectPreviewRow}>
                      {selected.statusBadges.slice(0, 2).map((status) => (
                        <Text key={status.key} style={styles.effectPreview}>• {status.title}</Text>
                      ))}
                      {selected.mapEffectLines.slice(0, 2).map((line) => (
                        <Text key={line} style={styles.effectPreview}>• {line}</Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.mutedLine}>Aucun effet actif.</Text>
                  )}
                </View>
              </>
            ) : null}

            {panel === "skills" ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Compétences disponibles</Text>
                {selected.unlockedSkills.map((skill) => (
                  <View key={skill.id} style={styles.skillCard}>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.78}
                      style={styles.skillName}
                    >
                      {skill.icon} {skill.name}
                    </Text>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.72}
                      style={styles.skillMeta}
                    >
                      Mana {skill.manaCost} · Niv. {skill.minLevel} ·{" "}
                      {skill.scaling}
                    </Text>
                    <Text style={styles.line}>{skill.description}</Text>
                  </View>
                ))}
                {selected.lockedSkills.length ? (
                  <Text style={styles.mutedLine}>
                    À débloquer :{" "}
                    {selected.lockedSkills
                      .slice(0, 3)
                      .map((skill) => `${skill.name} niv.${skill.minLevel}`)
                      .join(" · ")}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {panel === "talents" ? (
              <View style={styles.section}>
                <View style={styles.masteryHeader}>
                  <View style={styles.masteryHeaderBlock}>
                    <Text style={styles.sectionTitle}>Talents</Text>
                    <Text style={styles.mutedLine}>+1 point de maîtrise par niveau gagné. Appuie sur un talent pour lire et valider.</Text>
                  </View>
                </View>
                <View style={styles.masteryStatsRow}>
                  <View style={[styles.masteryPill, styles.masteryPillHalf]}>
                    <Text style={styles.masteryPillLabel}>Points non attribués</Text>
                    <Text style={styles.masteryPillValue}>{availableTalentPoints}</Text>
                    <Text style={styles.masteryPillSub}>à graver</Text>
                  </View>
                  <View style={[styles.masteryPill, styles.masteryPillHalf]}>
                    <Text style={styles.masteryPillLabel}>Progression</Text>
                    <Text style={styles.masteryPillValue}>{spentTalentPoints}/{totalTalentPoints}</Text>
                    <Text style={styles.masteryPillSub}>points totaux</Text>
                  </View>
                </View>
                <MobileMasteryTree
                  classType={player.classType}
                  level={player.level}
                  choices={player.buildChoices}
                  branches={talentBranches}
                  availablePoints={availableTalentPoints}
                  selectedTalentKey={selectedTalent ? `${selectedTalent.branchId}:${selectedTalent.node.id}` : null}
                  newlyGravedTalentKey={newlyGravedTalentKey}
                  onSelectTalent={(payload) => setSelectedTalent(payload)}
                />
              </View>
            ) : null}

            {panel === "effects" ? (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Effets actifs</Text>
                  {selected.statusBadges.length ||
                  selected.mapEffectLines.length ? (
                    <>
                      {selected.statusBadges.map((status) => (
                        <Text key={status.key} style={styles.line}>
                          • {status.title}
                        </Text>
                      ))}
                      {selected.mapEffectLines.map((line) => (
                        <Text key={line} style={styles.line}>
                          • {line}
                        </Text>
                      ))}
                    </>
                  ) : (
                    <Text style={styles.emptyText}>Aucun effet actif.</Text>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Passifs & traits</Text>
                  {[...selected.passiveLines, ...selected.traitLines].length ? (
                    [...selected.passiveLines, ...selected.traitLines].map(
                      (line) => (
                        <Text key={line} style={styles.line}>
                          • {line}
                        </Text>
                      ),
                    )
                  ) : (
                    <Text style={styles.emptyText}>Aucun passif spécial.</Text>
                  )}
                </View>
              </>
            ) : null}
          </>
        ) : (
          <Text style={styles.emptyText}>Aucun héros disponible.</Text>
        )}
      </ScrollView>
      {selectedTalent && player ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setSelectedTalent(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedTalent(null)}>
            <Pressable style={styles.talentModal} onPress={(event) => event.stopPropagation()}>
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalBranch}>{selectedTalent.branchLabel}</Text>
                <Pressable onPress={() => setSelectedTalent(null)} style={styles.modalCloseButton}>
                  <Text style={styles.modalCloseText}>×</Text>
                </Pressable>
              </View>
              <View style={styles.modalNameRow}>
                <Text style={styles.modalTalentIcon}>{selectedTalent.node.icon}</Text>
                <View style={styles.modalNameBlock}>
                  <Text style={styles.modalTalentName}>{selectedTalent.node.label}</Text>
                  <Text style={styles.modalTalentHint}>{selectedTalent.node.hint}</Text>
                </View>
              </View>
              {selectedTalent.branchId === "mechanic" ? (
                <View style={styles.modalInfoGrid}>
                  <View style={styles.modalInfoBoxWide}>
                    <Text style={styles.modalInfoLabel}>Statut</Text>
                    <Text style={styles.modalInfoText}>Mécanique active dès le départ.</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.modalInfoGrid}>
                  <View style={styles.modalInfoBox}>
                    <Text style={styles.modalInfoLabel}>Coût</Text>
                    <Text style={styles.modalInfoText}>{selectedTalent.node.cost} point</Text>
                  </View>
                  <View style={styles.modalInfoBox}>
                    <Text style={styles.modalInfoLabel}>Condition</Text>
                    <Text style={styles.modalInfoText}>
                      {getTalentNodeCondition(selectedTalent.node, player.classType, player.level, player.buildChoices)}
                    </Text>
                  </View>
                  <View style={styles.modalInfoBox}>
                    <Text style={styles.modalInfoLabel}>Rôle</Text>
                    <Text style={styles.modalInfoText}>{getTalentNodeRoleText(selectedTalent.node)}</Text>
                  </View>
                </View>
              )}
              <Text style={styles.modalLineTitle}>Effet</Text>
              <Text style={styles.modalLine}>{getTalentNodeTechnicalText(selectedTalent.node)}</Text>
              {getTalentNodeMilestoneText(selectedTalent.node) ? (
                <>
                  <Text style={styles.modalLineTitle}>Palier</Text>
                  <Text style={styles.modalLine}>{getTalentNodeMilestoneText(selectedTalent.node)}</Text>
                </>
              ) : null}
              {selectedTalent.branchId === "mechanic" ? (
                <Text style={styles.modalValidated}>Mécanique déjà active.</Text>
              ) : isTalentNodeUnlocked(selectedTalent.node, player.buildChoices) ? (
                <Text style={styles.modalValidated}>Talent déjà gravé.</Text>
              ) : (
                <Pressable
                  disabled={!isTalentNodeAvailable(selectedTalent.node, player.classType, player.level, player.buildChoices)}
                  onPress={() => void validateTalentNode(selectedTalent.node, selectedTalent.branchId)}
                  style={[
                    styles.validateTalentButton,
                    !isTalentNodeAvailable(selectedTalent.node, player.classType, player.level, player.buildChoices) && styles.validateTalentButtonDisabled,
                  ]}
                >
                  <Text style={styles.validateTalentButtonText}>Valider le talent</Text>
                </Pressable>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
    paddingHorizontal: mobileTheme.spacing.md,
    paddingTop: mobileTheme.spacing.md,
    paddingBottom: 18,
    gap: mobileTheme.spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.md,
  },
  headerText: { flex: 1 },
  kicker: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 3,
  },
  subtitle: { color: mobileTheme.colors.muted, lineHeight: 19, marginTop: 3 },
  ghostButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  ghostButtonText: { color: mobileTheme.colors.text, fontWeight: "900" },
  overviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statBox: {
    flexGrow: 1,
    minWidth: "28%",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.panelStrong,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
  },
  statLabel: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  statValue: {
    color: mobileTheme.colors.text,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900",
    marginTop: 2,
    includeFontPadding: false,
  },
  heroTabs: { gap: 8, paddingVertical: 0 },
  heroTab: {
    width: 94,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    overflow: "hidden",
  },
  heroTabClassIcon: {
    alignSelf: "center",
  },
  heroTabActive: {
    backgroundColor: "rgba(246,196,83,0.14)",
    borderColor: mobileTheme.colors.border,
  },
  heroTabDead: { opacity: 0.55 },
  heroTabIcon: { fontSize: 24 },
  heroTabName: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    marginTop: 4,
    lineHeight: 17,
    includeFontPadding: false,
  },
  heroTabMeta: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    includeFontPadding: false,
  },
  content: {
    gap: mobileTheme.spacing.sm,
    paddingBottom: 16,
  },
  segmentedRow: { flexDirection: "row", gap: 8 },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  segmentButtonActive: {
    backgroundColor: "rgba(246,196,83,0.16)",
    borderColor: mobileTheme.colors.border,
  },
  segmentText: {
    color: mobileTheme.colors.muted,
    fontWeight: "900",
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    textAlign: "center",
  },
  segmentTextActive: { color: mobileTheme.colors.accent },
  heroCard: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.panelStrong,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    gap: mobileTheme.spacing.sm,
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.md,
  },
  heroIdentityRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.md,
  },
  heroIcon: { fontSize: 38 },
  heroTitleBlock: { flex: 1 },
  heroFullbodyFrame: {
    width: 104,
    height: 158,
    borderRadius: mobileTheme.radius.md,
    overflow: "hidden",
    backgroundColor: "rgba(7,12,19,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroFullbodyImage: {
    width: "100%",
    height: "100%",
  },
  heroName: { color: mobileTheme.colors.text, fontSize: 24, fontWeight: "900" },
  heroRole: {
    color: mobileTheme.colors.accent,
    fontWeight: "800",
    marginTop: 2,
  },
  heroDescription: { color: mobileTheme.colors.muted, lineHeight: 20 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(246,196,83,0.12)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.22)",
  },
  resourceBlock: { gap: 6, marginTop: 2 },
  resourceLabel: {
    color: mobileTheme.colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  barTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: mobileTheme.colors.accent,
  },
  barDanger: { backgroundColor: mobileTheme.colors.danger },
  barMana: { backgroundColor: "#8b5cf6" },
  barXp: { backgroundColor: "#22c55e" },
  section: {
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.panel,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    gap: mobileTheme.spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.sm,
  },
  sectionTitle: {
    color: mobileTheme.colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  smallAccentButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.colors.accent,
  },
  smallAccentButtonText: {
    color: "#211405",
    fontWeight: "900",
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    textAlign: "center",
  },
  skillCard: {
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    gap: 3,
  },
  skillName: {
    color: mobileTheme.colors.text,
    fontWeight: "900",
    lineHeight: 17,
    includeFontPadding: false,
  },
  skillMeta: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    includeFontPadding: false,
  },
  line: { color: mobileTheme.colors.muted, lineHeight: 19 },
  mutedLine: {
    color: mobileTheme.colors.muted,
    fontStyle: "italic",
    lineHeight: 19,
  },
  progressPanel: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(246,196,83,0.08)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.20)",
    gap: mobileTheme.spacing.sm,
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: mobileTheme.spacing.sm,
  },
  progressGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  progressTile: {
    flexGrow: 1,
    minWidth: "22%",
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(0,0,0,0.20)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  progressTileWide: {
    flexGrow: 1,
    flexBasis: "44%",
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(0,0,0,0.20)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  progressTileLabel: {
    color: mobileTheme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  progressTileValue: {
    color: mobileTheme.colors.accent,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
    includeFontPadding: false,
  },
  progressTileText: {
    color: mobileTheme.colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  sectionCompact: {
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.panel,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    gap: mobileTheme.spacing.sm,
  },
  statsGridCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  equipmentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  equipmentCard: {
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: 138,
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    gap: 5,
  },
  equipmentCardCorrupted: {
    backgroundColor: "rgba(168,85,247,0.10)",
    borderColor: "rgba(168,85,247,0.25)",
  },
  equipmentTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  equipmentIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    textAlign: "center",
    textAlignVertical: "center",
    color: mobileTheme.colors.accent,
    backgroundColor: "rgba(246,196,83,0.10)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.18)",
    fontSize: 16,
    fontWeight: "900",
  },
  equipmentNameBlock: { flex: 1 },
  equipmentSlot: {
    color: mobileTheme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  equipmentName: {
    color: mobileTheme.colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    includeFontPadding: false,
  },
  equipmentTone: {
    alignSelf: "flex-start",
    color: mobileTheme.colors.accent,
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(246,196,83,0.10)",
  },
  equipmentToneCorrupted: {
    color: "#d8b4fe",
    backgroundColor: "rgba(168,85,247,0.16)",
  },
  equipmentBonus: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    lineHeight: 15,
  },
  equipmentBonusMuted: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    fontStyle: "italic",
  },
  masterySmallText: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
  },
  effectPreviewRow: {
    gap: 3,
  },
  effectPreview: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },

  masteryHeader: {
    gap: 6,
    marginBottom: 4,
  },
  masteryHeaderBlock: {
    gap: 4,
  },
  masteryStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  masteryPill: {
    minWidth: 112,
    alignItems: "flex-start",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(246,196,83,0.12)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.30)",
  },
  masteryPillHalf: {
    flexGrow: 1,
    flexBasis: 140,
    maxWidth: "100%",
  },
  masteryPillLabel: {
    color: mobileTheme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    textAlign: "center",
  },
  masteryPillValue: {
    color: mobileTheme.colors.accent,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "900",
    includeFontPadding: false,
  },
  masteryPillSub: {
    color: mobileTheme.colors.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  legendText: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    fontWeight: "800",
  },

  talentBranch: {
    gap: mobileTheme.spacing.sm,
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  talentBranchTitle: {
    color: mobileTheme.colors.accent,
    fontWeight: "900",
    fontSize: 14,
  },
  talentBranchMeta: {
    color: mobileTheme.colors.muted,
    fontWeight: "700",
    fontSize: 11,
    flexShrink: 1,
    textAlign: "right",
  },

  talentPathRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: mobileTheme.spacing.sm,
  },
  talentPathItem: {
    flex: 1,
    alignItems: "center",
    position: "relative",
    gap: 3,
  },
  talentIconButton: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.24)",
  },
  talentIconButtonUnlocked: {
    borderColor: "rgba(246,196,83,0.46)",
    backgroundColor: "rgba(246,196,83,0.14)",
  },
  talentIconButtonAvailable: {
    borderColor: "rgba(103,232,249,0.40)",
    backgroundColor: "rgba(103,232,249,0.10)",
  },
  talentIconButtonLocked: {
    opacity: 0.48,
  },
  talentIconButtonSelected: {
    borderColor: "rgba(255,255,255,0.70)",
  },
  talentLink: {
    position: "absolute",
    top: 28,
    right: -18,
    width: 28,
    height: 1,
    backgroundColor: "rgba(246,196,83,0.22)",
  },

  talentNodes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  talentNode: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 92,
    minHeight: 92,
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.18)",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  talentNodeUnlocked: {
    borderColor: "rgba(246,196,83,0.35)",
    backgroundColor: "rgba(246,196,83,0.10)",
  },
  talentNodeSelected: {
    borderColor: "rgba(103,232,249,0.58)",
    backgroundColor: "rgba(103,232,249,0.10)",
  },
  talentNodeLocked: {
    opacity: 0.62,
  },
  talentNodeIcon: {
    color: mobileTheme.colors.muted,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
    includeFontPadding: false,
  },
  talentNodeName: {
    color: mobileTheme.colors.muted,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
    includeFontPadding: false,
  },
  talentNodeNameUnlocked: {
    color: mobileTheme.colors.accent,
  },
  talentNodeHint: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
    textAlign: "center",
  },
  talentDetail: {
    width: "100%",
    marginTop: 6,
    gap: 6,
  },
  talentDetailText: {
    color: mobileTheme.colors.muted,
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
  },
  talentStateText: {
    color: mobileTheme.colors.accent,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  validateTalentButton: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: mobileTheme.colors.accent,
  },
  validateTalentButtonText: {
    color: "#211405",
    fontSize: 11,
    fontWeight: "900",
  },

  validateTalentButtonDisabled: {
    opacity: 0.45,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.62)",
    alignItems: "center",
    justifyContent: "center",
    padding: mobileTheme.spacing.lg,
  },
  talentModal: {
    width: "100%",
    maxWidth: 420,
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: "rgba(17,24,39,0.98)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.28)",
    gap: mobileTheme.spacing.sm,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalBranch: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  modalCloseText: {
    color: mobileTheme.colors.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  modalNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing.sm,
  },
  modalTalentIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    textAlign: "center",
    textAlignVertical: "center",
    color: mobileTheme.colors.accent,
    fontSize: 26,
    fontWeight: "900",
    backgroundColor: "rgba(246,196,83,0.12)",
    borderWidth: 1,
    borderColor: "rgba(246,196,83,0.26)",
  },
  modalNameBlock: { flex: 1 },
  modalTalentName: {
    color: mobileTheme.colors.text,
    fontSize: 21,
    fontWeight: "900",
  },
  modalTalentHint: {
    color: mobileTheme.colors.muted,
    lineHeight: 18,
  },
  modalInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing.sm,
  },
  modalInfoBox: {
    flex: 1,
    minWidth: "30%",
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  modalInfoBoxWide: {
    flex: 1,
    minWidth: "100%",
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
  },
  modalInfoLabel: {
    color: mobileTheme.colors.accent,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  modalInfoText: {
    color: mobileTheme.colors.text,
    fontWeight: "800",
    marginTop: 3,
  },
  modalLineTitle: {
    color: mobileTheme.colors.accent,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2,
  },
  modalLine: {
    color: mobileTheme.colors.muted,
    lineHeight: 19,
  },
  modalValidated: {
    color: mobileTheme.colors.accent,
    fontWeight: "900",
    textAlign: "center",
    paddingVertical: 8,
  },

  emptyText: { color: mobileTheme.colors.muted, fontStyle: "italic" },
});
