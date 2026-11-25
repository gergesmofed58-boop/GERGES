import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ArrowUpRight,
  Box,
  Camera,
  CheckCircle2,
  Compass,
  DoorOpen,
  Grid2x2,
  Home,
  Layers,
  Lightbulb,
  Map as MapIcon,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { getWoodSpec, WOOD_MATERIALS } from './catalog';
import {
  egBoxDims,
  egQtyPieces,
  egQtySheets,
  egSpokenLength,
} from './egyptianCopy';
import { ManualNumberInput } from './ManualNumberInput';
import {
  CornerColumnPos,
  DEFAULT_ROOM_DETAILS,
  DoorSwingType,
  generateRoomSpacePlan,
  getWallNameAr,
  getWindowPresetDefaults,
  parseEgyptianRoomDescription,
  ResolvedOpening,
  RoomArchitecturalDetails,
  RoomPlacedItem,
  RoomPlanResult,
  RoomSpaceType,
  RoomWall,
  WallSidePosition,
  WindowSizePreset,
} from './roomEngine';
import { AppLocale, ProjectParams, ThemeMode, WoodTypeId } from './types';

interface Props {
  locale: AppLocale;
  theme: ThemeMode;
  woodType: WoodTypeId;
  sheetPriceEgp: number;
  currencyLabel: string;
  onSelectWood: (woodId: WoodTypeId) => void;
  onUpdateSheetPrice: (nextPrice: number) => void;
  onOpenPieceInDesigner: (pieceParams: ProjectParams) => void;
}

type RoomCameraPreset = 'iso' | 'top' | 'front';
type RoomViewMode = '3d' | '2d';
type WallCutMode = 'cutaway' | 'full';

function buildMiniFurniture3D(
  item: RoomPlacedItem,
  woodMat: THREE.MeshStandardMaterial,
  frontMat: THREE.MeshStandardMaterial,
  accentMat: THREE.MeshStandardMaterial,
  edgeLine: THREE.LineBasicMaterial
): THREE.Group {
  const g = new THREE.Group();
  const p = item.projectParams;
  const W = p.widthCm / 100;
  const H = p.heightCm / 100;
  const D = p.depthCm / 100;
  const T = 0.02;

  const addBox = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material
  ) => {
    const geom = new THREE.BoxGeometry(
      Math.max(0.015, w),
      Math.max(0.015, h),
      Math.max(0.015, d)
    );
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom), edgeLine));
    g.add(mesh);
  };

  if (p.templateId === 'bed') {
    addBox(W, H, 0.05, 0, H / 2, -D / 2 + 0.025, frontMat);
    addBox(W, 0.3, D, 0, 0.15, 0, woodMat);
    const mattressMat = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.85 });
    addBox(W - 0.06, 0.22, D - 0.1, 0, 0.39, 0.02, mattressMat);
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xe6dfd3, roughness: 0.9 });
    addBox(W * 0.38, 0.12, 0.38, -W * 0.22, 0.54, -D / 2 + 0.32, pillowMat);
    addBox(W * 0.38, 0.12, 0.38, W * 0.22, 0.54, -D / 2 + 0.32, pillowMat);
    const blanketMat = new THREE.MeshStandardMaterial({ color: 0xd6c7b2, roughness: 0.92 });
    addBox(W - 0.04, 0.06, D * 0.52, 0, 0.51, D * 0.2, blanketMat);
  } else if (p.templateId === 'table') {
    addBox(W, 0.04, D, 0, H - 0.02, 0, frontMat);
    const lx = W / 2 - 0.1;
    const lz = D / 2 - 0.1;
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      addBox(0.075, H - 0.04, 0.075, sx * lx, (H - 0.04) / 2, sz * lz, woodMat);
    }
  } else if (p.templateId === 'desk') {
    addBox(W, 0.035, D, 0, H - 0.018, 0, frontMat);
    addBox(0.03, H - 0.035, D - 0.06, -W / 2 + 0.05, (H - 0.035) / 2, 0, woodMat);
    addBox(0.42, H - 0.06, D - 0.08, W / 2 - 0.24, (H - 0.06) / 2 + 0.02, 0, woodMat);
    addBox(W - 0.5, 0.34, 0.02, -0.2, H - 0.22, -D / 2 + 0.08, woodMat);
  } else if (p.templateId === 'dresser') {
    addBox(W, H, D, 0, H / 2, 0, woodMat);
    addBox(W - 0.02, H - 0.08, 0.02, 0, H / 2 + 0.02, D / 2 + 0.008, frontMat);
    if (!item.underWindow) {
      const r = Math.min(0.36, W * 0.28);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 12, 32), frontMat);
      ring.position.set(0, H + r + 0.1, -D / 2 + 0.03);
      g.add(ring);
      const glass = new THREE.Mesh(
        new THREE.CircleGeometry(r - 0.015, 28),
        new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.1, metalness: 0.85 })
      );
      glass.position.set(0, H + r + 0.1, -D / 2 + 0.035);
      g.add(glass);
    }
  } else {
    const openFront =
      p.doorsCount === 0 && (p.templateId === 'dressing' || p.templateId === 'bookshelf');
    if (openFront) {
      addBox(T, H, D, -W / 2 + T / 2, H / 2, 0, woodMat);
      addBox(T, H, D, W / 2 - T / 2, H / 2, 0, woodMat);
      addBox(W, T, D, 0, H - T / 2, 0, woodMat);
      addBox(W, T, D, 0, 0.08, 0, woodMat);
      addBox(W, H, 0.012, 0, H / 2, -D / 2 + 0.006, accentMat);
      const shelves = Math.min(5, Math.max(3, p.shelvesCount));
      for (let i = 1; i <= shelves; i++) {
        addBox(W - 0.04, T, D - 0.04, 0, (H / (shelves + 1)) * i, 0, frontMat);
      }
      for (let d = 1; d <= Math.min(2, p.dividersCount); d++) {
        addBox(
          T,
          H - 0.1,
          D - 0.03,
          -W / 2 + (W / (Math.min(2, p.dividersCount) + 1)) * d,
          H / 2,
          0,
          woodMat
        );
      }
    } else {
      addBox(W, H, D, 0, H / 2, 0, woodMat);
      const cols = Math.max(1, p.doorsCount || 2);
      const cw = (W - 0.01 * (cols + 1)) / cols;
      for (let i = 0; i < cols; i++) {
        const cx = -W / 2 + 0.01 + cw / 2 + i * (cw + 0.01);
        addBox(cw, H - 0.1, 0.018, cx, H / 2 + 0.03, D / 2 + 0.01, frontMat);
      }
      if (p.templateId === 'kitchen') {
        const stone = new THREE.MeshStandardMaterial({ color: 0xe2ddd5, roughness: 0.3 });
        addBox(W + 0.02, 0.035, D + 0.03, 0, H + 0.018, 0.01, stone);
      }
    }
  }

  return g;
}

/**
 * Builds one architectural wall in local wall coordinates:
 * Local X: 0 .. wallLen (meters), Local Y: 0 .. wallH (meters), Local Z: inward normal (+Z into room, wall body sits in [-t .. 0]).
 */
