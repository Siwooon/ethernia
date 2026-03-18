import { PassiveEffect, CombatEffectContext } from "@/app/component/types/game";

export function runEffects(
    trigger: PassiveEffect["trigger"],
    effects: PassiveEffect[],
    ctx: CombatEffectContext
    ) {
    for (const effect of effects) {
        if (effect.trigger === trigger) {
        effect.apply(ctx);
        }
    }
}

export const poisonAura: PassiveEffect = {
    id: "poison_aura",
    name: "Aura toxique",
    description: "Inflige 2 dégâts au joueur chaque tour.",
    trigger: "turn_start",

    apply: ({ player }) => {
        player.stats.hp = Math.max(0, player.stats.hp - 2);
    },
};