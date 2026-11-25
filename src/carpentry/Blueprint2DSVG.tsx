import React from 'react';
import { getWoodSpec } from './catalog';
import { AppLocale, ProjectParams } from './types';

interface Props {
  params: ProjectParams;
  locale: AppLocale;
}

export const Blueprint2DSVG: React.FC<Props> = ({ params, locale }) => {
  const isRtl = locale === 'ar';
  const wood = getWoodSpec(params.woodType);

  const W = params.widthCm;
  const H = params.heightCm;
  const D = params.depthCm;

  // Normalize drawings cleanly into a 760 x 440 technical blueprint sheet
  const frontMaxW = 340;
  const frontMaxH = 290;
  const scaleFront = Math.min(frontMaxW / W, frontMaxH / H);
  const drawW = W * scaleFront;
  const drawH = H * scaleFront;
  const fx = 65 + (frontMaxW - drawW) / 2;
  const fy = 60 + (frontMaxH - drawH) / 2;

  const sideMaxW = 190;
  const scaleSide = Math.min(sideMaxW / D, frontMaxH / H);
  const sDrawW = D * scaleSide;
  const sDrawH = H * scaleSide;
  const sx = 505 + (sideMaxW - sDrawW) / 2;
  const sy = 60 + (frontMaxH - sDrawH) / 2;

  const tPx = Math.max(4, (params.boardThicknessMm / 10) * scaleFront);
  const plinthPx = params.plinthHeightCm * scaleFront;

  return (
    <div className="w-full rounded-2xl border border-stone-200 dark:border-stone-800 bg-[#F9FBF9] dark:bg-[#0F1724] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-stone-800 dark:text-stone-100">
          {isRtl
            ? 'المسقط الهندسي الأمامي والجانبي بالمقاسات الدقيقة (سم / مم)'
            : 'Orthographic Front & Side Technical Blueprint (cm / mm)'}
        </span>
        <span dir="ltr" className="font-mono tabular-nums text-blue-700 dark:text-blue-400">
          W {W} · H {H} · D {D} cm · T {params.boardThicknessMm}mm
        </span>
      </div>

      <div className="w-full overflow-x-auto p-3">
        <svg
          viewBox="0 0 760 430"
          className="w-full min-w-[560px] h-auto max-h-[450px]"
          role="img"
          aria-label="Carpentry Technical Blueprint"
        >
          <defs>
            <pattern
              id="cad-grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="currentColor"
                className="text-blue-900/8 dark:text-blue-300/10"
                strokeWidth="0.7"
              />
            </pattern>
            <marker
              id="dim-arrow"
              viewBox="0 0 10 10"
              refX="5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#1D4ED8" />
            </marker>
          </defs>

          <rect width="760" height="430" fill="url(#cad-grid)" />

          {/* Section Titles */}
          <text
            x={fx + drawW / 2}
            y="28"
            textAnchor="middle"
            className="fill-stone-700 dark:fill-stone-200 text-[13px] font-bold"
          >
            {isRtl ? 'المسقط الأمامي (الواجهة)' : 'FRONT ELEVATION'}
          </text>
          <text
            x={sx + sDrawW / 2}
            y="28"
            textAnchor="middle"
            className="fill-stone-700 dark:fill-stone-200 text-[13px] font-bold"
          >
            {isRtl ? 'المسقط الجانبي (العمق)' : 'SIDE SECTION'}
          </text>

          {/* FRONT ELEVATION BODY */}
          <g>
            {/* Outer carcass */}
            <rect
              x={fx}
              y={fy}
              width={drawW}
              height={drawH}
              fill={wood.baseHex}
              fillOpacity={0.22}
              stroke="#1E293B"
              strokeWidth="2"
              className="dark:stroke-stone-200"
            />

            {/* Plinth */}
            {params.plinthHeightCm > 0 && (
              <rect
                x={fx + tPx}
                y={fy + drawH - plinthPx}
                width={Math.max(4, drawW - 2 * tPx)}
                height={plinthPx}
                fill={wood.accentHex}
                fillOpacity={0.3}
                stroke="#1E293B"
                strokeWidth="1.2"
                className="dark:stroke-stone-300"
              />
            )}

            {/* Vertical dividers */}
            {params.dividersCount > 0 &&
              Array.from({ length: params.dividersCount }).map((_, idx) => {
                const bays = params.dividersCount + 1;
                const innerW = drawW - 2 * tPx;
                const xPos = fx + tPx + ((idx + 1) * innerW) / bays;
                return (
                  <line
                    key={idx}
                    x1={xPos}
                    y1={fy + tPx}
                    x2={xPos}
                    y2={fy + drawH - plinthPx - tPx}
                    stroke="#1E293B"
                    strokeWidth={Math.max(2, tPx * 0.7)}
                    className="dark:stroke-stone-200"
                  />
                );
              })}

            {/* Internal shelves (dashed engineering lines behind doors or solid for open bookshelf/bed) */}
            {params.shelvesCount > 0 &&
              params.templateId !== 'bed' &&
              Array.from({ length: params.shelvesCount }).map((_, idx) => {
                const innerH = drawH - plinthPx - 2 * tPx;
                const yPos = fy + tPx + ((idx + 1) * innerH) / (params.shelvesCount + 1);
                return (
                  <line
                    key={idx}
                    x1={fx + tPx}
                    y1={yPos}
                    x2={fx + drawW - tPx}
                    y2={yPos}
                    stroke="#B45309"
                    strokeWidth="1.5"
                    strokeDasharray={params.doorsCount > 0 ? '5 4' : undefined}
                  />
                );
              })}

            {/* Door split lines & swing indicators */}
            {params.doorsCount > 1 &&
              Array.from({ length: params.doorsCount - 1 }).map((_, idx) => {
                const dx = fx + ((idx + 1) * drawW) / params.doorsCount;
                return (
                  <line
                    key={idx}
                    x1={dx}
                    y1={fy}
                    x2={dx}
                    y2={fy + drawH - plinthPx}
                    stroke="#0F172A"
                    strokeWidth="1.6"
                    className="dark:stroke-stone-100"
                  />
                );
              })}

            {/* Drawers preview lines */}
            {params.drawersCount > 0 &&
              Array.from({ length: params.drawersCount }).map((_, idx) => {
                const bays = params.dividersCount + 1;
                const zoneW =
                  params.templateId === 'desk'
                    ? drawW * 0.32
                    : (drawW - 2 * tPx) / bays;
                const zoneX =
                  params.templateId === 'desk'
                    ? fx + drawW - zoneW - 4
                    : params.templateId === 'kitchen'
                    ? fx + tPx
                    : fx + drawW - tPx - zoneW;
                const blockH =
                  params.templateId === 'wardrobe'
                    ? (drawH - plinthPx) * 0.4
                    : drawH - plinthPx - 14;
                const dh = blockH / params.drawersCount;
                const dy = fy + drawH - plinthPx - tPx - blockH + idx * dh;
                return (
                  <g key={idx}>
                    <rect
                      x={zoneX + 2}
                      y={dy + 2}
                      width={Math.max(10, zoneW - 4)}
                      height={Math.max(8, dh - 4)}
                      fill={wood.grainHex}
                      fillOpacity={0.22}
                      stroke="#B45309"
                      strokeWidth="1.2"
                    />
                    <line
                      x1={zoneX + zoneW * 0.35}
                      y1={dy + dh / 2}
                      x2={zoneX + zoneW * 0.65}
                      y2={dy + dh / 2}
                      stroke="#0F172A"
                      strokeWidth="2"
                      className="dark:stroke-stone-200"
                    />
                  </g>
                );
              })}

            {/* Part Callout Badges (A, B, C) */}
            <text
              x={fx + drawW / 2}
              y={fy + drawH / 2}
              textAnchor="middle"
              className="fill-amber-800 dark:fill-amber-300 font-mono text-[12px] font-bold"
            >
              {W} × {H} cm
            </text>

            {/* Front Width Dimension Arrow */}
            <line
              x1={fx}
              y1={fy + drawH + 28}
              x2={fx + drawW}
              y2={fy + drawH + 28}
              stroke="#1D4ED8"
              strokeWidth="1.4"
              markerStart="url(#dim-arrow)"
              markerEnd="url(#dim-arrow)"
            />
            <text
              x={fx + drawW / 2}
              y={fy + drawH + 46}
              textAnchor="middle"
              className="fill-blue-700 dark:fill-blue-400 font-mono text-[12px] font-bold"
            >
              {W} cm ({W * 10} mm)
            </text>

            {/* Front Height Dimension Arrow */}
            <line
              x1={fx - 26}
              y1={fy}
              x2={fx - 26}
              y2={fy + drawH}
              stroke="#1D4ED8"
              strokeWidth="1.4"
              markerStart="url(#dim-arrow)"
              markerEnd="url(#dim-arrow)"
            />
            <text
              x={fx - 36}
              y={fy + drawH / 2}
              textAnchor="middle"
              transform={`rotate(-90 ${fx - 36} ${fy + drawH / 2})`}
              className="fill-blue-700 dark:fill-blue-400 font-mono text-[12px] font-bold"
            >
              {H} cm ({H * 10} mm)
            </text>
          </g>

          {/* SIDE CROSS-SECTION */}
          <g>
            <rect
              x={sx}
              y={sy}
              width={sDrawW}
              height={sDrawH}
              fill={wood.baseHex}
              fillOpacity={0.18}
              stroke="#1E293B"
              strokeWidth="2"
              className="dark:stroke-stone-200"
            />
            {/* Back panel rabbet indicator */}
            {params.includeBackPanel && (
              <rect
                x={sx + 4}
                y={sy + 4}
                width={4}
                height={Math.max(8, sDrawH - 8)}
                fill="#1D4ED8"
                fillOpacity={0.65}
              />
            )}
            {/* Shelf cross-section lines */}
            {params.shelvesCount > 0 &&
              Array.from({ length: Math.min(8, params.shelvesCount) }).map((_, idx) => {
                const yPos =
                  sy + 10 + ((idx + 1) * (sDrawH - 20)) / (Math.min(8, params.shelvesCount) + 1);
                return (
                  <line
                    key={idx}
                    x1={sx + 10}
                    y1={yPos}
                    x2={sx + sDrawW - 8}
                    y2={yPos}
                    stroke="#B45309"
                    strokeWidth="2"
                  />
                );
              })}

            {/* Side Depth Dimension Arrow */}
            <line
              x1={sx}
              y1={sy + sDrawH + 28}
              x2={sx + sDrawW}
              y2={sy + sDrawH + 28}
              stroke="#1D4ED8"
              strokeWidth="1.4"
              markerStart="url(#dim-arrow)"
              markerEnd="url(#dim-arrow)"
            />
            <text
              x={sx + sDrawW / 2}
              y={sy + sDrawH + 46}
              textAnchor="middle"
              className="fill-blue-700 dark:fill-blue-400 font-mono text-[12px] font-bold"
            >
              {D} cm ({D * 10} mm)
            </text>
          </g>

          {/* Legend Strip */}
          <text
            x="24"
            y="412"
            className="fill-stone-500 dark:fill-stone-400 font-mono text-[11px]"
          >
            {isRtl
              ? `سمك اللوح: ${params.boardThicknessMm} مم · الظهر: ${params.backThicknessMm} مم · سلاح المنشار: ${params.kerfMm} مم`
              : `Board: ${params.boardThicknessMm}mm · Back: ${params.backThicknessMm}mm · Kerf: ${params.kerfMm}mm`}
          </text>
        </svg>
      </div>
    </div>
  );
};