function buildArchitecturalWall3D(opts: {
  wall: RoomWall;
  wallLenM: number;
  ceilingHM: number;
  wallThicknessM: number;
  isLowCutaway: boolean;
  door: ResolvedOpening | null;
  windowOp: ResolvedOpening | null;
  wallMat: THREE.MeshStandardMaterial;
  cutWallMat: THREE.MeshStandardMaterial;
  frameMat: THREE.MeshStandardMaterial;
  doorLeafMat: THREE.MeshStandardMaterial;
  brassMat: THREE.MeshStandardMaterial;
  glassMat: THREE.MeshStandardMaterial;
  sillMat: THREE.MeshStandardMaterial;
  edgeLine: THREE.LineBasicMaterial;
}): THREE.Group {
  const wallGroup = new THREE.Group();
  const {
    wallLenM,
    ceilingHM,
    wallThicknessM: T,
    isLowCutaway,
    door,
    windowOp,
    wallMat,
    cutWallMat,
    frameMat,
    doorLeafMat,
    brassMat,
    glassMat,
    sillMat,
    edgeLine,
  } = opts;

  const activeWallH = isLowCutaway ? 0.34 : ceilingHM;
  const mat = isLowCutaway ? cutWallMat : wallMat;

  const openings: { startM: number; endM: number; sillM: number; topM: number; kind: 'door' | 'window'; op: ResolvedOpening }[] = [];
  if (door) {
    openings.push({
      startM: door.startCm / 100,
      endM: door.endCm / 100,
      sillM: 0,
      topM: Math.min(ceilingHM - 0.12, door.heightCm / 100),
      kind: 'door',
      op: door,
    });
  }
  if (windowOp) {
    openings.push({
      startM: windowOp.startCm / 100,
      endM: windowOp.endCm / 100,
      sillM: windowOp.sillCm / 100,
      topM: Math.min(ceilingHM - 0.1, (windowOp.sillCm + windowOp.heightCm) / 100),
      kind: 'window',
      op: windowOp,
    });
  }
  openings.sort((a, b) => a.startM - b.startM);

  const addWallBox = (x0: number, x1: number, y0: number, y1: number) => {
    const w = x1 - x0;
    const h = y1 - y0;
    if (w <= 0.015 || h <= 0.015) return;
    const geom = new THREE.BoxGeometry(w, h, T);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, -T / 2);
    mesh.receiveShadow = true;
    mesh.castShadow = !isLowCutaway;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom), edgeLine));
    wallGroup.add(mesh);
  };

  // Build wall piers, sill walls, and top lintels around openings
  let cursor = 0;
  for (const op of openings) {
    // Solid pier before opening
    if (op.startM > cursor + 0.01) {
      addWallBox(cursor, op.startM, 0, activeWallH);
    }

    // Sill wall below window (if any)
    if (op.sillM > 0.02) {
      addWallBox(op.startM, op.endM, 0, Math.min(op.sillM, activeWallH));
    }

    // Lintel wall above opening (only on full-height walls)
    if (!isLowCutaway && op.topM < activeWallH - 0.02) {
      addWallBox(op.startM, op.endM, op.topM, activeWallH);
    }

    const opW = op.endM - op.startM;
    const opCenterX = (op.startM + op.endM) / 2;

    if (op.kind === 'door') {
      // Composite 3D Door Frame (حلق الباب) + Ajar Door Leaf + Brass Handle + 90° Floor Swing Arc!
      const doorH = op.topM;
      const jamb = 0.055;
      const frameDepth = T + 0.03;

      const leftJamb = new THREE.Mesh(new THREE.BoxGeometry(jamb, doorH, frameDepth), frameMat);
      leftJamb.position.set(op.startM + jamb / 2, doorH / 2, -T / 2);
      wallGroup.add(leftJamb);

      const rightJamb = new THREE.Mesh(new THREE.BoxGeometry(jamb, doorH, frameDepth), frameMat);
      rightJamb.position.set(op.endM - jamb / 2, doorH / 2, -T / 2);
      wallGroup.add(rightJamb);

      const topHeader = new THREE.Mesh(new THREE.BoxGeometry(opW, jamb, frameDepth), frameMat);
      topHeader.position.set(opCenterX, doorH - jamb / 2, -T / 2);
      wallGroup.add(topHeader);

      // Door leaf hinged at startM or endM swinging inward (+Z) or outward (-Z)
      const leafW = Math.max(0.5, opW - jamb * 2);
      const leafH = doorH - jamb;
      const swing = op.op.swing ?? 'inward-left';
      const hingeAtLeft = swing !== 'inward-right';
      const hingeX = hingeAtLeft ? op.startM + jamb : op.endM - jamb;
      const pivot = new THREE.Group();
      pivot.position.set(hingeX, 0, swing === 'outward' ? -T : 0);

      const leafGeom = new THREE.BoxGeometry(leafW, leafH, 0.042);
      const leafMesh = new THREE.Mesh(leafGeom, doorLeafMat);
      leafMesh.position.set(hingeAtLeft ? leafW / 2 : -leafW / 2, leafH / 2, 0);
      leafMesh.castShadow = true;
      leafMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(leafGeom), edgeLine));
      pivot.add(leafMesh);

      // Door brass handle
      const handleX = hingeAtLeft ? leafW - 0.11 : -(leafW - 0.11);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.09), brassMat);
      handle.position.set(handleX, 1.0, 0);
      pivot.add(handle);

      if (swing === 'inward-left') {
        pivot.rotation.y = -0.68; // opens into +Z room
      } else if (swing === 'inward-right') {
        pivot.rotation.y = 0.68; // opens into +Z room from right hinge
      } else {
        pivot.rotation.y = 0.55; // opens outward (-Z)
      }
      wallGroup.add(pivot);

      // Floor 90° Swing Clearance Zone (Green architectural arc on floor)
      const radius = Math.min(leafW + 0.04, 1.05);
      const arcGeom = new THREE.CircleGeometry(radius, 28, 0, Math.PI / 2);
      const arcMat = new THREE.MeshBasicMaterial({
        color: 0x059669,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const arcMesh = new THREE.Mesh(arcGeom, arcMat);
      arcMesh.rotation.x = -Math.PI / 2;
      if (swing === 'inward-left') {
        arcMesh.position.set(op.startM + jamb, 0.008, 0.01);
        arcMesh.rotation.z = -Math.PI / 2;
      } else if (swing === 'inward-right') {
        arcMesh.position.set(op.endM - jamb, 0.008, 0.01);
        arcMesh.rotation.z = Math.PI;
      } else {
        arcMesh.position.set(op.startM + jamb, 0.008, -T - 0.01);
        arcMesh.rotation.z = 0;
      }
      wallGroup.add(arcMesh);
    } else {
      // Composite 3D Window / Balcony Assembly (حلق + زجاج + قوائم + جلسة)
      const winH = op.topM - op.sillM;
      const winCenterY = (op.sillM + op.topM) / 2;
      const f = 0.05;
      const frameDepth = T + 0.02;

      // Perimeter window frame bars
      const barTop = new THREE.Mesh(new THREE.BoxGeometry(opW, f, frameDepth), frameMat);
      barTop.position.set(opCenterX, op.topM - f / 2, -T / 2);
      wallGroup.add(barTop);

      const barBot = new THREE.Mesh(new THREE.BoxGeometry(opW, f, frameDepth), frameMat);
      barBot.position.set(opCenterX, op.sillM + f / 2, -T / 2);
      wallGroup.add(barBot);

      const barL = new THREE.Mesh(new THREE.BoxGeometry(f, winH, frameDepth), frameMat);
      barL.position.set(op.startM + f / 2, winCenterY, -T / 2);
      wallGroup.add(barL);

      const barR = new THREE.Mesh(new THREE.BoxGeometry(f, winH, frameDepth), frameMat);
      barR.position.set(op.endM - f / 2, winCenterY, -T / 2);
      wallGroup.add(barR);

      // Mullions (1 vertical center bar for medium/small, 2 vertical bars for large windows >= 165cm)
      const panes = opW >= 1.65 ? 3 : opW >= 0.95 ? 2 : 1;
      for (let i = 1; i < panes; i++) {
        const mx = op.startM + (opW * i) / panes;
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.036, winH - f * 2, frameDepth * 0.72), frameMat);
        mullion.position.set(mx, winCenterY, -T / 2);
        wallGroup.add(mullion);
      }

      // Translucent Sky-Tinted Glass Pane
      const glassMesh = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(0.1, opW - f * 2), Math.max(0.1, winH - f * 2), 0.018),
        glassMat
      );
      glassMesh.position.set(opCenterX, winCenterY, -T / 2);
      wallGroup.add(glassMesh);

      // Protruding marble/wood windowsill (جلسة الشباك)
      if (!op.op.isBalcony) {
        const sillMesh = new THREE.Mesh(
          new THREE.BoxGeometry(opW + 0.08, 0.04, T + 0.08),
          sillMat
        );
        sillMesh.position.set(opCenterX, op.sillM, -T / 2 + 0.025);
        sillMesh.receiveShadow = true;
        wallGroup.add(sillMesh);
      }

      // Soft daylight projection strip on floor inside the room
      const sunMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: op.op.isBalcony ? 0.16 : 0.11,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const sunPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(opW, op.op.isBalcony ? 0.85 : 0.55),
        sunMat
      );
      sunPlane.rotation.x = -Math.PI / 2;
      sunPlane.position.set(opCenterX, 0.006, op.op.isBalcony ? 0.44 : 0.3);
      wallGroup.add(sunPlane);
    }

    cursor = Math.max(cursor, op.endM);
  }

  // Remaining solid pier to wall end
  if (cursor < wallLenM - 0.01) {
    addWallBox(cursor, wallLenM, 0, activeWallH);
  }

  return wallGroup;
}

/**
 * Interactive 2D Top-Down Architectural Floor Plan (SVG)
 * Shows all 4 walls, exact window/balcony span, door + 90° swing arc, column, and all auto-placed furniture.
 */
