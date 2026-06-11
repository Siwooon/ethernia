import { ClassType, LevelUpChoiceId, PlayerBuildChoice } from "@/shared/types/game";

export type TalentRole = "Défense" | "Dégâts" | "Soutien" | "Contrôle" | "Survie" | "Rythme" | "Risque";

export type TalentNode = {
  id: string;
  label: string;
  icon: string;
  hint: string;
  effect: string;
  change: string;
  technical?: string;
  milestone?: string;
  role?: TalentRole;
  tier?: number;
  choiceId: LevelUpChoiceId;
  cost: number;
  requiredLevel: number;
  requiresNodeId?: string;
};

export type TalentBranch = {
  id: string;
  label: string;
  summary: string;
  nodes: TalentNode[];
};

const commonTalents = {
  vitalite: {
    id: "ancrage",
    label: "Ancrage",
    icon: "✚",
    hint: "Augmente les PV max.",
    effect: "+14 PV max, +1 Défense.",
    change: "Le héros encaisse mieux les combats longs.",
    choiceId: "vitalite" as const,
    cost: 1,
    requiredLevel: 2,
  },
  tempo: {
    id: "elan",
    label: "Élan",
    icon: "➶",
    hint: "Augmente la Vitesse.",
    effect: "+Vitesse.",
    change: "Le héros agit plus tôt dans l’ordre des tours.",
    choiceId: "tempo" as const,
    cost: 1,
    requiredLevel: 3,
  },
  puissance: {
    id: "ferveur",
    label: "Ferveur",
    icon: "✦",
    hint: "Augmente la Force.",
    effect: "+Force.",
    change: "Les attaques physiques infligent plus de dégâts.",
    choiceId: "puissance" as const,
    cost: 1,
    requiredLevel: 4,
  },
  arcane: {
    id: "reserve",
    label: "Réserve",
    icon: "◌",
    hint: "Augmente Mana et Magie.",
    effect: "+Mana et +Magie.",
    change: "Le héros lance plus de compétences avant d’être à court de mana.",
    choiceId: "arcane" as const,
    cost: 1,
    requiredLevel: 4,
  },
};

