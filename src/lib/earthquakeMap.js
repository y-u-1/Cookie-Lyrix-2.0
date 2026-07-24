// src/lib/earthquakeMap.js
// Luna Calyx 7.0 の実装を参考に、被害範囲へ自動ズームし、
// 都道府県ごとに震度ラベルを表示する震度分布マップの描画。
const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

// フォントの登録(他のモジュールで既に登録済みでも安全に呼べる)
try {
  const fontPath = require.resolve('@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff2');
  if (!GlobalFonts.has('Noto Sans JP')) {
    GlobalFonts.registerFromPath(fontPath, 'Noto Sans JP');
  }
} catch (e) {
  console.error('Font registration failed (earthquakeMap):', e);
}

const GEO_PATH = path.join(__dirname, 'data', 'japan-prefectures.geojson');
let geoData = null;

function loadGeoData() {
  if (!geoData) {
    geoData = JSON.parse(fs.readFileSync(GEO_PATH, 'utf-8'));
  }
  return geoData;
}

// 気象庁震度階級のラベルと色(P2P地震情報のscale値: 10刻みで1〜7、45=5弱, 50=5強, 55=6弱, 60=6強)
const SCALE_INFO = {
  10: { label: '1', color: '#666666' },
  20: { label: '2', color: '#0099CC' },
  30: { label: '3', color: '#00CC00' },
  40: { label: '4', color: '#FFCC00' },
  45: { label: '5弱', color: '#FF9900' },
  50: { label: '5強', color: '#FF0000' },
  55: { label: '6弱', color: '#CC0000' },
  60: { label: '6強', color: '#990000' },
  70: { label: '7', color: '#660000' },
};
const NO_DATA_COLOR = '#3A3A4A';
const BG_COLOR = '#1E1E2E';
const BORDER_COLOR = 'rgba(255,255,255,0.35)';

function scaleInfo(scale) {
  return SCALE_INFO[scale] ?? { label: '?', color: NO_DATA_COLOR };
}

/**
 * points配列(P2P地震情報API)からpref単位の最大震度マップを作る。
 * @param {Array<{pref?: string, scale: number}>} points
 * @returns {Map<string, number>} 都道府県名 -> 最大scale
 */
function aggregateByPref(points) {
  const map = new Map();
  for (const p of points || []) {
    if (!p.pref) continue;
    const current = map.get(p.pref);
    if (current === undefined || p.scale > current) map.set(p.pref, p.scale);
  }
  return map;
}

// P2P地震情報のlatitude/longitudeは通常は数値だが、
// 旧仕様(v1)では "N35.8" / "E137.7" のような文字列の場合もあるため両対応する。
function parseCoord(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;
  const n = parseFloat(value.replace(/^[NSEW]/, ''));
  if (Number.isNaN(n)) return null;
  return value[0] === 'S' || value[0] === 'W' ? -n : n;
}

function project(lng, lat, bbox, width, height, padding) {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const scaleX = (width - padding * 2) / (maxLng - minLng);
  const scaleY = (height - padding * 2) / (maxLat - minLat);
  const scale = Math.min(scaleX, scaleY);
  const offsetX = padding + ((width - padding * 2) - (maxLng - minLng) * scale) / 2;
  const offsetY = padding + ((height - padding * 2) - (maxLat - minLat) * scale) / 2;
  const x = offsetX + (lng - minLng) * scale;
  const y = height - (offsetY + (lat - minLat) * scale);
  return [x, y];
}

function ringBBox(coords, depth, bbox) {
  if (depth === 0) {
    const [lng, lat] = coords;
    if (lng < bbox[0]) bbox[0] = lng;
    if (lat < bbox[1]) bbox[1] = lat;
    if (lng > bbox[2]) bbox[2] = lng;
    if (lat > bbox[3]) bbox[3] = lat;
  } else {
    for (const c of coords) ringBBox(c, depth - 1, bbox);
  }
}

/**
 * 震度分布マップ画像(PNG Buffer)を生成する。
 * @param {object} options
 * @param {Array} options.points - P2P地震情報APIのpoints配列
 * @param {{latitude: number|string, longitude: number|string}|null} options.epicenter - 震源座標(あれば×印を表示)
 * @returns {Buffer|null} 対象データが無い場合はnullを返す
 */
