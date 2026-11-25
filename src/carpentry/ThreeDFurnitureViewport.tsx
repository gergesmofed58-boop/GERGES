import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Camera,
  DoorOpen,
  Expand,
  Layers,
  RotateCcw,
  Tag,
  X,
} from 'lucide-react';
import { getTemplateSpec, getWoodSpec } from './catalog';
import { egBoxDims, egDim, egSpokenLength, egThickness } from './egyptianCopy';
import { AppLocale, ProjectParams, ThemeMode } from './types';

interface Props {
  params: ProjectParams;
  locale: AppLocale;
  theme: ThemeMode;
  sheetPriceEgp?: number;
  currencyLabel?: string;
}

type CameraPreset = 'iso' | 'front' | 'side' | 'top';

export interface Part3DInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  lengthCm: number;
  widthCm: number;
  thicknessMm: number;
  edgeNoteAr: string;
  edgeNoteEn: string;
  isBack?: boolean;
}

interface AnimatedPart {
  id: string;
  object: THREE.Object3D;
  basePos: THREE.Vector3;
  explodeOffset: THREE.Vector3;
  doorPivot?: THREE.Object3D;
  doorOpenAngle?: number;
  drawerPullZ?: number;
  meta: Part3DInfo;
  meshes: THREE.Mesh[];
}

interface ProjectedTag {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  dimText: string;
  x: number;
  y: number;
}

const EXPLODE_MULTIPLIER = 2.65;

const _camTargetPos = new THREE.Vector3();
const _orbitTarget = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _boxTmp = new THREE.Box3();

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function createWoodCanvasTexture(
  baseHex: string,
  grainHex: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 160; i++) {
      const y = (i / 160) * 512;
      ctx.strokeStyle = i % 3 === 0 ? accentHex : grainHex;
      ctx.globalAlpha = 0.08 + (i % 5) * 0.035;
      ctx.lineWidth = 1 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) {
        const wave = Math.sin(x * 0.015 + i * 0.37) * 3.5;
        ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 0.07;
    ctx.fillStyle = accentHex;
    for (let i = 0; i < 420; i++) {
      const rx = (i * 73) % 512;
      const ry = (i * 137) % 512;
      ctx.fillRect(rx, ry, 18 + (i % 24), 1);
    }
    ctx.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.32)');
    grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.12)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function dimsFromBox(w: number, h: number, d: number, fallbackThicknessMm: number) {
  const arr = [w * 100, h * 100, d * 100].sort((a, b) => b - a);
  return {
    lengthCm: round1(arr[0]),
    widthCm: round1(arr[1]),
    thicknessMm: Math.max(6, Math.round(arr[2] * 10) || fallbackThicknessMm),
  };
}