const BASE_CLASS_TALENT_TREES: Record<ClassType, TalentBranch[]> = {
  Guerrier: [
    {
      id: "rempart",
      label: "Rempart",
      summary: "Survivre et protéger.",
      nodes: [
        { ...commonTalents.vitalite, id: "ancrage" },
        {
          id: "mur",
          label: "Mur",
          icon: "▣",
          hint: "La garde se ferme.",
          effect: "+PV, +Défense.",
          change: "Défendre laisse le héros plus solide.",
          choiceId: "warrior_garde",
          cost: 1,
          requiredLevel: 3,
          requiresNodeId: "ancrage",
        },
      ],
    },
    {
      id: "riposte",
      label: "Riposte",
      summary: "Riposter après une défense.",
      nodes: [
        { ...commonTalents.puissance, id: "ferveur", requiredLevel: 2 },
        {
          id: "contre",
          label: "Contre",
          icon: "⚔",
          hint: "La riposte frappe plus fort.",
          effect: "+Force, +Défense.",
          change: "La riposte et les attaques physiques infligent plus de dégâts.",
          choiceId: "warrior_riposte",
          cost: 1,
          requiredLevel: 4,
          requiresNodeId: "ferveur",
        },
      ],
    },
    {
      id: "banniere",
      label: "Bannière",
      summary: "Donner des boucliers à l’équipe.",
      nodes: [
        { ...commonTalents.tempo, id: "appel", label: "Appel", icon: "⚑", requiredLevel: 3 },
        {
          id: "ligne",
          label: "Ligne",
          icon: "◆",
          hint: "Défendre protège aussi les alliés.",
          effect: "+Défense.",
          change: "Défendre donne un bouclier à toute l’équipe.",
          choiceId: "warrior_commandement",
          cost: 1,
          requiredLevel: 5,
          requiresNodeId: "appel",
        },
      ],
    },
  ],
  Mage: [
    {
      id: "braise",
      label: "Braises",
      summary: "Augmenter les dégâts de sort.",
      nodes: [
        { ...commonTalents.arcane, id: "reserve", requiredLevel: 2 },
        {
          id: "braise",
          label: "Braise",
          icon: "✹",
          hint: "Les sorts peuvent appliquer Brûlure.",
          effect: "+Magie.",
          change: "Les sorts ajoutent des dégâts de Brûlure pendant plusieurs tours.",
          choiceId: "mage_feu",
          cost: 1,
          requiredLevel: 3,
          requiresNodeId: "reserve",
        },
      ],
    },
    {
      id: "voile",
      label: "Voile",
      summary: "Punir les cibles avec malus.",
      nodes: [
        { ...commonTalents.tempo, id: "lecture", label: "Lecture", icon: "◇", requiredLevel: 3 },
        {
          id: "voile",
          label: "Voile",
          icon: "☽",
          hint: "Les cibles avec un effet négatif subissent plus de dégâts magiques.",
          effect: "+Mana.",
          change: "Les sorts infligent plus de dégâts aux cibles avec un malus.",
          choiceId: "mage_voile",
          cost: 1,
          requiredLevel: 4,
          requiresNodeId: "lecture",
        },
      ],
    },
    {
      id: "surcharge",
      label: "Surcharge",
      summary: "Charger un gros sort.",
      nodes: [
        { ...commonTalents.puissance, id: "tension", label: "Tension", icon: "✦", requiredLevel: 3 },
        {
          id: "charge",
          label: "Charge",
          icon: "✧",
          hint: "La Surcharge augmente les dégâts du prochain sort.",
          effect: "+Magie, +Vitesse.",
          change: "Quand la Surcharge est pleine, le prochain sort frappe plus fort.",
          choiceId: "mage_surcharge",
          cost: 1,
          requiredLevel: 5,
          requiresNodeId: "tension",
        },
      ],
    },
  ],
  Archer: [
    {
      id: "trace",
      label: "Trace",
      summary: "Augmenter les dégâts sur cible marquée.",
      nodes: [
        { ...commonTalents.tempo, id: "oeil", label: "Œil", icon: "◉", requiredLevel: 2 },
        {
          id: "trace",
          label: "Trace",
          icon: "⌖",
          hint: "La Marque dure plus longtemps.",
          effect: "+Vitesse.",
          change: "La cible marquée reste vulnérable plus longtemps.",
          choiceId: "archer_marque",
          cost: 1,
          requiredLevel: 3,
          requiresNodeId: "oeil",
        },
      ],
    },
    {
      id: "trait",
      label: "Trait",
      summary: "Achever les ennemis blessés.",
      nodes: [
        { ...commonTalents.puissance, id: "corde", label: "Corde", icon: "➴", requiredLevel: 3 },
        {
          id: "finir",
          label: "Finir",
          icon: "✷",
          hint: "Les ennemis blessés prennent plus de dégâts.",
          effect: "+Force.",
          change: "Les attaques finissent mieux les ennemis à bas PV.",
          choiceId: "archer_execution",
          cost: 1,
          requiredLevel: 4,
          requiresNodeId: "corde",
        },
      ],
    },
    {
      id: "piste",
      label: "Piste",
      summary: "Agir plus vite et profiter des marques.",
      nodes: [
        { ...commonTalents.vitalite, id: "souffle", label: "Souffle", icon: "≋", requiredLevel: 3 },
        {
          id: "piste",
          label: "Piste",
          icon: "➶",
          hint: "Exploiter une Marque ajoute un bonus de dégâts.",
          effect: "+Force, +Vitesse.",
          change: "Attaquer une cible marquée ajoute des dégâts fixes.",
          choiceId: "archer_piste",
          cost: 1,
          requiredLevel: 5,
          requiresNodeId: "souffle",
        },
      ],
    },
  ],
  Voleur: [
    {
      id: "chaine",
      label: "Chaîne",
      summary: "Enchaîner sans bruit.",
      nodes: [
        { ...commonTalents.tempo, id: "main", label: "Main vive", icon: "✧", requiredLevel: 2 },
        {
          id: "chaine",
          label: "Chaîne",
          icon: "⛓",
          hint: "Le troisième coup de combo frappe plus fort.",
          effect: "+Force, +Vitesse.",
          change: "Les combos finaux frappent plus fort.",
          choiceId: "rogue_combo",
          cost: 1,
          requiredLevel: 3,
          requiresNodeId: "main",
        },
      ],
    },
    {
      id: "ombre",
      label: "Ombre",
      summary: "Frapper le premier.",
      nodes: [
        { ...commonTalents.puissance, id: "lame", label: "Lame", icon: "†", requiredLevel: 3 },
        {
          id: "ombre",
          label: "Ombre",
          icon: "☾",
          hint: "Le premier coup sur une cible neuve gagne des dégâts.",
          effect: "+Vitesse.",
          change: "Le premier coup d'une cible démarre mieux.",
          choiceId: "rogue_ombre",
          cost: 1,
          requiredLevel: 4,
          requiresNodeId: "lame",
        },
      ],
    },
    {
      id: "butin",
      label: "Butin",
      summary: "Tirer parti du sac.",
      nodes: [
        { ...commonTalents.vitalite, id: "poche", label: "Poche sûre", icon: "◍", requiredLevel: 3 },
        {
          id: "butin",
          label: "Butin",
          icon: "◈",
          hint: "Les objets de combat rendent plus de rythme.",
          effect: "+Vitesse, +PV.",
          change: "Les objets de combat rendent mieux l'élan.",
          choiceId: "rogue_butin",
          cost: 1,
          requiredLevel: 5,
          requiresNodeId: "poche",
        },
      ],
    },
  ],
  Demoniste: [
    {
      id: "sang",
      label: "Sang",
      summary: "Payer moins cher.",
      nodes: [
        { ...commonTalents.arcane, id: "marque", label: "Marque", icon: "◌", requiredLevel: 2 },
        {
          id: "sang",
          label: "Sang",
          icon: "◆",
          hint: "Les pactes coûtent moins cher.",
          effect: "+Magie, -PV.",
          change: "Les pouvoirs de sang deviennent plus rentables.",
          choiceId: "warlock_sang",
          cost: 1,
          requiredLevel: 3,
          requiresNodeId: "marque",
        },
      ],
    },
    {
      id: "abime",
      label: "Abîme",
      summary: "Nourrir les altérations.",
      nodes: [
        { ...commonTalents.tempo, id: "appel", label: "Appel", icon: "☊", requiredLevel: 3 },
        {
          id: "abime",
          label: "Abîme",
          icon: "☗",
          hint: "Les cibles avec un effet négatif prennent plus de dégâts.",
          effect: "+Mana.",
          change: "Les cibles altérées nourrissent les dégâts.",
          choiceId: "warlock_abime",
          cost: 1,
          requiredLevel: 4,
          requiresNodeId: "appel",
        },
      ],
    },
    {
      id: "faim",
      label: "Faim",
      summary: "Rester dangereux blessé.",
      nodes: [
        { ...commonTalents.puissance, id: "morsure", label: "Morsure", icon: "☍", requiredLevel: 3 },
        {
          id: "faim",
          label: "Faim",
          icon: "✹",
          hint: "Sous la moitié des PV, les dégâts montent.",
          effect: "+Magie, -Défense.",
          change: "Le héros frappe plus fort quand il vacille.",
          choiceId: "warlock_faim",
          cost: 1,
          requiredLevel: 5,
          requiresNodeId: "morsure",
        },
      ],
    },
  ],
  Clerc: [
    {
      id: "foi",
      label: "Foi",
      summary: "Protéger les siens.",
      nodes: [
        { ...commonTalents.arcane, id: "priere", label: "Prière", icon: "✚", requiredLevel: 2 },
        {
          id: "foi",
          label: "Foi",
          icon: "✦",
          hint: "Les protections couvrent mieux l’équipe.",
          effect: "+Mana, +Magie.",
          change: "Les boucliers de foi couvrent mieux.",
          choiceId: "cleric_foi",
          cost: 1,
          requiredLevel: 3,
          requiresNodeId: "priere",
        },
      ],
    },
    {
      id: "sceau",
      label: "Sceau",
      summary: "Fermer la plaie.",
      nodes: [
        { ...commonTalents.vitalite, id: "ancre", label: "Ancre", icon: "▣", requiredLevel: 3 },
        {
          id: "sceau",
          label: "Sceau",
          icon: "◇",
          hint: "Défendre protège mieux l’allié fragile.",
          effect: "+Défense.",
          change: "Défendre protège mieux l'allié fragile.",
          choiceId: "cleric_sceau",
          cost: 1,
          requiredLevel: 4,
          requiresNodeId: "ancre",
        },
      ],
    },
    {
      id: "jugement",
      label: "Jugement",
      summary: "Punir le marqué.",
      nodes: [
        { ...commonTalents.puissance, id: "serment", label: "Serment", icon: "⚑", requiredLevel: 3 },
        {
          id: "jugement",
          label: "Jugement",
          icon: "✷",
          hint: "Les ennemis marqués prennent plus de dégâts.",
          effect: "+Magie.",
          change: "Les ennemis marqués subissent plus.",
          choiceId: "cleric_jugement",
          cost: 1,
          requiredLevel: 5,
          requiresNodeId: "serment",
        },
      ],
    },
  ],
  Sentinelle: [
    {
      id: "ancrage",
      label: "Ancrage",
      summary: "Stabiliser la ligne.",
      nodes: [
        { ...commonTalents.vitalite, id: "socle", label: "Socle", icon: "▣", requiredLevel: 2 },
        {
          id: "egide",
          label: "Égide",
          icon: "⛨",
          hint: "Les boucliers d’équipe sont renforcés.",
          effect: "+Défense, +PV.",
          change: "Les boucliers d'équipe gagnent en valeur.",
          choiceId: "sentinel_egide",
          cost: 1,
          requiredLevel: 4,
          requiresNodeId: "socle",
        },
      ],
    },
    {
      id: "faille",
      label: "Faille",
      summary: "Ouvrir l'ennemi.",
      nodes: [
        { ...commonTalents.arcane, id: "lecture", label: "Lecture", icon: "☽", requiredLevel: 2 },
        {
          id: "faille",
          label: "Faille",
          icon: "◇",
          hint: "Les cibles Vulnérables prennent plus de dégâts.",
          effect: "+Magie.",
          change: "Les cibles vulnérables subissent plus.",
          choiceId: "sentinel_faille",
          cost: 1,
          requiredLevel: 4,
          requiresNodeId: "lecture",
        },
      ],
    },
    {
      id: "pulsation",
      label: "Pulsation",
      summary: "Tenir le rythme.",
      nodes: [
        { ...commonTalents.tempo, id: "rythme", label: "Rythme", icon: "➶", requiredLevel: 3 },
        {
          id: "pulsation",
          label: "Pulsation",
          icon: "◉",
          hint: "Les sceaux reviennent plus vite.",
          effect: "+Vitesse, +Mana.",
          change: "Les sceaux reviennent plus vite.",
          choiceId: "sentinel_anchor_pulse",
          cost: 1,
          requiredLevel: 5,
          requiresNodeId: "rythme",
        },
      ],
    },
  ],
};