function buildIntensityMapImage({ points, epicenter }) {
  const prefScales = aggregateByPref(points);

  const lat = epicenter ? parseCoord(epicenter.latitude) : null;
  const lng = epicenter ? parseCoord(epicenter.longitude) : null;
  const epicenterCoord = lat !== null && lng !== null ? { lat, lng } : null;

  if (prefScales.size === 0 && !epicenterCoord) return null;

  const geo = loadGeoData();
  const width = 1000;
  const height = 720;
  const padding = 60;

  // 観測のあった都道府県＋震源のバウンディングボックスを計算し、その周辺だけをズーム表示する
  const bbox = [Infinity, Infinity, -Infinity, -Infinity];
  let hasBBox = false;
  for (const feature of geo.features) {
    if (!prefScales.has(feature.properties.nam_ja)) continue;
    const depth = feature.geometry.type === 'MultiPolygon' ? 3 : 2;
    ringBBox(feature.geometry.coordinates, depth, bbox);
    hasBBox = true;
  }
  if (epicenterCoord) {
    if (epicenterCoord.lng < bbox[0]) bbox[0] = epicenterCoord.lng;
    if (epicenterCoord.lat < bbox[1]) bbox[1] = epicenterCoord.lat;
    if (epicenterCoord.lng > bbox[2]) bbox[2] = epicenterCoord.lng;
    if (epicenterCoord.lat > bbox[3]) bbox[3] = epicenterCoord.lat;
    hasBBox = true;
  }
  if (!hasBBox) return null;

  // マージンを追加(周辺の県も見えるように広めに取る)
  const marginLng = Math.max((bbox[2] - bbox[0]) * 0.6, 1.5);
  const marginLat = Math.max((bbox[3] - bbox[1]) * 0.6, 1.5);
  bbox[0] -= marginLng;
  bbox[1] -= marginLat;
  bbox[2] += marginLng;
  bbox[3] += marginLat;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, width, height);

  function drawPolygon(coords) {
    ctx.beginPath();
    coords.forEach((ring) => {
      ring.forEach(([lngPt, latPt], i) => {
        const [x, y] = project(lngPt, latPt, bbox, width, height, padding);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = BORDER_COLOR;

  // 都道府県ポリゴンを描画
  const labelPositions = [];
  for (const feature of geo.features) {
    const name = feature.properties.nam_ja;
    const scale = prefScales.get(name);
    ctx.fillStyle = scale !== undefined ? scaleInfo(scale).color : NO_DATA_COLOR;

    if (feature.geometry.type === 'Polygon') {
      drawPolygon(feature.geometry.coordinates);
    } else {
      for (const poly of feature.geometry.coordinates) drawPolygon(poly);
    }

    if (scale !== undefined) {
      // ラベル位置は都道府県の頂点の平均(簡易重心)
      let sumX = 0, sumY = 0, count = 0;
      const depth = feature.geometry.type === 'MultiPolygon' ? 3 : 2;
      const collect = (coords, d) => {
        if (d === 0) {
          const [x, y] = project(coords[0], coords[1], bbox, width, height, padding);
          sumX += x; sumY += y; count++;
        } else {
          for (const c of coords) collect(c, d - 1);
        }
      };
      collect(feature.geometry.coordinates, depth);
      if (count > 0) labelPositions.push({ x: sumX / count, y: sumY / count, scale });
    }
  }

  // 震度ラベルを描画
  ctx.font = '600 26px "Noto Sans JP"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const { x, y, scale } of labelPositions) {
    const info = scaleInfo(scale);
    const label = info.label;
    const boxW = label.length > 1 ? 46 : 34;
    const boxH = 34;

    ctx.fillStyle = info.color;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - boxW / 2, y - boxH / 2, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = scale >= 30 && scale < 45 ? '#1E1E2E' : '#ffffff';
    ctx.fillText(label, x, y + 1);
  }

  // 震源に×印
  if (epicenterCoord) {
    const [ex, ey] = project(epicenterCoord.lng, epicenterCoord.lat, bbox, width, height, padding);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    const s = 14;
    ctx.beginPath();
    ctx.moveTo(ex - s, ey - s);
    ctx.lineTo(ex + s, ey + s);
    ctx.moveTo(ex + s, ey - s);
    ctx.lineTo(ex - s, ey + s);
    ctx.stroke();
  }

  return canvas.toBuffer('image/png');
}

module.exports = { buildIntensityMapImage, parseCoord };
