"use client";

export function TrendChart({
  values,
  color = "#6d5bd0",
  label,
  onSelect,
}: {
  values: number[];
  color?: string;
  label: string;
  onSelect?: (index: number) => void;
}) {
  const width = 320;
  const height = 120;
  const max = Math.max(...values, 1);
  const padX = 10;
  const padY = 14;
  const innerWidth = width - padX * 2;
  const innerHeight = height - padY * 2;
  const points = values.map((value, index) => {
    const x =
      values.length === 1
        ? width / 2
        : padX + (index / (values.length - 1)) * innerWidth;
    const y = padY + innerHeight - (value / max) * innerHeight;
    return { x, y, value };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = [
    `${padX},${height - padY}`,
    ...points.map((point) => `${point.x},${point.y}`),
    `${width - padX},${height - padY}`,
  ].join(" ");

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
        <polygon points={area} fill={color} opacity="0.12" />
        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r={index === points.length - 1 ? 3.4 : 2.2}
              fill={color}
            />
            {onSelect ? (
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onSelect(index)}
              />
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}
