export type MobileMapDensity = "comfortable" | "compact";

export type MobilePreferences = {
  reduceMotion: boolean;
  compactMap: boolean;
  showSaveFeedback: boolean;
  showDetailedCombatLog: boolean;
  mapDensity: MobileMapDensity;
};

export const DEFAULT_MOBILE_PREFERENCES: MobilePreferences = {
  reduceMotion: false,
  compactMap: false,
  showSaveFeedback: true,
  showDetailedCombatLog: true,
  mapDensity: "comfortable",
};

export function normalizeMobilePreferences(value: Partial<MobilePreferences> | null | undefined): MobilePreferences {
  return {
    ...DEFAULT_MOBILE_PREFERENCES,
    ...value,
    mapDensity: value?.mapDensity === "compact" ? "compact" : DEFAULT_MOBILE_PREFERENCES.mapDensity,
    compactMap: Boolean(value?.compactMap ?? DEFAULT_MOBILE_PREFERENCES.compactMap),
    reduceMotion: Boolean(value?.reduceMotion ?? DEFAULT_MOBILE_PREFERENCES.reduceMotion),
    showSaveFeedback: Boolean(value?.showSaveFeedback ?? DEFAULT_MOBILE_PREFERENCES.showSaveFeedback),
    showDetailedCombatLog: Boolean(value?.showDetailedCombatLog ?? DEFAULT_MOBILE_PREFERENCES.showDetailedCombatLog),
  };
}

export function toggleMobilePreference(preferences: MobilePreferences, key: keyof Omit<MobilePreferences, "mapDensity">): MobilePreferences {
  const next = {
    ...preferences,
    [key]: !preferences[key],
  };

  if (key === "compactMap") {
    next.mapDensity = next.compactMap ? "compact" : "comfortable";
  }

  return normalizeMobilePreferences(next);
}
