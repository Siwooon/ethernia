import React from "react";
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { ClassType } from "@/shared/types/game";
import { ClassIconVariant, getClassIcon, getClassPresentation } from "@/shared/engine/game/classPresentation";
import { getClassDisplayName } from "@/shared/engine/game/displayLabels";
import { getClassIconSource } from "../assets/mobileAssets";

type ClassIconSize = "sm" | "md" | "lg";

type ClassIconProps = {
  classType: ClassType;
  variant?: ClassIconVariant;
  size?: ClassIconSize;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

const SIZE_MAP: Record<ClassIconSize, number> = {
  sm: 26,
  md: 38,
  lg: 56,
};

export function ClassIcon({ classType, variant = "state", size = "md", active = false, style }: ClassIconProps) {
  const presentation = getClassPresentation(classType);
  const dimension = SIZE_MAP[size];
  const fontSize = size === "lg" ? 25 : size === "md" ? 18 : 13;
  const source = getClassIconSource(classType);

  return (
    <View
      style={[
        styles.base,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: "rgba(255,255,255,0.08)",
          borderColor: active ? presentation.accent : "rgba(255,255,255,0.34)",
          shadowColor: active ? presentation.accent : "#000",
        },
        active && styles.active,
        style,
      ]}
      accessibilityLabel={`${getClassDisplayName(classType)} ${presentation.title}`}
    >
      {source ? (
        <Image source={source} style={styles.image} resizeMode="cover" />
      ) : (
        <Text style={[styles.icon, { color: presentation.accent, fontSize }]}>{getClassIcon(classType, variant)}</Text>
      )}
      <View style={[styles.lightLift, { opacity: active ? 0.18 : 0.12 }]} />
      <View
        style={[
          styles.accentGlow,
          { backgroundColor: presentation.accent, opacity: active ? 0.12 : 0.06 },
        ]}
      />
      <View style={[styles.accentRing, { borderColor: active ? presentation.accent : "rgba(255,255,255,0.16)" }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  active: {
    borderWidth: 2,
    shadowOpacity: 0.35,
    shadowRadius: 7,
    elevation: 5,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  lightLift: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  accentGlow: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  accentRing: {
    position: "absolute",
    top: 2,
    right: 2,
    bottom: 2,
    left: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  icon: {
    fontWeight: "900",
    includeFontPadding: false,
    textAlign: "center",
  },
});