const RoomBlueprint2DSVG: React.FC<{
  plan: RoomPlanResult;
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  locale: AppLocale;
}> = ({ plan, selectedItemId, onSelectItem, locale }) => {
  const isRtl = locale === 'ar';
  const L = plan.lengthCm;
  const W = plan.widthCm;

  const pad = 54;
  const maxDrawW = 460;
  const maxDrawH = 310;
  const scale = Math.min(maxDrawW / L, maxDrawH / W);
  const drawW = L * scale;
  const drawH = W * scale;
  const svgW = drawW + pad * 2;
  const svgH = drawH + pad * 2;

  const toSvgX = (roomXCm: number) => pad + (roomXCm + L / 2) * scale;
  const toSvgY = (roomZCm: number) => pad + (roomZCm + W / 2) * scale;

  const renderOpening2D = (op: ResolvedOpening, kind: 'door' | 'window') => {
    const color = kind === 'door' ? '#059669' : '#0284C7';
    let x1 = 0;
    let y1 = 0;
    let x2 = 0;
    let y2 = 0;

    if (op.wall === 'back') {
      x1 = pad + op.startCm * scale;
      x2 = pad + op.endCm * scale;
      y1 = pad;
      y2 = pad;
    } else if (op.wall === 'front') {
      x1 = pad + op.startCm * scale;
      x2 = pad + op.endCm * scale;
      y1 = pad + drawH;
      y2 = pad + drawH;
    } else if (op.wall === 'left') {
      x1 = pad;
      x2 = pad;
      y1 = pad + op.startCm * scale;
      y2 = pad + op.endCm * scale;
    } else {
      x1 = pad + drawW;
      x2 = pad + drawW;
      y1 = pad + op.startCm * scale;
      y2 = pad + op.endCm * scale;
    }

    const r = op.widthCm * scale;
    const isHoriz = op.wall === 'back' || op.wall === 'front';

    // Door swing visualization
    let swingArc: React.ReactNode = null;
    if (kind === 'door') {
      const inwardSign = op.wall === 'back' || op.wall === 'left' ? 1 : -1;
      const outFactor = op.swing === 'outward' ? -0.55 : 0.88;
      const swingR = r * outFactor;

      if (isHoriz) {
        const hx = op.swing === 'inward-right' ? x2 : x1;
        const dirX = op.swing === 'inward-right' ? -1 : 1;
        const endY = y1 + inwardSign * swingR;
        swingArc = (
          <g>
            <path
              d={`M ${hx} ${y1} L ${hx} ${endY} A ${swingR} ${swingR} 0 0 ${
                dirX * inwardSign > 0 ? 0 : 1
              } ${hx + dirX * swingR} ${y1} Z`}
              fill="#10B981"
              fillOpacity="0.16"
              stroke="#059669"
              strokeWidth="1.4"
              strokeDasharray="4 3"
            />
            <line
              x1={hx}
              y1={y1}
              x2={hx + dirX * swingR * 0.55}
              y2={y1 + inwardSign * swingR * 0.82}
              stroke="#047857"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        );
      } else {
        const hy = op.swing === 'inward-right' ? y2 : y1;
        const dirY = op.swing === 'inward-right' ? -1 : 1;
        const endX = x1 + inwardSign * swingR;
        swingArc = (
          <g>
            <path
              d={`M ${x1} ${hy} L ${endX} ${hy} A ${swingR} ${swingR} 0 0 ${
                inwardSign * dirY > 0 ? 1 : 0
              } ${x1} ${hy + dirY * swingR} Z`}
              fill="#10B981"
              fillOpacity="0.16"
              stroke="#059669"
              strokeWidth="1.4"
              strokeDasharray="4 3"
            />
            <line
              x1={x1}
              y1={hy}
              x2={x1 + inwardSign * swingR * 0.82}
              y2={hy + dirY * swingR * 0.55}
              stroke="#047857"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        );
      }
    }

    const labelX = (x1 + x2) / 2;
    const labelY =
      op.wall === 'back'
        ? pad - 14
        : op.wall === 'front'
        ? pad + drawH + 20
        : (y1 + y2) / 2;
    const labelOffsetX =
      op.wall === 'left' ? pad - 10 : op.wall === 'right' ? pad + drawW + 10 : labelX;

    return (
      <g key={`${kind}-${op.wall}`}>
        {swingArc}
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#FFFFFF"
          strokeWidth="9"
          strokeLinecap="butt"
        />
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={color}
          strokeWidth={kind === 'window' ? '6' : '4'}
          strokeLinecap="butt"
        />
        {kind === 'window' && (
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#E0F2FE"
            strokeWidth="2"
          />
        )}
        <text
          x={labelOffsetX}
          y={labelY}
          textAnchor={
            op.wall === 'left' ? 'end' : op.wall === 'right' ? 'start' : 'middle'
          }
          dominantBaseline="central"
          fill={color}
          fontSize="10"
          fontWeight="700"
        >
          {kind === 'door'
            ? isRtl
              ? `باب ${op.widthCm}سم`
              : `Door ${op.widthCm}`
            : op.isBalcony
            ? isRtl
              ? `بلكونة ${op.widthCm}سم`
              : `Balc ${op.widthCm}`
            : isRtl
            ? `شباك ${op.widthCm}سم`
            : `Win ${op.widthCm}`}
        </text>
      </g>
    );
  };

  return (
    <div className="w-full h-[310px] sm:h-[440px] bg-[#FAF8F4] dark:bg-[#13161B] flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full h-full max-w-[580px]"
        role="img"
        aria-label={isRtl ? 'مخطط علوي للغرفة وتوزيع القطع' : '2D Top-Down Room Floor Plan'}
      >
        {/* Room Floor */}
        <rect
          x={pad}
          y={pad}
          width={drawW}
          height={drawH}
          fill="#FFFFFF"
          stroke="#44403C"
          strokeWidth="6"
          rx="2"
        />

        {/* Wall Orientation Labels */}
        <text
          x={pad + drawW / 2}
          y={16}
          textAnchor="middle"
          fill="#78716C"
          fontSize="10"
          fontWeight="700"
        >
          {isRtl ? `الحيطة الخلفية (${L} سم)` : `Back Wall (${L} cm)`}
        </text>
        <text
          x={pad + drawW / 2}
          y={svgH - 10}
          textAnchor="middle"
          fill="#78716C"
          fontSize="10"
          fontWeight="700"
        >
          {isRtl ? `الحيطة الأمامية (${L} سم)` : `Front Wall (${L} cm)`}
        </text>
        <text
          x={14}
          y={pad + drawH / 2}
          textAnchor="middle"
          fill="#78716C"
          fontSize="10"
          fontWeight="700"
          transform={`rotate(-90 14 ${pad + drawH / 2})`}
        >
          {isRtl ? `الشمال (${W} سم)` : `Left (${W} cm)`}
        </text>
        <text
          x={svgW - 14}
          y={pad + drawH / 2}
          textAnchor="middle"
          fill="#78716C"
          fontSize="10"
          fontWeight="700"
          transform={`rotate(90 ${svgW - 14} ${pad + drawH / 2})`}
        >
          {isRtl ? `اليمين (${W} سم)` : `Right (${W} cm)`}
        </text>

        {/* Corner Concrete Column */}
        {plan.resolvedColumn && (
          <g>
            <rect
              x={toSvgX(plan.resolvedColumn.box.minX)}
              y={toSvgY(plan.resolvedColumn.box.minZ)}
              width={plan.resolvedColumn.sizeCm * scale}
              height={plan.resolvedColumn.sizeCm * scale}
              fill="#64748B"
              stroke="#1E293B"
              strokeWidth="1.5"
            />
            <text
              x={toSvgX(plan.resolvedColumn.centerXCm)}
              y={toSvgY(plan.resolvedColumn.centerZCm)}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#FFFFFF"
              fontSize="8"
              fontWeight="700"
            >
              {isRtl ? 'عمود' : 'Col'}
            </text>
          </g>
        )}

        {/* Placed Furniture Pieces */}
        {plan.items.map((item) => {
          const isSideways = Math.abs(Math.sin(item.rotationYRad)) > 0.7;
          const bw = (isSideways ? item.projectParams.depthCm : item.projectParams.widthCm) * scale;
          const bh = (isSideways ? item.projectParams.widthCm : item.projectParams.depthCm) * scale;
          const cx = toSvgX(item.posXCm);
          const cy = toSvgY(item.posZCm);
          const isSel = selectedItemId === item.id;

          return (
            <g
              key={item.id}
              onClick={() => onSelectItem(isSel ? null : item.id)}
              className="cursor-pointer"
            >
              <rect
                x={cx - bw / 2}
                y={cy - bh / 2}
                width={bw}
                height={bh}
                rx="4"
                fill={isSel ? '#F59E0B' : '#FEF3C7'}
                fillOpacity={isSel ? '0.9' : '0.92'}
                stroke={isSel ? '#92400E' : '#B45309'}
                strokeWidth={isSel ? '2.4' : '1.5'}
              />
              <text
                x={cx}
                y={cy - (bh >= 34 ? 6 : 0)}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isSel ? '#FFFFFF' : '#78350F'}
                fontSize={bw >= 75 ? '10' : '8.5'}
                fontWeight="700"
              >
                {isRtl
                  ? item.roleAr.split(' ').slice(0, 2).join(' ')
                  : item.roleEn.split(' ').slice(0, 2).join(' ')}
              </text>
              {bh >= 30 && bw >= 44 && (
                <text
                  x={cx}
                  y={cy + 8}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isSel ? '#FEF3C7' : '#92400E'}
                  fontSize="8.5"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="600"
                >
                  {item.projectParams.widthCm}×{item.projectParams.depthCm}
                </text>
              )}
            </g>
          );
        })}

        {/* Architectural Openings (Window & Door on top of walls) */}
        {plan.resolvedWindow && renderOpening2D(plan.resolvedWindow, 'window')}
        {plan.resolvedDoor && renderOpening2D(plan.resolvedDoor, 'door')}
      </svg>
    </div>
  );
};