const TALENT_ROLE_DETAILS: Partial<Record<LevelUpChoiceId, TalentRole>> = {
  vitalite: "Survie",
  puissance: "Dégâts",
  arcane: "Soutien",
  tempo: "Rythme",
  garde: "Défense",
  purification: "Soutien",
  instinct: "Rythme",
  pacte: "Risque",
  warrior_garde: "Défense",
  warrior_riposte: "Dégâts",
  warrior_commandement: "Soutien",
  warrior_stalwart: "Défense",
  warrior_riposte_master: "Dégâts",
  warrior_battle_line: "Soutien",
  mage_feu: "Dégâts",
  mage_voile: "Contrôle",
  mage_surcharge: "Dégâts",
  mage_inferno: "Dégâts",
  mage_void_reading: "Contrôle",
  mage_overcharge: "Dégâts",
  archer_marque: "Contrôle",
  archer_execution: "Dégâts",
  archer_piste: "Rythme",
  archer_hunters_mark: "Contrôle",
  archer_finisher: "Dégâts",
  archer_momentum: "Rythme",
  rogue_combo: "Dégâts",
  rogue_ombre: "Rythme",
  rogue_butin: "Rythme",
  rogue_chain_finish: "Dégâts",
  rogue_first_shadow: "Rythme",
  rogue_quick_loot: "Soutien",
  warlock_sang: "Risque",
  warlock_abime: "Contrôle",
  warlock_faim: "Risque",
  warlock_blood_price: "Risque",
  warlock_black_tide: "Contrôle",
  warlock_last_hunger: "Risque",
  cleric_foi: "Soutien",
  cleric_sceau: "Défense",
  cleric_jugement: "Dégâts",
  cleric_wide_faith: "Soutien",
  cleric_guardian_seal: "Défense",
  cleric_sentence: "Contrôle",
  sentinel_ancrage: "Défense",
  sentinel_egide: "Défense",
  sentinel_faille: "Contrôle",
  sentinel_anchor_pulse: "Rythme",
  sentinel_veil_guard: "Soutien",
  sentinel_second_veil: "Contrôle",
  sentinel_anchor_relay: "Rythme",
};

