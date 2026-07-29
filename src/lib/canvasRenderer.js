// src/lib/canvasRenderer.js
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

// フォントの登録
// 'bold'指定の描画箇所があるため、Regular(400)に加えBold(700)も正規に登録する。
// Boldを登録せずに 'bold' を指定すると、Regularの字形を無理やり太らせた
// 疑似ボールドになり、特に漢字部分の線が潰れて見えてしまうため。
try {
  const regularPath = require.resolve('@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff2');
  const boldPath = require.resolve('@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff2');
  if (!GlobalFonts.has('Noto Sans JP')) {
    GlobalFonts.registerFromPath(regularPath, 'Noto Sans JP');
    GlobalFonts.registerFromPath(boldPath, 'Noto Sans JP');
  }
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

module.exports = { renderRankCard };