function addBoardMesh(
  parent: THREE.Object3D,
  animatedParts: AnimatedPart[],
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  material: THREE.Material,
  explodeOffset: THREE.Vector3,
  metaInput: {
    code: string;
    nameAr: string;
    nameEn: string;
    edgeNoteAr?: string;
    edgeNoteEn?: string;
    isBack?: boolean;
    thicknessMm?: number;
  },
  edgeMat?: THREE.LineBasicMaterial
): THREE.Mesh {
  const geom = new THREE.BoxGeometry(
    Math.max(0.008, w),
    Math.max(0.008, h),
    Math.max(0.008, d)
  );
  const mesh = new THREE.Mesh(geom, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const partId = `part-${animatedParts.length + 1}-${metaInput.code}`;
  mesh.userData.partId = partId;

  if (edgeMat) {
    const edges = new THREE.EdgesGeometry(geom);
    const line = new THREE.LineSegments(edges, edgeMat);
    mesh.add(line);
  }

  parent.add(mesh);

  const dCalc = dimsFromBox(w, h, d, metaInput.thicknessMm ?? 18);
  animatedParts.push({
    id: partId,
    object: mesh,
    basePos: mesh.position.clone(),
    explodeOffset,
    meshes: [mesh],
    meta: {
      id: partId,
      code: metaInput.code,
      nameAr: metaInput.nameAr,
      nameEn: metaInput.nameEn,
      lengthCm: dCalc.lengthCm,
      widthCm: dCalc.widthCm,
      thicknessMm: metaInput.thicknessMm ?? dCalc.thicknessMm,
      edgeNoteAr: metaInput.edgeNoteAr ?? 'شريط PVC جهة أمامية (1L)',
      edgeNoteEn: metaInput.edgeNoteEn ?? 'Front PVC Edge (1L)',
      isBack: metaInput.isBack,
    },
  });
  return mesh;
}

function buildFurnitureModel(
  params: ProjectParams,
  materials: {
    mainWood: THREE.MeshStandardMaterial;
    frontWood: THREE.MeshStandardMaterial;
    backWood: THREE.MeshStandardMaterial;
    metal: THREE.MeshStandardMaterial;
    stone: THREE.MeshStandardMaterial;
    edgeLine: THREE.LineBasicMaterial;
  }
): { group: THREE.Group; parts: AnimatedPart[]; boundingSize: THREE.Vector3 } {
  const group = new THREE.Group();
  const parts: AnimatedPart[] = [];

  const W = params.widthCm / 100;
  const H = params.heightCm / 100;
  const D = params.depthCm / 100;
  const T = Math.max(0.014, params.boardThicknessMm / 1000);
  const tMm = params.boardThicknessMm;
  const backT = Math.max(0.005, params.backThicknessMm / 1000);
  const plinth = params.plinthHeightCm / 100;

  const { mainWood, frontWood, backWood, metal, stone, edgeLine } = materials;

  if (params.templateId === 'wardrobe' || params.templateId === 'dressing') {
    const isDressing = params.templateId === 'dressing';
    const bodyD = D - (params.doorsCount > 0 ? T : 0);
    const bodyZ = -((params.doorsCount > 0 ? T : 0) / 2);
    const innerW = W - 2 * T;
    const carcassH = H - plinth;

    addBoardMesh(group, parts, T, H, bodyD, -W / 2 + T / 2, H / 2, bodyZ, mainWood, new THREE.Vector3(-0.46, 0, 0), { code: 'A1', nameAr: 'جنب شمال', nameEn: 'Left Side Panel', edgeNoteAr: 'قشاط أمامي وعلوي (1L+1W)', edgeNoteEn: 'Front + Top Edge', thicknessMm: tMm }, edgeLine);
    addBoardMesh(group, parts, T, H, bodyD, W / 2 - T / 2, H / 2, bodyZ, mainWood, new THREE.Vector3(0.46, 0, 0), { code: 'A2', nameAr: 'جنب يمين', nameEn: 'Right Side Panel', edgeNoteAr: 'قشاط أمامي وعلوي (1L+1W)', edgeNoteEn: 'Front + Top Edge', thicknessMm: tMm }, edgeLine);

    addBoardMesh(group, parts, innerW, T, bodyD, 0, H - T / 2, bodyZ, mainWood, new THREE.Vector3(0, 0.44, 0), { code: 'B1', nameAr: 'سقف العلبة (قرصة عليا)', nameEn: 'Top Panel', thicknessMm: tMm }, edgeLine);
    addBoardMesh(group, parts, innerW, T, bodyD, 0, plinth + T / 2, bodyZ, mainWood, new THREE.Vector3(0, -0.22, 0), { code: 'B2', nameAr: 'أرضية العلبة', nameEn: 'Bottom Panel', thicknessMm: tMm }, edgeLine);

    if (plinth > 0.01) {
      addBoardMesh(group, parts, innerW, plinth, T, 0, plinth / 2, bodyZ + bodyD / 2 - 0.03, mainWood, new THREE.Vector3(0, -0.36, 0.28), { code: 'C', nameAr: 'وزرة سفلية أمامية', nameEn: 'Front Plinth Toe-Kick', thicknessMm: tMm }, edgeLine);
    }

    if (params.includeBackPanel) {
      addBoardMesh(group, parts, W - 0.01, carcassH - 0.01, backT, 0, plinth + carcassH / 2, bodyZ - bodyD / 2 + backT / 2, backWood, new THREE.Vector3(0, 0, -0.56), { code: 'K', nameAr: 'ظهر أبلكاش 6مم', nameEn: 'Back Panel 6mm', edgeNoteAr: 'بدون قشاط', edgeNoteEn: 'No Edge Band', isBack: true, thicknessMm: params.backThicknessMm });
    }

    const bays = params.dividersCount + 1;
    const bayW = (innerW - params.dividersCount * T) / bays;
    const innerH = carcassH - 2 * T;

    for (let i = 1; i <= params.dividersCount; i++) {
      const dx = -innerW / 2 + i * bayW + (i - 0.5) * T;
      addBoardMesh(group, parts, T, innerH, bodyD - 0.02, dx, plinth + T + innerH / 2, bodyZ, mainWood, new THREE.Vector3((i - (params.dividersCount + 1) / 2) * 0.22, 0.12, 0.16), { code: `D${i}`, nameAr: `قاطوع رأسي ${i}`, nameEn: `Vertical Divider ${i}`, thicknessMm: tMm }, edgeLine);
    }

    const shelfBayCenterX = -innerW / 2 + (bays - 0.5) * bayW + (bays - 1) * T;
    const drawerBlockH = params.drawersCount > 0 ? Math.min(innerH * 0.45, Math.min(params.drawersCount, 4) * 0.19) : 0;
    const shelfZoneStart = plinth + T + drawerBlockH;
    const shelfZoneH = Math.max(0.3, innerH - drawerBlockH);

    for (let s = 1; s <= Math.min(6, params.shelvesCount); s++) {
      const sy = shelfZoneStart + (shelfZoneH / (Math.min(6, params.shelvesCount) + 1)) * s;
      addBoardMesh(group, parts, bayW - 0.004, T, bodyD - 0.04, shelfBayCenterX, sy, bodyZ, mainWood, new THREE.Vector3(0.24, 0.08 * s, 0.22), { code: `E${s}`, nameAr: `رف داخلي ${s}`, nameEn: `Interior Shelf ${s}`, thicknessMm: tMm }, edgeLine);
    }

    if (isDressing && bays >= 2) {
      const bay0CenterX = -innerW / 2 + bayW / 2;
      for (let sh = 1; sh <= 3; sh++) {
        addBoardMesh(group, parts, bayW - 0.004, T, bodyD - 0.06, bay0CenterX, plinth + T + sh * 0.22, bodyZ, frontWood, new THREE.Vector3(-0.26, 0.05 * sh, 0.24), { code: `S${sh}`, nameAr: `رف أحذية سفلي ${sh}`, nameEn: `Lower Shoe Shelf ${sh}`, thicknessMm: tMm }, edgeLine);
      }
    }

    if (params.drawersCount > 0) {
      const bayDrawers = Math.min(4, params.drawersCount);
      const drwH = drawerBlockH / bayDrawers;
      for (let d = 0; d < bayDrawers; d++) {
        const drwGroup = new THREE.Group();
        const dy = plinth + T + drwH * (d + 0.5);
        drwGroup.position.set(shelfBayCenterX, dy, bodyZ + 0.02);

        const boxW = bayW - 0.03;
        const boxD = bodyD - 0.07;
        const partId = `part-${parts.length + 1}-G${d + 1}`;
        const frontMesh = new THREE.Mesh(new THREE.BoxGeometry(bayW - 0.008, drwH - 0.006, T), frontWood);
        frontMesh.position.set(0, 0, boxD / 2);
        frontMesh.castShadow = true;
        frontMesh.userData.partId = partId;
        drwGroup.add(frontMesh);

        const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(boxW, drwH - 0.03, boxD), mainWood);
        bodyMesh.position.set(0, -0.005, 0);
        bodyMesh.userData.partId = partId;
        drwGroup.add(bodyMesh);

        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.012, 0.018), metal);
        handle.position.set(0, 0.01, boxD / 2 + T / 2 + 0.009);
        drwGroup.add(handle);

        group.add(drwGroup);
        parts.push({
          id: partId,
          object: drwGroup,
          basePos: drwGroup.position.clone(),
          explodeOffset: new THREE.Vector3(0.24, -0.06 * d, 0.52 + d * 0.09),
          drawerPullZ: Math.min(0.34, boxD * 0.68),
          meshes: [frontMesh, bodyMesh],
          meta: {
            id: partId,
            code: `G${d + 1}`,
            nameAr: `درج داخلي ${d + 1}`,
            nameEn: `Drawer Box ${d + 1}`,
            lengthCm: round1((bayW - 0.008) * 100),
            widthCm: round1(boxD * 100),
            thicknessMm: tMm,
            edgeNoteAr: 'وش الدرج قشاط 4 جهات (2L+2W)',
            edgeNoteEn: 'Drawer Front 4-Side Edge',
          },
        });
      }
    }

    const rodCount = isDressing && bays >= 2 ? 2 : 1;
    for (let r = 0; r < rodCount; r++) {
      const rodBayCenterX = -innerW / 2 + (r + 0.5) * bayW + r * T;
      const rodGeom = new THREE.CylinderGeometry(0.012, 0.012, Math.max(0.2, bayW - 0.02), 16);
      rodGeom.rotateZ(Math.PI / 2);
      const rodMesh = new THREE.Mesh(rodGeom, metal);
      rodMesh.position.set(rodBayCenterX, H - T - 0.14, bodyZ);
      const partId = `part-${parts.length + 1}-R${r + 1}`;
      rodMesh.userData.partId = partId;
      group.add(rodMesh);
      parts.push({
        id: partId,
        object: rodMesh,
        basePos: rodMesh.position.clone(),
        explodeOffset: new THREE.Vector3(-0.2 + r * 0.16, 0.22, 0.26),
        meshes: [rodMesh],
        meta: {
          id: partId,
          code: `R${r + 1}`,
          nameAr: `ماسورة تعليق ملابس ${r + 1}`,
          nameEn: `Hanging Rod ${r + 1}`,
          lengthCm: round1((bayW - 0.02) * 100),
          widthCm: 2.5,
          thicknessMm: 25,
          edgeNoteAr: 'ماسورة ألومنيوم بيضاوي + 2 فلانشة',
          edgeNoteEn: 'Oval Aluminum Rod + 2 Flanges',
        },
      });
    }

    if (params.doorsCount > 0) {
      const doorW = (W - (params.doorsCount + 1) * 0.004) / params.doorsCount;
      const doorH = carcassH - 0.006;
      for (let i = 0; i < params.doorsCount; i++) {
        const isRightHinged = i % 2 === 1;
        const leftEdgeX = -W / 2 + 0.004 + i * (doorW + 0.004);
        const pivotX = isRightHinged ? leftEdgeX + doorW : leftEdgeX;
        const doorPivot = new THREE.Group();
        doorPivot.position.set(pivotX, plinth + doorH / 2 + 0.003, D / 2 - T / 2);

        const partId = `part-${parts.length + 1}-F${i + 1}`;
        const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, T), frontWood);
        doorPanel.position.set(isRightHinged ? -doorW / 2 : doorW / 2, 0, 0);
        doorPanel.castShadow = true;
        doorPanel.receiveShadow = true;
        doorPanel.userData.partId = partId;
        doorPanel.add(new THREE.LineSegments(new THREE.EdgesGeometry(doorPanel.geometry), edgeLine));
        doorPivot.add(doorPanel);

        const handleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.24, 0.022), metal);
        handleMesh.position.set(isRightHinged ? -doorW + 0.045 : doorW - 0.045, -0.06, T / 2 + 0.012);
        doorPivot.add(handleMesh);

        group.add(doorPivot);
        parts.push({
          id: partId,
          object: doorPivot,
          basePos: doorPivot.position.clone(),
          explodeOffset: new THREE.Vector3((i - (params.doorsCount - 1) / 2) * 0.26, 0, 0.62),
          doorPivot,
          doorOpenAngle: isRightHinged ? 1.18 : -1.18,
          meshes: [doorPanel],
          meta: {
            id: partId,
            code: `F${i + 1}`,
            nameAr: `ضلفة أمامية ${i + 1}`,
            nameEn: `Front Door ${i + 1}`,
            lengthCm: round1(doorH * 100),
            widthCm: round1(doorW * 100),
            thicknessMm: tMm,
            edgeNoteAr: 'قشاط PVC 2مم من 4 جهات (2L+2W)',
            edgeNoteEn: '2mm PVC All 4 Sides (2L+2W)',
          },
        });
      }
    }
  } else if (
    params.templateId === 'kitchen' ||
    params.templateId === 'buffet' ||
    params.templateId === 'dresser' ||
    params.templateId === 'tv_unit' ||
    params.templateId === 'shoe_rack' ||
    params.templateId === 'nightstand'
  ) {
    const isKitchen = params.templateId === 'kitchen';
    const isDresser = params.templateId === 'dresser';
    const isBuffet = params.templateId === 'buffet';
    const isShoe = params.templateId === 'shoe_rack';
    const isNightstand = params.templateId === 'nightstand';
    const isTv = params.templateId === 'tv_unit';

    const topT = isKitchen ? 0.032 : T;
    const baseLift = isTv ? 0.22 : plinth;
    const bodyH = Math.max(0.32, H - plinth - (isKitchen ? topT : 0));
    const bodyD = D - (isKitchen ? 0.04 : 0.01);
    const innerW = W - 2 * T;
    const bays = params.dividersCount + 1;
    const bayW = (innerW - params.dividersCount * T) / bays;

    addBoardMesh(
      group,
      parts,
      W + (isKitchen ? 0.02 : 0.01),
      topT,
      D,
      0,
      baseLift + bodyH + (isKitchen ? topT / 2 : -topT / 2),
      0,
      isKitchen ? stone : frontWood,
      new THREE.Vector3(0, 0.44, 0),
      {
        code: 'T1',
        nameAr: isKitchen ? 'قرصة / رخامة علوية' : 'القرصة العلوية',
        nameEn: isKitchen ? 'Countertop Slab' : 'Top Panel',
        edgeNoteAr: 'قشاط 4 جهات (2L+2W)',
        edgeNoteEn: 'All 4 Sides Edge',
        thicknessMm: Math.round(topT * 1000),
      },
      edgeLine
    );

    addBoardMesh(group, parts, T, bodyH, bodyD, -W / 2 + T / 2, baseLift + bodyH / 2, -0.01, mainWood, new THREE.Vector3(-0.42, 0, 0), { code: 'A1', nameAr: 'جنب شمال', nameEn: 'Left Side Panel', thicknessMm: tMm }, edgeLine);
    addBoardMesh(group, parts, T, bodyH, bodyD, W / 2 - T / 2, baseLift + bodyH / 2, -0.01, mainWood, new THREE.Vector3(0.42, 0, 0), { code: 'A2', nameAr: 'جنب يمين', nameEn: 'Right Side Panel', thicknessMm: tMm }, edgeLine);
    addBoardMesh(group, parts, innerW, T, bodyD, 0, baseLift + T / 2, -0.01, mainWood, new THREE.Vector3(0, -0.24, 0), { code: 'B1', nameAr: 'أرضية العلبة', nameEn: 'Bottom Panel', thicknessMm: tMm }, edgeLine);

    if (!isTv && plinth > 0.01) {
      if (isBuffet || isShoe || isNightstand) {
        const legS = 0.042;
        const lx = W / 2 - 0.05;
        const lz = bodyD / 2 - 0.05;
        const corners: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
        corners.forEach(([sx, sz], idx) => {
          addBoardMesh(group, parts, legS, plinth, legS, sx * lx, plinth / 2, sz * lz, mainWood, new THREE.Vector3(sx * 0.24, -0.32, sz * 0.24), { code: `L${idx + 1}`, nameAr: `رجل خشب ${idx + 1}`, nameEn: `Wood Leg ${idx + 1}`, edgeNoteAr: 'خشب زان طبيعي', edgeNoteEn: 'Solid Beech Leg', thicknessMm: 42 }, edgeLine);
        });
      } else {
        addBoardMesh(group, parts, W - 0.02, plinth, T, 0, plinth / 2, bodyD / 2 - 0.04, mainWood, new THREE.Vector3(0, -0.34, 0.28), { code: 'C', nameAr: 'وزرة سفلية', nameEn: 'Plinth Base', thicknessMm: tMm }, edgeLine);
      }
    }

    if (params.includeBackPanel) {
      addBoardMesh(group, parts, W - 0.01, bodyH - 0.01, backT, 0, baseLift + bodyH / 2, -0.01 - bodyD / 2 + backT / 2, backWood, new THREE.Vector3(0, 0, -0.48), { code: 'K', nameAr: 'ظهر أبلكاش 6مم', nameEn: 'Back Panel 6mm', edgeNoteAr: 'بدون قشاط', edgeNoteEn: 'No Edge Band', isBack: true, thicknessMm: params.backThicknessMm });
    }

    for (let i = 1; i <= params.dividersCount; i++) {
      const dx = -innerW / 2 + i * bayW + (i - 0.5) * T;
      addBoardMesh(group, parts, T, bodyH - 2 * T, bodyD - 0.02, dx, baseLift + bodyH / 2, -0.01, mainWood, new THREE.Vector3((i - (params.dividersCount + 1) / 2) * 0.18, 0.1, 0.14), { code: `D${i}`, nameAr: `قاطوع داخلي ${i}`, nameEn: `Divider ${i}`, thicknessMm: tMm }, edgeLine);
    }

    const hasTopDrawerRow = (isBuffet || isShoe) && params.drawersCount > 0;
    const topDrawerRowH = hasTopDrawerRow ? Math.min(0.18, bodyH * 0.24) : 0;

    if (hasTopDrawerRow) {
      const drwW = (innerW - (params.drawersCount + 1) * 0.004) / params.drawersCount;
      for (let d = 0; d < params.drawersCount; d++) {
        const dx = -innerW / 2 + 0.004 + d * (drwW + 0.004) + drwW / 2;
        const drwGroup = new THREE.Group();
        drwGroup.position.set(dx, baseLift + bodyH - T - topDrawerRowH / 2 - 0.004, -0.01);
        const partId = `part-${parts.length + 1}-G${d + 1}`;
        const face = new THREE.Mesh(new THREE.BoxGeometry(drwW, topDrawerRowH - 0.006, T), frontWood);
        face.position.set(0, 0, bodyD / 2 + T / 2);
        face.castShadow = true;
        face.userData.partId = partId;
        drwGroup.add(face);
        const box = new THREE.Mesh(new THREE.BoxGeometry(drwW - 0.03, topDrawerRowH - 0.03, bodyD - 0.06), mainWood);
        box.userData.partId = partId;
        drwGroup.add(box);
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.018, 16), metal);
        knob.rotation.x = Math.PI / 2;
        knob.position.set(0, 0, bodyD / 2 + T + 0.008);
        drwGroup.add(knob);
        group.add(drwGroup);
        parts.push({
          id: partId,
          object: drwGroup,
          basePos: drwGroup.position.clone(),
          explodeOffset: new THREE.Vector3((d - (params.drawersCount - 1) / 2) * 0.16, 0.16, 0.48),
          drawerPullZ: Math.min(0.28, bodyD * 0.58),
          meshes: [face, box],
          meta: {
            id: partId,
            code: `G${d + 1}`,
            nameAr: `درج علوي ${d + 1}`,
            nameEn: `Upper Drawer ${d + 1}`,
            lengthCm: round1(drwW * 100),
            widthCm: round1((bodyD - 0.06) * 100),
            thicknessMm: tMm,
            edgeNoteAr: 'وش درج قشاط 4 جهات',
            edgeNoteEn: '4-Side PVC Drawer Front',
          },
        });
      }
    }

    const hasStackDrawers = !hasTopDrawerRow && params.drawersCount > 0;
    if (hasStackDrawers) {
      const stackW = isNightstand ? innerW : isDresser ? innerW * 0.66 : bayW;
      const stackCenterX = isNightstand
        ? 0
        : isDresser
        ? W / 2 - T - stackW / 2
        : isTv
        ? 0
        : -innerW / 2 + bayW / 2;
      const stackH = isNightstand ? bodyH * 0.56 : bodyH - 2 * T;
      const stackStartY = isNightstand ? baseLift + bodyH - T - stackH : baseLift + T;
      const drwH = stackH / params.drawersCount;

      for (let d = 0; d < params.drawersCount; d++) {
        const drwGroup = new THREE.Group();
        drwGroup.position.set(stackCenterX, stackStartY + drwH * (d + 0.5), -0.01);
        const partId = `part-${parts.length + 1}-G${d + 1}`;
        const face = new THREE.Mesh(new THREE.BoxGeometry(stackW - 0.006, drwH - 0.006, T), frontWood);
        face.position.set(0, 0, bodyD / 2 + T / 2);
        face.castShadow = true;
        face.userData.partId = partId;
        drwGroup.add(face);
        const box = new THREE.Mesh(new THREE.BoxGeometry(stackW - 0.03, drwH - 0.03, bodyD - 0.06), mainWood);
        box.userData.partId = partId;
        drwGroup.add(box);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.018), metal);
        handle.position.set(0, drwH * 0.18, bodyD / 2 + T + 0.01);
        drwGroup.add(handle);
        group.add(drwGroup);
        parts.push({
          id: partId,
          object: drwGroup,
          basePos: drwGroup.position.clone(),
          explodeOffset: new THREE.Vector3(0, 0.06 * d, 0.48 + d * 0.09),
          drawerPullZ: Math.min(0.3, bodyD * 0.6),
          meshes: [face, box],
          meta: {
            id: partId,
            code: `G${d + 1}`,
            nameAr: `درج ${d + 1}`,
            nameEn: `Drawer ${d + 1}`,
            lengthCm: round1((stackW - 0.006) * 100),
            widthCm: round1((bodyD - 0.06) * 100),
            thicknessMm: tMm,
            edgeNoteAr: 'وش درج قشاط 4 جهات',
            edgeNoteEn: '4-Side PVC Drawer Front',
          },
        });
      }
    }

    if (params.shelvesCount > 0 && !isNightstand) {
      const shelfZoneH = bodyH - topDrawerRowH - 2 * T;
      for (let s = 1; s <= Math.min(4, params.shelvesCount); s++) {
        const sy = baseLift + T + (shelfZoneH / (Math.min(4, params.shelvesCount) + 1)) * s;
        addBoardMesh(group, parts, innerW - 0.01, T, bodyD - 0.06, 0, sy, -0.02, mainWood, new THREE.Vector3(0, 0.06 * s, 0.18), { code: `E${s}`, nameAr: `رف داخلي ${s}`, nameEn: `Shelf ${s}`, thicknessMm: tMm });
      }
    }

    if (params.doorsCount > 0) {
      const doorH = bodyH - topDrawerRowH - 0.01;
      const doorCenterY = baseLift + doorH / 2 + 0.004;
      const doorZoneStartX =
        hasStackDrawers && bays > 1
          ? isDresser
            ? -W / 2 + T
            : -innerW / 2 + bayW + T
          : -W / 2;
      const doorZoneW =
        hasStackDrawers && bays > 1
          ? isDresser
            ? innerW * 0.32
            : W / 2 - doorZoneStartX
          : W;

      const dW = (doorZoneW - (params.doorsCount + 1) * 0.004) / params.doorsCount;
      for (let i = 0; i < params.doorsCount; i++) {
        const isRight = i % 2 === 1;
        const lx = doorZoneStartX + 0.004 + i * (dW + 0.004);
        const pivot = new THREE.Group();
        pivot.position.set(isRight ? lx + dW : lx, doorCenterY, -0.01 + bodyD / 2 + T / 2);
        const partId = `part-${parts.length + 1}-F${i + 1}`;
        const panel = new THREE.Mesh(new THREE.BoxGeometry(dW, doorH, T), frontWood);
        panel.position.set(isRight ? -dW / 2 : dW / 2, 0, 0);
        panel.castShadow = true;
        panel.userData.partId = partId;
        panel.add(new THREE.LineSegments(new THREE.EdgesGeometry(panel.geometry), edgeLine));
        pivot.add(panel);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.015, Math.min(0.18, doorH * 0.35), 0.02), metal);
        handle.position.set(isRight ? -dW + 0.04 : dW - 0.04, doorH * 0.2, T / 2 + 0.01);
        pivot.add(handle);
        group.add(pivot);
        parts.push({
          id: partId,
          object: pivot,
          basePos: pivot.position.clone(),
          explodeOffset: new THREE.Vector3((i - (params.doorsCount - 1) / 2) * 0.22, 0, 0.56),
          doorPivot: pivot,
          doorOpenAngle: isRight ? 1.12 : -1.12,
          meshes: [panel],
          meta: {
            id: partId,
            code: `F${i + 1}`,
            nameAr: `ضلفة ${i + 1}`,
            nameEn: `Door ${i + 1}`,
            lengthCm: round1(doorH * 100),
            widthCm: round1(dW * 100),
            thicknessMm: tMm,
            edgeNoteAr: 'قشاط 4 جهات (2L+2W)',
            edgeNoteEn: '4-Side PVC Edge',
          },
        });
      }
    }

    if (isDresser) {
      const mirrorR = Math.min(0.38, W * 0.25);
      const mirrorGroup = new THREE.Group();
      mirrorGroup.position.set(W * 0.12, baseLift + bodyH + mirrorR + 0.14, -bodyD / 2 + 0.04);
      const partId = `part-${parts.length + 1}-M1`;

      const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(mirrorR, 0.026, 16, 48), mainWood);
      ringMesh.castShadow = true;
      ringMesh.userData.partId = partId;
      mirrorGroup.add(ringMesh);

      const glassMesh = new THREE.Mesh(
        new THREE.CircleGeometry(mirrorR - 0.015, 40),
        new THREE.MeshStandardMaterial({ color: 0xdde6ee, roughness: 0.08, metalness: 0.92 })
      );
      glassMesh.userData.partId = partId;
      mirrorGroup.add(glassMesh);

      group.add(mirrorGroup);
      parts.push({
        id: partId,
        object: mirrorGroup,
        basePos: mirrorGroup.position.clone(),
        explodeOffset: new THREE.Vector3(0, 0.42, -0.26),
        meshes: [ringMesh],
        meta: {
          id: partId,
          code: 'M1',
          nameAr: 'مرآة دائرية ببرواز خشب',
          nameEn: 'Framed Round Mirror',
          lengthCm: round1(mirrorR * 200),
          widthCm: round1(mirrorR * 200),
          thicknessMm: 26,
          edgeNoteAr: 'مرآة بلجيكي 5مم + برواز',
          edgeNoteEn: '5mm Mirror + Wood Rim',
        },
      });
    }
  } else if (params.templateId === 'desk') {
    const topT = Math.max(0.028, T * 1.5);
    const legH = H - topT;
    const pedW = params.drawersCount > 0 ? Math.min(0.48, Math.max(0.38, W * 0.3)) : 0;

    addBoardMesh(group, parts, W, topT, D, 0, H - topT / 2, 0, frontWood, new THREE.Vector3(0, 0.42, 0), { code: 'A', nameAr: 'قرصة المكتب العلوية', nameEn: 'Desktop Slab', edgeNoteAr: 'قشاط 2مم دائري 4 جهات', edgeNoteEn: '2mm PVC All 4 Sides', thicknessMm: Math.round(topT * 1000) }, edgeLine);
    addBoardMesh(group, parts, T, legH, D - 0.04, -W / 2 + 0.04, legH / 2, 0, mainWood, new THREE.Vector3(-0.46, 0, 0), { code: 'B1', nameAr: 'رجل / جنب شمال', nameEn: 'Left Leg Panel', thicknessMm: tMm }, edgeLine);
    if (params.drawersCount === 0) {
      addBoardMesh(group, parts, T, legH, D - 0.04, W / 2 - 0.04, legH / 2, 0, mainWood, new THREE.Vector3(0.46, 0, 0), { code: 'B2', nameAr: 'رجل / جنب يمين', nameEn: 'Right Leg Panel', thicknessMm: tMm }, edgeLine);
    }
    const modW = Math.max(0.4, W - pedW - 0.1);
    const modH = Math.min(0.42, legH * 0.55);
    addBoardMesh(group, parts, modW, modH, T, -pedW / 2, H - topT - modH / 2, -D / 2 + 0.08, mainWood, new THREE.Vector3(0, 0, -0.48), { code: 'C', nameAr: 'مريلة ظهر تقوية', nameEn: 'Rear Modesty Panel', thicknessMm: tMm }, edgeLine);

    if (params.drawersCount > 0) {
      const pedH = legH - 0.04;
      const pedD = D - 0.06;
      const pedCenterX = W / 2 - pedW / 2 - 0.03;
      addBoardMesh(group, parts, T, pedH, pedD, pedCenterX - pedW / 2 + T / 2, 0.04 + pedH / 2, 0, mainWood, new THREE.Vector3(0.24, 0, 0), { code: 'P1', nameAr: 'جنب كمودة داخلي', nameEn: 'Pedestal Inner Side', thicknessMm: tMm }, edgeLine);
      addBoardMesh(group, parts, T, pedH, pedD, pedCenterX + pedW / 2 - T / 2, 0.04 + pedH / 2, 0, mainWood, new THREE.Vector3(0.52, 0, 0), { code: 'P2', nameAr: 'جنب كمودة خارجي', nameEn: 'Pedestal Outer Side', thicknessMm: tMm }, edgeLine);
      addBoardMesh(group, parts, pedW - 2 * T, T, pedD, pedCenterX, 0.04 + T / 2, 0, mainWood, new THREE.Vector3(0.36, -0.2, 0), { code: 'P3', nameAr: 'قاعدة كمودة الأدراج', nameEn: 'Pedestal Bottom', thicknessMm: tMm }, edgeLine);

      const drwH = (pedH - 0.01) / params.drawersCount;
      for (let d = 0; d < params.drawersCount; d++) {
        const drwGroup = new THREE.Group();
        drwGroup.position.set(pedCenterX, 0.04 + drwH * (d + 0.5) + 0.005, 0);
        const partId = `part-${parts.length + 1}-G${d + 1}`;
        const face = new THREE.Mesh(new THREE.BoxGeometry(pedW - 0.006, drwH - 0.008, T), frontWood);
        face.position.set(0, 0, pedD / 2 + T / 2);
        face.castShadow = true;
        face.userData.partId = partId;
        drwGroup.add(face);
        const box = new THREE.Mesh(new THREE.BoxGeometry(pedW - 0.04, drwH - 0.03, pedD - 0.04), mainWood);
        box.userData.partId = partId;
        drwGroup.add(box);
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.018, 16), metal);
        knob.rotation.x = Math.PI / 2;
        knob.position.set(0, 0, pedD / 2 + T + 0.009);
        drwGroup.add(knob);
        group.add(drwGroup);
        parts.push({
          id: partId,
          object: drwGroup,
          basePos: drwGroup.position.clone(),
          explodeOffset: new THREE.Vector3(0.36, 0.05 * d, 0.48 + d * 0.1),
          drawerPullZ: Math.min(0.3, pedD * 0.6),
          meshes: [face, box],
          meta: {
            id: partId,
            code: `G${d + 1}`,
            nameAr: `درج كمودة ${d + 1}`,
            nameEn: `Desk Drawer ${d + 1}`,
            lengthCm: round1((pedW - 0.006) * 100),
            widthCm: round1((pedD - 0.04) * 100),
            thicknessMm: tMm,
            edgeNoteAr: 'وش درج قشاط 4 جهات',
            edgeNoteEn: '4-Side PVC Edge',
          },
        });
      }
    }
  } else if (params.templateId === 'bookshelf') {
    const innerW = W - 2 * T;
    const bodyH = H - plinth;
    const innerH = bodyH - 2 * T;
    const cols = params.dividersCount + 1;
    const colW = (innerW - params.dividersCount * T) / cols;

    addBoardMesh(group, parts, T, H, D, -W / 2 + T / 2, H / 2, 0, mainWood, new THREE.Vector3(-0.46, 0, 0), { code: 'A1', nameAr: 'جنب شمال', nameEn: 'Left Side', thicknessMm: tMm }, edgeLine);
    addBoardMesh(group, parts, T, H, D, W / 2 - T / 2, H / 2, 0, mainWood, new THREE.Vector3(0.46, 0, 0), { code: 'A2', nameAr: 'جنب يمين', nameEn: 'Right Side', thicknessMm: tMm }, edgeLine);
    addBoardMesh(group, parts, innerW, T, D, 0, H - T / 2, 0, mainWood, new THREE.Vector3(0, 0.4, 0), { code: 'B1', nameAr: 'سقف المكتبة', nameEn: 'Top Panel', thicknessMm: tMm }, edgeLine);
    addBoardMesh(group, parts, innerW, T, D, 0, plinth + T / 2, 0, mainWood, new THREE.Vector3(0, -0.22, 0), { code: 'B2', nameAr: 'أرضية المكتبة', nameEn: 'Bottom Panel', thicknessMm: tMm }, edgeLine);

    if (plinth > 0.01) {
      addBoardMesh(group, parts, innerW, plinth, T, 0, plinth / 2, D / 2 - 0.025, mainWood, new THREE.Vector3(0, -0.34, 0.24), { code: 'C', nameAr: 'وزرة سفلية', nameEn: 'Plinth', thicknessMm: tMm }, edgeLine);
    }
    if (params.includeBackPanel) {
      addBoardMesh(group, parts, W - 0.01, bodyH - 0.01, backT, 0, plinth + bodyH / 2, -D / 2 + backT / 2, backWood, new THREE.Vector3(0, 0, -0.5), { code: 'K', nameAr: 'ظهر أبلكاش 6مم', nameEn: 'Back Panel 6mm', isBack: true, thicknessMm: params.backThicknessMm });
    }
    for (let i = 1; i <= params.dividersCount; i++) {
      const dx = -innerW / 2 + i * colW + (i - 0.5) * T;
      addBoardMesh(group, parts, T, innerH, D - 0.015, dx, plinth + T + innerH / 2, 0.005, mainWood, new THREE.Vector3((i - (params.dividersCount + 1) / 2) * 0.24, 0, 0.2), { code: `D${i}`, nameAr: `قاطوع رأسي ${i}`, nameEn: `Divider ${i}`, thicknessMm: tMm }, edgeLine);
    }
    for (let c = 0; c < cols; c++) {
      const cx = -innerW / 2 + (c + 0.5) * colW + c * T;
      for (let s = 1; s <= params.shelvesCount; s++) {
        const sy = plinth + T + (innerH / (params.shelvesCount + 1)) * s;
        addBoardMesh(group, parts, colW - 0.002, T, D - 0.02, cx, sy, 0.005, frontWood, new THREE.Vector3((c - (cols - 1) / 2) * 0.24, (s - params.shelvesCount / 2) * 0.08, 0.34), { code: `E${c + 1}-${s}`, nameAr: `رف عمود ${c + 1} رقم ${s}`, nameEn: `Col ${c + 1} Shelf ${s}`, thicknessMm: tMm }, edgeLine);
      }
    }
  } else if (params.templateId === 'bed') {
    const legW = 0.065;
    const footH = 0.44;
    const railH = 0.22;
    const railY = 0.3;

    addBoardMesh(group, parts, legW, H, legW, -W / 2, H / 2, -D / 2, mainWood, new THREE.Vector3(-0.36, 0, -0.44), { code: 'P1', nameAr: 'قائم رأس شمال', nameEn: 'Head Left Post', thicknessMm: 65 }, edgeLine);
    addBoardMesh(group, parts, legW, H, legW, W / 2, H / 2, -D / 2, mainWood, new THREE.Vector3(0.36, 0, -0.44), { code: 'P2', nameAr: 'قائم رأس يمين', nameEn: 'Head Right Post', thicknessMm: 65 }, edgeLine);
    addBoardMesh(group, parts, legW, footH, legW, -W / 2, footH / 2, D / 2, mainWood, new THREE.Vector3(-0.36, 0, 0.44), { code: 'P3', nameAr: 'رجل قدم شمال', nameEn: 'Foot Left Leg', thicknessMm: 65 }, edgeLine);
    addBoardMesh(group, parts, legW, footH, legW, W / 2, footH / 2, D / 2, mainWood, new THREE.Vector3(0.36, 0, 0.44), { code: 'P4', nameAr: 'رجل قدم يمين', nameEn: 'Foot Right Leg', thicknessMm: 65 }, edgeLine);

    const headPanelH = Math.max(0.38, H - 0.48);
    addBoardMesh(group, parts, W - legW, headPanelH, T * 1.2, 0, H - headPanelH / 2 - 0.04, -D / 2, frontWood, new THREE.Vector3(0, 0.34, -0.52), { code: 'A', nameAr: 'لوح شباك الرأس', nameEn: 'Headboard Panel', thicknessMm: Math.round(T * 1200) }, edgeLine);
    addBoardMesh(group, parts, W - legW, railH, T * 1.2, 0, railY, D / 2, frontWood, new THREE.Vector3(0, 0, 0.48), { code: 'C', nameAr: 'لوح شباك القدم', nameEn: 'Footboard Rail', thicknessMm: Math.round(T * 1200) }, edgeLine);

    addBoardMesh(group, parts, T * 1.2, railH, D - legW, -W / 2, railY, 0, mainWood, new THREE.Vector3(-0.48, 0, 0), { code: 'B1', nameAr: 'فخذ السرير الشمال', nameEn: 'Left Side Rail', thicknessMm: Math.round(T * 1200) }, edgeLine);
    addBoardMesh(group, parts, T * 1.2, railH, D - legW, W / 2, railY, 0, mainWood, new THREE.Vector3(0.48, 0, 0), { code: 'B2', nameAr: 'فخذ السرير اليمين', nameEn: 'Right Side Rail', thicknessMm: Math.round(T * 1200) }, edgeLine);

    addBoardMesh(group, parts, 0.045, 0.07, D - legW, 0, railY - 0.04, 0, mainWood, new THREE.Vector3(0, -0.24, 0), { code: 'M', nameAr: 'كمرة وسطى حاملة', nameEn: 'Center Beam', thicknessMm: 45 });
    addBoardMesh(group, parts, 0.05, railY - 0.04, 0.05, 0, (railY - 0.04) / 2, 0, mainWood, new THREE.Vector3(0, -0.34, 0), { code: 'M2', nameAr: 'رجل وسطى داعمة', nameEn: 'Center Leg', thicknessMm: 50 });

    const slatsCount = Math.max(10, Math.min(20, params.shelvesCount));
    const usableLen = D - 0.14;
    for (let i = 0; i < slatsCount; i++) {
      const sz = -usableLen / 2 + (usableLen / Math.max(1, slatsCount - 1)) * i;
      addBoardMesh(group, parts, W - 0.06, 0.018, 0.075, 0, railY + 0.01, sz, backWood, new THREE.Vector3(0, 0.34 + (i % 2) * 0.09, 0), { code: `S${i + 1}`, nameAr: `مولة سرير ${i + 1}`, nameEn: `Bed Slat ${i + 1}`, edgeNoteAr: 'خشب موسكي بدون قشاط', edgeNoteEn: 'Pine Slat', thicknessMm: 18 });
    }
  } else {
    const topT = 0.036;
    const legSize = 0.08;
    const legH = H - topT;
    const overhang = 0.06;
    const apronH = 0.1;
    const legX = W / 2 - overhang - legSize / 2;
    const legZ = D / 2 - overhang - legSize / 2;

    addBoardMesh(group, parts, W, topT, D, 0, H - topT / 2, 0, frontWood, new THREE.Vector3(0, 0.46, 0), { code: 'A', nameAr: 'قرصة الترابيزة', nameEn: 'Tabletop Slab', edgeNoteAr: 'قشاط سميك 4 جهات', edgeNoteEn: '4-Side Thick Edge', thicknessMm: 36 }, edgeLine);

    const legCoords: [number, number][] = [[-legX, -legZ], [legX, -legZ], [-legX, legZ], [legX, legZ]];
    legCoords.forEach(([lx, lz], idx) => {
      addBoardMesh(group, parts, legSize, legH, legSize, lx, legH / 2, lz, mainWood, new THREE.Vector3(Math.sign(lx) * 0.36, -0.2, Math.sign(lz) * 0.36), { code: `L${idx + 1}`, nameAr: `رجل زان ${idx + 1}`, nameEn: `Table Leg ${idx + 1}`, thicknessMm: 80 }, edgeLine);
    });

    const longApronW = Math.max(0.2, 2 * legX - legSize);
    const shortApronD = Math.max(0.2, 2 * legZ - legSize);
    const apronY = H - topT - apronH / 2;
    addBoardMesh(group, parts, longApronW, apronH, T, 0, apronY, legZ - 0.01, mainWood, new THREE.Vector3(0, 0.1, 0.36), { code: 'C1', nameAr: 'مريلة أمامية طويلة', nameEn: 'Front Long Apron', thicknessMm: tMm }, edgeLine);
    addBoardMesh(group, parts, longApronW, apronH, T, 0, apronY, -legZ + 0.01, mainWood, new THREE.Vector3(0, 0.1, -0.36), { code: 'C2', nameAr: 'مريلة خلفية طويلة', nameEn: 'Rear Long Apron', thicknessMm: tMm }, edgeLine);
    addBoardMesh(group, parts, T, apronH, shortApronD, legX - 0.01, apronY, 0, mainWood, new THREE.Vector3(0.36, 0.1, 0), { code: 'D1', nameAr: 'مريلة جانبية يمين', nameEn: 'Right Side Apron', thicknessMm: tMm }, edgeLine);
    addBoardMesh(group, parts, T, apronH, shortApronD, -legX + 0.01, apronY, 0, mainWood, new THREE.Vector3(-0.36, 0.1, 0), { code: 'D2', nameAr: 'مريلة جانبية شمال', nameEn: 'Left Side Apron', thicknessMm: tMm }, edgeLine);
  }

  const box = new THREE.Box3().setFromObject(group);
  const boundingSize = new THREE.Vector3();
  box.getSize(boundingSize);
  return { group, parts, boundingSize };
}