const TALENT_TECHNICAL_DETAILS: Partial<Record<LevelUpChoiceId, string>> = {
  vitalite: "Bonus immédiat : +14 PV max et +1 Défense. Le héros récupère aussi une partie de ses PV.",
  puissance: "Bonus immédiat : +2 Force. Augmente les attaques physiques et les ripostes.",
  arcane: "Bonus immédiat : +8 Mana max et +1 Magie. Le héros récupère aussi une partie de son Mana.",
  tempo: "Bonus immédiat : +2 Vitesse. Le héros agit plus tôt dans l’ordre des tours.",
  warrior_garde: "Défendre donne un meilleur bouclier personnel. Utile si le Guerrier encaisse souvent les coups.",
  warrior_riposte: "Après Défendre, la prochaine riposte utilise plus de Force et frappe plus fort.",
  warrior_commandement: "Défendre donne aussi un petit bouclier à toute l’équipe.",
  warrior_stalwart: "Renforce encore le bouclier gagné avec Défendre et le rend plus durable.",
  warrior_riposte_master: "La riposte après Défendre devient un vrai coup fort.",
  warrior_battle_line: "Défendre protège toute l’équipe plus longtemps.",
  mage_feu: "Les sorts ajoutent des dégâts de Brûlure pendant quelques tours.",
  mage_voile: "Les sorts infligent plus de dégâts aux ennemis qui ont déjà un malus.",
  mage_surcharge: "Quand la Surcharge est pleine, le prochain sort gagne un bonus de dégâts plus élevé.",
  mage_inferno: "La Brûlure des sorts devient plus forte et dure plus longtemps.",
  mage_void_reading: "Les sorts frappent encore plus fort les ennemis avec un malus et peuvent appliquer Vulnérable.",
  mage_overcharge: "La Surcharge pleine donne un très gros bonus au prochain sort.",
  archer_marque: "Exploiter une Marque donne plus de dégâts.",
  archer_execution: "Les attaques infligent plus de dégâts aux ennemis déjà bas en PV.",
  archer_piste: "Attaquer une cible marquée ajoute aussi des dégâts fixes.",
  archer_hunters_mark: "La Marque dure plus longtemps et donne un meilleur bonus de dégâts.",
  archer_finisher: "Le bonus contre les ennemis blessés s’active plus tôt et frappe plus fort.",
  archer_momentum: "Exploiter une Marque ajoute un bonus de dégâts basé sur la Vitesse.",
  rogue_combo: "Le troisième coup de Combo inflige plus de dégâts.",
  rogue_ombre: "Le premier coup sur une nouvelle cible inflige plus de dégâts.",
  rogue_butin: "Les objets de combat donnent plus d’avantage au Voleur.",
  rogue_chain_finish: "Le troisième coup de Combo devient beaucoup plus fort.",
  rogue_first_shadow: "Le premier coup sur une nouvelle cible devient un vrai coup d’ouverture.",
  rogue_quick_loot: "Utiliser un objet de combat donne aussi Élan et Régénération.",
  warlock_sang: "Les pactes coûtent moins de PV pour un gain de dégâts plus sûr.",
  warlock_abime: "Les ennemis avec un malus prennent plus de dégâts du Démoniste.",
  warlock_faim: "Quand le Démoniste est sous 50% PV, ses dégâts augmentent.",
  warlock_blood_price: "Les pactes coûtent encore moins de PV.",
  warlock_black_tide: "Les ennemis avec un malus prennent plus de dégâts et peuvent recevoir Fragilité.",
  warlock_last_hunger: "Sous 40% PV, le Démoniste gagne un très gros bonus de dégâts.",
  cleric_foi: "Quand la jauge de Foi est pleine, l’équipe reçoit un bouclier.",
  cleric_sceau: "Défendre donne un bouclier à l’allié le plus fragile.",
  cleric_jugement: "Les ennemis marqués ou vulnérables prennent plus de dégâts magiques.",
  cleric_wide_faith: "La Foi pleine donne un bouclier d’équipe plus fort.",
  cleric_guardian_seal: "Défendre protège davantage l’allié le plus fragile et retire un malus.",
  cleric_sentence: "Jugement frappe plus fort les ennemis marqués et peut appliquer Vulnérable.",
  sentinel_ancrage: "Donne plus de Défense, Mana et Magie pour stabiliser le début de run.",
  sentinel_egide: "Les compétences qui donnent un bouclier d’équipe en donnent davantage.",
  sentinel_faille: "Les attaques hybrides infligent plus de dégâts aux ennemis Vulnérables.",
  sentinel_anchor_pulse: "La Sentinelle gagne de la Vitesse et peut agir plus souvent.",
  sentinel_veil_guard: "Les boucliers d’équipe de la Sentinelle deviennent plus forts.",
  sentinel_second_veil: "Les attaques majeures frappent plus fort les cibles Vulnérables ou Fragiles.",
  sentinel_anchor_relay: "Après avoir donné un bouclier d’équipe, la Sentinelle gagne un court bonus de rythme.",
};

