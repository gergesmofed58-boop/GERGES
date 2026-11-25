import React from 'react';

interface SparklineProps {
  data: number[];
  positive: boolean;
  width?: number;
  height?: number;
}

export const SparklineChart: React.FC<SparklineProps> = ({
  data,
  positive,
  width = 88,
  height = 28,
}) => {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 0.0001);
  const stepX = width / (data.length - 1);

  const points = data
    .map((val, idx) => {
      const x = idx * stepX;
      const y = height - 3 - ((val - min) / range) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const stroke = positive ? '#10B981' : '#EF4444';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible shrink-0"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

interface DetailedChartProps {
  data: number[];
  support: number;
  resistance: number;
  positive: boolean;
  supportLabel: string;
  resistanceLabel: string;
}

export const DetailedAssetChart: React.FC<DetailedChartProps> = ({
  data,
  support,
  resistance,
  positive,
  supportLabel,
  resistanceLabel,
}) => {
  const width = 560;
  const height = 190;
  const padY = 18;

  const allVals = [...data, support, resistance];
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = Math.max(max - min, 0.0001);

  const toY = (v: number) => height - padY - ((v - min) / range) * (height - padY * 2);
  const stepX = width / Math.max(1, data.length - 1);

  const linePoints = data
    .map((v, i) => `${(i * stepX).toFixed(1)},${toY(v).toFixed(1)}`)
    .join(' ');

  const areaPoints = `0,${height} ${linePoints} ${width},${height}`;
  const stroke = positive ? '#10B981' : '#EF4444';
  const supY = toY(support);
  const resY = toY(resistance);

  return (
    <div className="w-full" dir="ltr">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[185px] overflow-visible"
      >
        <defs>
          <linearGradient id="mpChartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Resistance dashed line */}
        <line
          x1="0"
          y1={resY}
          x2={width}
          y2={resY}
          stroke="#EF4444"
          strokeOpacity="0.45"
          strokeDasharray="4 4"
          strokeWidth="1"
        />
        <text
          x={width - 4}
          y={Math.max(12, resY - 5)}
          textAnchor="end"
          fontSize="10"
          fill="#EF4444"
          className="font-mono"
        >
          {resistanceLabel}: {resistance}
        </text>

        {/* Support dashed line */}
        <line
          x1="0"
          y1={supY}
          x2={width}
          y2={supY}
          stroke="#10B981"
          strokeOpacity="0.5"
          strokeDasharray="4 4"
          strokeWidth="1"
        />
        <text
          x={width - 4}
          y={Math.min(height - 4, supY - 5)}
          textAnchor="end"
          fontSize="10"
          fill="#10B981"
          className="font-mono"
        >
          {supportLabel}: {support}
        </text>

        {/* Area fill */}
        <polygon points={areaPoints} fill="url(#mpChartGrad)" />

        {/* Price line */}
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={linePoints}
        />

        {/* Last point indicator */}
        {data.length > 0 && (
          <circle
            cx={width}
            cy={toY(data[data.length - 1])}
            r="4"
            fill={stroke}
          />
        )}
      </svg>
    </div>
  );
};
