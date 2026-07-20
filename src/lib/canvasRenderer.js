// src/lib/canvasRenderer.js
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const { getScaleColor, getScaleText } = require('./earthquakeService');

// フォントの登録
try {
  const fontPath = require.resolve('@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff2');
  GlobalFonts.registerFromPath(fontPath, 'Noto Sans JP');
} catch (e) {
  console.error('Font registration failed:', e);
}

async function renderRankCard(user, rankData) {
  const width = 934;
  const height = 282;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 背景 (画像のような深い色)
  ctx.fillStyle = '#1E1E2E';
  // 角丸の背景を描画
  const r = 20;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(width, 0, width, height, r);
  ctx.arcTo(width, height, 0, height, r);
  ctx.arcTo(0, height, 0, 0, r);
  ctx.arcTo(0, 0, width, 0, r);
  ctx.closePath();
  ctx.fill();

  // ユーザーアイコン (円形)
  const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });
  const avatar = await loadImage(avatarURL);
  
  const avatarX = 60;
  const avatarY = 60;
  const avatarSize = 160;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  ctx.restore();

  // ユーザー名
  ctx.font = 'bold 40px "Noto Sans JP"';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  let username = user.username;
  if (username.length > 15) username = username.substring(0, 15) + '...';
  ctx.fillText(username, 270, 110);

  // ランクとレベル
  ctx.font = 'bold 32px "Noto Sans JP"';
  ctx.fillStyle = '#B89CFF'; // 紫色
  ctx.fillText(`#${rankData.rank}`, 270, 170);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`Level ${rankData.level}`, 380, 170);

  // XP テキスト
  ctx.font = 'bold 24px "Noto Sans JP"';
  ctx.fillStyle = '#DCDDDE';
  ctx.textAlign = 'right';
  const currentXp = Number(rankData.xp); // BigIntのままだとNumberとの算術演算でエラーになるため変換
  const nextXp = Math.floor(rankData.nextLevelXp);
  ctx.fillText(`${currentXp} / ${nextXp} XP`, 870, 110);

  // プログレスバー (紫)
  const barX = 270;
  const barY = 190;
  const barWidth = 600;
  const barHeight = 20;
  
  // バーの背景
  ctx.fillStyle = '#313244';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 10);
  ctx.fill();

  // バーの進捗
  const progress = nextXp > 0 ? Math.min(1, currentXp / nextXp) : 1;
  ctx.fillStyle = '#B89CFF'; // 紫色
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth * progress, barHeight, 10);
  ctx.fill();

  // 右下の透かし (Cookie Lyrics 2.0)
  ctx.font = '20px "Noto Sans JP"';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.textAlign = 'right';
  ctx.fillText('Cookie Lyrix 2.0', width - 20, height - 20);

  return canvas.toBuffer('image/png');
}

async function renderEarthquakeMap(earthquake) {
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = '#1E1E2E';
  ctx.fillRect(0, 0, width, height);

  // タイトル
  ctx.font = 'bold 28px "Noto Sans JP"';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.fillText(`${earthquake.earthquake.hypocenter.name} (最大震度 ${getScaleText(earthquake.earthquake.maxScale)})`, 20, 40);

  // --- 都道府県ごとの震度マップ (GeoJSON) ---
  const mapX = 40, mapY = 60, mapW = 720, mapH = 360;

  // 日本全体を収めるおおよその緯度経度の範囲(沖合の震源も入るよう少し余裕を持たせる)
  const LON_MIN = 120, LON_MAX = 150;
  const LAT_MIN = 23, LAT_MAX = 47;

  function project(lon, lat) {
    const x = mapX + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * mapW;
    const y = mapY + (1 - (lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * mapH;
    return [x, y];
  }

  // 観測点(points)から、都道府県ごとの最大震度を集計する
  const scaleByPref = {};
  for (const p of (earthquake.points || [])) {
    const current = scaleByPref[p.pref];
    if (current === undefined || p.scale > current) {
      scaleByPref[p.pref] = p.scale;
    }
  }

  const prefectures = getPrefectureGeoJson();
  for (const feature of prefectures.features) {
    const prefName = feature.properties.nam_ja;
    const scale = scaleByPref[prefName];

    const polygons = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;

    ctx.beginPath();
    for (const polygon of polygons) {
      for (const ring of polygon) {
        ring.forEach(([lon, lat], i) => {
          const [x, y] = project(lon, lat);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
      }
    }

    // 観測情報がある都道府県は震度に応じた色、ないところはニュートラルなグレー
    ctx.fillStyle = scale !== undefined ? getScaleColor(scale) : '#3A3A4A';
    ctx.fill();
    ctx.strokeStyle = '#1E1E2E';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 震源(エピセンター)を星印でプロット
  const { latitude, longitude } = earthquake.earthquake.hypocenter;
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    const [ex, ey] = project(longitude, latitude);
    drawStar(ctx, ex, ey, 5, 12, 5, '#FFFFFF', '#000000');
  }

  // 枠線
  ctx.strokeStyle = '#45475A';
  ctx.lineWidth = 2;
  ctx.strokeRect(mapX, mapY, mapW, mapH);

  // --- 凡例 ---
  const legendScales = [10, 20, 30, 40, 45, 50, 55, 60, 70];
  const legendY = mapY + mapH + 20;
  const legendItemW = mapW / legendScales.length;
  ctx.font = '14px "Noto Sans JP"';
  legendScales.forEach((scale, i) => {
    const lx = mapX + i * legendItemW;
    ctx.fillStyle = getScaleColor(scale);
    ctx.fillRect(lx, legendY, legendItemW - 4, 16);
    ctx.fillStyle = '#DCDDDE';
    ctx.textAlign = 'center';
    ctx.fillText(getScaleText(scale), lx + (legendItemW - 4) / 2, legendY + 30);
  });

  // 情報テキスト
  ctx.font = '20px "Noto Sans JP"';
  ctx.fillStyle = '#DCDDDE';
  ctx.textAlign = 'left';
  const time = new Date(earthquake.earthquake.time).toLocaleString('ja-JP');
  ctx.fillText(`発生時刻: ${time}`, 20, height - 60);
  ctx.fillText(`深さ: ${earthquake.earthquake.hypocenter.depth}`, 20, height - 32);
  ctx.fillText(`マグニチュード: ${earthquake.earthquake.hypocenter.magnitude}`, 300, height - 32);

  return canvas.toBuffer('image/png');
}

// 都道府県境界のGeoJSONを一度だけ読み込みキャッシュする。
// データ出典: 地球地図日本 (国土地理院 / dataofjapan/land, https://github.com/dataofjapan/land)
// を簡略化・軽量化したもの。非営利利用時は出典の明記が必要(埋め込みのフッターに表記済み)。
let _prefectureGeoJsonCache = null;
function getPrefectureGeoJson() {
  if (!_prefectureGeoJsonCache) {
    const filePath = path.join(__dirname, 'data', 'japan-prefectures.geojson');
    _prefectureGeoJsonCache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return _prefectureGeoJsonCache;
}

// 震源を示す星形マーカーを描画する
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, fillColor, strokeColor) {
  let rot = (Math.PI / 2) * 3;
  let x = cx, y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();

  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = strokeColor;
  ctx.stroke();
}

module.exports = { renderRankCard, renderEarthquakeMap };