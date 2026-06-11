import { MobileNodeEventPanel } from "./nodeEventEngine";
import { EventChoice, Player } from "@/shared/types/game";

export type MobileChoiceImpactTone = "safe" | "reward" | "risk" | "danger" | "neutral";

export type MobileChoiceImpact = {
  icon: string;
  tone: MobileChoiceImpactTone;
  summary: string;
  details: string[];
  disabledReason?: string;
};

export function getMobileEventKindLabel(panel: MobileNodeEventPanel): string {
  switch (panel.kind) {
    case "combat":
      return "Combat";
    case "merchant":
      return "Marchand";
    case "choice":
      return panel.choiceType === "statuette"
        ? "Statuette"
        : panel.choiceType === "rest"
          ? "Repos"
          : panel.choiceType === "treasure"
            ? "Trésor"
            : panel.choiceType === "shrine"
              ? "Sanctuaire"
              : "Événement";
    case "game_over":
      return "Fin de run";
    case "empty":
      return "Lieu vide";
    case "message":
    default:
      return "Interaction";
  }
}

export function getMobileChoiceImpact(params: {
  choice: EventChoice;
  panel: MobileNodeEventPanel;
  player?: Player | null;
  hasDeadAlly?: boolean;
}): MobileChoiceImpact {
  const { choice, panel, player, hasDeadAlly } = params;
  const corrupted = Boolean(panel.corrupted);
  const hp = player?.stats.hp ?? 0;
  const mana = player?.stats.mana ?? 0;

  switch (choice.id) {
    case "engage_battle":
      return {
        icon: "⚔️",
        tone: "danger",
        summary: "Engager le combat",
        details: ["Démarre le combat.", "Victoire : le lieu est sécurisé."],
      };

    case "wait_for_party":
      return {
        icon: "⏳",
        tone: "neutral",
        summary: "Attendre le groupe",
        details: ["Passe au héros suivant.", corrupted ? "La zone agit encore." : "Aucun effet direct."],
      };

    case "retreat":
      return {
        icon: "↩️",
        tone: "safe",
        summary: "Revenir en arrière",
        details: ["Retour au lieu précédent.", "Lieu non résolu."],
      };

    case "take_statue":
      return {
        icon: "⭐",
        tone: "danger",
        summary: "Réveiller le gardien",
        details: ["Déclenche un combat de gardien.", "Victoire : +1 statuette."],
      };

    case "purify_statue":
      return {
        icon: "✨",
        tone: hp <= 18 || mana <= 12 ? "danger" : "risk",
        summary: "Purifier la statuette",
        details: ["-18 PV, -12 Mana.", "Applique un malus temporaire.", "+1 statuette sans combat."],
        disabledReason: hp <= 1 ? "PV trop bas pour risquer une purification." : undefined,
      };

    case "absorb_statue":
      return {
        icon: "🩸",
        tone: "risk",
        summary: "Absorber l’énergie",
        details: ["Bonus d’équipe immédiat.", "Toute l’équipe gagne de la Force.", "La corruption augmente fortement."],
      };

    case "rest_sleep":
      return {
        icon: "🛌",
        tone: "safe",
        summary: "Soigner le héros",
        details: [corrupted ? "+22 PV." : "+32 PV.", corrupted ? "La corruption augmente de 10." : "Aucun piège."],
      };

    case "rest_focus":
      return {
        icon: "🔮",
        tone: corrupted ? "risk" : "safe",
        summary: "Récupérer du mana",
        details: [corrupted ? "+22 Mana, +1 Magie." : "+32 Mana.", corrupted ? "La corruption augmente de 12." : "Aucun piège."],
      };

    case "rest_cleanse":
      return {
        icon: "💧",
        tone: "safe",
        summary: "Nettoyer les malus",
        details: ["Retire les statuts dangereux et les malus de carte.", corrupted ? "+8 PV, +4 Mana." : "+18 PV, +10 Mana."],
      };

    case "treasure_open_safe":
      return {
        icon: "🗝️",
        tone: "reward",
        summary: "Ouvrir prudemment",
        details: ["Récupère un butin moyen.", "Aucun piège."],
      };

    case "treasure_force":
      return {
        icon: "💥",
        tone: corrupted ? "danger" : "risk",
        summary: "Forcer le coffre",
        details: ["Récupère un meilleur butin.", corrupted ? "Une mimique peut surgir." : "Une mimique peut surgir."],
      };

    case "treasure_leave":
      return {
        icon: "🚶",
        tone: "neutral",
        summary: "Quitter le lieu",
        details: ["Aucun gain.", corrupted ? "La corruption baisse un peu." : "Aucun piège."],
      };

    case "shrine_bless":
      return {
        icon: "🕯️",
        tone: corrupted ? "risk" : "reward",
        summary: "Recevoir une bénédiction",
        details: [corrupted ? "+2 Magie, +1 Force." : "+1 Défense, +1 Magie.", corrupted ? "La corruption augmente." : "Bonus défensif temporaire."],
      };

    case "shrine_offer":
      return {
        icon: "🩸",
        tone: hp <= (corrupted ? 15 : 8) ? "danger" : "risk",
        summary: "Offrir du sang",
        details: [corrupted ? "Perd 14 PV. Gagne +2 Force et +2 Magie." : "Perd 8 PV. Gagne +2 Défense.", corrupted ? "La corruption augmente beaucoup." : "Protection temporaire."],
        disabledReason: hp <= 1 ? "PV trop bas pour une offrande." : undefined,
      };

    case "shrine_revive":
      return {
        icon: "🕊️",
        tone: hasDeadAlly ? "reward" : "neutral",
        summary: hasDeadAlly ? "Ressusciter un allié" : "Aucun allié à relever",
        details: [hasDeadAlly ? "Relève un allié tombé." : "Aucun allié tombé."],
      };

    case "shrine_leave":
      return {
        icon: "🚪",
        tone: "neutral",
        summary: "Quitter le lieu",
        details: ["Aucun effet.", "Tour terminé."],
      };

    case "random_help":
      return {
        icon: "🤝",
        tone: corrupted ? "risk" : "reward",
        summary: "Aider",
        details: [corrupted ? "Gagne 22 or. Perd 10 PV." : "Gagne 14 or.", corrupted ? "Applique une infection légère." : "Aucun piège."],
      };

    case "random_search":
      return {
        icon: "🔎",
        tone: corrupted ? "danger" : "reward",
        summary: "Fouiller les environs",
        details: ["Tu peux trouver du butin.", corrupted ? "Une embuscade peut se déclencher." : "Une embuscade faible peut se déclencher."],
      };

    case "random_ignore":
      return {
        icon: "🌫️",
        tone: "neutral",
        summary: "Quitter le lieu",
        details: ["Tu repars sans incident.", "Tu repars."],
      };

    case "event_forge_temper":
      return {
        icon: "⚒️",
        tone: corrupted ? "risk" : "reward",
        summary: "Améliorer l’équipement",
        details: ["Améliore une pièce équipée.", "Coûte de l’or.", corrupted ? "La corruption augmente de 8." : "Aucun piège."],
      };

    case "event_veil_relic":
      return {
        icon: "◇",
        tone: corrupted ? "danger" : "reward",
        summary: "Prendre une relique",
        details: ["Ajoute une relique à la run.", "Son effet s’applique à toute l’équipe.", corrupted ? "La corruption peut augmenter." : "Aucun piège."],
      };

    case "event_anchor_cleanse":
      return {
        icon: "▣",
        tone: "safe",
        summary: "Stabiliser le lieu",
        details: [corrupted ? "Corruption -18." : "Corruption -10.", "Petit soin pour l’équipe.", "Retire des malus légers."],
      };

    case "class_force":
      return {
        icon: "🛡️",
        tone: hp <= 10 ? "danger" : "risk",
        summary: "Utiliser la classe",
        details: ["Coûte des PV.", "Donne le gain immédiatement."],
        disabledReason: hp <= 1 ? "PV trop bas." : undefined,
      };

    case "class_analyze":
      return {
        icon: "✨",
        tone: mana < 10 ? "risk" : "reward",
        summary: "Utiliser la classe",
        details: ["Coûte du Mana.", corrupted ? "Réduit la corruption." : "Augmente la Magie."],
        disabledReason: mana <= 0 ? "Mana insuffisant." : undefined,
      };

    case "class_finesse":
      return {
        icon: "🗡️",
        tone: corrupted ? "risk" : "reward",
        summary: "Utiliser la classe",
        details: ["Gagne une petite récompense immédiate.", corrupted ? "La corruption augmente légèrement." : "Aucun piège."],
      };

    case "class_purify":
      return {
        icon: "🕊️",
        tone: mana < 14 ? "risk" : "safe",
        summary: "Utiliser la classe",
        details: ["Coûte du Mana.", "Soigne l’équipe.", corrupted ? "Réduit le danger du lieu." : "Soutien sans risque."],
        disabledReason: mana <= 0 ? "Mana insuffisant." : undefined,
      };

    case "class_pact":
      return {
        icon: "🩸",
        tone: hp <= 12 ? "danger" : "risk",
        summary: "Utiliser la classe",
        details: ["Coûte des PV.", "Bonus immédiat.", "La corruption augmente."],
        disabledReason: hp <= 1 ? "PV trop bas." : undefined,
      };

    default:
      return {
        icon: "•",
        tone: "neutral",
        summary: choice.description,
        details: [],
      };
  }
}
