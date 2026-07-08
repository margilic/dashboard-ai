/**
 * AI / Agent adapters — MiniMax-M3 for prose, DeepSeek for multi-step reasoning.
 * Both are OpenAI-compatible chat completion APIs.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  max_tokens?: number;
  model?: string;
  timeoutMs?: number;
}

interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
}

function readProvider(name: "minimax" | "deepseek"): ProviderConfig {
  if (name === "minimax") {
    return {
      baseUrl: process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1",
      apiKey: process.env.MINIMAX_API_KEY || "",
      defaultModel: process.env.MINIMAX_MODEL || "MiniMax-M3",
    };
  }
  return {
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    defaultModel: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  };
}

export async function chatCompletion(
  provider: "minimax" | "deepseek",
  messages: ChatMessage[],
  opts: ChatOptions = {}
): Promise<string> {
  const cfg = readProvider(provider);
  if (!cfg.apiKey) {
    throw new Error(`${provider} API key missing in env`);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 90_000);
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model ?? cfg.defaultModel,
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.max_tokens ?? 1500,
        stream: false,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${provider} ${res.status}: ${txt.slice(0, 300)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

export interface PnlContext {
  symbol: string;
  range: string;
  total_pnl: number;
  total_pnl_pct: number;
  win_rate: number;
  wins: number;
  losses: number;
  total_trades: number;
  avg_win: number;
  avg_loss: number;
  best_trade: number | null;
  worst_trade: number | null;
  open_positions: number;
  unrealized_pnl: number;
  balance: number;
  recent_trades: Array<{
    symbol: string;
    side: string;
    pnl: number;
    pnl_pct: number;
    closed_at: number;
    duration_min: number;
  }>;
  current_price: number;
  price_change_pct: number;
}

export const ANALYZER_SYSTEM_PROMPT = `Sen profesyonel bir kripto/scalping trading analistisin. Görevin: trader'ın performansını, açık pozisyonlarını ve son işlemlerini analiz edip kısa, uygulanabilir Türkçe yorum üretmek. Yapı: 1) Tek satır "YÖNETİCİ ÖZETİ", 2) en fazla 3 madde halinde GÜÇLÜ YÖNLER, 3) en fazla 3 madde halinde RİSKLER / DİKKAT EDİLECEKLER, 4) tek satır SONRAKI AKSİYON. Maksimum 180 kelime. Asla yatırım tavsiyesi verme, sadece gözlem ve öneri.`;

export async function analyzeWithMinimax(ctx: PnlContext): Promise<string> {
  const user = JSON.stringify(ctx, null, 2);
  return chatCompletion(
    "minimax",
    [
      { role: "system", content: ANALYZER_SYSTEM_PROMPT },
      { role: "user", content: user },
    ],
    { temperature: 0.5, max_tokens: 900, timeoutMs: 60_000 }
  );
}

export const AGENT_SYSTEM_PROMPT = `Sen uzun vadeli trading pattern analistisin. Verilen trade geçmişinden: 1) tekrar eden ihlal kalıpları (ör: aynı saat diliminde kayıp serisi, aynı coin'de arka arkaya stop), 2) strateji-saat-coin üçlü korelasyonu, 3) iyileştirme önerileri. Çıktı: kısa Türkçe bullet list, max 200 kelimemadde. Tavsiye değil, gözlem.`;

export async function runAgentWithDeepseek(
  ctx: Record<string, unknown>
): Promise<string> {
  return chatCompletion(
    "deepseek",
    [
      { role: "system", content: AGENT_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(ctx, null, 2) },
    ],
    { temperature: 0.6, max_tokens: 1200, timeoutMs: 120_000 }
  );
}