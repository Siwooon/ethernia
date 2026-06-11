
import { TraitEffect } from "@/app/component/types/game";

export const TRAITS = {
  blessing_vigor: (): TraitEffect => ({
    id: "blessing_vigor",
    name: "Vigueur bénie",
    description: "+10 PV max.",
    category: "blessing",
    trigger: "stats",
    modifiers: { maxHp: 10 },
  }),

  blessing_focus: (): TraitEffect => ({
    id: "blessing_focus",
    name: "Esprit clair",
    description: "+8 Mana max.",
    category: "blessing",
    trigger: "stats",
    modifiers: { maxMana: 8 },
  }),

  blessing_power: (): TraitEffect => ({
    id: "blessing_power",
    name: "Puissance sacrée",
    description: "+2 Force.",
    category: "blessing",
    trigger: "stats",
    modifiers: { strength: 2 },
  }),

  curse_frailty: (): TraitEffect => ({
    id: "curse_frailty",
    name: "Fragilité",
    description: "-2 Défense.",
    category: "curse",
    trigger: "stats",
    modifiers: { defense: -2 },
  }),

  curse_withered_mind: (): TraitEffect => ({
    id: "curse_withered_mind",
    name: "Esprit flétri",
    description: "-2 Magie.",
    category: "curse",
    trigger: "stats",
    modifiers: { magic: -2 },
  }),

  passive_thorns: (): TraitEffect => ({
    id: "thorns",
    name: "Peau d'épines",
    description: "Quand vous êtes frappé, l'attaquant subit 3 dégâts.",
    category: "passive",
    trigger: "on_damaged",
    value: 3,
  }),

  passive_regen: (): TraitEffect => ({
    id: "regen_turn",
    name: "Régénération",
    description: "Récupère 4 PV au début du tour.",
    category: "passive",
    trigger: "turn_start",
    value: 4,
  }),

  passive_mana_shield: (): TraitEffect => ({
    id: "mana_shield",
    name: "Bouclier arcanique",
    description: "Convertit 2 mana en protection à l'impact.",
    category: "passive",
    trigger: "on_damaged",
    value: 2,
  }),
};