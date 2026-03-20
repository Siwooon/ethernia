"use client";

import { getEquipmentBonuses } from "@/app/component/lib/equipment";
import { getDerivedPlayerStats } from "@/app/component/lib/playerStats";
import { InventoryItem, Player } from "@/app/component/types/game";
import { AnimatePresence, motion } from "framer-motion";

type PanelTab = "stats" | "inventory" | "equipment" | "passives";

type Props = {
  player: Player | undefined;
  activeTab: PanelTab | null;
  onUseItem: (itemId: string) => void;
  onEquipItem: (itemId: string) => void;
  onUnequipSlot: (slot: "weapon" | "armor" | "relic") => void;
};

export default function CharacterPanel({
  player,
  activeTab,
  onUseItem,
  onEquipItem,
  onUnequipSlot,
}: Props) {
  if (!player || !activeTab) return null;
  const formatEffects = (
    effects?: {
      healHp?: number;
      healMana?: number;
      strength?: number;
      magic?: number;
      defense?: number;
      maxHp?: number;
      maxMana?: number;
    }
  ) => {
    if (!effects) return [];

    const lines: string[] = [];
    if (effects.strength) lines.push(`Force ${effects.strength > 0 ? "+" : ""}${effects.strength}`);
    if (effects.magic) lines.push(`Magie ${effects.magic > 0 ? "+" : ""}${effects.magic}`);
    if (effects.defense) lines.push(`Défense ${effects.defense > 0 ? "+" : ""}${effects.defense}`);
    if (effects.maxHp) lines.push(`PV max ${effects.maxHp > 0 ? "+" : ""}${effects.maxHp}`);
    if (effects.maxMana) lines.push(`Mana max ${effects.maxMana > 0 ? "+" : ""}${effects.maxMana}`);
    return lines;
  };
    const formatPassiveTrigger = (trigger: Player["passives"][number]["trigger"]) => {
    switch (trigger) {
      case "combat_start":
        return "Début de combat";
      case "combat_end":
        return "Fin de combat";
      case "turn_start":
        return "Début de tour";
      case "turn_end":
        return "Fin de tour";
      case "before_attack":
        return "Avant attaque";
      case "after_attack":
        return "Après attaque";
      case "before_take_damage":
        return "Avant dégâts reçus";
      case "after_take_damage":
        return "Après dégâts reçus";
      case "map_enter_node":
        return "Entrée sur une case";
      case "map_end_turn":
        return "Fin de tour carte";
      default:
        return trigger;
    }
  };

  const renderEquippedItemCard = (
    title: string,
    item: Player["equipment"]["weapon"] | Player["equipment"]["armor"] | Player["equipment"]["relic"],
    slot: "weapon" | "armor" | "relic"
  ) => {
    const bonusLines = formatEffects(item?.effects);
    const curseLines = formatEffects(item?.curseEffects);

    return (
      <div
        className={`rounded p-2 border ${
          item?.corrupted
            ? "bg-red-950/35 border-red-700"
            : "bg-[#1b0a3d]/80 border-violet-900"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs text-gray-300">{title}</div>
            <div className="text-sm text-violet-100 font-bold">
              {item ? item.name : "Aucune"}
            </div>
          </div>

          {item && (
            <button
              onClick={() => onUnequipSlot(slot)}
              className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-400 text-white"
            >
              Retirer
            </button>
          )}
        </div>

        {item && (
          <div className="mt-2 space-y-1">
            {item.corrupted && (
              <div className="text-[11px] text-red-300 font-bold uppercase">
                Objet corrompu
              </div>
            )}

            {bonusLines.length > 0 && (
              <div className="text-xs text-emerald-300">
                {bonusLines.join(" • ")}
              </div>
            )}

            {curseLines.length > 0 && (
              <div className="text-xs text-red-400">
                {curseLines.join(" • ")}
              </div>
            )}

            <div className="text-[11px] text-gray-400">{item.description}</div>
          </div>
        )}
      </div>
    );
  };

  const renderPassivesPanel = () => {
    return (
      <div className="mt-3 bg-[#1b0a3d]/80 rounded p-3 border border-amber-700/60">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-bold text-amber-200">Passifs</div>
          <div className="text-[11px] text-amber-400">
            {player.passives?.length || 0}
          </div>
        </div>

        {!player.passives || player.passives.length === 0 ? (
          <div className="text-xs text-gray-400 italic">
            Aucun passif pour le moment.
          </div>
        ) : (
          <div className="space-y-2">
            {player.passives.map((passive) => (
              <div
                key={passive.id}
                className="rounded border border-amber-800 bg-amber-950/20 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-amber-100">
                    ✨ {passive.name}
                  </div>

                  <div className="text-[10px] uppercase text-amber-400 text-right">
                    {formatPassiveTrigger(passive.trigger)}
                  </div>
                </div>

                <div className="text-xs text-amber-50/90 mt-1">
                  {passive.description}
                </div>

                {(passive.value !== undefined || passive.oncePerCombat || passive.chance !== undefined) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {passive.value !== undefined && (
                      <div className="text-[10px] px-2 py-1 rounded bg-black/30 border border-amber-900 text-amber-300">
                        Valeur : {passive.value}
                      </div>
                    )}

                    {passive.oncePerCombat && (
                      <div className="text-[10px] px-2 py-1 rounded bg-black/30 border border-amber-900 text-amber-300">
                        1 fois / combat
                      </div>
                    )}

                    {passive.chance !== undefined && (
                      <div className="text-[10px] px-2 py-1 rounded bg-black/30 border border-amber-900 text-amber-300">
                        Chance : {Math.round(passive.chance * 100)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  const effectiveStats = getDerivedPlayerStats(player);
  const equipmentBonuses = getEquipmentBonuses(player);

  const xpPercent = (player.xp / player.xpToNextLevel) * 100;
  const hpPercent = (effectiveStats.hp / effectiveStats.maxHp) * 100;
  const manaPercent = (effectiveStats.mana / effectiveStats.maxMana) * 100;

  const renderInventoryActions = (item: InventoryItem) => {
    if (item.type === "consumable") {
      return (
        <button
          onClick={() => onUseItem(item.id)}
          className="mt-2 px-2 py-1 text-xs rounded bg-emerald-700 hover:bg-emerald-600 border border-emerald-400 text-white"
        >
          Utiliser
        </button>
      );
    }

    if (item.type === "equipment" && item.slot) {
      const equippedItem = player.equipment[item.slot];
      const alreadyEquipped = equippedItem?.name === item.name;

      return (
        <button
          onClick={() => onEquipItem(item.id)}
          disabled={alreadyEquipped}
          className="mt-2 px-2 py-1 text-xs rounded bg-violet-700 hover:bg-violet-600 border border-violet-400 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {alreadyEquipped ? "Équipé" : "Équiper"}
        </button>
      );
    }

    return null;
  };

    return (
    <AnimatePresence>
      {activeTab && (
        <motion.div
          initial={{ x: -30, opacity: 0, scale: 0.98 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: -30, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="absolute top-24 left-20 z-40 w-[360px] bg-black/90 border border-violet-700 rounded-xl p-4 shadow-[0_0_20px_rgba(168,117,255,0.25)] backdrop-blur-sm"
        >
          {activeTab === "stats" && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={player.portrait}
                  alt={player.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-violet-500"
                />
                <div>
                  <div className="text-xl font-fantasy text-violet-100">{player.name}</div>
                  <div className="text-sm text-violet-300 font-rpg">
                    {player.classType} — Niveau {player.level}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-red-200 mb-1">
                    <span>Vie</span>
                    <span>{effectiveStats.hp}/{effectiveStats.maxHp}</span>
                  </div>
                  <div className="h-2 bg-black/60 rounded overflow-hidden border border-red-900">
                    <div
                      className="h-full bg-red-500 transition-all duration-300"
                      style={{ width: `${hpPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-blue-200 mb-1">
                    <span>Mana</span>
                    <span>{effectiveStats.mana}/{effectiveStats.maxMana}</span>
                  </div>
                  <div className="h-2 bg-black/60 rounded overflow-hidden border border-blue-900">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${manaPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-violet-200 mb-1">
                    <span>Expérience</span>
                    <span>{player.xp}/{player.xpToNextLevel}</span>
                  </div>
                  <div className="h-2 bg-black/60 rounded overflow-hidden border border-violet-900">
                    <div
                      className="h-full bg-violet-500 transition-all duration-300"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="bg-[#1b0a3d]/80 rounded p-2 border border-violet-900">
                  <span className="text-gray-300">Force</span>
                  <div className="text-violet-100 font-bold">{effectiveStats.strength}</div>
                </div>
                <div className="bg-[#1b0a3d]/80 rounded p-2 border border-violet-900">
                  <span className="text-gray-300">Magie</span>
                  <div className="text-violet-100 font-bold">{effectiveStats.magic}</div>
                </div>
                <div className="bg-[#1b0a3d]/80 rounded p-2 border border-violet-900">
                  <span className="text-gray-300">Défense</span>
                  <div className="text-violet-100 font-bold">{effectiveStats.defense}</div>
                </div>
                <div className="bg-[#1b0a3d]/80 rounded p-2 border border-violet-900">
                  <span className="text-gray-300">Vitesse</span>
                  <div className="text-violet-100 font-bold">{effectiveStats.speed}</div>
                </div>
              </div>
              {player.mapEffects.length > 0 && (
                <div className="mt-3 bg-[#1b0a3d]/80 rounded p-3 border border-violet-900">
                  <div className="text-xs text-gray-300 mb-2">Effets persistants</div>

                  <div className="flex flex-wrap gap-2">
                    {player.mapEffects.map((effect, idx) => (
                      <div
                        key={`${effect.type}-${idx}`}
                        className={`text-[11px] px-2 py-1 rounded-md border font-semibold ${
                          effect.type === "wound" || effect.type === "infection"
                            ? "bg-red-950/40 border-red-700 text-red-200"
                            : "bg-emerald-950/40 border-emerald-700 text-emerald-200"
                        }`}
                      >
                        {effect.type === "wound" && `🩸 Blessure Profonde`}
                        {effect.type === "infection" && `☣️ Infection`}
                        {effect.type === "blessing" && `✨ Bénédiction (${effect.duration})`}
                        {effect.type === "protection" && `🛡️ Protection (${effect.duration})`}
                        {effect.type === "fatigue" && `😵 Fatigue (${effect.duration})`}
                        {effect.type === "hex" && `🔮 Malédiction (${effect.duration})`}
                        {effect.type === "corruption_mark" && `☠️ Marque corruptrice (${effect.duration})`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-3 bg-[#1b0a3d]/80 rounded p-2 border border-violet-900">
                <div className="text-xs text-gray-300 mb-1">Bonus d’équipement</div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div>Force : <span className="text-red-400 font-bold">+{equipmentBonuses.strength}</span></div>
                  <div>Magie : <span className="text-cyan-300 font-bold">+{equipmentBonuses.magic}</span></div>
                  <div>Défense : <span className="text-yellow-300 font-bold">+{equipmentBonuses.defense}</span></div>
                  <div>Vie max : <span className="text-green-400 font-bold">+{equipmentBonuses.maxHp}</span></div>
                  <div>Mana max : <span className="text-blue-400 font-bold">+{equipmentBonuses.maxMana}</span></div>
                  
                </div>
              </div>

              {renderPassivesPanel()}
            </>
          )}

          {activeTab === "equipment" && (
            <>
              <div className="text-xl font-fantasy text-violet-100 mb-4">Équipement</div>

              <div className="space-y-2">
                {renderEquippedItemCard("Arme", player.equipment.weapon, "weapon")}
                {renderEquippedItemCard("Armure", player.equipment.armor, "armor")}
                {renderEquippedItemCard("Relique", player.equipment.relic, "relic")}
              </div>

              <div className="mt-3 bg-[#1b0a3d]/80 rounded p-2 border border-violet-900">
                <div className="text-xs text-gray-300 mb-1">Bonus d’équipement</div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div>
                    Force : <span className="text-red-400 font-bold">
                      {equipmentBonuses.strength >= 0 ? "+" : ""}{equipmentBonuses.strength}
                    </span>
                  </div>
                  <div>
                    Magie : <span className="text-cyan-300 font-bold">
                      {equipmentBonuses.magic >= 0 ? "+" : ""}{equipmentBonuses.magic}
                    </span>
                  </div>
                  <div>
                    Défense : <span className="text-yellow-300 font-bold">
                      {equipmentBonuses.defense >= 0 ? "+" : ""}{equipmentBonuses.defense}
                    </span>
                  </div>
                  <div>
                    Vie max : <span className="text-green-400 font-bold">
                      {equipmentBonuses.maxHp >= 0 ? "+" : ""}{equipmentBonuses.maxHp}
                    </span>
                  </div>
                  <div>
                    Mana max : <span className="text-blue-400 font-bold">
                      {equipmentBonuses.maxMana >= 0 ? "+" : ""}{equipmentBonuses.maxMana}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "inventory" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xl font-fantasy text-violet-100">Inventaire</div>
                <div className="text-sm font-bold text-yellow-300">🪙 {player.gold}</div>
              </div>

              <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                {player.inventory.length === 0 ? (
                  <div className="text-xs text-gray-400 italic">Inventaire vide</div>
                ) : (
                  player.inventory.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#1b0a3d]/80 rounded p-2 border border-violet-900"
                    >
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-violet-100 font-bold">{item.name}</div>
                        <div className="text-xs text-violet-300">x{item.quantity}</div>
                      </div>
                      <div className="text-xs text-gray-300 mt-1">{item.description}</div>
                      {item.type === "equipment" && item.slot && (
                        <div className="text-[11px] text-amber-300 mt-1 uppercase">
                          Slot : {item.slot}
                        </div>
                      )}
                      {item.corrupted && (
                        <div className="text-[11px] text-red-300 mt-1 uppercase font-bold">
                          Corrompu
                        </div>
                      )}
                      {item.curseEffects && (
                        <div className="text-[11px] text-red-400 mt-1">
                          {formatEffects(item.curseEffects).join(" • ")}
                        </div>
                      )}
                      {renderInventoryActions(item)}
                    </div>
                  ))
                )}
              </div>
            </>
            
          )}
          
        </motion.div>
      )}
    </AnimatePresence>
  );
}