"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { cn } from "@/lib/utils";

interface PnlPoint {
  t: number;
  v: number;
}

interface Props {
  data: PnlPoint[];
  height?: number;
  className?: string;
}

export function PnlCurve({ data, height = 220, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaRef = useRef<ISeriesApi<"Area"> | null>(null);

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
      timeScale: { borderColor: "#1f2638" },
      rightPriceScale: { borderColor: "#1f2638" },
      crosshair: {
        mode: 1,
        vertLine: { color: "#6366f1", width: 1, style: 2 },
        horzLine: { color: "#6366f1", width: 1, style: 2 },
      },
    });

    const area = chart.addSeries(AreaSeries, {
      lineColor: "#6366f1",
      topColor: "rgba(99,102,241,0.4)",
      bottomColor: "rgba(99,102,241,0.0)",
      lineWidth: 2,
      priceLineVisible: false,
    });
    chartRef.current = chart;
    areaRef.current = area;

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
      areaRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    if (areaRef.current && data.length) {
      areaRef.current.setData(data.map((p) => ({ time: p.t as Time, value: p.v })));
      chartRef.current?.timeScale().fitContent();
    } else if (areaRef.current) {
      areaRef.current.setData([]);
    }
  }, [data]);

  return <div ref={containerRef} className={cn("w-full", className)} />;
}