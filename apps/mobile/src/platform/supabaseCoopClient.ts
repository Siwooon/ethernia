import type { EtherniaRunSave } from "@/shared/engine/game/gameTypes";
import {
  createLocalCoopLobby,
  joinPreparedCoopLobby,
  normalizePartyCode,
  type CoopLobbyState,
} from "@/shared/engine/game/coopParty";
import { mobileStorage } from "./mobileStorage";

const DEVICE_ID_KEY = "ethernia-mobile-coop-device-id";

type ExpoEnv = {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
};

const expoEnv =
  ((globalThis as { process?: { env?: ExpoEnv } }).process?.env ?? {}) as ExpoEnv;

export type CoopBackendMode = "local" | "supabase";

export type SupabaseCoopSessionStatus = "lobby" | "running" | "finished";

export type SupabaseCoopSnapshot = {
  id: string;
  table_code: string;
  host_device_id: string;
  status: SupabaseCoopSessionStatus;
  lobby_state: CoopLobbyState | null;
  run_state: EtherniaRunSave | null;
  created_at?: string;
  updated_at?: string;
};


export type CoopQueuedAction = {
  id: string;
  session_id: string;
  device_id: string;
  seat: number;
  hero_id: number | null;
  action_type: string;
  payload: Record<string, unknown>;
  accepted: boolean;
  processed_at?: string | null;
  rejected_reason?: string | null;
  created_at?: string;
};

export type SupabaseCoopClientState = {
  configured: boolean;
  url: string | null;
  sessionId: string | null;
  tableCode: string | null;
  deviceId: string | null;
  isHost: boolean;
  status: "hors ligne" | "lié" | "erreur";
  message: string;
};