const TALENT_MILESTONE_DETAILS: Partial<Record<LevelUpChoiceId, string>> = {
  warrior_stalwart: "Palier 3 · coût 2 : défense prolongée.",
  warrior_riposte_master: "Palier 3 · coût 2 : riposte majeure.",
  warrior_battle_line: "Palier 3 · coût 2 : protection d'équipe.",
  mage_inferno: "Palier 3 · coût 2 : dégâts de sort renforcés.",
  mage_void_reading: "Palier 3 · coût 2 : bonus contre altérations.",
  mage_overcharge: "Palier 3 · coût 2 : surcharge majeure.",
  archer_hunters_mark: "Palier 3 · coût 2 : marque longue.",
  archer_finisher: "Palier 3 · coût 2 : exécution plus tôt.",
  archer_momentum: "Palier 3 · coût 2 : bonus plat sur marque.",
  rogue_chain_finish: "Palier 3 · coût 2 : combo final majeur.",
  rogue_first_shadow: "Palier 3 · coût 2 : ouverture renforcée.",
  rogue_quick_loot: "Palier 3 · coût 2 : objets plus rentables.",
  warlock_blood_price: "Palier 3 · coût 2 : pacte moins coûteux.",
  warlock_black_tide: "Palier 3 · coût 2 : dégâts sur cible altérée.",
  warlock_last_hunger: "Palier 3 · coût 2 : puissance à bas PV.",
  cleric_wide_faith: "Palier 3 · coût 2 : foi d'équipe.",
  cleric_guardian_seal: "Palier 3 · coût 2 : protection ciblée.",
  cleric_sentence: "Palier 3 · coût 2 : jugement majeur.",
  sentinel_veil_guard: "Palier 3 · coût 2 : boucliers d'équipe renforcés.",
  sentinel_second_veil: "Palier 3 · coût 2 : sceau majeur contre cible altérée.",
  sentinel_anchor_relay: "Palier 3 · coût 2 : rythme d'ancre.",
};

