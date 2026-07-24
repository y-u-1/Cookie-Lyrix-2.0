// src/commands/moderation/earthquakeWatcher.js
// Luna Calyx 7.0を参考に、REST APIのポーリングから
// P2P地震情報のWebSocket(リアルタイム配信)に置き換えたもの。
const WebSocket = require('ws');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');
const { getScaleText } = require('../../lib/earthquakeService');
const { buildIntensityMapImage } = require('../../lib/earthquakeMap');
const logger = require('../../lib/logger');

const WS_URL = 'wss://api.p2pquake.net/v2/ws';
const RECONNECT_DELAY_MS = 10 * 1000;

/** points/hypocenterから震度分布マップ画像(AttachmentBuilder)を作る。データ不足時はnull。 */
function buildMapAttachment(data) {
  try {
    const buf = buildIntensityMapImage({
      points: data.points,
      epicenter: data.earthquake?.hypocenter ?? null,
    });
    if (!buf) return null;
    return new AttachmentBuilder(buf, { name: 'earthquake-map.png' });
  } catch (err) {
    logger.error('震度分布マップの生成に失敗しました:', err);
    return null;
  }
}

async function broadcast(client, data) {
  const maxScale = data.earthquake?.maxScale ?? -1;

  const guilds = await prisma.guildSettings.findMany({
    where: { earthquakeChannelId: { not: null } },
  });
  if (guilds.length === 0) return;

  const mapAttachment = buildMapAttachment(data);
  const time = data.earthquake?.time ? new Date(data.earthquake.time).toLocaleString('ja-JP') : '-';

  for (const guild of guilds) {
    if (maxScale < guild.earthquakeMinScale) continue;

    const channel = await client.channels.fetch(guild.earthquakeChannelId).catch(() => null);
    if (!channel) continue;

    const title = await tGuild(guild.guildId, 'earthquake.title');
    const scaleText = await tGuild(guild.guildId, 'earthquake.scale');
    const magText = await tGuild(guild.guildId, 'earthquake.magnitude');
    const depthText = await tGuild(guild.guildId, 'earthquake.depth');
    const timeText = await tGuild(guild.guildId, 'earthquake.time');
    const epicenterText = await tGuild(guild.guildId, 'earthquake.epicenter');
    const mapCredit = await tGuild(guild.guildId, 'earthquake.map_credit');

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`${title} - ${scaleText} ${getScaleText(maxScale)}`)
      .addFields(
        { name: epicenterText, value: `${data.earthquake?.hypocenter?.name ?? '-'}`, inline: true },
        { name: magText, value: `${data.earthquake?.hypocenter?.magnitude ?? '-'}`, inline: true },
        { name: depthText, value: `${data.earthquake?.hypocenter?.depth ?? '-'}`, inline: true },
        { name: timeText, value: time, inline: true }
      )
      .setFooter({ text: mapCredit })
      .setTimestamp();

    if (mapAttachment) embed.setImage(`attachment://${mapAttachment.name}`);

    await channel
      .send({ embeds: [embed], files: mapAttachment ? [mapAttachment] : [] })
      .catch(() => {});
  }
}

function startEarthquakeWatcher(client) {
  let ws;
  let reconnectTimer = null;

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.on('open', () => logger.success('地震速報の受信を開始しました(WebSocket)'));

    ws.on('message', async (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.code === 551) await broadcast(client, data); // 551: 地震情報
      } catch (err) {
        logger.error('地震速報の処理エラー:', err);
      }
    });

    ws.on('close', () => {
      // p2pquakeのWebSocketエンドポイントは仕様上10分で強制切断されるため、
      // これは異常ではなく想定内の切断。自動的に再接続する。
      if (reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, RECONNECT_DELAY_MS);
    });

    ws.on('error', (err) => {
      logger.error('地震速報WebSocketエラー:', err.message ?? err);
    });
  }

  connect();
}

module.exports = { startEarthquakeWatcher };
