// src/lib/canvasRenderer.js
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
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

  // 簡易的な日本地図の描画 (枠線のみ)
  ctx.strokeStyle = '#313244';
  ctx.lineWidth = 2;
  ctx.strokeRect(100, 100, 600, 400);
  
  // タイトル
  ctx.font = 'bold 30px "Noto Sans JP"';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.fillText(`${earthquake.earthquake.hypocenter.name} (最大震度 ${getScaleText(earthquake.earthquake.maxScale)})`, 20, 50);

  // 観測点のプロット (簡易的な位置決め)
  // 本来は緯度経度から座標を計算しますが、ここではランダムな位置にプロットします
  const points = earthquake.points || [];
  points.forEach((p, i) => {
    const x = 150 + (i % 10) * 50;
    const y = 150 + Math.floor(i / 10) * 40;
    
    ctx.fillStyle = getScaleColor(p.scale);
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px "Noto Sans JP"';
    ctx.textAlign = 'center';
    ctx.fillText(getScaleText(p.scale), x, y + 4);
  });

  // 情報テキスト
  ctx.font = '20px "Noto Sans JP"';
  ctx.fillStyle = '#DCDDDE';
  ctx.textAlign = 'left';
  const time = new Date(earthquake.earthquake.time).toLocaleString('ja-JP');
  ctx.fillText(`発生時刻: ${time}`, 20, height - 80);
  ctx.fillText(`深さ: ${earthquake.earthquake.hypocenter.depth}`, 20, height - 50);
  ctx.fillText(`マグニチュード: ${earthquake.earthquake.hypocenter.magnitude}`, 20, height - 20);

  return canvas.toBuffer('image/png');
}

module.exports = { renderRankCard, renderEarthquakeMap };