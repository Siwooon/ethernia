import { Player } from "@/app/component/types/game";

export function getClassFallbackIcon(classType: Player["classType"]): string {
  switch (classType) {
    case "Guerrier":
      return "🛡️";
    case "Mage":
      return "✨";
    case "Archer":
      return "🏹";
    case "Voleur":
      return "🗡️";
    case "Demoniste":
      return "🔮";
    case "Clerc":
      return "✝️";
    default:
      return "🧙";
  }
}