const MILESTONE_NODES: Record<ClassType, Partial<Record<string, TalentNode>>> = {
  Guerrier: {
    rempart: { id: "bastion", label: "Bastion", icon: "▰", hint: "Le bouclier dure plus longtemps.", effect: "Bouclier plus haut et plus long.", change: "Mur protège mieux lors de Défendre.", choiceId: "warrior_stalwart", cost: 2, requiredLevel: 7, requiresNodeId: "mur", tier: 3 },
    riposte: { id: "acier-rendu", label: "Acier rendu", icon: "⚔", hint: "La riposte frappe plus fort.", effect: "Riposte majeure.", change: "La riposte inflige presque toute la Force.", choiceId: "warrior_riposte_master", cost: 2, requiredLevel: 7, requiresNodeId: "contre", tier: 3 },
    banniere: { id: "rang-or", label: "Rang d'or", icon: "⚑", hint: "Défendre protège toute l’équipe.", effect: "Bouclier d'équipe renforcé.", change: "Défendre protège mieux tous les alliés.", choiceId: "warrior_battle_line", cost: 2, requiredLevel: 7, requiresNodeId: "ligne", tier: 3 },
  },
  Mage: {
    braise: { id: "flamme-vive", label: "Flamme vive", icon: "✹", hint: "Brûlure et dégâts de sort augmentés.", effect: "Bonus de Magie renforcé.", change: "Les sorts gagnent plus de dégâts plats.", choiceId: "mage_inferno", cost: 2, requiredLevel: 7, requiresNodeId: "braise", tier: 3 },
    voile: { id: "lecture-noire", label: "Lecture noire", icon: "☽", hint: "Les altérations augmentent les dégâts magiques.", effect: "Bonus sur cible altérée.", change: "Les sorts punissent mieux les altérations.", choiceId: "mage_void_reading", cost: 2, requiredLevel: 7, requiresNodeId: "voile", tier: 3 },
    surcharge: { id: "orage-captif", label: "Orage captif", icon: "✧", hint: "Surcharge maximale renforcée.", effect: "Surcharge majeure.", change: "La surcharge pleine frappe beaucoup plus fort.", choiceId: "mage_overcharge", cost: 2, requiredLevel: 7, requiresNodeId: "charge", tier: 3 },
  },
  Archer: {
    trace: { id: "proie-liee", label: "Proie liée", icon: "⌖", hint: "La Marque dure plus longtemps.", effect: "Marque plus longue et plus forte.", change: "Exploiter une marque devient plus rentable.", choiceId: "archer_hunters_mark", cost: 2, requiredLevel: 7, requiresNodeId: "trace", tier: 3 },
    trait: { id: "trait-final", label: "Trait final", icon: "✷", hint: "L’exécution s’active plus tôt.", effect: "Exécution plus précoce.", change: "Finir s'active sur des ennemis moins blessés.", choiceId: "archer_finisher", cost: 2, requiredLevel: 7, requiresNodeId: "finir", tier: 3 },
    piste: { id: "pas-sur", label: "Pas sûr", icon: "➶", hint: "Les Marques donnent plus de dégâts directs.", effect: "Bonus plat sur marque.", change: "Frapper une marque ajoute plus de dégâts directs.", choiceId: "archer_momentum", cost: 2, requiredLevel: 7, requiresNodeId: "piste", tier: 3 },
  },
  Voleur: {
    chaine: { id: "dernier-anneau", label: "Dernier anneau", icon: "⛓", hint: "Le troisième coup gagne un gros bonus.", effect: "Combo final majeur.", change: "Le troisième coup gagne un gros palier.", choiceId: "rogue_chain_finish", cost: 2, requiredLevel: 7, requiresNodeId: "chaine", tier: 3 },
    ombre: { id: "pas-ombre", label: "Pas d'ombre", icon: "☾", hint: "Le premier coup est renforcé.", effect: "Premier coup renforcé.", change: "Changer de cible frappe plus fort au départ.", choiceId: "rogue_first_shadow", cost: 2, requiredLevel: 7, requiresNodeId: "ombre", tier: 3 },
    butin: { id: "main-sure", label: "Main sûre", icon: "◈", hint: "Les objets de combat sont plus efficaces.", effect: "Objets plus rentables.", change: "Les objets de combat rendent mieux le rythme.", choiceId: "rogue_quick_loot", cost: 2, requiredLevel: 7, requiresNodeId: "butin", tier: 3 },
  },
  Demoniste: {
    sang: { id: "prix-moindre", label: "Prix moindre", icon: "◆", hint: "Les pactes coûtent moins de PV.", effect: "Pacte moins coûteux.", change: "Le pacte prend moins de PV.", choiceId: "warlock_blood_price", cost: 2, requiredLevel: 7, requiresNodeId: "sang", tier: 3 },
    abime: { id: "maree-noire", label: "Marée noire", icon: "☗", hint: "Les effets négatifs amplifient les dégâts.", effect: "Altérations plus rentables.", change: "Les cibles altérées subissent plus.", choiceId: "warlock_black_tide", cost: 2, requiredLevel: 7, requiresNodeId: "abime", tier: 3 },
    faim: { id: "faim-derniere", label: "Faim dernière", icon: "✹", hint: "Les dégâts augmentent à bas PV.", effect: "Bonus bas PV renforcé.", change: "Sous la moitié des PV, les dégâts montent davantage.", choiceId: "warlock_last_hunger", cost: 2, requiredLevel: 7, requiresNodeId: "faim", tier: 3 },
  },
  Clerc: {
    foi: { id: "foi-large", label: "Foi large", icon: "✚", hint: "Les boucliers d’équipe sont renforcés.", effect: "Bouclier d'équipe renforcé.", change: "La foi pleine protège plus fort.", choiceId: "cleric_wide_faith", cost: 2, requiredLevel: 7, requiresNodeId: "foi", tier: 3 },
    sceau: { id: "sceau-gardien", label: "Sceau gardien", icon: "◇", hint: "L’allié le plus fragile reçoit plus de protection.", effect: "Protection ciblée renforcée.", change: "Défendre couvre mieux l'allié fragile.", choiceId: "cleric_guardian_seal", cost: 2, requiredLevel: 7, requiresNodeId: "sceau", tier: 3 },
    jugement: { id: "sentence", label: "Sentence", icon: "✷", hint: "Les ennemis marqués prennent plus de dégâts.", effect: "Jugement majeur.", change: "Les ennemis marqués prennent plus de dégâts.", choiceId: "cleric_sentence", cost: 2, requiredLevel: 7, requiresNodeId: "jugement", tier: 3 },
  },

  Sentinelle: {
    ancrage: { id: "garde-voile", label: "Garde d’équipe", icon: "⛨", hint: "Les boucliers d’équipe sont renforcés.", effect: "Bouclier d'équipe renforcé.", change: "Garde d’équipe protège mieux tout le groupe.", choiceId: "sentinel_veil_guard", cost: 2, requiredLevel: 7, requiresNodeId: "egide", tier: 3 },
    faille: { id: "second-voile", label: "Sceau de rupture", icon: "🌌", hint: "Les cibles Vulnérables ou Fragiles prennent plus de dégâts.", effect: "Sceau majeur contre cible altérée.", change: "Sceau de rupture punit mieux les ennemis ouverts.", choiceId: "sentinel_second_veil", cost: 2, requiredLevel: 7, requiresNodeId: "faille", tier: 3 },
    pulsation: { id: "relais-ancre", label: "Relais d'ancre", icon: "◉", hint: "Après un bouclier d’équipe, la Sentinelle gagne du rythme.", effect: "Rythme et mana renforcés.", change: "Les sceaux soutiennent mieux la cadence.", choiceId: "sentinel_anchor_relay", cost: 2, requiredLevel: 7, requiresNodeId: "pulsation", tier: 3 },
  },
};

