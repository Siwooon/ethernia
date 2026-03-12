"use client";

import { getEffectiveStats, getEquipmentBonuses } from "@/app/component/lib/equipment";
import { InventoryItem, Player } from "@/app/component/types/game";
import { AnimatePresence, motion } from "framer-motion";

type PanelTab = "stats" | "inventory" | "equipment";

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

  const effectiveStats = getEffectiveStats(player);
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
                  <span className="text-gray-300">État</span>
                  <div className={`font-bold ${player.isDead ? "text-red-500" : "text-green-400"}`}>
                    {player.isDead ? "Mort" : "Vivant"}
                  </div>
                </div>
              </div>

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
            </>
          )}

          {activeTab === "equipment" && (
            <>
              <div className="text-xl font-fantasy text-violet-100 mb-4">Équipement</div>

              <div className="space-y-2">
                <div className="bg-[#1b0a3d]/80 rounded p-2 border border-violet-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-300">Arme</div>
                      <div className="text-sm text-violet-100 font-bold">
                        {player.equipment.weapon ? player.equipment.weapon.name : "Aucune"}
                      </div>
                    </div>
                    {player.equipment.weapon && (
                      <button
                        onClick={() => onUnequipSlot("weapon")}
                        className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-400 text-white"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-[#1b0a3d]/80 rounded p-2 border border-violet-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-300">Armure</div>
                      <div className="text-sm text-violet-100 font-bold">
                        {player.equipment.armor ? player.equipment.armor.name : "Aucune"}
                      </div>
                    </div>
                    {player.equipment.armor && (
                      <button
                        onClick={() => onUnequipSlot("armor")}
                        className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-400 text-white"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-[#1b0a3d]/80 rounded p-2 border border-violet-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-300">Relique</div>
                      <div className="text-sm text-violet-100 font-bold">
                        {player.equipment.relic ? player.equipment.relic.name : "Aucune"}
                      </div>
                    </div>
                    {player.equipment.relic && (
                      <button
                        onClick={() => onUnequipSlot("relic")}
                        className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 border border-gray-400 text-white"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                </div>
              </div>

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