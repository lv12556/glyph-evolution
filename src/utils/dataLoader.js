/**
 * Data loading utilities for glyph evolution visualization
 * Loads per-group shape files, features CSV, and PCA CSV lazily
 */

const DATA_BASE = '/data';

// ── Cache ────────────────────────────────────────────────────
const shapeCache = new Map();   // groupId → shape data
const csvCache = new Map();     // filename → parsed array

let groupIndex = null;
let featuresData = null;
let pcaData = null;

// ── Load group index ─────────────────────────────────────────
export async function loadGroupIndex() {
  if (groupIndex) return groupIndex;
  const res = await fetch(`${DATA_BASE}/shapes/index.json`);
  if (!res.ok) throw new Error(`Failed to load group index: ${res.status}`);
  groupIndex = await res.json();
  return groupIndex;
}

// ── Load single group shape data ─────────────────────────────
export async function loadGroupShape(groupId) {
  if (shapeCache.has(groupId)) return shapeCache.get(groupId);
  const res = await fetch(`${DATA_BASE}/shapes/${groupId}.json`);
  if (!res.ok) throw new Error(`Failed to load shape for ${groupId}: ${res.status}`);
  const data = await res.json();
  shapeCache.set(groupId, data);
  // Keep cache bounded
  if (shapeCache.size > 5) {
    const firstKey = shapeCache.keys().next().value;
    shapeCache.delete(firstKey);
  }
  return data;
}

// ── Load and parse CSV ───────────────────────────────────────
async function loadCSV(filename) {
  if (csvCache.has(filename)) return csvCache.get(filename);
  const res = await fetch(`${DATA_BASE}/${filename}`);
  if (!res.ok) throw new Error(`Failed to load ${filename}: ${res.status}`);
  let text = await res.text();
  // 去除 UTF-8 BOM（Python utf-8-sig 会写 ﻿，污染CSV第一列字段名）
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  // 统一换行符，去除末尾空行
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const lines = text.split('\n');
  const headers = lines[0].split(',');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',');
    const row = {};
    headers.forEach((h, j) => {
      const v = vals[j];
      // Try parse as number
      const n = Number(v);
      row[h] = isNaN(n) ? v : n;
    });
    rows.push(row);
  }
  csvCache.set(filename, rows);
  return rows;
}

// ── Load features ────────────────────────────────────────────
export async function loadFeatures() {
  if (featuresData) return featuresData;
  featuresData = await loadCSV('features.csv');
  return featuresData;
}

// ── Load PCA ─────────────────────────────────────────────────
export async function loadPCA() {
  if (pcaData) return pcaData;
  pcaData = await loadCSV('pca.csv');
  return pcaData;
}

// ── Filter helpers ───────────────────────────────────────────
export function filterFeatures(features, { group, order, char }) {
  return features.filter(r =>
    (!group || r.group === group) &&
    (!order || r.order === order) &&
    (!char || r.char === char)
  );
}

// ── Get available feature names ──────────────────────────────
export function getFeatureNames(features) {
  if (!features || features.length === 0) return [];
  const first = features[0];
  const metaCols = ['group', 'order', 'char', 'time'];
  return Object.keys(first).filter(k =>
    !metaCols.includes(k) && typeof first[k] === 'number'
  );
}

// ── Get max time from data ───────────────────────────────────
export function getMaxTime(features, pca) {
  const maxFromData = (data) => {
    if (!data || data.length === 0) return 0;
    return Math.max(...data.map(r => r.time || 0));
  };
  return Math.max(maxFromData(features), maxFromData(pca), 1);
}

// ── Reference image index ────────────────────────────────────
let imageIndex = null;

export async function loadImageIndex() {
  if (imageIndex) return imageIndex;
  const res = await fetch(`${DATA_BASE}/images/index.json`);
  if (!res.ok) throw new Error(`Failed to load image index: ${res.status}`);
  imageIndex = await res.json();
  return imageIndex;
}

export function getReferenceImageUrl(groupId, orderId, imageIdx) {
  if (!imageIdx) return null;
  const key = `${groupId}_${orderId}`;
  const filename = imageIdx[key];
  if (!filename) return null;
  return `${DATA_BASE}/images/${filename}`;
}
