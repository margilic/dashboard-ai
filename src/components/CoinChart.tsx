"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { cn } from "@/lib/utils";

interface Props {
  symbol: string;
  interval?: string;
  height?: number;
  className?: string;
}

export function CoinChart({
  symbol,
  interval = "15m",
  height = 320,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { color: "transparent" },
        textColor: "#9aa3b8",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(31,38,56,0.5)" },
        horzLines: { color: "rgba(31,38,56,0.5)" },
      },
      timeScale: {
        borderColor: "#1f2638",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#1f2638",
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: "#6366f1", width: 1, style: 2 },
        horzLine: { color: "#6366f1", width: 1, style: 2 },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const volSeries = chart.addSeries(HistogramSeries, {
      color: "#1f2638",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    volumeRef.current = volSeries;

    const onResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/klines?symbol=${symbol}&interval=${interval}&limit=200`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (seriesRef.current && data.klines?.length) {
          seriesRef.current.setData(
            data.klines.map((k: { t: number; o: number; h: number; l: number; c: number }) => ({
              time: k.t as Time,
              open: k.o,
              high: k.h,
              low: k.l,
              close: k.c,
            }))
          );
          volumeRef.current?.setData(
            data.klines.map((k: { t: number; o: number; c: number; v: number }) => ({
              time: k.t as Time,
              value: k.v,
              color: k.c >= k.o ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)",
            }))
          );
          chartRef.current?.timeScale().fitContent();
        }
      } catch (e) {
        console.error("[CoinChart] load failed", e);
      }
    }
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol, interval]);

  return <div ref={containerRef} className={cn("w-full", className)} />;
}