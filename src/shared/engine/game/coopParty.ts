import { MAX_PLAYERS } from "./gameState";
import type { Player } from "@/shared/types/game";

export type CoopSeatConnection = "empty" | "local" | "reserved" | "remote";

export type CoopSeat = {
  seat: number;
  name: string;
  connection: CoopSeatConnection;
  ready: boolean;
  heroId: number | null;
  heroName: string | null;
  heroClassType?: Player["classType"] | null;
  isHost: boolean;
};

export type CoopLobbyState = {
  code: string;
  localSeat: number;
  hostSeat: number;
  seats: CoopSeat[];
};
export type CoopRunAssignment = {
  playerId: number;
  playerName: string;
  classType: Player["classType"];
  seat: number;
  seatName: string;
  connection: CoopSeatConnection;
  isHost: boolean;
};

export type CoopRunSession = {
  code: string;
  mode: "local_scaffold" | "supabase_host_guest";
  hostSeat: number;
  localSeat: number;
  turnPolicy: "seat_owner";
  createdAt: number;
  assignments: CoopRunAssignment[];
  backendSessionId?: string;
  isHostDevice?: boolean;
  lastSyncedAt?: number;
};

export function attachCoopBackendToRunSession(
  session: CoopRunSession | undefined,
  params: { sessionId?: string | null; localSeat?: number; isHostDevice?: boolean },
): CoopRunSession | undefined {
  if (!session) return session;
  return {
    ...session,
    backendSessionId: params.sessionId ?? session.backendSessionId,
    localSeat: typeof params.localSeat === "number" ? params.localSeat : session.localSeat,
    isHostDevice: params.isHostDevice ?? session.isHostDevice,
    lastSyncedAt: Date.now(),
  };
}

