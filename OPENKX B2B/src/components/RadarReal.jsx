import React, { useEffect, useRef } from "react";
import {
  Chart,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  RadarController
} from "chart.js";

Chart.register(
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
);

export default function RadarReal({ data, benchmarkData = {}, benchmarkColors = {}, benchmarkOpcions = [] }) {
  const canvasRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const isMobile = window.innerWidth <= 480;
    const isSmallMobile = window.innerWidth <= 360;

    const rawLabels = data.map(d => d.capacity);
    const values = data.map(d => Number(d.value) || 0);

    const splitLabel = (label) => {
      const text = String(label || "").trim();
      if (!text) return "";

      const maxChars = isSmallMobile ? 10 : isMobile ? 12 : 18;
      if (text.length <= maxChars) return text;

      const words = text.split(" ");
      const lines = [];
      let current = "";

      words.forEach((word) => {
        const next = current ? `${current} ${word}` : word;
        if (next.length > maxChars && current) {
          lines.push(current);
          current = word;
        } else {
          current = next;
        }
      });

      if (current) lines.push(current);

      return lines.slice(0, 2);
    };

    const labels = rawLabels.map(splitLabel);

    const pointLabelSize = isSmallMobile ? 7 : isMobile ? 8 : 10;
    const pointLabelPadding = isSmallMobile ? 0 : isMobile ? 2 : 8;
    const legendFontSize = isSmallMobile ? 9 : isMobile ? 10 : 11;
    const pointRadius = isMobile ? 2.5 : 4;
    const hoverRadius = isMobile ? 4 : 7;

    const datasets = [
      {
        label: "Mis competencias",
        data: values,
        backgroundColor: "rgba(99, 102, 241, 0.3)",
        borderColor: "#6366f1",
        borderWidth: 2,
        pointBackgroundColor: "#6366f1",
        pointRadius,
        pointHoverRadius: hoverRadius
      }
    ];

    Object.entries(benchmarkData).forEach(([key, bData]) => {
      if (!bData || !bData.length) return;
      const color = benchmarkColors[key] || { border: "#fff", bg: "rgba(255,255,255,0.1)" };
      const label = benchmarkOpcions.find(o => o.key === key)?.label || `Nivel ${key}`;

      const bValues = rawLabels.map(cap => {
        const match = bData.find(d => d.capacity === cap);
        return match ? Number(match.value) || 0 : 0;
      });

      datasets.push({
        label,
        data: bValues,
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 2,
        pointBackgroundColor: color.border,
        pointRadius: isMobile ? 2 : 3,
        pointHoverRadius: isMobile ? 4 : 6,
        borderDash: [4, 3]
      });
    });

    chartInstance.current = new Chart(canvasRef.current, {
      type: "radar",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: {
          padding: isSmallMobile
            ? { top: 18, right: 18, bottom: 18, left: 18 }
            : isMobile
              ? { top: 22, right: 22, bottom: 22, left: 22 }
              : { top: 28, right: 28, bottom: 28, left: 28 }
        },
        scales: {
          r: {
            suggestedMin: 0,
            suggestedMax: 100,
            ticks: { display: false },
            pointLabels: {
              display: true,
              color: "#e2e8f0",
              font: {
                size: pointLabelSize,
                family: "Inter, sans-serif",
                weight: 600
              },
              padding: pointLabelPadding
            },
            grid: { color: "rgba(255,255,255,0.2)" },
            angleLines: { color: "rgba(255,255,255,0.2)" }
          }
        },
        plugins: {
          legend: {
            display: datasets.length > 1,
            labels: {
              color: "#e2e8f0",
              font: { size: legendFontSize },
              boxWidth: isMobile ? 10 : 14,
              padding: isMobile ? 8 : 12
            }
          },
          tooltip: {
            enabled: true,
            callbacks: {
              title: (items) => {
                const index = items?.[0]?.dataIndex ?? 0;
                return rawLabels[index] || "";
              },
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}`
            }
          }
        }
      }
    });

    return () => {
      chartInstance.current?.destroy();
    };
  }, [data, benchmarkData, benchmarkColors, benchmarkOpcions]);

  const chartHeight =
    typeof window !== "undefined" && window.innerWidth <= 360
      ? 240
      : typeof window !== "undefined" && window.innerWidth <= 480
        ? 270
        : 300;

  return (
    <div style={{ width: "100%", height: `${chartHeight}px` }}>
      <canvas ref={canvasRef} />
    </div>
  );
}