export const RoomSpaceDesignerView: React.FC<Props> = ({
  locale,
  theme,
  woodType,
  sheetPriceEgp,
  currencyLabel,
  onSelectWood,
  onUpdateSheetPrice,
  onOpenPieceInDesigner,
}) => {
  const isRtl = locale === 'ar';
  const [lengthCm, setLengthCm] = useState(380);
  const [widthCm, setWidthCm] = useState(340);
  const [ceilingCm, setCeilingCm] = useState(280);
  const [roomType, setRoomType] = useState<RoomSpaceType>('bedroom');
  const [details, setDetails] = useState<RoomArchitecturalDetails>(DEFAULT_ROOM_DETAILS);
  const [roomDescriptionText, setRoomDescriptionText] = useState('');
  const [parseFeedback, setParseFeedback] = useState<string | null>(null);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [roomExplodePct, setRoomExplodePct] = useState(0);
  const [cameraPreset, setCameraPreset] = useState<RoomCameraPreset>('iso');
  const [viewMode, setViewMode] = useState<RoomViewMode>('3d');
  const [wallCutMode, setWallCutMode] = useState<WallCutMode>('cutaway');

  const mountRef = useRef<HTMLDivElement | null>(null);
  const presetReqRef = useRef<RoomCameraPreset | null>('iso');
  const explodeTargetRef = useRef(0);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const snapshotRef = useRef<(() => void) | null>(null);
  const rebuildRoomRef = useRef<(() => void) | null>(null);

  const plan = useMemo(
    () =>
      generateRoomSpacePlan({
        lengthCm,
        widthCm,
        ceilingCm,
        roomType,
        woodType,
        sheetPriceEgp,
        details,
      }),
    [lengthCm, widthCm, ceilingCm, roomType, woodType, sheetPriceEgp, details]
  );

  const latestDataRef = useRef({
    plan,
    woodType,
    theme,
    selectedItemId,
    wallCutMode,
  });
  latestDataRef.current = {
    plan,
    woodType,
    theme,
    selectedItemId,
    wallCutMode,
  };

  useEffect(() => {
    explodeTargetRef.current = roomExplodePct / 100;
    requestRenderRef.current?.();
  }, [roomExplodePct]);

  useEffect(() => {
    if (viewMode === '3d') {
      rebuildRoomRef.current?.();
    }
  }, [plan, woodType, theme, selectedItemId, wallCutMode, viewMode]);

  useEffect(() => {
    if (viewMode !== '3d') return;
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || 640, container.clientHeight || 440);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(
      42,
      (container.clientWidth || 640) / (container.clientHeight || 440),
      0.08,
      60
    );
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.minDistance = 1.8;
    controls.maxDistance = 15;

    const hemi = new THREE.HemisphereLight(0xf6f9ff, 0x807262, 0.92);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff5e4, 1.65);
    dir.position.set(4.5, 6.8, 4.5);
    dir.castShadow = !isSoftwareGl;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.left = -5;
    dir.shadow.camera.right = 5;
    dir.shadow.camera.top = 5;
    dir.shadow.camera.bottom = -5;
    dir.shadow.bias = -0.0005;
    scene.add(dir);

    let roomGroup: THREE.Group | null = null;
    let animatedItems: { obj: THREE.Group; basePos: THREE.Vector3; offset: THREE.Vector3 }[] = [];
    let currentExplode = 0;

    const disposeGroup = () => {
      if (roomGroup) {
        roomGroup.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
            else mesh.material.dispose();
          }
        });
        scene.remove(roomGroup);
        roomGroup = null;
      }
      animatedItems = [];
    };

    const rebuildRoom = () => {
      disposeGroup();
      const {
        plan: p,
        woodType: wt,
        theme: th,
        selectedItemId: selId,
        wallCutMode: cutMode,
      } = latestDataRef.current;

      const bgHex = th === 'dark' ? 0x13161b : 0xf2efe9;
      scene.background = new THREE.Color(bgHex);
      scene.fog = new THREE.Fog(bgHex, 11, 28);

      const L = p.lengthCm / 100;
      const W = p.widthCm / 100;
      const H = p.ceilingCm / 100;
      const wallT = 0.12;

      const group = new THREE.Group();
      const wood = getWoodSpec(wt);

      // Floor slab
      const floorMat = new THREE.MeshStandardMaterial({
        color: th === 'dark' ? 0x222730 : 0xe9e4da,
        roughness: 0.88,
      });
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(L + wallT * 2 + 0.08, 0.08, W + wallT * 2 + 0.08),
        floorMat
      );
      floor.position.set(0, -0.04, 0);
      floor.receiveShadow = true;
      group.add(floor);

      // Architectural floor grid
      const grid = new THREE.GridHelper(
        Math.max(L, W),
        Math.max(6, Math.round(Math.max(L, W) * 2)),
        th === 'dark' ? 0x475569 : 0xc2b9aa,
        th === 'dark' ? 0x334155 : 0xd9d2c5
      );
      grid.position.y = 0.002;
      grid.scale.set(L / Math.max(L, W), 1, W / Math.max(L, W));
      group.add(grid);

      // Shared architectural materials
      const wallMat = new THREE.MeshStandardMaterial({
        color: th === 'dark' ? 0x28303b : 0xf8f6f1,
        roughness: 0.92,
      });
      const cutWallMat = new THREE.MeshStandardMaterial({
        color: th === 'dark' ? 0x334155 : 0xe7e2d8,
        roughness: 0.9,
      });
      const frameMat = new THREE.MeshStandardMaterial({
        color: th === 'dark' ? 0x475569 : 0x57534e,
        roughness: 0.45,
        metalness: 0.2,
      });
      const doorLeafMat = new THREE.MeshStandardMaterial({
        color: 0x8b5a2b,
        roughness: 0.55,
      });
      const brassMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.25,
        metalness: 0.85,
      });
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        roughness: 0.12,
        metalness: 0.15,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      });
      const sillMat = new THREE.MeshStandardMaterial({
        color: th === 'dark' ? 0x94a3b8 : 0xe2ddd5,
        roughness: 0.35,
      });
      const edgeLine = new THREE.LineBasicMaterial({
        color: 0x3b2a1a,
        transparent: true,
        opacity: 0.32,
      });

      // Build all 4 architectural walls with REAL cutouts for the Door and Window/Balcony!
      const wallDefs: {
        wall: RoomWall;
        lenM: number;
        pos: [number, number, number];
        rotY: number;
        isCutawayByDefault: boolean;
      }[] = [
        { wall: 'back', lenM: L, pos: [-L / 2, 0, -W / 2], rotY: 0, isCutawayByDefault: false },
        { wall: 'left', lenM: W, pos: [-L / 2, 0, W / 2], rotY: Math.PI / 2, isCutawayByDefault: false },
        { wall: 'right', lenM: W, pos: [L / 2, 0, -W / 2], rotY: -Math.PI / 2, isCutawayByDefault: true },
        { wall: 'front', lenM: L, pos: [L / 2, 0, W / 2], rotY: Math.PI, isCutawayByDefault: true },
      ];

      for (const wd of wallDefs) {
        // Flip s-coordinate for walls whose local +X runs opposite to our roomEngine 1D axis
        const mapOpeningToLocal = (op: ResolvedOpening | null): ResolvedOpening | null => {
          if (!op || op.wall !== wd.wall) return null;
          // Back: local X goes from -L/2 to +L/2 (matches s = 0..L)
          // Right: local X goes from -W/2 to +W/2 (matches s = 0..W)
          // Left: local X goes from +W/2 to -W/2 (reversed from s = 0..W!)
          // Front: local X goes from +L/2 to -L/2 (reversed from s = 0..L!)
          if (wd.wall === 'left' || wd.wall === 'front') {
            const wallLenCm = wd.wall === 'front' ? p.lengthCm : p.widthCm;
            const flippedSwing: DoorSwingType | undefined =
              op.swing === 'inward-left'
                ? 'inward-right'
                : op.swing === 'inward-right'
                ? 'inward-left'
                : op.swing;
            return {
              ...op,
              startCm: wallLenCm - op.endCm,
              endCm: wallLenCm - op.startCm,
              centerCm: wallLenCm - op.centerCm,
              swing: flippedSwing,
            };
          }
          return op;
        };

        const wDoor = mapOpeningToLocal(p.resolvedDoor);
        const wWin = mapOpeningToLocal(p.resolvedWindow);

        const wallMeshGroup = buildArchitecturalWall3D({
          wall: wd.wall,
          wallLenM: wd.lenM,
          ceilingHM: H,
          wallThicknessM: wallT,
          isLowCutaway: cutMode === 'cutaway' && wd.isCutawayByDefault,
          door: wDoor,
          windowOp: wWin,
          wallMat,
          cutWallMat,
          frameMat,
          doorLeafMat,
          brassMat,
          glassMat,
          sillMat,
          edgeLine,
        });
        wallMeshGroup.position.set(wd.pos[0], wd.pos[1], wd.pos[2]);
        wallMeshGroup.rotation.y = wd.rotY;
        group.add(wallMeshGroup);
      }

      // 3D Corner Concrete Column (if enabled)
      if (p.resolvedColumn) {
        const cs = p.resolvedColumn.sizeCm / 100;
        const colGeom = new THREE.BoxGeometry(cs, H, cs);
        const colMat = new THREE.MeshStandardMaterial({
          color: th === 'dark' ? 0x475569 : 0xcbd5e1,
          roughness: 0.82,
        });
        const colMesh = new THREE.Mesh(colGeom, colMat);
        colMesh.position.set(
          p.resolvedColumn.centerXCm / 100,
          H / 2,
          p.resolvedColumn.centerZCm / 100
        );
        colMesh.castShadow = true;
        colMesh.receiveShadow = true;
        colMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(colGeom), edgeLine));
        group.add(colMesh);
      }

      // Furniture pieces auto-placed around the openings
      const woodMat = new THREE.MeshStandardMaterial({
        color: wood.baseHex,
        roughness: wood.roughness,
      });
      const frontMat = new THREE.MeshStandardMaterial({
        color: wood.grainHex,
        roughness: Math.max(0.35, wood.roughness - 0.1),
      });
      const highlightMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        emissive: 0x78350f,
        emissiveIntensity: 0.22,
        roughness: 0.4,
      });
      const accentMat = new THREE.MeshStandardMaterial({ color: 0xd9cbb6, roughness: 0.85 });

      p.items.forEach((item, idx) => {
        const isSel = selId === item.id;
        const furn = buildMiniFurniture3D(
          item,
          isSel ? highlightMat : woodMat,
          isSel ? highlightMat : frontMat,
          accentMat,
          edgeLine
        );
        const bx = item.posXCm / 100;
        const bz = item.posZCm / 100;
        furn.position.set(bx, 0, bz);
        furn.rotation.y = item.rotationYRad;
        group.add(furn);

        const angle = (idx / Math.max(1, p.items.length)) * Math.PI * 2;
        const offset = new THREE.Vector3(
          Math.cos(angle) * 0.42,
          0.32 + idx * 0.16,
          Math.sin(angle) * 0.42
        );
        animatedItems.push({ obj: furn, basePos: furn.position.clone(), offset });
      });

      roomGroup = group;
      scene.add(group);
      controls.target.set(0, Math.min(1.0, H * 0.32), 0);
      presetReqRef.current = cameraPreset;
      requestRender();
    };

    rebuildRoomRef.current = rebuildRoom;

    let frameId = 0;
    let busy = false;
    let dirty = false;
    let disposed = false;
    let lastT = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const requestRender = () => {
      if (disposed) return;
      if (busy) {
        dirty = true;
        return;
      }
      busy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        dirty = false;
        const now = performance.now();
        const dt = Math.min(0.05, Math.max(0.005, (now - lastT) / 1000));
        lastT = now;
        let more = false;

        const targetExp = explodeTargetRef.current;
        if (Math.abs(currentExplode - targetExp) > 0.003) {
          currentExplode = isSoftwareGl
            ? targetExp
            : THREE.MathUtils.damp(currentExplode, targetExp, 7, dt);
          if (!isSoftwareGl && Math.abs(currentExplode - targetExp) > 0.003) more = true;
          else currentExplode = targetExp;
        }

        for (const a of animatedItems) {
          a.obj.position.copy(a.basePos).addScaledVector(a.offset, currentExplode);
        }

        const preset = presetReqRef.current;
        if (preset) {
          const p = latestDataRef.current.plan;
          const span = Math.max(p.lengthCm, p.widthCm) / 100;
          const targetPos = new THREE.Vector3();
          if (preset === 'top') {
            targetPos.set(0.02, span * 1.65, 0.25);
          } else if (preset === 'front') {
            targetPos.set(0, (p.ceilingCm / 100) * 0.58, span * 1.5);
          } else {
            targetPos.set(span * 1.05, span * 0.94, span * 1.15);
          }

          if (isSoftwareGl) {
            camera.position.copy(targetPos);
            presetReqRef.current = null;
          } else {
            camera.position.lerp(targetPos, 1 - Math.exp(-8 * dt));
            if (camera.position.distanceTo(targetPos) < 0.02) {
              camera.position.copy(targetPos);
              presetReqRef.current = null;
            } else {
              more = true;
            }
          }
        }

        controls.update();
        renderer.render(scene, camera);
        const done = () => {
          busy = false;
          if (dirty || more) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    requestRenderRef.current = requestRender;
    snapshotRef.current = () => {
      renderer.render(scene, camera);
      const a = document.createElement('a');
      a.href = renderer.domElement.toDataURL('image/png');
      a.download = `bola-wood-room-${lengthCm}x${widthCm}cm.png`;
      a.click();
    };

    const onStart = () => {
      presetReqRef.current = null;
    };
    controls.addEventListener('start', onStart);
    controls.addEventListener('change', requestRender);

    rebuildRoom();

    const ro = new ResizeObserver(() => {
      if (!container || disposed) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 440;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    ro.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      disposeGroup();
      envTarget.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const applyWindowPreset = (preset: WindowSizePreset) => {
    const defs = getWindowPresetDefaults(preset);
    setDetails((prev) => ({
      ...prev,
      windowPreset: preset,
      windowWidthCm: defs.widthCm,
      windowHeightCm: defs.heightCm,
      windowSillCm: defs.sillCm,
    }));
  };

  const applyRoomDescription = () => {
    if (!roomDescriptionText.trim()) return;
    const parsed = parseEgyptianRoomDescription(roomDescriptionText, {
      lengthCm,
      widthCm,
      roomType,
      details,
    });
    setLengthCm(parsed.lengthCm);
    setWidthCm(parsed.widthCm);
    setRoomType(parsed.roomType);
    setDetails(parsed.details);
    setParseFeedback(parsed.matchedSummaryAr);
    setSelectedItemId(null);
  };

  const roomTypeButtons: { id: RoomSpaceType; ar: string; en: string }[] = [
    { id: 'auto', ar: 'اقترحلي أوتوماتيك', en: 'Smart Auto' },
    { id: 'bedroom', ar: 'أوضة نوم', en: 'Bedroom' },
    { id: 'dressing', ar: 'دريسينج روم', en: 'Dressing' },
    { id: 'kitchen', ar: 'مطبخ', en: 'Kitchen' },
    { id: 'living', ar: 'ليفينج وسفرة', en: 'Living' },
    { id: 'office', ar: 'أوضة مكتب', en: 'Office' },
    { id: 'entryway', ar: 'مدخل / ركن صغير', en: 'Entry Nook' },
  ];

  const wallOptions: { id: RoomWall; ar: string; en: string }[] = [
    { id: 'back', ar: 'الخلفية (الوش)', en: 'Back' },
    { id: 'right', ar: 'اليمين', en: 'Right' },
    { id: 'left', ar: 'الشمال', en: 'Left' },
    { id: 'front', ar: 'الأمامية', en: 'Front' },
  ];

  const posOptions: { id: WallSidePosition; ar: string; en: string }[] = [
    { id: 'left', ar: 'شمال / بداية', en: 'Left' },
    { id: 'center', ar: 'في النص', en: 'Center' },
    { id: 'right', ar: 'يمين / آخرها', en: 'Right' },
  ];

  const triggerPreset = (preset: RoomCameraPreset) => {
    setCameraPreset(preset);
    presetReqRef.current = preset;
    requestRenderRef.current?.();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header Summary Banner */}
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
              {isRtl
                ? 'مصمم الغرف 3D حسب تفاصيل الأوضة (الباب + الشباك + المساحة)'
                : 'Architectural 3D Room Planner (Door + Window + Space)'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              {isRtl
                ? 'حدّد مقاس الغرفة ومكان الباب (يمين/شمال) وحجم الشباك والعمود، والبرنامج هيرسملك القطع جواها أوتوماتيك من غير ما تسد باب أو شباك'
                : 'Set room size, doorway wall, window size & columns — furniture auto-places & resizes cleanly around every opening'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-stone-500 block">
              {isRtl ? 'المساحة الصافية' : 'Net Area'}
            </span>
            <span className="font-mono tabular-nums font-bold text-base text-amber-700 dark:text-amber-400">
              {plan.areaM2} {isRtl ? 'م²' : 'm²'}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block">
              {isRtl ? 'الألواح للأوضة' : 'Room Sheets'}
            </span>
            <span className="font-bold text-base text-stone-900 dark:text-stone-100">
              {isRtl ? egQtySheets(plan.totalSheets) : `${plan.totalSheets} sheets`}
            </span>
          </div>
          <div>
            <span className="text-stone-500 block">
              {isRtl ? 'التكلفة التقريبية' : 'Estimate'}
            </span>
            <span className="font-mono tabular-nums font-bold text-base text-emerald-700 dark:text-emerald-400">
              {plan.totalRoomCostEgp.toLocaleString()} {currencyLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Main Split: 3D/2D Stage FIRST on mobile (order-1 lg:order-2), Controls cleanly below on mobile (order-2 lg:order-1) */}
      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5 items-start">
        {/* Visual Stage + Advisor + Auto-Placed Pieces */}
        <div className="order-1 lg:order-2 flex flex-col gap-5 min-w-0">
          {/* 3D & 2D Room Viewport Card */}
          <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] flex flex-col">
            {/* Top Mode Strip: 3D vs 2D Floor Plan + Cutaway toggle */}
            <div className="px-3 py-2.5 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2 bg-stone-50/70 dark:bg-[#14171B]">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-200/70 dark:bg-stone-800">
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className={`min-h-[34px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    viewMode === '3d'
                      ? 'bg-amber-700 text-white'
                      : 'text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'عرض 3D للأوضة' : '3D Room'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('2d')}
                  className={`min-h-[34px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    viewMode === '2d'
                      ? 'bg-amber-700 text-white'
                      : 'text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>{isRtl ? 'مخطط علوي 2D' : '2D Floor Plan'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {viewMode === '3d' && (
                  <button
                    type="button"
                    onClick={() =>
                      setWallCutMode((m) => (m === 'cutaway' ? 'full' : 'cutaway'))
                    }
                    className="min-h-[34px] px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#191C20] text-[11px] font-semibold text-stone-700 dark:text-stone-200"
                  >
                    {wallCutMode === 'cutaway'
                      ? isRtl
                        ? 'قطع معماري (مفتوح)'
                        : 'Cutaway Walls'
                      : isRtl
                      ? '4 حوائط كاملة'
                      : 'Full 4 Walls'}
                  </button>
                )}
                {viewMode === '3d' && (
                  <button
                    type="button"
                    onClick={() => snapshotRef.current?.()}
                    className="min-h-[34px] px-2.5 rounded-lg bg-white dark:bg-[#191C20] border border-stone-200 dark:border-stone-700 text-[11px] font-semibold flex items-center gap-1 hover:bg-amber-50 dark:hover:bg-stone-800"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    <span>{isRtl ? 'حفظ' : 'PNG'}</span>
                  </button>
                )}
              </div>
            </div>

            {viewMode === '3d' ? (
              <div className="relative w-full h-[310px] sm:h-[440px] bg-[#F2EFE9] dark:bg-[#13161B] select-none overflow-hidden">
                <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
                <div className="absolute top-2.5 start-2.5 z-10 pointer-events-none px-2.5 py-1 rounded-xl bg-white/95 dark:bg-[#191C20]/95 border border-stone-200 dark:border-stone-700 text-[11px] font-bold text-stone-800 dark:text-stone-100 flex items-center gap-1.5 max-w-[calc(100%-24px)]">
                  <Compass className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span className="truncate">
                    {isRtl
                      ? `${plan.lengthCm}×${plan.widthCm} سم · ${
                          plan.resolvedDoor ? `باب ${getWallNameAr(plan.resolvedDoor.wall)}` : 'بدون باب'
                        }${
                          plan.resolvedWindow
                            ? ` · ${plan.resolvedWindow.isBalcony ? 'بلكونة' : 'شباك'} ${plan.resolvedWindow.widthCm}سم`
                            : ''
                        }`
                      : `${plan.lengthCm}×${plan.widthCm} cm · ${plan.areaM2} m²`}
                  </span>
                </div>
              </div>
            ) : (
              <RoomBlueprint2DSVG
                plan={plan}
                selectedItemId={selectedItemId}
                onSelectItem={setSelectedItemId}
                locale={locale}
              />
            )}

            {/* Attached Bottom Control Bar (3D Camera & Explode) */}
            {viewMode === '3d' && (
              <div className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-2.5 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
                  {(
                    [
                      { id: 'iso', ar: '3D', en: '3D' },
                      { id: 'top', ar: 'علوي', en: 'Top' },
                      { id: 'front', ar: 'أمامي', en: 'Front' },
                    ] as const
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => triggerPreset(preset.id)}
                      className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap ${
                        cameraPreset === preset.id
                          ? 'bg-amber-700 text-white'
                          : 'text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {isRtl ? preset.ar : preset.en}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                  <Layers className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold whitespace-nowrap">
                    {isRtl ? 'تفكيك' : 'Explode'}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={roomExplodePct}
                    onChange={(e) => setRoomExplodePct(Number(e.target.value))}
                    className="flex-1 accent-amber-700 cursor-pointer h-2"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRoomExplodePct(0);
                    setSelectedItemId(null);
                    triggerPreset('iso');
                  }}
                  className="min-h-[36px] min-w-[36px] rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-center"
                  aria-label="Reset Room View"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Architectural Summary & Smart Recommendation */}
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <Lightbulb className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm sm:text-base font-bold text-emerald-950 dark:text-emerald-200">
                  {isRtl ? plan.headlineAr : plan.headlineEn}
                </h2>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mt-1">
                  {isRtl ? plan.architecturalSummaryAr : plan.architecturalSummaryEn}
                </p>
                <p className="text-xs sm:text-sm text-emerald-900/90 dark:text-emerald-200/90 mt-1 leading-relaxed">
                  {isRtl ? plan.recommendationAr : plan.recommendationEn}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/70 dark:border-emerald-900/50 text-xs">
              <div>
                <p className="font-bold text-emerald-950 dark:text-emerald-200 mb-1.5">
                  {isRtl ? 'بدائل تانية تنفع في نفس المساحة:' : 'Other Layouts That Fit:'}
                </p>
                <ul className="space-y-1 text-emerald-900/85 dark:text-emerald-300">
                  {(isRtl ? plan.alternativeUsesAr : plan.alternativeUsesEn).map((alt) => (
                    <li key={alt} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{alt}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-bold text-emerald-950 dark:text-emerald-200 mb-1.5">
                  {isRtl ? 'ملاحظات النجارة والحركة:' : 'Carpentry & Clearance Notes:'}
                </p>
                <ul className="space-y-1 text-emerald-900/85 dark:text-emerald-300">
                  {(isRtl ? plan.ergonomicTipsAr : plan.ergonomicTipsEn).map((tip) => (
                    <li key={tip} className="flex items-start gap-1.5">
                      <span className="text-emerald-700 font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Auto-Placed Furniture Pieces */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 sm:p-5 flex flex-col gap-3">
            <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
              {isRtl
                ? `القطع المرسومة جوه الأوضة (${plan.items.length} قطع · اضغط على أي قطعة لتفصيلها وتفكيكها)`
                : `Furniture Drawn Inside Room (${plan.items.length} pieces — tap any to open 3D cut list)`}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plan.items.map((item) => {
                const isSel = selectedItemId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemId(isSel ? null : item.id)}
                    className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition-colors cursor-pointer ${
                      isSel
                        ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/25'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-[#111315]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {isRtl ? item.roleAr : item.roleEn}
                        </p>
                        <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 leading-snug">
                          {isRtl ? item.wallNoteAr : item.wallNoteEn}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-400 shrink-0 text-end">
                        {isRtl
                          ? egBoxDims(
                              item.projectParams.widthCm,
                              item.projectParams.heightCm,
                              item.projectParams.depthCm
                            )
                          : `${item.projectParams.widthCm}×${item.projectParams.heightCm}×${item.projectParams.depthCm} cm`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/70 dark:border-stone-800 text-xs">
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                        <span>
                          {isRtl ? egQtySheets(item.sheetsCount) : `${item.sheetsCount} sheets`}
                        </span>
                        <span>·</span>
                        <span>
                          {isRtl ? egQtyPieces(item.piecesCount) : `${item.piecesCount} pcs`}
                        </span>
                        <span>·</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          {item.estimatedCostEgp.toLocaleString()} {currencyLabel}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPieceInDesigner(item.projectParams);
                        }}
                        className="min-h-[34px] px-3 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>{isRtl ? 'افتح تفصيلها 3D' : 'Open 3D Cut List'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Left/Bottom Controls Panel: Room Description + Openings (Door / Window / Column) + Exact Size */}
        <section className="order-2 lg:order-1 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-4 sm:p-5 flex flex-col gap-5">
          {/* Quick Free-Text Egyptian Room Description Parser */}
          <div className="rounded-xl border border-amber-300/80 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/25 p-3.5 flex flex-col gap-2.5">
            <label
              htmlFor="room-eg-desc"
              className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>
                {isRtl
                  ? 'اوصف الأوضة بالمصري والبرنامج يرسمها فوراً:'
                  : 'Describe your room & openings to auto-draw:'}
              </span>
            </label>
            <textarea
              id="room-eg-desc"
              rows={2}
              value={roomDescriptionText}
              onChange={(e) => setRoomDescriptionText(e.target.value)}
              placeholder={
                isRtl
                  ? 'مثال: أوضة نوم 400×350 فيها شباك كبير في الوش والباب من اليمين...'
                  : 'e.g. Bedroom 400x350 with large back window and door on the right...'
              }
              className="w-full rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-[#111315] px-3 py-2 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600/30"
            />
            <button
              type="button"
              onClick={applyRoomDescription}
              className="w-full min-h-[40px] px-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-colors"
            >
              {isRtl ? 'ارسم الأوضة والقطع حسب الوصف' : 'Apply Description to 3D Room'}
            </button>
            {parseFeedback && (
              <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                {parseFeedback}
              </p>
            )}

            {/* 1-Tap Ready Room Detail Scenarios */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                {
                  ar: 'شباك كبير في الوش + باب يمين',
                  apply: () => {
                    setRoomType('bedroom');
                    setDetails({
                      ...DEFAULT_ROOM_DETAILS,
                      doorWall: 'right',
                      doorPosition: 'right',
                      windowPreset: 'large',
                      windowWall: 'back',
                      windowPosition: 'center',
                      windowWidthCm: 200,
                      windowHeightCm: 135,
                      windowSillCm: 95,
                    });
                  },
                },
                {
                  ar: 'شباك كبير في الوش + باب شمال',
                  apply: () => {
                    setRoomType('bedroom');
                    setDetails({
                      ...DEFAULT_ROOM_DETAILS,
                      doorWall: 'left',
                      doorPosition: 'right',
                      doorSwing: 'inward-right',
                      windowPreset: 'large',
                      windowWall: 'back',
                      windowPosition: 'center',
                      windowWidthCm: 200,
                      windowHeightCm: 135,
                      windowSillCm: 95,
                    });
                  },
                },
                {
                  ar: 'بلكونة في الوش + باب شمال',
                  apply: () => {
                    setRoomType('bedroom');
                    setDetails({
                      ...DEFAULT_ROOM_DETAILS,
                      doorWall: 'left',
                      doorPosition: 'right',
                      windowPreset: 'balcony',
                      windowWall: 'back',
                      windowPosition: 'center',
                      windowWidthCm: 165,
                      windowHeightCm: 215,
                      windowSillCm: 0,
                    });
                  },
                },
                {
                  ar: 'مطبخ بشباك كبير + باب يمين',
                  apply: () => {
                    setRoomType('kitchen');
                    setLengthCm(330);
                    setWidthCm(270);
                    setDetails({
                      ...DEFAULT_ROOM_DETAILS,
                      doorWall: 'right',
                      doorPosition: 'right',
                      windowPreset: 'large',
                      windowWall: 'back',
                      windowPosition: 'center',
                      windowWidthCm: 180,
                      windowHeightCm: 120,
                      windowSillCm: 105,
                    });
                  },
                },
              ].map((sc) => (
                <button
                  key={sc.ar}
                  type="button"
                  onClick={() => {
                    sc.apply();
                    setParseFeedback(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-amber-300/90 dark:border-amber-800 bg-white dark:bg-[#111315] hover:bg-amber-100/70 dark:hover:bg-amber-950/50 text-[11px] font-semibold text-stone-800 dark:text-stone-200"
                >
                  {sc.ar}
                </button>
              ))}
            </div>
          </div>

          {/* Room Type Selector */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-200">
              {isRtl ? 'نوع الغرفة أو المكان' : 'Room Purpose'}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {roomTypeButtons.map((btn) => {
                const active = roomType === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => {
                      setRoomType(btn.id);
                      setSelectedItemId(null);
                    }}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                      active
                        ? 'border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300'
                        : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    {isRtl ? btn.ar : btn.en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DOOR DETAILS SECTION (تفاصيل الباب) */}
          <div className="flex flex-col gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                <DoorOpen className="w-4 h-4 shrink-0" />
                <span>{isRtl ? 'تفاصيل باب الغرفة' : 'Room Door Details'}</span>
              </span>
              <button
                type="button"
                onClick={() => setDetails((d) => ({ ...d, hasDoor: !d.hasDoor }))}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                  details.hasDoor
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                }`}
              >
                {details.hasDoor
                  ? isRtl
                    ? 'الباب مفعّل'
                    : 'Door On'
                  : isRtl
                  ? 'بدون باب'
                  : 'No Door'}
              </button>
            </div>

            {details.hasDoor && (
              <div className="flex flex-col gap-2.5">
                <div>
                  <span className="text-[11px] font-semibold text-stone-500 block mb-1">
                    {isRtl ? 'الباب على أنهي حيطة؟ (يمين / شمال / أمام / خلف)' : 'Door Wall'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {wallOptions.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setDetails((d) => ({ ...d, doorWall: w.id }))}
                        className={`min-h-[36px] px-2 rounded-lg border text-[11px] font-bold ${
                          details.doorWall === w.id
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {isRtl ? w.ar : w.en}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-stone-500 block mb-1">
                    {isRtl ? 'مكان الباب على الحيطة' : 'Door Position Along Wall'}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {posOptions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setDetails((d) => ({ ...d, doorPosition: p.id }))}
                        className={`min-h-[34px] px-2 rounded-lg border text-[11px] font-semibold ${
                          details.doorPosition === p.id
                            ? 'border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300'
                            : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                        }`}
                      >
                        {isRtl ? p.ar : p.en}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[11px] font-semibold text-stone-500 block mb-1">
                      {isRtl ? 'عرض الباب (يدوي)' : 'Door Width'}
                    </span>
                    <ManualNumberInput
                      value={details.doorWidthCm}
                      onChange={(v) => setDetails((d) => ({ ...d, doorWidthCm: v }))}
                      min={65}
                      max={180}
                      step={5}
                      unit={isRtl ? 'سم' : 'cm'}
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-stone-500 block mb-1">
                      {isRtl ? 'اتجاه فتح الضلفة' : 'Swing Direction'}
                    </span>
                    <select
                      value={details.doorSwing}
                      onChange={(e) =>
                        setDetails((d) => ({
                          ...d,
                          doorSwing: e.target.value as DoorSwingType,
                        }))
                      }
                      className="w-full h-11 px-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#111315] text-xs font-semibold text-stone-800 dark:text-stone-200"
                    >
                      <option value="inward-left">
                        {isRtl ? 'لجوه (ناحية الشمال)' : 'Inward Left'}
                      </option>
                      <option value="inward-right">
                        {isRtl ? 'لجوه (ناحية اليمين)' : 'Inward Right'}
                      </option>
                      <option value="outward">
                        {isRtl ? 'لبره (خارج الأوضة)' : 'Outward'}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* WINDOW / BALCONY DETAILS SECTION (تفاصيل الشباك أو البلكونة) */}
          <div className="flex flex-col gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <span className="text-xs font-bold text-sky-800 dark:text-sky-400 flex items-center gap-1.5">
              <Grid2x2 className="w-4 h-4 shrink-0" />
              <span>{isRtl ? 'تفاصيل الشباك أو البلكونة' : 'Window / Balcony Details'}</span>
            </span>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(
                [
                  { id: 'none', ar: 'مفيش', en: 'None' },
                  { id: 'small', ar: 'صغير', en: 'Small' },
                  { id: 'medium', ar: 'متوسط', en: 'Med' },
                  { id: 'large', ar: 'كبير', en: 'Large' },
                  { id: 'balcony', ar: 'بلكونة', en: 'Balcony' },
                ] as { id: WindowSizePreset; ar: string; en: string }[]
              ).map((wp) => (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() => applyWindowPreset(wp.id)}
                  className={`min-h-[36px] px-2 rounded-lg border text-[11px] font-bold ${
                    details.windowPreset === wp.id
                      ? 'bg-sky-700 text-white border-sky-700'
                      : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {isRtl ? wp.ar : wp.en}
                </button>
              ))}
            </div>

            {details.windowPreset !== 'none' && (
              <div className="flex flex-col gap-2.5">
                <div>
                  <span className="text-[11px] font-semibold text-stone-500 block mb-1">
                    {isRtl ? 'الشباك على أنهي حيطة؟' : 'Window Wall'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {wallOptions.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setDetails((d) => ({ ...d, windowWall: w.id }))}
                        className={`min-h-[36px] px-2 rounded-lg border text-[11px] font-bold ${
                          details.windowWall === w.id
                            ? 'bg-sky-700 text-white border-sky-700'
                            : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {isRtl ? w.ar : w.en}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-stone-500 block mb-1">
                    {isRtl ? 'مكان الشباك على الحيطة' : 'Window Position'}
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {posOptions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setDetails((d) => ({ ...d, windowPosition: p.id }))}
                        className={`min-h-[34px] px-2 rounded-lg border text-[11px] font-semibold ${
                          details.windowPosition === p.id
                            ? 'border-sky-700 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-300'
                            : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                        }`}
                      >
                        {isRtl ? p.ar : p.en}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="flex items-center sm:flex-col justify-between gap-2 sm:gap-1">
                    <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 w-24 sm:w-auto shrink-0">
                      {isRtl ? 'عرض الشباك' : 'Width'}
                    </span>
                    <ManualNumberInput
                      value={details.windowWidthCm}
                      onChange={(v) => setDetails((d) => ({ ...d, windowWidthCm: v }))}
                      min={50}
                      max={450}
                      step={10}
                      unit={isRtl ? 'سم' : 'cm'}
                      className="flex-1 sm:w-full"
                    />
                  </div>
                  <div className="flex items-center sm:flex-col justify-between gap-2 sm:gap-1">
                    <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 w-24 sm:w-auto shrink-0">
                      {isRtl ? 'ارتفاعه' : 'Height'}
                    </span>
                    <ManualNumberInput
                      value={details.windowHeightCm}
                      onChange={(v) => setDetails((d) => ({ ...d, windowHeightCm: v }))}
                      min={50}
                      max={260}
                      step={10}
                      unit={isRtl ? 'سم' : 'cm'}
                      className="flex-1 sm:w-full"
                    />
                  </div>
                  <div className="flex items-center sm:flex-col justify-between gap-2 sm:gap-1">
                    <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-400 w-24 sm:w-auto shrink-0">
                      {isRtl ? 'الجلسة من الأرض' : 'Sill Height'}
                    </span>
                    <ManualNumberInput
                      value={details.windowSillCm}
                      onChange={(v) => setDetails((d) => ({ ...d, windowSillCm: v }))}
                      min={0}
                      max={180}
                      step={5}
                      emptyAsZero
                      unit={isRtl ? 'سم' : 'cm'}
                      className="flex-1 sm:w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CORNER COLUMN (عمود خرسانة بارز) */}
          <div className="flex flex-col gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <span className="text-xs font-bold text-stone-700 dark:text-stone-200">
              {isRtl ? 'عمود خرسانة بارز في ركن الأوضة (اختياري)' : 'Corner Concrete Column'}
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(
                [
                  { id: 'none', ar: 'بدون', en: 'None' },
                  { id: 'back-left', ar: 'خلف شمال', en: 'Back-L' },
                  { id: 'back-right', ar: 'خلف يمين', en: 'Back-R' },
                  { id: 'front-left', ar: 'أمام شمال', en: 'Front-L' },
                  { id: 'front-right', ar: 'أمام يمين', en: 'Front-R' },
                ] as { id: CornerColumnPos; ar: string; en: string }[]
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setDetails((d) => ({ ...d, cornerColumn: c.id }))}
                  className={`min-h-[34px] px-1.5 rounded-lg border text-[11px] font-semibold ${
                    details.cornerColumn === c.id
                      ? 'bg-stone-800 text-white border-stone-800 dark:bg-stone-200 dark:text-stone-900'
                      : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {isRtl ? c.ar : c.en}
                </button>
              ))}
            </div>
          </div>

          {/* Room Exact Dimensions & Wood Price — Simple 3-Column Direct Input */}
          <div className="flex flex-col gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-100">
              {isRtl ? 'مقاسات الأوضة وسعر اللوح (إدخال يدوي)' : 'Room Size & Sheet Price (Manual)'}
            </span>
            <div className="flex flex-col gap-2">
              {(
                [
                  {
                    id: 'room-len',
                    ar: 'طول الأوضة',
                    en: 'Length',
                    val: lengthCm,
                    min: 140,
                    max: 850,
                    set: setLengthCm,
                  },
                  {
                    id: 'room-wid',
                    ar: 'عرض الأوضة',
                    en: 'Width',
                    val: widthCm,
                    min: 130,
                    max: 750,
                    set: setWidthCm,
                  },
                  {
                    id: 'room-ceil',
                    ar: 'ارتفاع السقف',
                    en: 'Ceiling',
                    val: ceilingCm,
                    min: 215,
                    max: 420,
                    set: setCeilingCm,
                  },
                ] as const
              ).map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2.5">
                  <label
                    htmlFor={d.id}
                    className="text-xs font-bold text-stone-700 dark:text-stone-200 w-24 shrink-0"
                  >
                    {isRtl ? d.ar : d.en}
                  </label>
                  <ManualNumberInput
                    id={d.id}
                    value={d.val}
                    onChange={d.set}
                    min={d.min}
                    max={d.max}
                    step={10}
                    unit={isRtl ? 'سم' : 'cm'}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2.5 text-xs pt-1">
              <span className="font-bold text-stone-700 dark:text-stone-200 w-24 shrink-0">
                {isRtl ? 'سعر اللوح' : 'Sheet Price'}
              </span>
              <ManualNumberInput
                value={sheetPriceEgp}
                onChange={onUpdateSheetPrice}
                min={0}
                max={100000}
                step={50}
                emptyAsZero
                unit={currencyLabel}
                className="flex-1"
              />
            </div>
          </div>

          {/* Wood Material Choice for Whole Room */}
          <div className="flex flex-col gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">
              {isRtl ? 'توحيد نوع خشب الغرفة' : 'Room Wood Finish'}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {WOOD_MATERIALS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onSelectWood(w.id)}
                  className={`min-h-[38px] px-2 py-1.5 rounded-xl border text-start flex items-center gap-2 ${
                    woodType === w.id
                      ? 'border-amber-700 bg-amber-50/70 dark:bg-amber-950/30'
                      : 'border-stone-200 dark:border-stone-700'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded shrink-0 border border-black/15"
                    style={{ backgroundColor: w.baseHex }}
                  />
                  <span className="text-[11px] font-semibold truncate">
                    {isRtl ? w.nameAr.split('(')[0] : w.nameEn.split('(')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
