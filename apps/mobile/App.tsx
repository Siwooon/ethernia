import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { etherniaTheme } from "./src/styles/etherniaTheme";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import { MobileErrorBoundary } from "./src/components/MobileErrorBoundary";
import { mobileRunSaveSystem } from "./src/platform/mobileRunSaveSystem";
import { MobileCombatLaunch, MobileCombatScreen } from "./src/screens/MobileCombatScreen";
import { MobileDiagnosticsScreen } from "./src/screens/MobileDiagnosticsScreen";
import { MobileFloorTransitionScreen } from "./src/screens/MobileFloorTransitionScreen";
import { MobileHomeGameMode, MobileHomeScreen } from "./src/screens/MobileHomeScreen";
import { MobileInventoryScreen } from "./src/screens/MobileInventoryScreen";
import { MobileLobbyScreen } from "./src/screens/MobileLobbyScreen";
import { MobileMapScreen } from "./src/screens/MobileMapScreen";
import { MobileMerchantLaunch, MobileMerchantScreen } from "./src/screens/MobileMerchantScreen";
import { MobilePostCombatFlow } from "@/shared/engine/combat/mobileCombatRewards";
import { MobileRunEndOutcome, MobileRunEndScreen } from "./src/screens/MobileRunEndScreen";
import { MobileRunMenuScreen } from "./src/screens/MobileRunMenuScreen";
import { MobileTeamScreen } from "./src/screens/MobileTeamScreen";
import { MobileQuickNav } from "./src/components/MobileQuickNav";
import { fetchCoopSessionById, publishCoopRun } from "./src/platform/supabaseCoopClient";

type MobileScreen = "home" | "lobby" | "map" | "combat" | "merchant" | "inventory" | "team" | "run_menu" | "diagnostics" | "run_end" | "floor_transition";
type QuickNavScreen = "map" | "team" | "inventory" | "run_menu";

function safeStringifyRun(run: EtherniaRunSave | null) {
  try {
    return run ? JSON.stringify(run) : "";
  } catch {
    return "";
  }
}