export function attachCoopBackendToRun<T extends { coopSession?: CoopRunSession }>(
  run: T,
  params: { sessionId?: string | null; localSeat?: number; isHostDevice?: boolean },
): T {
  if (!run.coopSession) return run;
  return {
    ...run,
    coopSession: attachCoopBackendToRunSession(run.coopSession, params),
  };
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createPartyCode(random = Math.random) {
  let code = "";
  for (let index = 0; index < 5; index += 1) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizePartyCode(code: string) {
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5);
}

function createEmptySeat(seat: number): CoopSeat {
  return {
    seat,
    name: `Place ${seat + 1}`,
    connection: "empty",
    ready: false,
    heroId: null,
    heroName: null,
    heroClassType: null,
    isHost: seat === 0,
  };
}

export function createLocalCoopLobby(code = createPartyCode()): CoopLobbyState {
  return {
    code,
    localSeat: 0,
    hostSeat: 0,
    seats: Array.from({ length: MAX_PLAYERS }).map((_, seat) => ({
      ...createEmptySeat(seat),
      name: seat === 0 ? "Joueur local" : `Place ${seat + 1}`,
      connection: seat === 0 ? "local" : "empty",
    })),
  };
}

export function joinPreparedCoopLobby(code: string): CoopLobbyState {
  const normalizedCode = normalizePartyCode(code) || createPartyCode();
  return {
    code: normalizedCode,
    localSeat: 1,
    hostSeat: 0,
    seats: Array.from({ length: MAX_PLAYERS }).map((_, seat) => ({
      ...createEmptySeat(seat),
      name:
        seat === 0
          ? "Hôte distant"
          : seat === 1
            ? "Joueur local"
            : `Place ${seat + 1}`,
      connection: seat === 0 ? "reserved" : seat === 1 ? "local" : "empty",
      isHost: seat === 0,
    })),
  };
}

export function resetCoopReady(lobby: CoopLobbyState): CoopLobbyState {
  return {
    ...lobby,
    seats: lobby.seats.map((seat) => ({ ...seat, ready: false })),
  };
}

export function toggleLocalReady(lobby: CoopLobbyState): CoopLobbyState {
  return {
    ...lobby,
    seats: lobby.seats.map((seat) =>
      seat.seat === lobby.localSeat && seat.connection !== "empty"
        ? { ...seat, ready: !seat.ready }
        : seat,
    ),
  };
}

export function assignHeroToSeat(
  lobby: CoopLobbyState,
  player: Player,
  preferredSeat?: number,
): CoopLobbyState {
  const targetSeat =
    typeof preferredSeat === "number"
      ? preferredSeat
      : lobby.seats.find((seat) => seat.connection !== "empty" && !seat.heroId)
          ?.seat ?? lobby.localSeat;

  return {
    ...resetCoopReady(lobby),
    seats: lobby.seats.map((seat) => {
      if (seat.heroId === player.id) {
        return { ...seat, heroId: null, heroName: null, heroClassType: null, ready: false };
      }

      if (seat.seat !== targetSeat) return seat;

      return {
        ...seat,
        connection: seat.connection === "empty" ? "local" : seat.connection,
        name: seat.connection === "empty" ? "Joueur local" : seat.name,
        heroId: player.id,
        heroName: player.name,
        heroClassType: player.classType,
        ready: false,
      };
    }),
  };
}

export function removeHeroFromLobby(
  lobby: CoopLobbyState,
  playerId: number,
): CoopLobbyState {
  return {
    ...resetCoopReady(lobby),
    seats: lobby.seats.map((seat) =>
      seat.heroId === playerId
        ? { ...seat, heroId: null, heroName: null, heroClassType: null, ready: false }
        : seat,
    ),
  };
}

export function reserveRemoteSeat(lobby: CoopLobbyState): CoopLobbyState {
  const emptySeat = lobby.seats.find((seat) => seat.connection === "empty");
  if (!emptySeat) return lobby;

  return {
    ...resetCoopReady(lobby),
    seats: lobby.seats.map((seat) =>
      seat.seat === emptySeat.seat
        ? {
            ...seat,
            name: `Invité ${seat.seat + 1}`,
            connection: "reserved",
            ready: false,
          }
        : seat,
    ),
  };
}

export function clearSeat(lobby: CoopLobbyState, seatIndex: number): CoopLobbyState {
  if (seatIndex === lobby.localSeat) {
    return {
      ...resetCoopReady(lobby),
      seats: lobby.seats.map((seat) =>
        seat.seat === seatIndex
          ? {
              ...seat,
              connection: "local",
              name: "Joueur local",
              ready: false,
              heroId: null,
              heroName: null,
              heroClassType: null,
            }
          : seat,
      ),
    };
  }

  return {
    ...resetCoopReady(lobby),
    seats: lobby.seats.map((seat) =>
      seat.seat === seatIndex ? createEmptySeat(seatIndex) : seat,
    ),
  };
}

export function syncCoopLobbyWithPlayers(
  lobby: CoopLobbyState,
  players: Player[],
): CoopLobbyState {
  const playersById = new Map(players.map((player) => [player.id, player]));

  return {
    ...lobby,
    seats: lobby.seats.map((seat) => {
      if (!seat.heroId) return seat;
      const player = playersById.get(seat.heroId);
      if (!player) return { ...seat, heroId: null, heroName: null, heroClassType: null, ready: false };
      return { ...seat, heroName: player.name, heroClassType: player.classType };
    }),
  };
}

export function getCoopLobbySummary(lobby: CoopLobbyState) {
  const connectedSeats = lobby.seats.filter(
    (seat) => seat.connection !== "empty",
  );
  const readySeats = connectedSeats.filter((seat) => seat.ready);
  const heroSeats = connectedSeats.filter((seat) => seat.heroId !== null);

  return {
    connected: connectedSeats.length,
    ready: readySeats.length,
    heroes: heroSeats.length,
    canStart:
      heroSeats.length > 0 &&
      connectedSeats.every((seat) => seat.heroId !== null && seat.ready),
  };
}


export function createCoopRunSession(lobby: CoopLobbyState, players: Player[]): CoopRunSession {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const assignments = lobby.seats
    .filter((seat) => seat.connection !== "empty" && seat.heroId !== null)
    .map((seat) => {
      const player = playersById.get(seat.heroId as number);
      return player
        ? {
            playerId: player.id,
            playerName: player.name,
            classType: player.classType,
            seat: seat.seat,
            seatName: seat.name,
            connection: seat.connection,
            isHost: seat.isHost,
          }
        : null;
    })
    .filter((assignment): assignment is CoopRunAssignment => assignment !== null);

  return {
    code: lobby.code,
    mode: "supabase_host_guest",
    hostSeat: lobby.hostSeat,
    localSeat: lobby.localSeat,
    turnPolicy: "seat_owner",
    createdAt: Date.now(),
    assignments,
  };
}

export function getCoopAssignmentForPlayer(
  session: CoopRunSession | undefined,
  playerId: number | undefined,
): CoopRunAssignment | null {
  if (!session || typeof playerId !== "number") return null;
  return session.assignments.find((assignment) => assignment.playerId === playerId) ?? null;
}

export function getCoopTurnOwnerLabel(
  session: CoopRunSession | undefined,
  playerId: number | undefined,
) {
  const assignment = getCoopAssignmentForPlayer(session, playerId);
  if (!assignment) return "Solo";
  if (assignment.seat === session?.localSeat) return "À toi";
  if (assignment.connection === "reserved") return "Réservé";
  return assignment.seatName;
}


export function canLocalDeviceControlPlayer(
  session: CoopRunSession | undefined,
  playerId: number | undefined,
) {
  if (!session || session.mode !== "supabase_host_guest") return true;
  const assignment = getCoopAssignmentForPlayer(session, playerId);
  if (!assignment) return true;
  return assignment.seat === session.localSeat;
}

export function getCoopActionLockMessage(
  session: CoopRunSession | undefined,
  playerId: number | undefined,
) {
  if (canLocalDeviceControlPlayer(session, playerId)) return null;
  const label = getCoopTurnOwnerLabel(session, playerId);
  return label === "Solo" ? "Ce héros est contrôlé par une autre place." : `En attente de ${label}.`;
}

export function getCoopStartIssues(lobby: CoopLobbyState) {
  const connectedSeats = lobby.seats.filter((seat) => seat.connection !== "empty");
  const issues: string[] = [];
  const missingHero = connectedSeats.filter((seat) => seat.heroId === null);
  const notReady = connectedSeats.filter((seat) => !seat.ready);

  if (connectedSeats.length === 0) issues.push("Aucune place active.");
  if (missingHero.length > 0) issues.push("Chaque place active doit choisir un héros.");
  if (notReady.length > 0) issues.push("Toutes les places actives doivent être prêtes.");
  return issues;
}
