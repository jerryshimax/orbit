"use client";

/**
 * Tiny SVG sparkline showing 13 weeks of interaction density.
 * GitHub-contribution-graph style — instantly reveals engagement momentum.
 */
export function Sparkline({
  data,
  width = 78,
  height = 20,
  color = "var(--accent)",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data, 1);
  const barWidth = width / data.length - 1;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0"
    >
      {data.map((v, i) => {
        const barHeight = (v / max) * (height - 2);
        const opacity = v === 0 ? 0.15 : 0.3 + (v / max) * 0.7;
        return (
          <rect
            key={i}
            x={i * (barWidth + 1)}
            y={height - barHeight - 1}
            width={barWidth}
            height={Math.max(barHeight, 1)}
            rx={1}
            fill={color}
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
}
