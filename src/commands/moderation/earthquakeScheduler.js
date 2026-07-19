// src/commands/moderation/earthquakeScheduler.js
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { prisma } = require('../../lib/database');
const { fetchEarthquakeData, getScaleText } = require('../../lib/earthquakeService');
const { renderEarthquakeMap } = require('../../lib/canvasRenderer');
const { tGuild } = require('../../lib/i18n');
const logger = require('../../lib/logger');

const CHECK_INTERVAL_MS = 30 * 1000; // 30秒ごとにチェック
let lastEarthquakeId = null;

function startEarthquakeScheduler(client) {
  setInterval(async () => {
    try {
      const earthquakes = await fetchEarthquakeData();
      if (!earthquakes || earthquakes.length === 0) return;

      const latest = earthquakes[0];
      
      // 初回起動時はIDを記録するだけ
      if (!lastEarthquakeId) {
        lastEarthquakeId = latest.id;
        return;
      }

      // 前回と同じIDならスキップ
      if (latest.id === lastEarthquakeId) return;
      
      // 新しい地震情報を検知
      lastEarthquakeId = latest.id;

      // 震度4(40)以上の情報のみ通知
      //if (latest.earthquake.maxScale < 40) return;

      // 通知を有効にしているサーバーを取得
      const guilds = await prisma.guildSettings.findMany({
        where: { earthquakeChannelId: { not: null } }
      });

      if (guilds.length === 0) return;

      // 画像生成
      const imageBuffer = await renderEarthquakeMap(latest);
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'earthquake.png' });

      for (const guild of guilds) {
        if (latest.earthquake.maxScale < guild.earthquakeMinScale) continue;

        const channel = client.channels.cache.get(guild.earthquakeChannelId);
        if (!channel) continue;

        const title = await tGuild(guild.guildId, 'earthquake.title');
        const scaleText = await tGuild(guild.guildId, 'earthquake.scale');
        const magText = await tGuild(guild.guildId, 'earthquake.magnitude');
        const depthText = await tGuild(guild.guildId, 'earthquake.depth');
        const timeText = await tGuild(guild.guildId, 'earthquake.time');
        const epicenterText = await tGuild(guild.guildId, 'earthquake.epicenter');

        const time = new Date(latest.earthquake.time).toLocaleString('ja-JP');

        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle(`${title} - ${scaleText} ${getScaleText(latest.earthquake.maxScale)}`)
          .setImage('attachment://earthquake.png')
          .addFields(
            { name: epicenterText, value: latest.earthquake.hypocenter.name, inline: true },
            { name: magText, value: latest.earthquake.hypocenter.magnitude, inline: true },
            { name: depthText, value: latest.earthquake.hypocenter.depth, inline: true },
            { name: timeText, value: time, inline: true }
          )
          .setTimestamp();

        await channel.send({ embeds: [embed], files: [attachment] }).catch(() => {});
      }
    } catch (err) {
      logger.error('Earthquake scheduler error:', err);
    }
  }, CHECK_INTERVAL_MS);

  logger.success('Earthquake scheduler started.');
}

module.exports = { startEarthquakeScheduler };