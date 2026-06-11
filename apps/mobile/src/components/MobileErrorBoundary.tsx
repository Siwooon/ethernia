import React, { Component, ErrorInfo, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MobilePressableButton } from "./MobilePressableButton";
import { mobileTheme } from "../styles/theme";

type MobileErrorBoundaryProps = {
  children: ReactNode;
  onResetApp?: () => void;
  onClearSave?: () => Promise<void> | void;
};

type MobileErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
  isClearing: boolean;
};

export class MobileErrorBoundary extends Component<MobileErrorBoundaryProps, MobileErrorBoundaryState> {
  state: MobileErrorBoundaryState = {
    hasError: false,
    errorMessage: "",
    isClearing: false,
  };

  static getDerivedStateFromError(error: Error): Partial<MobileErrorBoundaryState> {
    return {
      hasError: true,
      errorMessage: error.message || "Erreur inconnue",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("Ethernia mobile crash", error, info.componentStack);
  }

  private resetScreen = () => {
    this.setState({ hasError: false, errorMessage: "", isClearing: false });
    this.props.onResetApp?.();
  };

  private clearSave = async () => {
    if (!this.props.onClearSave) return;

    this.setState({ isClearing: true });
    try {
      await this.props.onClearSave();
      this.resetScreen();
    } catch (error) {
      this.setState({
        isClearing: false,
        errorMessage: error instanceof Error ? error.message : "Impossible d’effacer la sauvegarde.",
      });
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.screen}>
        <View style={styles.card}>
          <Text style={styles.kicker}>Protection anti-crash</Text>
          <Text style={styles.title}>Ethernia a rencontré une erreur</Text>
          <Text style={styles.text}>
            L’écran a été stoppé pour éviter un crash blanc. Tu peux revenir au lobby, puis relancer ou effacer la sauvegarde si elle est cassée.
          </Text>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{this.state.errorMessage}</Text>
          </View>
          <MobilePressableButton label="Retour lobby" onPress={this.resetScreen} tone="primary" />
          {this.props.onClearSave ? (
            <MobilePressableButton
              label={this.state.isClearing ? "Suppression..." : "Effacer la sauvegarde"}
              onPress={this.clearSave}
              disabled={this.state.isClearing}
              tone="danger"
            />
          ) : null}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: mobileTheme.spacing.md,
    backgroundColor: mobileTheme.colors.background,
  },
  card: {
    padding: mobileTheme.spacing.lg,
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: mobileTheme.colors.panelStrong,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    gap: mobileTheme.spacing.md,
  },
  kicker: {
    color: mobileTheme.colors.danger,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  text: {
    color: mobileTheme.colors.muted,
    lineHeight: 20,
  },
  errorBox: {
    padding: mobileTheme.spacing.sm,
    borderRadius: mobileTheme.radius.md,
    backgroundColor: "rgba(248,113,113,0.12)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.26)",
  },
  errorText: {
    color: mobileTheme.colors.text,
    lineHeight: 19,
  },
});
