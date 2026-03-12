import { ClassData, ClassType } from "@/app/component/types/game";

export const CLASSES: Record<ClassType, ClassData> = {
  Guerrier: {
    image:
      "https://api.dicebear.com/7.x/adventurer/png?seed=Guerrier&size=200&backgroundColor=5e2cb8",
    portrait:
      "https://api.dicebear.com/7.x/adventurer/png?seed=Guerrier&size=120&backgroundColor=3b1c7a",
    stats: {
      hp: 150,
      maxHp: 150,
      mana: 20,
      maxMana: 20,
      strength: 16,
      magic: 2,
      defense: 12,
    },
  },
  Mage: {
    image:
      "https://api.dicebear.com/7.x/adventurer/png?seed=Mage&size=200&backgroundColor=2c1266",
    portrait:
      "https://api.dicebear.com/7.x/adventurer/png?seed=Mage&size=120&backgroundColor=1b0a3d",
    stats: {
      hp: 70,
      maxHp: 70,
      mana: 100,
      maxMana: 100,
      strength: 3,
      magic: 20,
      defense: 3,
    },
  },
  Archer: {
    image:
      "https://api.dicebear.com/7.x/adventurer/png?seed=Archer&size=200&backgroundColor=4d1b99",
    portrait:
      "https://api.dicebear.com/7.x/adventurer/png?seed=Archer&size=120&backgroundColor=3b1c7a",
    stats: {
      hp: 90,
      maxHp: 90,
      mana: 50,
      maxMana: 50,
      strength: 12,
      magic: 5,
      defense: 5,
    },
  },
  Voleur: {
    image:
      "https://api.dicebear.com/7.x/adventurer/png?seed=Voleur&size=200&backgroundColor=200a4d",
    portrait:
      "https://api.dicebear.com/7.x/adventurer/png?seed=Voleur&size=120&backgroundColor=2c1266",
    stats: {
      hp: 85,
      maxHp: 85,
      mana: 40,
      maxMana: 40,
      strength: 10,
      magic: 4,
      defense: 4,
    },
  },
  Invocateur: {
    image:
      "https://api.dicebear.com/7.x/adventurer/png?seed=Invocateur&size=200&backgroundColor=8e4ae8",
    portrait:
      "https://api.dicebear.com/7.x/adventurer/png?seed=Invocateur&size=120&backgroundColor=5e2cb8",
    stats: {
      hp: 100,
      maxHp: 100,
      mana: 80,
      maxMana: 80,
      strength: 6,
      magic: 14,
      defense: 6,
    },
  },
};