export default function App() {
  const [screen, setScreen] = useState<MobileScreen>("home");
  const [activeRun, setActiveRun] = useState<EtherniaRunSave | null>(null);
  const [activeCombat, setActiveCombat] = useState<MobileCombatLaunch | null>(null);
  const [activeMerchant, setActiveMerchant] = useState<MobileMerchantLaunch | null>(null);
  const [runEnd, setRunEnd] = useState<{ outcome: MobileRunEndOutcome; title: string; text: string } | null>(null);
  const [floorTransition, setFloorTransition] = useState<{ title: string; text: string } | null>(null);
  const [lobbyMode, setLobbyMode] = useState<MobileHomeGameMode>("solo");
  const [initialJoinCode, setInitialJoinCode] = useState("");
  const [onlineRunStatus, setOnlineRunStatus] = useState<string | null>(null);
  const lastPublishedRunRef = useRef("");
  const lastRemoteRunRef = useRef("");

  const resetToLobby = () => {
    setActiveRun(null);
    setActiveCombat(null);
    setActiveMerchant(null);
    setRunEnd(null);
    setFloorTransition(null);
    setScreen("home");
  };

  const clearSaveAndReset = async () => {
    await mobileRunSaveSystem.deleteRun();
    resetToLobby();
  };

  const setActiveRunSynced = useCallback((run: EtherniaRunSave | null) => {
    setActiveRun(run);
    if (run?.coopSession?.backendSessionId) {
      lastRemoteRunRef.current = safeStringifyRun(run);
    }
  }, []);

  useEffect(() => {
    const session = activeRun?.coopSession;
    if (!activeRun || !session?.backendSessionId) {
      setOnlineRunStatus(null);
      return;
    }

    if (session.isHostDevice) {
      const serialized = safeStringifyRun(activeRun);
      if (!serialized || serialized === lastPublishedRunRef.current) return;

      const timeoutId = setTimeout(() => {
        void publishCoopRun(session.backendSessionId as string, activeRun)
          .then(() => {
            lastPublishedRunRef.current = serialized;
            lastRemoteRunRef.current = serialized;
            setOnlineRunStatus("Run publiée");
          })
          .catch((error) => {
            setOnlineRunStatus(error instanceof Error ? error.message : "Sync échouée");
          });
      }, 500);

      return () => clearTimeout(timeoutId);
    }

    let cancelled = false;
    const pullRemoteRun = async () => {
      try {
        const snapshot = await fetchCoopSessionById(session.backendSessionId as string);
        if (cancelled || !snapshot?.run_state) return;
        const nextRun: EtherniaRunSave = {
          ...snapshot.run_state,
          coopSession: snapshot.run_state.coopSession
            ? {
                ...snapshot.run_state.coopSession,
                backendSessionId: session.backendSessionId,
                localSeat: session.localSeat,
                isHostDevice: false,
                lastSyncedAt: Date.now(),
              }
            : session,
        };
        const serialized = safeStringifyRun(nextRun);
        if (!serialized || serialized === lastRemoteRunRef.current) return;
        lastRemoteRunRef.current = serialized;
        setActiveRun(nextRun);
        await mobileRunSaveSystem.saveRun(nextRun);
        setOnlineRunStatus("Run reçue");
      } catch (error) {
        if (!cancelled) {
          setOnlineRunStatus(error instanceof Error ? error.message : "Lecture réseau échouée");
        }
      }
    };

    void pullRemoteRun();
    const intervalId = setInterval(pullRemoteRun, 2400);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeRun]);

  const quickNavScreens: MobileScreen[] = ["map", "team", "inventory", "run_menu"];
  const showQuickNav = Boolean(activeRun && quickNavScreens.includes(screen));
  const navigateQuick = (target: QuickNavScreen) => {
    if (!activeRun) return;
    setScreen(target);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <MobileErrorBoundary onResetApp={resetToLobby} onClearSave={clearSaveAndReset}>
      <View style={styles.contentArea}>
      {screen === "run_end" && runEnd ? (
        <MobileRunEndScreen
          outcome={runEnd.outcome}
          run={activeRun}
          title={runEnd.title}
          text={runEnd.text}
          onBackToLobby={() => {
            setActiveRun(null);
            setActiveCombat(null);
            setActiveMerchant(null);
            setRunEnd(null);
            setFloorTransition(null);
            setScreen("home");
          }}
        />
      ) : screen === "floor_transition" && activeRun && floorTransition ? (
        <MobileFloorTransitionScreen
          run={activeRun}
          title={floorTransition.title}
          text={floorTransition.text}
          onContinue={async (run) => {
            setActiveRunSynced(run);
            await mobileRunSaveSystem.saveRun(run);
            setFloorTransition(null);
            setScreen("map");
          }}
          onOpenTeam={() => setScreen("team")}
        />
      ) : screen === "run_menu" && activeRun ? (
        <MobileRunMenuScreen
          run={activeRun}
          onResume={() => setScreen("map")}
          onBackToLobby={() => {
            setActiveRun(null);
            setActiveCombat(null);
            setActiveMerchant(null);
            setRunEnd(null);
            setFloorTransition(null);
            setScreen("home");
          }}
          onOpenTeam={(run) => {
            setActiveRunSynced(run);
            setScreen("team");
          }}
          onOpenInventory={(run) => {
            setActiveRunSynced(run);
            setScreen("inventory");
          }}
          onOpenDiagnostics={(run) => {
            setActiveRunSynced(run);
            setScreen("diagnostics");
          }}
        />
      ) : screen === "diagnostics" && activeRun ? (
        <MobileDiagnosticsScreen
          run={activeRun}
          onClose={() => setScreen("run_menu")}
          onBackToLobby={resetToLobby}
          onDeleteSave={mobileRunSaveSystem.deleteRun}
          onRepairRun={async (run) => {
            await mobileRunSaveSystem.saveRun(run);
            setActiveRunSynced(run);
          }}
        />
      ) : screen === "inventory" && activeRun ? (
        <MobileInventoryScreen
          initialRun={activeRun}
          onClose={(run) => {
            setActiveRunSynced(run);
            setScreen("map");
          }}
        />
      ) : screen === "team" && activeRun ? (
        <MobileTeamScreen
          run={activeRun}
          onClose={() => setScreen("map")}
          onRunChanged={setActiveRunSynced}
          onOpenInventory={(run) => {
            setActiveRunSynced(run);
            setScreen("inventory");
          }}
        />
      ) : screen === "merchant" && activeRun && activeMerchant ? (
        <MobileMerchantScreen
          initialRun={activeRun}
          merchant={activeMerchant}
          onClose={(run) => {
            setActiveRunSynced(run);
            setActiveMerchant(null);
            setScreen("map");
          }}
        />
      ) : screen === "combat" && activeRun && activeCombat ? (
        <MobileCombatScreen
          initialRun={activeRun}
          combat={activeCombat}
          onCancelCombat={() => setScreen("map")}
          onOpenHeroAfterLevelUp={(run, postCombat: MobilePostCombatFlow) => {
            setActiveRunSynced(run);
            setActiveCombat(null);
            if (postCombat.kind === "next_floor") {
              setFloorTransition({ title: postCombat.title, text: postCombat.text });
            }
            if (postCombat.kind === "run_victory" || postCombat.kind === "run_defeat") {
              setRunEnd({
                outcome: postCombat.kind === "run_victory" ? "victory" : "defeat",
                title: postCombat.title,
                text: postCombat.text,
              });
            }
            setScreen("team");
          }}
          onCombatFinished={(run, postCombat: MobilePostCombatFlow) => {
            setActiveRunSynced(run);
            setActiveCombat(null);

            if (postCombat.kind === "run_victory" || postCombat.kind === "run_defeat") {
              setRunEnd({
                outcome: postCombat.kind === "run_victory" ? "victory" : "defeat",
                title: postCombat.title,
                text: postCombat.text,
              });
              setFloorTransition(null);
              setScreen("run_end");
              return;
            }

            if (postCombat.kind === "next_floor") {
              setFloorTransition({ title: postCombat.title, text: postCombat.text });
              setScreen("floor_transition");
              return;
            }

            setFloorTransition(null);
            setScreen("map");
          }}
        />
      ) : screen === "map" && activeRun ? (
        <MobileMapScreen
          initialRun={activeRun}
          onRunChanged={setActiveRunSynced}
          onBackToLobby={() => setScreen("lobby")}
          onOpenRunMenu={() => setScreen("run_menu")}
          onStartCombat={(run, combat) => {
            setActiveRunSynced(run);
            setActiveCombat(combat);
            setScreen("combat");
          }}
          onOpenMerchant={(run, merchant) => {
            setActiveRunSynced(run);
            setActiveMerchant(merchant);
            setScreen("merchant");
          }}
          onOpenInventory={(run) => {
            setActiveRunSynced(run);
            setScreen("inventory");
          }}
          onOpenTeam={(run) => {
            setActiveRunSynced(run);
            setScreen("team");
          }}
        />
      ) : screen === "lobby" ? (
        <MobileLobbyScreen
          entryMode={lobbyMode}
          initialJoinCode={initialJoinCode}
          onBackHome={() => setScreen("home")}
          onOpenRun={(run) => {
            setActiveRunSynced(run);
            setScreen("map");
          }}
        />
      ) : (
        <MobileHomeScreen
          onSelectMode={(mode, joinCode) => {
            setLobbyMode(mode);
            setInitialJoinCode(joinCode ?? "");
            setScreen("lobby");
          }}
          onContinueRun={(run) => {
            setActiveRunSynced(run);
            setScreen("map");
          }}
        />
      )}
      </View>
      {onlineRunStatus ? (
        <View style={styles.onlineRunBadge}>
          <Text style={styles.onlineRunBadgeText}>{onlineRunStatus}</Text>
        </View>
      ) : null}
      {showQuickNav ? (
        <MobileQuickNav
          current={screen as QuickNavScreen}
          onNavigate={navigateQuick}
        />
      ) : null}
      </MobileErrorBoundary>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: etherniaTheme.colors.background,
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
  },
  onlineRunBadge: {
    position: "absolute",
    right: 12,
    bottom: 86,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(10, 18, 30, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(242,193,91,0.28)",
  },
  onlineRunBadgeText: {
    color: etherniaTheme.colors.gold,
    fontSize: 11,
    fontWeight: "900",
  },
});
