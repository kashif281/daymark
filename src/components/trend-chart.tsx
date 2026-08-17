"use client";

export function TrendChart({
  values,
  color = "#6d5bd0",
  label,
}: {
  values: number[];
  color?: string;
  label: string;
}) {
  const width = 320;
  const height = 92;
  const max = Math.max(...values, 1);
  const barWidth = values.length ? width / values.length : width;

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9a9994]">
        {label}
      </p>
      <svg
        className="mt-2 w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
      >
        {values.map((value, index) => {
          const barHeight = (value / max) * 76;
          return (
            <rect
              key={index}
              x={index * barWidth + 1}
              y={height - barHeight - 4}
              width={Math.max(barWidth - 2, 1)}
              height={barHeight}
              rx="1.5"
              fill={color}
              opacity={value ? 0.9 : 0.18}
            />
          );
        })}
      </svg>
    </div>
  );
}