function withMilestoneNodes(tree: Record<ClassType, TalentBranch[]>): Record<ClassType, TalentBranch[]> {
  const result = {} as Record<ClassType, TalentBranch[]>;
  for (const classType of Object.keys(tree) as ClassType[]) {
    result[classType] = tree[classType].map((branch) => {
      const milestone = MILESTONE_NODES[classType][branch.id];
      const nodes = milestone ? [...branch.nodes, milestone] : branch.nodes;
      return {
        ...branch,
        nodes: nodes.map((node, index) => ({
          ...node,
          tier: node.tier ?? index + 1,
          role: node.role ?? TALENT_ROLE_DETAILS[node.choiceId] ?? "Dégâts",
        })),
      };
    });
  }
  return result;
}

export const CLASS_TALENT_TREES: Record<ClassType, TalentBranch[]> = withMilestoneNodes(BASE_CLASS_TALENT_TREES);

export function getTalentNodeTechnicalText(node: TalentNode) {
  return node.technical ?? TALENT_TECHNICAL_DETAILS[node.choiceId] ?? node.effect;
}

export function getTalentNodeMilestoneText(node: TalentNode) {
  return node.milestone ?? TALENT_MILESTONE_DETAILS[node.choiceId] ?? (node.tier ? `Palier ${node.tier}.` : null);
}

