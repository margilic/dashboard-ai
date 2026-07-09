/**
 * Paperclip integration — server-side. Signs in with a board-operator session
 * (email/password from env) and lists the Margilic Capital agents + statuses.
 *
 * Session cookie is cached in module scope and re-used across requests; on 401
 * it re-authenticates once.
 */

const PC_BASE = process.env.PAPERCLIP_BASE || "http://31.97.184.120:62332";
const PC_EMAIL = process.env.PAPERCLIP_EMAIL || "";
const PC_PASSWORD = process.env.PAPERCLIP_PASSWORD || "";
const PC_COMPANY =
  process.env.PAPERCLIP_COMPANY_ID || "66c0e357-f6f1-4dcf-bd07-50c6e513f69f";

export interface AgentInfo {
  id: string;
  name: string;
  role: string;
  title: string;
  status: string;
  model: string;
  reportsTo: string | null;
  lastHeartbeatAt: string | null;
  pauseReason: string | null;
  budgetCents: number;
  spentCents: number;
  orgHealth: string;
}

let cachedCookie: string | null = null;

async function signIn(): Promise<string> {
  const res = await fetch(`${PC_BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: PC_BASE },
    body: JSON.stringify({ email: PC_EMAIL, password: PC_PASSWORD }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`paperclip signin ${res.status}`);
  const setCookie = res.headers.get("set-cookie") || "";
  // extract session token cookie
  const m = setCookie.match(/paperclip-default\.session_token=[^;]+/);
  if (!m) {
    // some versions return token in body
    const body = await res.json().catch(() => ({}));
    if (body?.token) {
      cachedCookie = `paperclip-default.session_token=${encodeURIComponent(
        body.token
      )}`;
      return cachedCookie;
    }
    throw new Error("paperclip: no session cookie");
  }
  cachedCookie = m[0];
  return cachedCookie;
}

async function pcGet(path: string): Promise<unknown> {
  if (!cachedCookie) await signIn();
  const doFetch = () =>
    fetch(`${PC_BASE}${path}`, {
      headers: { Origin: PC_BASE, Cookie: cachedCookie! },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  let res = await doFetch();
  if (res.status === 401 || res.status === 403) {
    await signIn();
    res = await doFetch();
  }
  if (!res.ok) throw new Error(`paperclip ${path} ${res.status}`);
  return res.json();
}

export interface AgentsResult {
  online: boolean;
  agents: AgentInfo[];
  total: number;
  running: number;
  paused: number;
  idle: number;
  error?: string;
}

export async function fetchAgents(): Promise<AgentsResult> {
  if (!PC_EMAIL || !PC_PASSWORD) {
    return {
      online: false,
      agents: [],
      total: 0,
      running: 0,
      paused: 0,
      idle: 0,
      error: "Paperclip kimlik bilgileri tanımlı değil (env)",
    };
  }
  try {
    const raw = (await pcGet(
      `/api/companies/${PC_COMPANY}/agents`
    )) as Record<string, unknown>[];
    const list = Array.isArray(raw) ? raw : [];
    const agents: AgentInfo[] = list.map((a) => ({
      id: String(a.id),
      name: String(a.name || ""),
      role: String(a.role || ""),
      title: String(a.title || ""),
      status: String(a.status || "unknown"),
      model: String(
        (a.adapterConfig as Record<string, unknown>)?.model || "—"
      ),
      reportsTo: (a.reportsTo as string) || null,
      lastHeartbeatAt: (a.lastHeartbeatAt as string) || null,
      pauseReason: (a.pauseReason as string) || null,
      budgetCents: Number(a.budgetMonthlyCents || 0),
      spentCents: Number(a.spentMonthlyCents || 0),
      orgHealth: String(
        (a.orgChainHealth as Record<string, unknown>)?.status || "—"
      ),
    }));
    const count = (s: string) =>
      agents.filter((a) => a.status.toLowerCase() === s).length;
    return {
      online: true,
      agents,
      total: agents.length,
      running: count("running") + count("active") + count("busy"),
      paused: count("paused"),
      idle: count("idle"),
    };
  } catch (e) {
    return {
      online: false,
      agents: [],
      total: 0,
      running: 0,
      paused: 0,
      idle: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