export const ThreeDFurnitureViewport: React.FC<Props> = ({
  params,
  locale,
  theme,
  sheetPriceEgp = 1850,
  currencyLabel,
}) => {
  const isRtl = locale === 'ar';
  const curLabel = currencyLabel ?? (isRtl ? 'ج.م' : 'EGP');
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [explodePct, setExplodePct] = useState(0);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [showPartLabels, setShowPartLabels] = useState(true);
  const [activePreset, setActivePreset] = useState<CameraPreset>('iso');
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part3DInfo | null>(null);
  const [projectedTags, setProjectedTags] = useState<ProjectedTag[]>([]);

  const explodeTargetRef = useRef(0);
  const openTargetRef = useRef(0);
  const showLabelsRef = useRef(true);
  const selectedPartIdRef = useRef<string | null>(null);
  const cameraPresetRequestRef = useRef<CameraPreset | null>(null);
  const requestRenderFnRef = useRef<(() => void) | null>(null);
  const exportSnapshotFnRef = useRef<(() => void) | null>(null);
  const rebuildSceneModelRef = useRef<((p: ProjectParams, t: ThemeMode) => void) | null>(null);
  const selectPartByIdRef = useRef<((id: string | null) => void) | null>(null);

  useEffect(() => {
    explodeTargetRef.current = explodePct / 100;
    requestRenderFnRef.current?.();
  }, [explodePct]);

  useEffect(() => {
    openTargetRef.current = doorsOpen ? 1 : 0;
    requestRenderFnRef.current?.();
  }, [doorsOpen]);

  useEffect(() => {
    showLabelsRef.current = showPartLabels;
    requestRenderFnRef.current?.();
  }, [showPartLabels]);

  const triggerPreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    cameraPresetRequestRef.current = preset;
    requestRenderFnRef.current?.();
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
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
        preserveDrawingBuffer: false,
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || 640, container.clientHeight || 420);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglUnavailable(true);
    };
    const onContextRestored = () => {
      setWebglUnavailable(false);
      requestRender();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    const bgHex = theme === 'dark' ? 0x15181d : 0xf4f2ed;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.Fog(bgHex, 9, 28);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      40,
      (container.clientWidth || 640) / (container.clientHeight || 420),
      0.05,
      60
    );
    camera.position.set(2.4, 1.85, 2.8);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.minDistance = 0.9;
    controls.maxDistance = 14;
    controls.target.set(0, 0.8, 0);

    const hemiLight = new THREE.HemisphereLight(0xf0f6ff, 0x7c6a56, 0.88);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.85);
    keyLight.position.set(3.5, 5.8, 3.8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -4.2;
    keyLight.shadow.camera.right = 4.2;
    keyLight.shadow.camera.top = 4.2;
    keyLight.shadow.camera.bottom = -4.2;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xcbe0ff, 0.65);
    rimLight.position.set(-3.2, 2.8, -3.5);
    scene.add(rimLight);

    const floorGeom = new THREE.PlaneGeometry(32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: theme === 'dark' ? 0x1b1f26 : 0xebe8e0,
      roughness: 0.92,
      metalness: 0.02,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.006;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(
      18,
      36,
      theme === 'dark' ? 0x3a414d : 0xcbc4b8,
      theme === 'dark' ? 0x262b33 : 0xded9cf
    );
    gridHelper.position.y = -0.002;
    scene.add(gridHelper);

    const shadowTex = createContactShadowTexture();
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.001;
    scene.add(shadowPlane);

    const highlightMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0x92400e,
      emissiveIntensity: 0.35,
      roughness: 0.38,
      metalness: 0.08,
    });

    let activeModelGroup: THREE.Group | null = null;
    let activeParts: AnimatedPart[] = [];
    const originalMatMap = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    let currentExplode = 0;
    let currentOpen = 0;
    let modelCenterY = 0.85;
    let modelRadius = 1.6;
    let activeTextures: THREE.Texture[] = [];
    let activeMaterials: THREE.Material[] = [];

    const applyHighlight = (targetId: string | null) => {
      selectedPartIdRef.current = targetId;
      for (const p of activeParts) {
        const isSel = p.id === targetId;
        for (const m of p.meshes) {
          if (isSel) {
            if (!originalMatMap.has(m)) originalMatMap.set(m, m.material);
            m.material = highlightMat;
          } else if (originalMatMap.has(m)) {
            m.material = originalMatMap.get(m)!;
          }
        }
      }
      const found = activeParts.find((p) => p.id === targetId) ?? null;
      setSelectedPart(found ? found.meta : null);
      requestRender();
    };

    selectPartByIdRef.current = applyHighlight;

    const disposeActiveModel = () => {
      originalMatMap.clear();
      if (activeModelGroup) {
        activeModelGroup.traverse((child) => {
          if ((child as THREE.Mesh).geometry) {
            (child as THREE.Mesh).geometry.dispose();
          }
        });
        scene.remove(activeModelGroup);
        activeModelGroup = null;
      }
      for (const m of activeMaterials) m.dispose();
      for (const tex of activeTextures) tex.dispose();
      activeMaterials = [];
      activeTextures = [];
      activeParts = [];
    };

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const rebuildModel = (p: ProjectParams, currentTheme: ThemeMode) => {
      disposeActiveModel();
      selectedPartIdRef.current = null;
      setSelectedPart(null);

      const nextBg = currentTheme === 'dark' ? 0x15181d : 0xf4f2ed;
      scene.background = new THREE.Color(nextBg);
      scene.fog = new THREE.Fog(nextBg, 9, 28);
      floorMat.color.setHex(currentTheme === 'dark' ? 0x1b1f26 : 0xebe8e0);

      const wood = getWoodSpec(p.woodType);
      const woodTex = createWoodCanvasTexture(wood.baseHex, wood.grainHex, wood.accentHex, maxAniso);
      const frontTex = createWoodCanvasTexture(wood.baseHex, wood.accentHex, wood.grainHex, maxAniso);
      activeTextures.push(woodTex, frontTex);

      const mainWood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: wood.roughness, metalness: 0.03 });
      const frontWood = new THREE.MeshStandardMaterial({ map: frontTex, roughness: Math.max(0.28, wood.roughness - 0.12), metalness: 0.05 });
      const backWood = new THREE.MeshStandardMaterial({ color: 0xd8c7ab, roughness: 0.82, metalness: 0.0 });
      const metal = new THREE.MeshStandardMaterial({ color: 0x3b3f46, roughness: 0.24, metalness: 0.86 });
      const stone = new THREE.MeshStandardMaterial({ color: 0xd9d4ca, roughness: 0.35, metalness: 0.08 });
      const edgeLine = new THREE.LineBasicMaterial({
        color: currentTheme === 'dark' ? 0x261d15 : 0x4b3826,
        transparent: true,
        opacity: 0.36,
      });

      activeMaterials.push(mainWood, frontWood, backWood, metal, stone, edgeLine);

      const built = buildFurnitureModel(p, { mainWood, frontWood, backWood, metal, stone, edgeLine });
      activeModelGroup = built.group;
      activeParts = built.parts;
      scene.add(activeModelGroup);

      modelCenterY = Math.max(0.35, built.boundingSize.y * 0.5);
      modelRadius = Math.max(
        1.1,
        Math.hypot(built.boundingSize.x, built.boundingSize.y, built.boundingSize.z) * 0.78
      );
      shadowPlane.scale.set(
        Math.max(0.7, built.boundingSize.x * 0.72),
        Math.max(0.6, built.boundingSize.z * 0.82),
        1
      );

      for (const part of activeParts) {
        part.object.position
          .copy(part.basePos)
          .addScaledVector(part.explodeOffset, currentExplode * EXPLODE_MULTIPLIER);
        if (part.drawerPullZ) part.object.position.z += part.drawerPullZ * currentOpen;
        if (part.doorPivot && part.doorOpenAngle) part.doorPivot.rotation.y = part.doorOpenAngle * currentOpen;
      }

      controls.target.set(0, modelCenterY, 0);
      cameraPresetRequestRef.current = 'iso';
      requestRender();
    };

    rebuildSceneModelRef.current = rebuildModel;

    // Click raycasting on individual 3D parts
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let pointerDownX = 0;
    let pointerDownY = 0;

    const onPointerDown = (e: PointerEvent) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY) > 6) return;
      if (!activeModelGroup) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(activeModelGroup.children, true);
      const hitMesh = hits.find((h) => h.object.userData?.partId);
      if (hitMesh?.object.userData?.partId) {
        const hitId = String(hitMesh.object.userData.partId);
        applyHighlight(selectedPartIdRef.current === hitId ? null : hitId);
      } else if (selectedPartIdRef.current) {
        applyHighlight(null);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();
    let disposed = false;
    let lastTagSync = 0;

    const updateProjectedTags = () => {
      const shouldShow = showLabelsRef.current && currentExplode > 0.14;
      if (!shouldShow) {
        setProjectedTags((prev) => (prev.length === 0 ? prev : []));
        return;
      }

      const w = container.clientWidth || 640;
      const h = container.clientHeight || 420;
      const nextTags: ProjectedTag[] = [];
      const placed: { x: number; y: number }[] = [];

      // Prioritize main distinct pieces (cap at 14 clean non-overlapping badges)
      for (const part of activeParts) {
        if (nextTags.length >= 14) break;
        // Skip repetitive bed slats beyond #1 & #2
        if (part.meta.code.startsWith('S') && Number(part.meta.code.slice(1)) > 2) continue;

        _boxTmp.setFromObject(part.object);
        _boxTmp.getCenter(_projVec);
        _projVec.project(camera);
        if (_projVec.z > 1 || _projVec.z < -1) continue;

        const sx = (_projVec.x * 0.5 + 0.5) * w;
        const sy = (-_projVec.y * 0.5 + 0.5) * h;

        if (sx < 44 || sx > w - 44 || sy < 52 || sy > h - 108) continue;
        if (placed.some((p) => Math.abs(p.x - sx) < 92 && Math.abs(p.y - sy) < 26)) continue;

        placed.push({ x: sx, y: sy });
        nextTags.push({
          id: part.id,
          code: part.meta.code,
          nameAr: part.meta.nameAr,
          nameEn: part.meta.nameEn,
          dimText: `${part.meta.lengthCm}×${part.meta.widthCm}`,
          x: Math.round(sx),
          y: Math.round(sy),
        });
      }
      setProjectedTags(nextTags);
    };

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) frameId = window.setTimeout(poll, 5);
        else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const now = performance.now();
        const dt = Math.min(0.05, Math.max(0.004, (now - lastTime) / 1000));
        lastTime = now;

        let needsMoreFrames = false;

        const targetExp = explodeTargetRef.current;
        const targetOpen = openTargetRef.current;
        if (Math.abs(currentExplode - targetExp) > 0.002) {
          currentExplode = isSoftwareGl
            ? targetExp
            : THREE.MathUtils.damp(currentExplode, targetExp, 7.5, dt);
          if (!isSoftwareGl && Math.abs(currentExplode - targetExp) > 0.002) {
            needsMoreFrames = true;
          } else {
            currentExplode = targetExp;
          }
        }
        if (Math.abs(currentOpen - targetOpen) > 0.002) {
          currentOpen = isSoftwareGl
            ? targetOpen
            : THREE.MathUtils.damp(currentOpen, targetOpen, 7.5, dt);
          if (!isSoftwareGl && Math.abs(currentOpen - targetOpen) > 0.002) {
            needsMoreFrames = true;
          } else {
            currentOpen = targetOpen;
          }
        }

        const effectiveExplode = currentExplode * EXPLODE_MULTIPLIER;
        for (const part of activeParts) {
          part.object.position
            .copy(part.basePos)
            .addScaledVector(part.explodeOffset, effectiveExplode);
          if (part.drawerPullZ) {
            part.object.position.z += part.drawerPullZ * currentOpen;
          }
          if (part.doorPivot && part.doorOpenAngle) {
            part.doorPivot.rotation.y = part.doorOpenAngle * currentOpen;
          }
        }

        // Smooth camera preset transition (auto-expands distance when exploded!)
        const preset = cameraPresetRequestRef.current;
        if (preset) {
          const explodeZoomBoost = 1 + currentExplode * 0.72;
          const dist = modelRadius * 1.95 * explodeZoomBoost;
          _orbitTarget.set(0, modelCenterY, 0);
          if (preset === 'iso') {
            _camTargetPos.set(dist * 0.72, modelCenterY + dist * 0.38, dist * 0.88);
          } else if (preset === 'front') {
            _camTargetPos.set(0, modelCenterY, dist * 1.12);
          } else if (preset === 'side') {
            _camTargetPos.set(dist * 1.12, modelCenterY, 0.01);
          } else {
            _camTargetPos.set(0.01, modelCenterY + dist * 1.18, dist * 0.42);
          }

          if (isSoftwareGl) {
            camera.position.copy(_camTargetPos);
            controls.target.copy(_orbitTarget);
            cameraPresetRequestRef.current = null;
          } else {
            const alpha = 1 - Math.exp(-8 * dt);
            camera.position.lerp(_camTargetPos, alpha);
            controls.target.lerp(_orbitTarget, alpha);
            if (camera.position.distanceTo(_camTargetPos) < 0.018) {
              camera.position.copy(_camTargetPos);
              controls.target.copy(_orbitTarget);
              cameraPresetRequestRef.current = null;
            } else {
              needsMoreFrames = true;
            }
          }
        }

        controls.update();
        renderer.render(scene, camera);

        if (now - lastTagSync > 45 || !needsMoreFrames) {
          lastTagSync = now;
          updateProjectedTags();
        }

        const done = () => {
          renderBusy = false;
          if (renderDirty || needsMoreFrames) requestRender();
        };

        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    requestRenderFnRef.current = requestRender;

    exportSnapshotFnRef.current = () => {
      renderer.render(scene, camera);
      const a = document.createElement('a');
      a.href = renderer.domElement.toDataURL('image/png');
      a.download = `bola-wood-3d-${params.templateId}-${params.widthCm}x${params.heightCm}cm.png`;
      a.click();
    };

    const onControlStart = () => {
      cameraPresetRequestRef.current = null;
    };
    const onControlChange = () => {
      requestRender();
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('change', onControlChange);

    rebuildModel(params, theme);
    if (!isSoftwareGl) renderer.compile(scene, camera);
    requestRender();

    const resizeObserver = new ResizeObserver(() => {
      if (!container || disposed) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('change', onControlChange);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      disposeActiveModel();
      highlightMat.dispose();
      floorGeom.dispose();
      floorMat.dispose();
      shadowTex.dispose();
      shadowPlaneMat.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    rebuildSceneModelRef.current?.(params, theme);
  }, [
    params.templateId,
    params.widthCm,
    params.heightCm,
    params.depthCm,
    params.doorsCount,
    params.shelvesCount,
    params.drawersCount,
    params.dividersCount,
    params.plinthHeightCm,
    params.woodType,
    params.boardThicknessMm,
    params.backThicknessMm,
    params.includeBackPanel,
    theme,
  ]);

  const template = getTemplateSpec(params.templateId);
  const supportsOpen = params.doorsCount > 0 || params.drawersCount > 0;

  const toggleFullExplode = () => {
    const next = explodePct >= 75 ? 0 : 100;
    setExplodePct(next);
    if (next === 100) setShowPartLabels(true);
    cameraPresetRequestRef.current = activePreset;
    requestRenderFnRef.current?.();
  };

  // Single-piece EGP estimate for clicked 3D board
  const selectedPartCost = selectedPart
    ? Math.max(
        1,
        Math.round(
          ((selectedPart.lengthCm * selectedPart.widthCm) / 10000) *
            ((selectedPart.isBack ? 580 : sheetPriceEgp) / ((122 * 244) / 10000))
        )
      )
    : 0;

  if (webglUnavailable) {
    return (
      <div className="relative w-full h-[380px] sm:h-[480px] rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900">
        <img
          src={template.imageUrl}
          alt={isRtl ? template.nameAr : template.nameEn}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white text-xs">
          {isRtl
            ? 'متصفحك لا يدعم WebGL 3D حالياً — تم عرض صورة التصميم الواقعية.'
            : 'WebGL 3D unavailable in this browser — showing photorealistic reference.'}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] flex flex-col">
      {/* Unobstructed 3D WebGL Viewport */}
      <div className="relative w-full h-[300px] sm:h-[440px] lg:h-[500px] overflow-hidden bg-[#F4F2ED] dark:bg-[#15181D] select-none">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Projected Floating Per-Piece Dimension Callouts during Wide Explode */}
        {projectedTags.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {projectedTags.map((tag) => {
              const isSel = selectedPart?.id === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => selectPartByIdRef.current?.(isSel ? null : tag.id)}
                  style={{ left: `${tag.x}px`, top: `${tag.y}px` }}
                  className={`pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg border text-[10px] font-bold shadow-xs transition-transform hover:scale-105 whitespace-nowrap flex items-center gap-1 ${
                    isSel
                      ? 'bg-amber-700 text-white border-amber-900 scale-105 z-20'
                      : 'bg-white/95 dark:bg-[#191C20]/95 text-stone-800 dark:text-stone-100 border-stone-300 dark:border-stone-600'
                  }`}
                >
                  <span
                    className={
                      isSel
                        ? 'text-amber-200 font-mono'
                        : 'text-amber-700 dark:text-amber-400 font-mono'
                    }
                  >
                    {tag.code}
                  </span>
                  <span className="font-mono tabular-nums">
                    {tag.dimText} {isRtl ? 'سم' : 'cm'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Compact Top-Start Dimension Spec OR Clicked Individual Board Inspector */}
        <div className="absolute top-2.5 start-2.5 z-20 max-w-[calc(100%-115px)]">
          {selectedPart ? (
            <div className="px-2.5 py-1.5 rounded-xl bg-amber-950/95 text-white border border-amber-500/60 text-[11px] sm:text-xs shadow-md flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-mono font-bold text-amber-300">{selectedPart.code}</span>
              <span className="font-bold">
                {isRtl ? selectedPart.nameAr : selectedPart.nameEn}
              </span>
              <span className="font-bold text-amber-200 tabular-nums">
                {isRtl
                  ? `${egDim(selectedPart.lengthCm)} × ${egDim(selectedPart.widthCm)} (${egThickness(
                      selectedPart.thicknessMm
                    )})`
                  : `${selectedPart.lengthCm} × ${selectedPart.widthCm} cm`}
              </span>
              <span className="font-mono tabular-nums text-emerald-300 font-bold">
                ~{selectedPartCost.toLocaleString()} {curLabel}
              </span>
              <button
                type="button"
                onClick={() => selectPartByIdRef.current?.(null)}
                className="ms-auto p-1 rounded hover:bg-white/15"
                aria-label="Clear selected piece"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-xl bg-white/95 dark:bg-[#191C20]/95 border border-stone-200 dark:border-stone-700 text-[11px] sm:text-xs flex items-center gap-1.5 text-stone-700 dark:text-stone-200 shadow-xs">
              <span className="font-bold text-amber-700 dark:text-amber-400">3D</span>
              <span aria-hidden="true">·</span>
              <span className="font-bold tabular-nums truncate">
                {isRtl
                  ? egBoxDims(params.widthCm, params.heightCm, params.depthCm)
                  : `${params.widthCm} × ${params.heightCm} × ${params.depthCm} cm`}
              </span>
            </div>
          )}
        </div>

        {/* Compact Top-End Save PNG Button */}
        <div className="absolute top-2.5 end-2.5 z-20">
          <button
            type="button"
            onClick={() => exportSnapshotFnRef.current?.()}
            className="min-h-[36px] px-2.5 rounded-xl bg-white/95 dark:bg-[#191C20]/95 hover:bg-amber-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
            <span className="hidden sm:inline">{isRtl ? 'حفظ صورة 3D' : 'Save PNG'}</span>
            <span className="sm:hidden">{isRtl ? 'صورة' : 'PNG'}</span>
          </button>
        </div>
      </div>

      {/* Clean Attached Below-Canvas Control Bar (Never Covers the 3D Furniture on Phones!) */}
      <div className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-[#191C20] p-2.5 sm:p-3 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Camera View Presets */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800/90 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'iso', ar: '3D', en: '3D' },
                { id: 'front', ar: 'أمامي', en: 'Front' },
                { id: 'side', ar: 'جانبي', en: 'Side' },
                { id: 'top', ar: 'علوي', en: 'Top' },
              ] as { id: CameraPreset; ar: string; en: string }[]
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => triggerPreset(preset.id)}
                className={`min-h-[36px] px-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activePreset === preset.id
                    ? 'bg-amber-700 text-white'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-700'
                }`}
              >
                {isRtl ? preset.ar : preset.en}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={toggleFullExplode}
              className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
                explodePct >= 75
                  ? 'bg-amber-700 text-white border-amber-700'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800'
              }`}
            >
              <Expand className="w-3.5 h-3.5 shrink-0" />
              <span>
                {explodePct >= 75
                  ? isRtl
                    ? 'تجميع'
                    : 'Assemble'
                  : isRtl
                  ? 'تفكيك واسع'
                  : 'Explode'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowPartLabels((v) => !v)}
              className={`min-h-[38px] px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-colors whitespace-nowrap ${
                showPartLabels
                  ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-900 dark:border-stone-100'
                  : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700'
              }`}
            >
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>{isRtl ? 'المقاسات' : 'Labels'}</span>
            </button>

            {supportsOpen && (
              <button
                type="button"
                onClick={() => setDoorsOpen((o) => !o)}
                className={`min-h-[38px] px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-colors whitespace-nowrap ${
                  doorsOpen
                    ? 'bg-amber-700 text-white border-amber-700'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700'
                }`}
              >
                <DoorOpen className="w-3.5 h-3.5 shrink-0" />
                <span>{doorsOpen ? (isRtl ? 'إغلاق' : 'Close') : isRtl ? 'فتح' : 'Open'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setExplodePct(0);
                setDoorsOpen(false);
                selectPartByIdRef.current?.(null);
                triggerPreset('iso');
              }}
              className="min-h-[38px] min-w-[38px] rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center transition-colors"
              title={isRtl ? 'إعادة ضبط المنظور' : 'Reset View'}
              aria-label="Reset 3D View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Wide Explode Distance Slider */}
        <div className="flex items-center gap-2.5 pt-1.5 border-t border-stone-100 dark:border-stone-800">
          <Layers className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
          <label
            htmlFor="explode-slider"
            className="text-xs font-semibold text-stone-700 dark:text-stone-200 whitespace-nowrap"
          >
            {isRtl ? 'التفكيك:' : 'Explode:'}
          </label>
          <input
            id="explode-slider"
            type="range"
            min={0}
            max={100}
            value={explodePct}
            onChange={(e) => {
              const val = Number(e.target.value);
              setExplodePct(val);
              cameraPresetRequestRef.current = activePreset;
            }}
            className="flex-1 accent-amber-700 cursor-pointer h-2"
          />
          <span
            dir="ltr"
            className="text-xs font-mono tabular-nums font-bold text-amber-700 dark:text-amber-400 w-9 text-end"
          >
            {explodePct}%
          </span>
        </div>
      </div>
    </div>
  );
};