export function getTalentNodeRoleText(node: TalentNode) {
  return node.role ?? TALENT_ROLE_DETAILS[node.choiceId] ?? "Dégâts";
}

export function getTalentNodes(classType: ClassType): TalentNode[] {
  return CLASS_TALENT_TREES[classType].flatMap((branch) => branch.nodes);
}

export function isTalentNodeUnlocked(node: TalentNode, choices: PlayerBuildChoice[] | undefined) {
  if (!choices?.length) return false;
  return choices.some((choice) => choice.id === node.choiceId);
}

export function countUnlockedTalentNodes(classType: ClassType, choices: PlayerBuildChoice[] | undefined) {
  return getTalentNodes(classType).filter((node) => isTalentNodeUnlocked(node, choices)).length;
}

export function getTalentPointsForLevel(level: number) {
  return Math.max(0, level - 1);
}

export function getSpentTalentPoints(classType: ClassType, choices: PlayerBuildChoice[] | undefined) {
  return getTalentNodes(classType).reduce((total, node) => {
    return total + (isTalentNodeUnlocked(node, choices) ? node.cost : 0);
  }, 0);
}

export function getAvailableTalentPoints(classType: ClassType, level: number, choices: PlayerBuildChoice[] | undefined) {
  return Math.max(0, getTalentPointsForLevel(level) - getSpentTalentPoints(classType, choices));
}

export function isTalentNodeAvailable(node: TalentNode, classType: ClassType, level: number, choices: PlayerBuildChoice[] | undefined) {
  if (isTalentNodeUnlocked(node, choices)) return false;
  if (level < node.requiredLevel) return false;
  if (getAvailableTalentPoints(classType, level, choices) < node.cost) return false;
  if (!node.requiresNodeId) return true;
  const requiredNode = getTalentNodes(classType).find((candidate) => candidate.id === node.requiresNodeId);
  return requiredNode ? isTalentNodeUnlocked(requiredNode, choices) : true;
}

export function getTalentNodeCondition(node: TalentNode, classType: ClassType, level: number, choices: PlayerBuildChoice[] | undefined) {
  if (isTalentNodeUnlocked(node, choices)) return "Déjà maîtrisé.";
  if (level < node.requiredLevel) return `Niveau ${node.requiredLevel} requis.`;
  if (node.requiresNodeId) {
    const requiredNode = getTalentNodes(classType).find((candidate) => candidate.id === node.requiresNodeId);
    if (requiredNode && !isTalentNodeUnlocked(requiredNode, choices)) {
      return `Maîtrise requise : ${requiredNode.label}.`;
    }
  }
  if (getAvailableTalentPoints(classType, level, choices) < node.cost) return "Point de maîtrise requis.";
  return "Disponible.";
}
