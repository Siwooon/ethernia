import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CLASSES } from "@/shared/data/classes";
import { MAX_PLAYERS } from "@/shared/engine/game/gameState";
import {
  assignHeroToSeat,
  attachCoopBackendToRun,
  clearSeat,
  createCoopRunSession,
  createLocalCoopLobby,
  createPartyCode,
  getCoopLobbySummary,
  getCoopStartIssues,
  removeHeroFromLobby,
  syncCoopLobbyWithPlayers,
  toggleLocalReady,
} from "@/shared/engine/game/coopParty";
import { createPlayer } from "@/shared/engine/game/playerFactory";
import { createRunFromPlayers } from "@/shared/engine/game/runFactory";
import { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import type { SavedRunInfo } from "@/shared/engine/game/runSaveSystem";
import { createRunSeed } from "@/shared/platform/random";
import { ClassType, Player } from "@/shared/types/game";
import { mobileRunSaveSystem } from "../platform/mobileRunSaveSystem";
import {
  createHostedCoopSession,
  fetchCoopSessionById,
  isSupabaseCoopConfigured,
  joinHostedCoopSession,
  publishCoopLobby,
  publishCoopRun,
  type SupabaseCoopClientState,
} from "../platform/supabaseCoopClient";
import { etherniaTheme } from "../styles/etherniaTheme";
import { attributeColors } from "../styles/statColors";
import {
  EtherniaButton,
  EtherniaCard,
  EtherniaScreen,
  EtherniaStatPill,
} from "../components/design";
import { ClassIcon } from "../components/ClassIcon";
import type { MobileHomeGameMode } from "./MobileHomeScreen";
import { getClassPresentation } from "@/shared/engine/game/classPresentation";
import { getBiomeDisplayName, getClassDisplayName } from "@/shared/engine/game/displayLabels";
import { getClassFullbodySource } from "../assets/mobileAssets";

const classTypes = Object.keys(CLASSES) as ClassType[];

const READY_TEAM: Array<{ name: string; classType: ClassType }> = [
  { name: "Ronce", classType: "Guerrier" },
  { name: "Aube", classType: "Clerc" },
  { name: "Trait", classType: "Archer" },
];

function formatSavedDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CLASS_CHOICE_HINTS: Record<
  ClassType,
  { role: string; difficulty: string; starter: string; note: string }
> = {
  Guerrier: {
    role: "Protecteur",
    difficulty: "Simple",
    starter: "Épée et bouclier",
    note: "Encaisse, couvre les alliés et tient les lignes.",
  },
  Mage: {
    role: "Arcaniste",
    difficulty: "Intermédiaire",
    starter: "Bâton et réserve de mana",
    note: "Frappe fort, mais demande de surveiller le mana.",
  },
  Archer: {
    role: "Tireur",
    difficulty: "Simple",
    starter: "Arc et carquois",
    note: "Vise les cibles faibles et garde le rythme.",
  },
  Voleur: {
    role: "Lame vive",
    difficulty: "Intermédiaire",
    starter: "Dagues légères",
    note: "Profite des ouvertures et des cibles isolées.",
  },
  Demoniste: {
    role: "Occulte",
    difficulty: "Exigeant",
    starter: "Focus occulte",
    note: "Puissant si ses risques sont bien maîtrisés.",
  },
  Clerc: {
    role: "Soutien",
    difficulty: "Simple",
    starter: "Masse et talisman",
    note: "Protège le groupe et stabilise les longues runs.",
  },
  Sentinelle: {
    role: "Ancre hybride",
    difficulty: "Intermédiaire",
    starter: "Lame, focus et bouclier",
    note: "Stabilise l'équipe et ouvre les failles ennemies.",
  },
};

type TeamRoleScores = {
  survie: number;
  degats: number;
  soin: number;
  vitesse: number;
  controle: number;
};

const CLASS_TEAM_ROLES: Record<
  ClassType,
  TeamRoleScores & { label: string; role: string }
> = {
  Guerrier: {
    label: "Ancre",
    role: "Tank",
    survie: 35,
    degats: 14,
    soin: 0,
    vitesse: 8,
    controle: 10,
  },
  Mage: {
    label: "Burst",
    role: "Dégâts",
    survie: 8,
    degats: 34,
    soin: 0,
    vitesse: 12,
    controle: 16,
  },
  Archer: {
    label: "Focus",
    role: "Dégâts",
    survie: 12,
    degats: 28,
    soin: 0,
    vitesse: 24,
    controle: 8,
  },
  Voleur: {
    label: "Combo",
    role: "Rapide",
    survie: 10,
    degats: 26,
    soin: 0,
    vitesse: 30,
    controle: 6,
  },
  Demoniste: {
    label: "Pacte",
    role: "Contrôle",
    survie: 12,
    degats: 24,
    soin: 0,
    vitesse: 8,
    controle: 28,
  },
  Clerc: {
    label: "Foi",
    role: "Soutien",
    survie: 24,
    degats: 10,
    soin: 34,
    vitesse: 6,
    controle: 8,
  },
  Sentinelle: {
    label: "Voile",
    role: "Hybride",
    survie: 24,
    degats: 18,
    soin: 8,
    vitesse: 10,
    controle: 20,
  },
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getTeamScores(players: Player[]): TeamRoleScores {
  const raw = players.reduce<TeamRoleScores>(
    (scores, player) => {
      const role = CLASS_TEAM_ROLES[player.classType];
      scores.survie += role.survie;
      scores.degats += role.degats;
      scores.soin += role.soin;
      scores.vitesse += role.vitesse;
      scores.controle += role.controle;
      return scores;
    },
    { survie: 0, degats: 0, soin: 0, vitesse: 0, controle: 0 },
  );

  const max = Math.max(players.length, 1) * 35;
  return {
    survie: clampScore((raw.survie / max) * 100),
    degats: clampScore((raw.degats / max) * 100),
    soin: clampScore((raw.soin / max) * 100),
    vitesse: clampScore((raw.vitesse / max) * 100),
    controle: clampScore((raw.controle / max) * 100),
  };
}

function getTeamWarnings(players: Player[], scores: TeamRoleScores) {
  if (players.length === 0)
    return ["Ajoute au moins un héros pour lire la composition."];

  const warnings: string[] = [];
  const hasTank = players.some((player) => player.classType === "Guerrier");
  const hasSupport = players.some((player) => player.classType === "Clerc");
  const damageCount = players.filter((player) =>
    ["Mage", "Archer", "Voleur", "Demoniste"].includes(player.classType),
  ).length;

  if (!hasTank && scores.survie < 45)
    warnings.push(
      "Survie fragile : un Guerrier ou un Clerc sécurise mieux la run.",
    );
  if (!hasSupport && scores.soin < 25)
    warnings.push(
      "Peu de soin : prévois des potions ou une route plus prudente.",
    );
  if (damageCount === 0 || scores.degats < 35)
    warnings.push("Dégâts faibles : les élites risquent de durer longtemps.");
  if (players.length === 1)
    warnings.push("Solo possible, mais plus risqué contre les boss.");
  if (players.length >= 3 && scores.survie >= 45 && scores.degats >= 45)
    warnings.push(
      "Composition prête : équilibre correct pour une run standard.",
    );

  return warnings.slice(0, 3);
}

function getTeamTags(players: Player[]) {
  const tags = new Set<string>();
  players.forEach((player) => {
    tags.add(CLASS_TEAM_ROLES[player.classType].role);
    CLASSES[player.classType].synergyTags
      .slice(0, 2)
      .forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).slice(0, 7);
}

function classScore(value: number, max: number) {
  return Math.max(8, Math.min(100, Math.round((value / max) * 100)));
}

function getDifficultyScore(classType: ClassType) {
  const difficulty = CLASS_CHOICE_HINTS[classType].difficulty;
  if (difficulty === "Simple") return 32;
  if (difficulty === "Intermédiaire") return 62;
  return 88;
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function createOnlineHeroId(seat: number, index: number) {
  return seat * 1000 + index + 1;
}

function ensurePlayersFromLobby(
  players: Player[],
  lobby: ReturnType<typeof createLocalCoopLobby>,
) {
  const nextPlayers = [...players];
  const playersById = new Map(nextPlayers.map((player) => [player.id, player]));

  lobby.seats.forEach((seat) => {
    if (
      seat.connection === "empty" ||
      !seat.heroId ||
      !seat.heroName ||
      !seat.heroClassType
    )
      return;
    if (playersById.has(seat.heroId)) return;
    const player = createPlayer({
      id: seat.heroId,
      name: seat.heroName,
      classType: seat.heroClassType,
    });
    nextPlayers.push(player);
    playersById.set(player.id, player);
  });

  return nextPlayers;
}

function buildRunPlayersForLobby(
  players: Player[],
  lobby: ReturnType<typeof createLocalCoopLobby>,
) {
  const playersById = new Map(players.map((player) => [player.id, player]));

  return lobby.seats
    .filter((seat) => seat.connection !== "empty" && seat.heroId !== null)
    .map((seat, index) => {
      const existing = seat.heroId ? playersById.get(seat.heroId) : null;
      if (existing) return existing;
      if (!seat.heroName || !seat.heroClassType) return null;
      return createPlayer({
        id:
          typeof seat.heroId === "number"
            ? seat.heroId
            : createOnlineHeroId(seat.seat, index),
        name: seat.heroName,
        classType: seat.heroClassType,
      });
    })
    .filter((player): player is Player => player !== null);
}

type MobileLobbyScreenProps = {
  entryMode?: MobileHomeGameMode;
  initialJoinCode?: string;
  onBackHome?: () => void;
  onOpenRun?: (run: EtherniaRunSave) => void;
};

const MODE_COPY: Record<
  MobileHomeGameMode,
  { title: string; subtitle: string; action: string }
> = {
  solo: {
    title: "Choisir les héros",
    subtitle: "Compose ton groupe localement avant d’ouvrir la faille.",
    action: "Ouvrir la faille",
  },
  host: {
    title: "Salon hôte",
    subtitle:
      "Crée une table, partage le code et publie la run pour les invités.",
    action: "Publier et ouvrir",
  },
  join: {
    title: "Salon invité",
    subtitle:
      "Rejoins une table avec son code, choisis ta place, puis attends l’hôte.",
    action: "En attente de l’hôte",
  },
};

export function MobileLobbyScreen({
  entryMode = "solo",
  initialJoinCode = "",
  onBackHome,
  onOpenRun,
}: MobileLobbyScreenProps) {
  const [sessionMode, setSessionMode] = useState<MobileHomeGameMode>(entryMode);
  const [name, setName] = useState("");
  const [selectedClass, setSelectedClass] = useState<ClassType>("Guerrier");
  const [players, setPlayers] = useState<Player[]>([]);
  const [runSeed, setRunSeed] = useState(() => createRunSeed());
  const [activeRun, setActiveRun] = useState<EtherniaRunSave | null>(null);
  const [savedRunInfo, setSavedRunInfo] = useState<SavedRunInfo | null>(null);
  const [loadingSave, setLoadingSave] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [coopLobby, setCoopLobby] = useState(() => createLocalCoopLobby());
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [coopBackend, setCoopBackend] = useState<SupabaseCoopClientState>(
    () => ({
      configured: isSupabaseCoopConfigured(),
      url: null,
      sessionId: null,
      tableCode: null,
      deviceId: null,
      isHost: false,
      status: isSupabaseCoopConfigured() ? "hors ligne" : "erreur",
      message: isSupabaseCoopConfigured()
        ? "Supabase prêt, table non liée."
        : "Ajoute EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    }),
  );
  const [coopNetworkBusy, setCoopNetworkBusy] = useState(false);
  const autoHostStartedRef = useRef(false);
  const autoJoinStartedRef = useRef(false);
  const lastPublishedLobbyRef = useRef("");
  const lastRemoteLobbyRef = useRef("");
  const [onlineSyncLabel, setOnlineSyncLabel] = useState("hors ligne");

  const canAddPlayer = name.trim().length > 0 && players.length < MAX_PLAYERS;
  const coopSummary = useMemo(
    () => getCoopLobbySummary(coopLobby),
    [coopLobby],
  );
  const coopStartIssues = useMemo(
    () => getCoopStartIssues(coopLobby),
    [coopLobby],
  );
  const canStartRun =
    (sessionMode === "solo" ? players.length > 0 : true) &&
    (sessionMode === "solo" ||
      (sessionMode === "host" && coopSummary.canStart));

  const selectedClassData = CLASSES[selectedClass];
  const selectedPresentation = getClassPresentation(selectedClass);
  const selectedChoiceHint = CLASS_CHOICE_HINTS[selectedClass];
  const teamPowerPreview = useMemo(
    () =>
      players.reduce(
        (total, player) =>
          total +
          player.stats.maxHp +
          player.stats.strength +
          player.stats.magic,
        0,
      ),
    [players],
  );
  const teamScores = useMemo(() => getTeamScores(players), [players]);
  const teamWarnings = useMemo(
    () => getTeamWarnings(players, teamScores),
    [players, teamScores],
  );
  const teamTags = useMemo(() => getTeamTags(players), [players]);

  const refreshSavedRunInfo = useCallback(async () => {
    setLoadingSave(true);
    try {
      setSavedRunInfo(await mobileRunSaveSystem.getSavedRunInfo());
    } finally {
      setLoadingSave(false);
    }
  }, []);

  useEffect(() => {
    setSessionMode(entryMode);
    setJoinCode(initialJoinCode);
    autoHostStartedRef.current = false;
    autoJoinStartedRef.current = false;
  }, [entryMode, initialJoinCode]);

  useEffect(() => {
    void refreshSavedRunInfo();
  }, [refreshSavedRunInfo]);

  useEffect(() => {
    setCoopLobby((currentLobby) =>
      syncCoopLobbyWithPlayers(currentLobby, players),
    );
  }, [players]);

  const addPlayer = () => {
    if (!canAddPlayer) return;

    setPlayers((currentPlayers) => {
      const nextPlayer = createPlayer({
        id:
          sessionMode === "solo"
            ? currentPlayers.length + 1
            : createOnlineHeroId(coopLobby.localSeat, currentPlayers.length),
        name,
        classType: selectedClass,
      });
      setCoopLobby((currentLobby) =>
        assignHeroToSeat(currentLobby, nextPlayer),
      );
      return [...currentPlayers, nextPlayer];
    });
    setName("");
    setFeedback(null);
  };

  const resetTeam = () => {
    setPlayers([]);
    setCoopLobby((currentLobby) => syncCoopLobbyWithPlayers(currentLobby, []));
    setRunSeed(createRunSeed());
    setFeedback(null);
  };

  const applyReadyTeam = () => {
    const readyPlayers = READY_TEAM.map((hero, index) =>
      createPlayer({
        id: index + 1,
        name: hero.name,
        classType: hero.classType,
      }),
    );

    setPlayers(readyPlayers);
    setCoopLobby((currentLobby) =>
      readyPlayers.reduce(
        (lobby, player, index) => assignHeroToSeat(lobby, player, index),
        syncCoopLobbyWithPlayers(currentLobby, []),
      ),
    );
    setRunSeed(createRunSeed());
    setFeedback("Groupe prêt. Tu peux ouvrir la faille.");
  };

  const removePlayer = (playerId: number) => {
    setPlayers((currentPlayers) =>
      currentPlayers.filter((player) => player.id !== playerId),
    );
    setCoopLobby((currentLobby) => removeHeroFromLobby(currentLobby, playerId));
    setFeedback(null);
  };

  const hostOnlineTable = async () => {
    if (!isSupabaseCoopConfigured()) {
      setFeedback("Supabase n'est pas configuré dans .env.");
      return;
    }

    setCoopNetworkBusy(true);
    try {
      const nextLobby = syncCoopLobbyWithPlayers(
        createLocalCoopLobby(createPartyCode()),
        players,
      );
      const snapshot = await createHostedCoopSession(nextLobby);
      if (!snapshot) throw new Error("Création de table impossible.");
      const hostedLobby = snapshot.lobby_state ?? nextLobby;
      setCoopLobby(hostedLobby);
      lastPublishedLobbyRef.current = safeStringify(hostedLobby);
      lastRemoteLobbyRef.current = safeStringify(hostedLobby);
      setOnlineSyncLabel("salon créé");
      setCoopBackend({
        configured: true,
        url: null,
        sessionId: snapshot.id,
        tableCode: snapshot.table_code,
        deviceId: snapshot.host_device_id,
        isHost: true,
        status: "lié",
        message: "Salon créé. Partage le code aux invités.",
      });
      setFeedback(`Salon ${snapshot.table_code} créé.`);
    } catch (error) {
      setCoopBackend((current) => ({
        ...current,
        status: "erreur",
        message: error instanceof Error ? error.message : "Erreur Supabase.",
      }));
      setFeedback(error instanceof Error ? error.message : "Erreur Supabase.");
    } finally {
      setCoopNetworkBusy(false);
    }
  };

  const joinOnlineTable = async () => {
    if (!isSupabaseCoopConfigured()) {
      setFeedback("Supabase n'est pas configuré dans .env.");
      return;
    }

    setCoopNetworkBusy(true);
    try {
      const { snapshot, lobby } = await joinHostedCoopSession(joinCode);
      setPlayers([]);
      setCoopLobby(lobby);
      lastPublishedLobbyRef.current = safeStringify(lobby);
      lastRemoteLobbyRef.current = safeStringify(lobby);
      setOnlineSyncLabel("salon rejoint");
      setCoopBackend({
        configured: true,
        url: null,
        sessionId: snapshot.id,
        tableCode: snapshot.table_code,
        deviceId: null,
        isHost: false,
        status: "lié",
        message: "Table rejointe. L'hôte garde la run source.",
      });
      setFeedback(`Table ${snapshot.table_code} rejointe.`);
    } catch (error) {
      setCoopBackend((current) => ({
        ...current,
        status: "erreur",
        message: error instanceof Error ? error.message : "Table introuvable.",
      }));
      setFeedback(
        error instanceof Error ? error.message : "Table introuvable.",
      );
    } finally {
      setCoopNetworkBusy(false);
    }
  };

  useEffect(() => {
    if (
      sessionMode !== "host" ||
      autoHostStartedRef.current ||
      coopBackend.sessionId
    )
      return;
    autoHostStartedRef.current = true;
    void hostOnlineTable();
  }, [sessionMode, coopBackend.sessionId]);

  useEffect(() => {
    if (sessionMode !== "join" || autoJoinStartedRef.current || !joinCode)
      return;
    autoJoinStartedRef.current = true;
    void joinOnlineTable();
  }, [sessionMode, joinCode]);

  useEffect(() => {
    if (
      sessionMode === "solo" ||
      !coopBackend.sessionId ||
      coopBackend.status !== "lié"
    )
      return;
    const serialized = safeStringify(coopLobby);
    if (!serialized || serialized === lastPublishedLobbyRef.current) return;

    const timeoutId = setTimeout(() => {
      void publishCoopLobby(coopBackend.sessionId as string, coopLobby)
        .then((snapshot) => {
          lastPublishedLobbyRef.current = serialized;
          if (snapshot?.lobby_state) {
            lastRemoteLobbyRef.current = safeStringify(snapshot.lobby_state);
          }
          setOnlineSyncLabel("salon synchronisé");
        })
        .catch((error) => {
          setOnlineSyncLabel("sync échouée");
          setFeedback(
            error instanceof Error
              ? error.message
              : "Synchronisation impossible.",
          );
        });
    }, 450);

    return () => clearTimeout(timeoutId);
  }, [coopBackend.sessionId, coopBackend.status, coopLobby, sessionMode]);

  useEffect(() => {
    if (
      sessionMode === "solo" ||
      !coopBackend.sessionId ||
      coopBackend.status !== "lié"
    )
      return;

    let cancelled = false;
    const syncRemoteSession = async () => {
      try {
        const snapshot = await fetchCoopSessionById(
          coopBackend.sessionId as string,
        );
        if (cancelled || !snapshot) return;

        if (snapshot.status === "running" && snapshot.run_state) {
          const receivedRun = attachCoopBackendToRun(snapshot.run_state, {
            sessionId: snapshot.id,
            localSeat: coopLobby.localSeat,
            isHostDevice: false,
          });
          await mobileRunSaveSystem.saveRun(receivedRun);
          setActiveRun(receivedRun);
          setPlayers(receivedRun.players);
          setOnlineSyncLabel("run reçue");
          onOpenRun?.(receivedRun);
          return;
        }

        const remoteLobby = snapshot.lobby_state;
        if (remoteLobby) {
          const remoteSerialized = safeStringify(remoteLobby);
          if (
            remoteSerialized &&
            remoteSerialized !== lastRemoteLobbyRef.current
          ) {
            lastRemoteLobbyRef.current = remoteSerialized;
            lastPublishedLobbyRef.current = remoteSerialized;
            setCoopLobby(remoteLobby);
            setPlayers((currentPlayers) =>
              ensurePlayersFromLobby(currentPlayers, remoteLobby),
            );
            setOnlineSyncLabel("salon à jour");
          }
        }
      } catch (error) {
        if (!cancelled) {
          setOnlineSyncLabel("lecture échouée");
        }
      }
    };

    void syncRemoteSession();
    const intervalId = setInterval(syncRemoteSession, 2200);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [coopBackend.sessionId, coopBackend.status, onOpenRun, sessionMode]);

  const startRun = async () => {
    if (!canStartRun) return;

    const runPlayers =
      sessionMode === "host"
        ? buildRunPlayersForLobby(players, coopLobby)
        : players;
    const createdRun = createRunFromPlayers({
      players: runPlayers,
      runSeed,
      coopSession: createCoopRunSession(coopLobby, runPlayers),
    });
    const run = attachCoopBackendToRun(createdRun, {
      sessionId: coopBackend.sessionId,
      localSeat: coopLobby.localSeat,
      isHostDevice: coopBackend.isHost,
    });
    if (coopBackend.sessionId && coopBackend.isHost) {
      try {
        await publishCoopRun(coopBackend.sessionId, run);
      } catch (error) {
        setFeedback(
          error instanceof Error
            ? error.message
            : "Run locale créée, publication échouée.",
        );
      }
    }
    await mobileRunSaveSystem.saveRun(run);
    setActiveRun(run);
    setFeedback("Faille ouverte pour le groupe prêt.");
    onOpenRun?.(run);
    await refreshSavedRunInfo();
  };

  const continueRun = async () => {
    const run = await mobileRunSaveSystem.loadRun();

    if (!run) {
      setFeedback("Aucune sauvegarde mobile valide trouvée.");
      await refreshSavedRunInfo();
      return;
    }

    setActiveRun(run);
    onOpenRun?.(run);
    setPlayers(run.players);
    setCoopLobby((currentLobby) =>
      run.players.reduce(
        (lobby, player) => assignHeroToSeat(lobby, player),
        syncCoopLobbyWithPlayers(currentLobby, []),
      ),
    );
    setRunSeed(run.runSeed ?? createRunSeed());
    setFeedback("Run chargée depuis AsyncStorage.");
    await refreshSavedRunInfo();
  };

  const deleteSavedRun = async () => {
    await mobileRunSaveSystem.deleteRun();
    setSavedRunInfo(null);
    setActiveRun(null);
    setFeedback("Sauvegarde mobile supprimée.");
  };

  return (
    <EtherniaScreen>
      {onBackHome ? (
        <View style={styles.lobbyTopBar}>
          <Pressable
            onPress={onBackHome}
            style={({ pressed }) => [
              styles.backHomeButton,
              pressed && styles.pressedCard,
            ]}
          >
            <Text style={styles.backHomeText}>Accueil</Text>
          </Pressable>
        </View>
      ) : null}

      <EtherniaCard variant={savedRunInfo ? "gold" : "default"}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Sauvegarde mobile</Text>
          {loadingSave ? (
            <ActivityIndicator color={etherniaTheme.colors.gold} />
          ) : null}
        </View>

        {savedRunInfo ? (
          <View style={styles.saveCardInner}>
            <Text style={styles.saveTitle}>Partie sauvegardée</Text>
            <Text style={styles.saveText}>
              Étage {savedRunInfo.currentFloor} · {savedRunInfo.heroCount} héros
            </Text>
            <Text style={styles.saveText}>
              Tour de {savedRunInfo.currentPlayerName ?? "héros inconnu"}
            </Text>
            <Text style={styles.saveDate}>
              Sauvegardée le {formatSavedDate(savedRunInfo.savedAt)}
            </Text>

            <View style={styles.buttonRow}>
              <EtherniaButton onPress={continueRun}>Continuer</EtherniaButton>
              <EtherniaButton onPress={deleteSavedRun} tone="danger">
                Effacer
              </EtherniaButton>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>
            Aucune sauvegarde mobile pour le moment.
          </Text>
        )}
      </EtherniaCard>

      <EtherniaCard>
        <Text style={styles.sectionTitle}>Créer un héros</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nom du héros"
          placeholderTextColor={etherniaTheme.colors.muted}
          style={styles.input}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.classList}
        >
          {classTypes.map((classType) => {
            const isSelected = classType === selectedClass;
            const classData = CLASSES[classType];

            return (
              <Pressable
                key={classType}
                onPress={() => setSelectedClass(classType)}
                style={({ pressed }) => [
                  styles.classCard,
                  {
                    borderColor: isSelected
                      ? getClassPresentation(classType).accent
                      : etherniaTheme.colors.borderSoft,
                  },
                  isSelected && styles.classCardSelected,
                  pressed && styles.pressedCard,
                ]}
              >
                <View style={styles.classArtFrame}>
                  <Image
                    source={getClassFullbodySource(classType)}
                    style={styles.classArtImage}
                    resizeMode="contain"
                  />
                  <View style={styles.classArtShade} />
                </View>
                <View style={styles.classIdentityRow}>
                  <ClassIcon
                    classType={classType}
                    variant="portrait"
                    size="md"
                    active={isSelected}
                  />
                  <View style={styles.classIdentityText}>
                    <Text style={styles.className}>{getClassDisplayName(classType)}</Text>
                    <Text style={styles.classRole}>
                      {getClassPresentation(classType).short}
                    </Text>
                  </View>
                </View>
                <Text style={styles.classDescription} numberOfLines={3}>
                  {classData.shortDescription}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.classPreviewCard}>
          <View style={styles.classPreviewHeroRow}>
            <View style={styles.classPreviewInfoColumn}>
              <View style={styles.classPreviewHeader}>
                <View
                  style={[
                    styles.classAccentOrb,
                    { backgroundColor: selectedPresentation.accent },
                  ]}
                />
                <View style={styles.classPreviewTitleBlock}>
                  <Text style={styles.classPreviewTitle}>
                    {selectedPresentation.title}
                  </Text>
                  <Text style={styles.classPreviewMeta}>
                    {selectedChoiceHint.role} · {selectedChoiceHint.difficulty}
                  </Text>
                </View>
              </View>
              <Text style={styles.classPreviewText}>{selectedChoiceHint.note}</Text>
            </View>
            <View style={styles.classPreviewArtFrame}>
              <Image
                source={getClassFullbodySource(selectedClass)}
                style={styles.classPreviewArt}
                resizeMode="contain"
              />
            </View>
          </View>
          <View style={styles.hintGrid}>
            <View style={styles.hintPill}>
              <Text style={styles.hintLabel}>Départ</Text>
              <Text style={styles.hintValue}>{selectedChoiceHint.starter}</Text>
            </View>
            <View style={styles.hintPill}>
              <Text style={styles.hintLabel}>Traits</Text>
              <Text style={styles.hintValue}>
                {selectedClassData.synergyTags.slice(0, 2).join(" · ")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <EtherniaStatPill
            label="PV"
            value={selectedClassData.stats.maxHp}
            tone="hp"
          />
          <EtherniaStatPill
            label="Mana"
            value={selectedClassData.stats.maxMana}
            tone="mana"
          />
          <EtherniaStatPill
            label="FOR"
            value={selectedClassData.stats.strength}
            tone="strength"
          />
          <EtherniaStatPill
            label="MAG"
            value={selectedClassData.stats.magic}
            tone="magic"
          />
          <EtherniaStatPill
            label="DEF"
            value={selectedClassData.stats.defense}
            tone="defense"
          />
          <EtherniaStatPill
            label="VIT"
            value={selectedClassData.stats.speed}
            tone="speed"
          />
        </View>



        <EtherniaButton onPress={addPlayer} disabled={!canAddPlayer}>
          Ajouter le héros
        </EtherniaButton>
      </EtherniaCard>

      <EtherniaCard>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Groupe</Text>
          <Text style={styles.muted}>
            {players.length}/{MAX_PLAYERS}
          </Text>
        </View>

        <View style={styles.readyTeamBar}>
          <View style={styles.readyTeamTextBlock}>
            <Text style={styles.readyTeamTitle}>Rendu rapide</Text>
            <Text style={styles.readyTeamText}>Ajoute une équipe équilibrée en un geste.</Text>
          </View>
          <EtherniaButton tone="secondary" onPress={applyReadyTeam}>
            Groupe prêt
          </EtherniaButton>
        </View>

        {sessionMode !== "solo" ? (
          <View style={styles.tableStrip}>
            <View style={styles.tableStripItem}>
              <Text style={styles.tableStripLabel}>
                {sessionMode === "host" ? "Code" : "Table"}
              </Text>
              <Text style={styles.tableStripValue}>
                {coopBackend.tableCode ?? joinCode ?? "…"}
              </Text>
            </View>
            <View style={styles.tableStripItem}>
              <Text style={styles.tableStripLabel}>Places</Text>
              <Text style={styles.tableStripValue}>
                {coopSummary.ready}/{coopSummary.connected}
              </Text>
            </View>
            <View style={styles.tableStripItem}>
              <Text style={styles.tableStripLabel}>Seed</Text>
              <Text style={styles.tableStripValue} numberOfLines={1}>
                {runSeed}
              </Text>
            </View>
          </View>
        ) : null}

        {players.length === 0 ? (
          <Text style={styles.emptyText}>Aucun héros pour le moment.</Text>
        ) : (
          players.map((player) => (
            <View key={player.id} style={styles.playerRow}>
              <View style={styles.playerRowHeader}>
                <ClassIcon
                  classType={player.classType}
                  variant="state"
                  size="md"
                />
                <View style={styles.playerRowText}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerMeta}>
                    {getClassDisplayName(player.classType)} · PV {player.stats.maxHp} · Niv.{" "}
                    {player.level}
                  </Text>
                </View>
                <Pressable
                  onPress={() => removePlayer(player.id)}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.removeHeroButton,
                    pressed && styles.pressedCard,
                  ]}
                >
                  <Text style={styles.removeHeroText}>×</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {sessionMode !== "solo" ? (
          <View style={styles.compactSeats}>
            {coopLobby.seats.map((seat) => {
              const assignedHero = players.find(
                (player) => player.id === seat.heroId,
              );
              return (
                <View
                  key={seat.seat}
                  style={[
                    styles.compactSeat,
                    seat.ready && styles.compactSeatReady,
                  ]}
                >
                  <Text style={styles.compactSeatName} numberOfLines={1}>
                    {seat.isHost ? "Hôte" : seat.name}
                  </Text>
                  <Text style={styles.compactSeatHero} numberOfLines={1}>
                    {assignedHero
                      ? `${assignedHero.name} · ${getClassDisplayName(assignedHero.classType)}`
                      : seat.connection === "empty"
                        ? "Libre"
                        : "Héros à choisir"}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {players.length > 0 ? (
          <View style={styles.teamReadout}>
            <Text style={styles.teamReadoutTitle}>Lecture du groupe</Text>
            <View style={styles.teamScoreGrid}>
              <TeamScore label="Survie" value={teamScores.survie} color={attributeColors.defense.color} />
              <TeamScore label="Dégâts" value={teamScores.degats} color={attributeColors.strength.color} />
              <TeamScore label="Soin" value={teamScores.soin} color={attributeColors.magic.color} />
              <TeamScore label="Vitesse" value={teamScores.vitesse} color={attributeColors.speed.color} />
            </View>
            {teamTags.length > 0 ? (
              <View style={styles.teamTags}>
                {teamTags.map((tag) => (
                  <Text key={tag} style={styles.teamTag}>{tag}</Text>
                ))}
              </View>
            ) : null}
            {teamWarnings.map((warning) => (
              <Text key={warning} style={styles.warningLine}>• {warning}</Text>
            ))}
          </View>
        ) : null}

        <View style={styles.startSummary}>
          <Text style={styles.startLine}>Départ conseillé : 1 à 3 héros. Lance vite, puis enchaîne carte, combat et récompense.</Text>
          <Text style={styles.startLine}>Le jeu reste mobile-first : gros boutons, textes courts, sauvegarde locale.</Text>
        </View>

        {sessionMode !== "solo" ? (
          <EtherniaButton
            tone={
              coopLobby.seats[coopLobby.localSeat]?.ready
                ? "primary"
                : "secondary"
            }
            onPress={() =>
              setCoopLobby((currentLobby) => toggleLocalReady(currentLobby))
            }
          >
            {coopLobby.seats[coopLobby.localSeat]?.ready ? "Prêt" : "Pas prêt"}
          </EtherniaButton>
        ) : null}

        <View style={styles.buttonRow}>
          <EtherniaButton onPress={resetTeam} tone="secondary">
            Réinitialiser
          </EtherniaButton>
          <EtherniaButton onPress={startRun} disabled={!canStartRun}>
            {MODE_COPY[sessionMode].action}
          </EtherniaButton>
        </View>
      </EtherniaCard>

      {activeRun ? (
        <EtherniaCard variant="raised">
          <Text style={styles.sectionTitle}>Run active</Text>
          <Text style={styles.runLine}>
            Étage {activeRun.currentFloor} · Biome {getBiomeDisplayName(activeRun.currentFloorBiome)}
          </Text>
          <Text style={styles.runLine}>
            Carte : {activeRun.nodes.length} nœuds · {activeRun.mapWidth}×
            {activeRun.mapHeight}
          </Text>
          <Text style={styles.runLine}>
            Corruption : niveau {activeRun.corruptionLevel} · charge{" "}
            {activeRun.corruptionCharge}
          </Text>
          <EtherniaButton onPress={() => onOpenRun?.(activeRun)}>
            Ouvrir la carte native
          </EtherniaButton>
          <Text style={styles.muted}>
            La carte native Expo est disponible : déplacement tactile, détails
            de nœud et sauvegarde mobile après mouvement.
          </Text>
        </EtherniaCard>
      ) : null}

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </EtherniaScreen>
  );
}

function TeamScore({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.teamScoreItem}>
      <View style={styles.rowBetween}>
        <Text style={styles.teamScoreLabel}>{label}</Text>
        <Text style={styles.teamScoreValue}>{value}</Text>
      </View>
      <View style={styles.teamScoreTrack}>
        <View
          style={[
            styles.teamScoreFill,
            { width: `${value}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  lobbyTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: etherniaTheme.spacing.sm,
    paddingHorizontal: etherniaTheme.spacing.sm,
    paddingVertical: 2,
  },
  lobbyModeBlock: {
    flex: 1,
    alignItems: "flex-end",
  },
  lobbyModeHint: {
    color: etherniaTheme.colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  lobbyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: etherniaTheme.spacing.sm,
    marginBottom: etherniaTheme.spacing.sm,
  },
  backHomeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  backHomeText: {
    color: etherniaTheme.colors.text,
    fontWeight: "900",
    fontSize: 12,
  },
  lobbyModeLabel: {
    color: etherniaTheme.colors.gold,
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  modePills: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
    backgroundColor: "rgba(0,0,0,0.16)",
  },
  modePillActive: {
    borderColor: "rgba(242,193,91,0.48)",
    backgroundColor: "rgba(242,193,91,0.16)",
  },
  modePillText: {
    color: etherniaTheme.colors.textDim,
    fontWeight: "900",
    fontSize: 11,
  },
  modePillTextActive: {
    color: etherniaTheme.colors.gold,
  },
  partyPanel: {
    gap: etherniaTheme.spacing.sm,
  },
  onlineBox: {
    padding: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(88,214,141,0.28)",
    backgroundColor: "rgba(88,214,141,0.07)",
    gap: etherniaTheme.spacing.xs,
  },
  onlineStatus: {
    color: "#58d68d",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  partyTopRow: {
    flexDirection: "row",
    gap: etherniaTheme.spacing.sm,
    alignItems: "stretch",
  },
  partyStateBox: {
    flex: 1,
    padding: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.md,
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
    backgroundColor: "rgba(255,255,255,0.045)",
    justifyContent: "center",
  },
  partyStateText: {
    color: etherniaTheme.colors.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3,
  },
  partyStateMeta: {
    color: etherniaTheme.colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  partyCodeBox: {
    padding: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(242,193,91,0.28)",
    backgroundColor: "rgba(242,193,91,0.10)",
  },
  partyLabel: {
    color: etherniaTheme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  partyCode: {
    color: etherniaTheme.colors.gold,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 4,
    marginTop: 3,
  },
  partySlots: {
    gap: etherniaTheme.spacing.xs,
  },
  partySlot: {
    paddingHorizontal: etherniaTheme.spacing.sm,
    paddingVertical: 8,
    borderRadius: etherniaTheme.radius.md,
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  partySlotFilled: {
    borderColor: "rgba(242,193,91,0.35)",
    backgroundColor: "rgba(242,193,91,0.08)",
  },
  partySlotName: {
    color: etherniaTheme.colors.text,
    fontWeight: "900",
    fontSize: 12,
  },
  partySlotMeta: {
    color: etherniaTheme.colors.textDim,
    marginTop: 3,
    fontSize: 11,
    fontWeight: "700",
  },

  partySlotReady: {
    borderColor: "rgba(88,214,141,0.42)",
    backgroundColor: "rgba(88,214,141,0.08)",
  },
  partySlotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  partySeatBadge: {
    color: etherniaTheme.colors.gold,
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(242,193,91,0.12)",
    overflow: "hidden",
  },
  partySlotActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 6,
  },
  partyMiniAction: {
    minWidth: 58,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
    backgroundColor: "rgba(0,0,0,0.16)",
  },
  partyMiniActionActive: {
    borderColor: "rgba(242,193,91,0.42)",
    backgroundColor: "rgba(242,193,91,0.16)",
  },
  partyMiniActionText: {
    color: etherniaTheme.colors.text,
    fontSize: 10,
    fontWeight: "900",
  },
  partyHint: {
    color: etherniaTheme.colors.textDim,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  partyRulesBox: {
    padding: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.md,
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
    backgroundColor: "rgba(0,0,0,0.14)",
    gap: 4,
  },
  partyRulesTitle: {
    color: etherniaTheme.colors.text,
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
  },
  partyRuleLine: {
    color: etherniaTheme.colors.textDim,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  partyRuleOk: {
    color: "#58d68d",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
  },
  joinRow: {
    flexDirection: "row",
    gap: etherniaTheme.spacing.sm,
    alignItems: "center",
  },
  joinInput: {
    flex: 1,
    minHeight: 44,
  },
  heroPanel: {
    minHeight: 210,
    justifyContent: "center",
  },
  heroRune: {
    position: "absolute",
    right: 18,
    top: 12,
    color: "rgba(242,193,91,0.22)",
    fontSize: 72,
    fontWeight: "900",
  },
  seedBox: {
    marginTop: etherniaTheme.spacing.sm,
    padding: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.md,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
  },
  seedLabel: {
    color: etherniaTheme.colors.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  seed: {
    color: etherniaTheme.colors.gold,
    marginTop: 3,
    fontWeight: "900",
  },
  tableStrip: {
    flexDirection: "row",
    gap: etherniaTheme.spacing.xs,
    marginTop: etherniaTheme.spacing.xs,
    marginBottom: etherniaTheme.spacing.sm,
  },
  tableStripItem: {
    flex: 1,
    paddingHorizontal: etherniaTheme.spacing.sm,
    paddingVertical: 8,
    borderRadius: etherniaTheme.radius.md,
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
    backgroundColor: "rgba(0,0,0,0.16)",
  },
  tableStripLabel: {
    color: etherniaTheme.colors.muted,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  tableStripValue: {
    color: etherniaTheme.colors.text,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2,
  },
  compactSeats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: etherniaTheme.spacing.xs,
    marginTop: etherniaTheme.spacing.sm,
  },
  compactSeat: {
    width: "48%",
    padding: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.md,
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  compactSeatReady: {
    borderColor: "rgba(88,214,141,0.42)",
    backgroundColor: "rgba(88,214,141,0.08)",
  },
  compactSeatName: {
    color: etherniaTheme.colors.gold,
    fontSize: 11,
    fontWeight: "900",
  },
  compactSeatHero: {
    color: etherniaTheme.colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  sectionTitle: {
    color: etherniaTheme.colors.text,
    fontSize: etherniaTheme.typography.section,
    fontWeight: "900",
  },
  input: {
    minHeight: etherniaTheme.touch.comfortableTarget,
    borderRadius: etherniaTheme.radius.md,
    borderWidth: 1,
    borderColor: etherniaTheme.colors.border,
    color: etherniaTheme.colors.text,
    paddingHorizontal: etherniaTheme.spacing.md,
    backgroundColor: "rgba(255,255,255,0.055)",
    fontWeight: "800",
  },
  classList: {
    gap: etherniaTheme.spacing.sm,
  },
  classCard: {
    width: 172,
    minHeight: 268,
    padding: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.lg,
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
    backgroundColor: "rgba(255,255,255,0.055)",
  },
  classCardSelected: {
    borderColor: etherniaTheme.colors.gold,
    backgroundColor: "rgba(242,193,91,0.14)",
  },
  pressedCard: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  classArtFrame: {
    height: 148,
    borderRadius: etherniaTheme.radius.md,
    overflow: "hidden",
    backgroundColor: "rgba(9,14,25,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  classArtImage: {
    width: "100%",
    height: "100%",
  },
  classArtShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 28,
    backgroundColor: "rgba(7,10,18,0.18)",
  },
  classIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: etherniaTheme.spacing.sm,
    marginTop: 8,
  },
  classIdentityText: {
    flex: 1,
  },
  className: {
    color: etherniaTheme.colors.text,
    fontWeight: "900",
  },
  classRole: {
    color: etherniaTheme.colors.gold,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3,
    textTransform: "uppercase",
  },
  classDescription: {
    color: etherniaTheme.colors.textDim,
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: etherniaTheme.spacing.sm,
  },
  classPreviewCard: {
    padding: etherniaTheme.spacing.md,
    borderRadius: etherniaTheme.radius.lg,
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
    backgroundColor: "rgba(255,255,255,0.055)",
    gap: etherniaTheme.spacing.sm,
  },
  classPreviewHeroRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: etherniaTheme.spacing.sm,
  },
  classPreviewInfoColumn: {
    flex: 1,
    gap: etherniaTheme.spacing.sm,
  },
  classPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: etherniaTheme.spacing.sm,
  },
  classPreviewArtFrame: {
    width: 126,
    height: 210,
    borderRadius: etherniaTheme.radius.md,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  classPreviewArt: {
    width: "100%",
    height: "100%",
  },
  classAccentOrb: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
  classPreviewTitleBlock: {
    flex: 1,
  },
  classPreviewTitle: {
    color: etherniaTheme.colors.text,
    fontWeight: "900",
    fontSize: 16,
  },
  classPreviewMeta: {
    color: etherniaTheme.colors.gold,
    fontWeight: "900",
    fontSize: 12,
    marginTop: 2,
  },
  classPreviewText: {
    color: etherniaTheme.colors.textDim,
    lineHeight: 19,
    fontWeight: "700",
  },
  hintGrid: {
    flexDirection: "row",
    gap: etherniaTheme.spacing.sm,
  },
  hintPill: {
    flex: 1,
    padding: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.md,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
  },
  hintLabel: {
    color: etherniaTheme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  hintValue: {
    color: etherniaTheme.colors.text,
    fontWeight: "900",
    marginTop: 3,
    fontSize: 12,
  },
  compareBars: {
    gap: 8,
    padding: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.md,
    backgroundColor: "rgba(0,0,0,0.16)",
  },
  compareTitle: {
    color: etherniaTheme.colors.text,
    fontWeight: "900",
    fontSize: 12,
    textTransform: "uppercase",
  },
  compareBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: etherniaTheme.spacing.sm,
  },
  compareLabel: {
    width: 56,
    color: etherniaTheme.colors.textDim,
    fontWeight: "900",
    fontSize: 12,
  },
  compareTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  compareFill: {
    height: "100%",
    borderRadius: 999,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: etherniaTheme.spacing.sm,
  },
  muted: {
    color: etherniaTheme.colors.muted,
    lineHeight: 20,
  },
  emptyText: {
    color: etherniaTheme.colors.muted,
    fontStyle: "italic",
  },
  playerRow: {
    borderRadius: etherniaTheme.radius.md,
    padding: etherniaTheme.spacing.md,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
  },
  playerRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: etherniaTheme.spacing.sm,
  },
  playerRowText: {
    flex: 1,
  },
  playerName: {
    color: etherniaTheme.colors.text,
    fontWeight: "900",
    fontSize: 16,
  },
  playerMeta: {
    color: etherniaTheme.colors.textDim,
    marginTop: 4,
  },
  readyTeamBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: etherniaTheme.spacing.sm,
    padding: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(242,193,91,0.22)",
    backgroundColor: "rgba(242,193,91,0.08)",
  },
  readyTeamTextBlock: {
    flex: 1,
  },
  readyTeamTitle: {
    color: etherniaTheme.colors.text,
    fontWeight: "900",
    fontSize: 13,
  },
  readyTeamText: {
    color: etherniaTheme.colors.textDim,
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: "row",
    gap: etherniaTheme.spacing.sm,
  },
  saveCardInner: {
    gap: 8,
  },
  saveTitle: {
    color: etherniaTheme.colors.text,
    fontWeight: "900",
    fontSize: 16,
  },
  saveText: {
    color: etherniaTheme.colors.text,
  },
  saveDate: {
    color: etherniaTheme.colors.muted,
    fontSize: 12,
  },
  runLine: {
    color: etherniaTheme.colors.text,
    fontWeight: "800",
  },

  removeHeroButton: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
  },
  removeHeroText: {
    color: etherniaTheme.colors.text,
    fontWeight: "900",
    fontSize: 18,
    lineHeight: 20,
  },
  teamReadout: {
    gap: etherniaTheme.spacing.sm,
    padding: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.lg,
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
    backgroundColor: "rgba(0,0,0,0.16)",
  },
  teamReadoutTitle: {
    color: etherniaTheme.colors.text,
    fontWeight: "900",
    fontSize: 13,
    textTransform: "uppercase",
  },
  teamScoreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: etherniaTheme.spacing.sm,
  },
  teamScoreItem: {
    flexBasis: "48%",
    flexGrow: 1,
    gap: 5,
  },
  teamScoreLabel: {
    color: etherniaTheme.colors.textDim,
    fontSize: 11,
    fontWeight: "900",
  },
  teamScoreValue: {
    color: etherniaTheme.colors.text,
    fontSize: 11,
    fontWeight: "900",
  },
  teamScoreTrack: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  teamScoreFill: {
    height: "100%",
    borderRadius: 999,
  },
  teamTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  teamTag: {
    color: etherniaTheme.colors.text,
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(242,193,91,0.12)",
    borderWidth: 1,
    borderColor: "rgba(242,193,91,0.25)",
  },
  warningLine: {
    color: etherniaTheme.colors.textDim,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  startSummary: {
    padding: etherniaTheme.spacing.sm,
    borderRadius: etherniaTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: etherniaTheme.colors.borderSoft,
    gap: 5,
  },
  startLine: {
    color: etherniaTheme.colors.textDim,
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 17,
  },
  feedback: {
    color: etherniaTheme.colors.gold,
    textAlign: "center",
    fontWeight: "900",
    paddingBottom: etherniaTheme.spacing.md,
  },
});