function getSupabaseUrl() {
  return (expoEnv.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
}

function getSupabaseAnonKey() {
  return expoEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

export function isSupabaseCoopConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

function createDeviceId() {
  return `device_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getCoopDeviceId() {
  const existing = await mobileStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const nextId = createDeviceId();
  await mobileStorage.setItem(DEVICE_ID_KEY, nextId);
  return nextId;
}

function createHeaders(extra?: Record<string, string>) {
  const anonKey = getSupabaseAnonKey();
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...extra,
  };
}

async function supabaseRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = getSupabaseUrl();
  if (!url || !getSupabaseAnonKey()) {
    throw new Error("Supabase n'est pas configuré.");
  }

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: createHeaders(options.headers as Record<string, string> | undefined),
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : `Erreur Supabase ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

function pickSnapshot(result: SupabaseCoopSnapshot[] | SupabaseCoopSnapshot | null) {
  if (Array.isArray(result)) return result[0] ?? null;
  return result;
}

export async function createHostedCoopSession(lobby: CoopLobbyState) {
  const deviceId = await getCoopDeviceId();
  const normalizedCode = normalizePartyCode(lobby.code) || lobby.code;
  const hostLobby: CoopLobbyState = {
    ...createLocalCoopLobby(normalizedCode),
    seats: lobby.seats,
  };

  const result = await supabaseRequest<SupabaseCoopSnapshot[]>("ethernia_coop_sessions", {
    method: "POST",
    body: JSON.stringify({
      table_code: normalizedCode,
      host_device_id: deviceId,
      status: "lobby",
      lobby_state: hostLobby,
      run_state: null,
    }),
  });

  return pickSnapshot(result);
}


export async function fetchCoopSessionById(sessionId: string) {
  const result = await supabaseRequest<SupabaseCoopSnapshot[]>(
    `ethernia_coop_sessions?id=eq.${encodeURIComponent(sessionId)}&select=*&limit=1`,
  );
  return pickSnapshot(result);
}

export async function fetchCoopSessionByCode(code: string) {
  const normalizedCode = normalizePartyCode(code);
  if (!normalizedCode) return null;
  const result = await supabaseRequest<SupabaseCoopSnapshot[]>(
    `ethernia_coop_sessions?table_code=eq.${encodeURIComponent(normalizedCode)}&select=*&limit=1`,
  );
  return pickSnapshot(result);
}

export async function publishCoopLobby(sessionId: string, lobby: CoopLobbyState) {
  const result = await supabaseRequest<SupabaseCoopSnapshot[]>(
    `ethernia_coop_sessions?id=eq.${encodeURIComponent(sessionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        lobby_state: lobby,
        status: "lobby",
        updated_at: new Date().toISOString(),
      }),
    },
  );
  return pickSnapshot(result);
}

export async function publishCoopRun(sessionId: string, run: EtherniaRunSave) {
  const result = await supabaseRequest<SupabaseCoopSnapshot[]>(
    `ethernia_coop_sessions?id=eq.${encodeURIComponent(sessionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        run_state: run,
        status: "running",
        updated_at: new Date().toISOString(),
      }),
    },
  );
  return pickSnapshot(result);
}

export async function joinHostedCoopSession(code: string) {
  const snapshot = await fetchCoopSessionByCode(code);
  if (!snapshot) throw new Error("Table introuvable.");

  const baseLobby = snapshot.lobby_state ?? joinPreparedCoopLobby(snapshot.table_code);
  const localSeat =
    baseLobby.seats.find((seat) => seat.seat !== baseLobby.hostSeat && seat.connection !== "remote")?.seat ??
    baseLobby.seats.find((seat) => seat.seat !== baseLobby.hostSeat)?.seat ??
    1;

  const guestLobby: CoopLobbyState = {
    ...baseLobby,
    localSeat,
    hostSeat: baseLobby.hostSeat,
    seats: baseLobby.seats.map((seat) => {
      if (seat.seat === baseLobby.hostSeat) {
        return {
          ...seat,
          name: seat.name || "Hôte",
          connection: seat.connection === "empty" ? "remote" : seat.connection,
          isHost: true,
        };
      }
      if (seat.seat === localSeat) {
        return {
          ...seat,
          name: "Invité local",
          connection: "local",
          ready: false,
        };
      }
      return seat;
    }),
  };

  await publishCoopLobby(snapshot.id, {
    ...guestLobby,
    seats: guestLobby.seats.map((seat) =>
      seat.seat === localSeat ? { ...seat, connection: "remote", name: "Invité" } : seat,
    ),
  });

  return { snapshot, lobby: guestLobby };
}

export async function submitCoopAction(
  sessionId: string,
  action: {
    type: string;
    seat: number;
    heroId?: number | null;
    payload?: unknown;
  },
) {
  const deviceId = await getCoopDeviceId();
  const result = await supabaseRequest<CoopQueuedAction[]>("ethernia_coop_actions", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      device_id: deviceId,
      seat: action.seat,
      hero_id: action.heroId ?? null,
      action_type: action.type,
      payload: action.payload ?? {},
      accepted: false,
      processed_at: null,
      rejected_reason: null,
    }),
  });
  return Array.isArray(result) ? result[0] ?? null : result;
}

export async function fetchPendingCoopActions(sessionId: string) {
  return supabaseRequest<CoopQueuedAction[]>(
    `ethernia_coop_actions?session_id=eq.${encodeURIComponent(sessionId)}&processed_at=is.null&select=*&order=created_at.asc&limit=8`,
  );
}

export async function markCoopActionProcessed(
  actionId: string,
  params: { accepted: boolean; rejectedReason?: string | null },
) {
  const result = await supabaseRequest<CoopQueuedAction[]>(
    `ethernia_coop_actions?id=eq.${encodeURIComponent(actionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        accepted: params.accepted,
        processed_at: new Date().toISOString(),
        rejected_reason: params.rejectedReason ?? null,
      }),
    },
  );
  return Array.isArray(result) ? result[0] ?? null : result;
}

export function isOnlineGuestRun(run: EtherniaRunSave | null | undefined) {
  const session = run?.coopSession;
  return Boolean(
    session?.mode === "supabase_host_guest" &&
      session.backendSessionId &&
      !session.isHostDevice,
  );
}

export function isOnlineHostRun(run: EtherniaRunSave | null | undefined) {
  const session = run?.coopSession;
  return Boolean(
    session?.mode === "supabase_host_guest" &&
      session.backendSessionId &&
      session.isHostDevice,
  );
}
