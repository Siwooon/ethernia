import { MobilePreferences, DEFAULT_MOBILE_PREFERENCES, normalizeMobilePreferences } from "@/shared/engine/game/mobilePreferences";
import { mobileStorage } from "./mobileStorage";

const MOBILE_PREFERENCES_KEY = "ethernia-mobile-preferences";

export const mobilePreferencesStorage = {
  async load(): Promise<MobilePreferences> {
    const raw = await mobileStorage.getItem(MOBILE_PREFERENCES_KEY);
    if (!raw) return DEFAULT_MOBILE_PREFERENCES;

    try {
      return normalizeMobilePreferences(JSON.parse(raw) as Partial<MobilePreferences>);
    } catch {
      return DEFAULT_MOBILE_PREFERENCES;
    }
  },

  async save(preferences: MobilePreferences): Promise<MobilePreferences> {
    const normalized = normalizeMobilePreferences(preferences);
    await mobileStorage.setItem(MOBILE_PREFERENCES_KEY, JSON.stringify(normalized));
    return normalized;
  },

  async reset(): Promise<MobilePreferences> {
    await mobileStorage.removeItem(MOBILE_PREFERENCES_KEY);
    return DEFAULT_MOBILE_PREFERENCES;
  },
};
