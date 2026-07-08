# Margilic AI Trading Dashboard

AI-analyzed trading performance dashboard. PnL, pozisyonlar, coin chart ve zaman filtreleri tek ekranda. MiniMax-M3 dashboard analizi ve yazımı için, DeepSeek pattern agent için.

## Stack

- Next.js 16 + React 19 (App Router)
- Tailwind v4
- lightweight-charts (TradingView) — coin mum grafiği
- recharts / lightweight-charts area — equity curve
- MiniMax-M3 — AI analiz & metin üretimi (OpenAI-compatible)
- DeepSeek — multi-step pattern agent (OpenAI-compatible)

## Veri Kaynakları

| Kaynak | Ne | Endpoint |
|---|---|---|
| SMC Engine (lokal) | Pozisyonlar, trade history, balance, sinyaller | `SMC_ENGINE_URL/api/trade/*` |
| Binance public | Klines (mum), 24h ticker | `https://demo-api.binance.com` veya `api.binance.com` |
| MiniMax-M3 | Türkçe analiz metni | `MINIMAX_BASE_URL/chat/completions` |
| DeepSeek | Pattern/agent raporu | `DEEPSEEK_BASE_URL/chat/completions` |

## Kurulum

```bash
cd /opt/data/dashboard-ai
cp .env.example .env.local
# API key'leri doldur
npm install
npm run dev
# http://localhost:3000
```

## API Routes

- `GET /api/positions` — açık pozisyonlar (SMC Engine proxy)
- `GET /api/trades?range=7d&symbol=BTCUSDT` — trade history + equity curve
- `GET /api/pnl?range=7d` — sadece equity curve (lighter)
- `GET /api/klines?symbol=BTCUSDT&interval=15m&limit=200` — Binance mum verisi
- `POST /api/analyze` body `{symbol, range}` — MiniMax-M3 analizi
- `POST /api/agent-task` body `{range, focus}` — DeepSeek pattern raporu

## Deploy (Vercel)

```bash
npx vercel --token "$VERCEL_TOKEN" --yes --prod
```

Vercel env'e `MINIMAX_API_KEY`, `DEEPSEEK_API_KEY`, `SMC_ENGINE_URL` ekle.
`SMC_ENGINE_URL` Vercel'den lokal SMC Engine'e erişemeyeceği için dikkat: ya
SMC Engine'i public URL'e aç, ya da Vercel fonksiyonundan kaldır ve trades'i
doğrudan Binance order history'den çek.