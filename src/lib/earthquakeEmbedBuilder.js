// src/lib/earthquakeEmbedBuilder.js
// 地震情報のEmbedを組み立てる共通処理。
// ライブ配信(earthquakeWatcher.js)とプレビュー(/earthquake test)の両方から使い、
// 表示内容が食い違わないようにする。
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { tGuild, getGuildLanguage } = require('./i18n');
const { getScaleText, getScaleColorInt, formatMagnitude, getTsunamiInfo } = require('./earthquakeService');
const { buildIntensityMapImage } = require('./earthquakeMap');
const logger = require('./logger');

const MAX_OBSERVATION_POINTS = 5;

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

/** 最大震度を観測した地点を上位N件抽出し、表示用の文字列にする */
function formatTopObservationPoints(points, maxScale, lang) {
  if (!points || points.length === 0) return null;

  const top = points
    .filter((p) => p.scale === maxScale && p.addr)
    .slice(0, MAX_OBSERVATION_POINTS);

  if (top.length === 0) return null;

  const names = top.map((p) => p.addr).join(lang === 'en' ? ', ' : '、');
  const suffix = points.filter((p) => p.scale === maxScale).length > top.length ? ' …' : '';
  return `${names}${suffix}`;
}

/**
 * P2P地震情報APIのデータ(code: 551)からEmbedとマップ添付ファイルを組み立てる。
 * @param {string} guildId
 * @param {object} data - P2P地震情報APIのイベントデータ
 * @param {boolean} isUpdate - 続報/訂正の場合はタイトルに表示する
 * @returns {Promise<{ embed: EmbedBuilder, mapAttachment: AttachmentBuilder|null }>}
 */
async function buildEarthquakeEmbed(guildId, data, isUpdate = false) {
  const lang = await getGuildLanguage(guildId);
  const maxScale = data.earthquake?.maxScale ?? -1;

  const title = await tGuild(guildId, 'earthquake.title');
  const scaleText = await tGuild(guildId, 'earthquake.scale');
  const magText = await tGuild(guildId, 'earthquake.magnitude');
  const depthText = await tGuild(guildId, 'earthquake.depth');
  const timeText = await tGuild(guildId, 'earthquake.time');
  const epicenterText = await tGuild(guildId, 'earthquake.epicenter');
  const pointsText = await tGuild(guildId, 'earthquake.points');
  const mapCredit = await tGuild(guildId, 'earthquake.map_credit');
  const unknownText = await tGuild(guildId, 'earthquake.unknown');
  const updatedLabel = isUpdate ? ` (${await tGuild(guildId, 'earthquake.updated')})` : '';

  const mapAttachment = buildMapAttachment(data);
  const time = data.earthquake?.time ? new Date(data.earthquake.time).toLocaleString('ja-JP') : '-';
  const magnitude = formatMagnitude(data.earthquake?.hypocenter?.magnitude);
  const depth = data.earthquake?.hypocenter?.depth || unknownText;
  const hypocenterName = data.earthquake?.hypocenter?.name || unknownText;

  const embed = new EmbedBuilder()
    .setColor(getScaleColorInt(maxScale))
    .setTitle(`${title} - ${scaleText} ${getScaleText(maxScale, lang)}${updatedLabel}`)
    .addFields(
      { name: epicenterText, value: hypocenterName, inline: true },
      { name: magText, value: magnitude ?? unknownText, inline: true },
      { name: depthText, value: `${depth}`, inline: true },
      { name: timeText, value: time, inline: true }
    );

  // 津波情報(該当する場合のみ、目立つよう先頭に近い位置へ追加)
  const tsunami = getTsunamiInfo(data.earthquake?.domesticTsunami, lang);
  if (tsunami.text) {
    const tsunamiLabel = await tGuild(guildId, 'earthquake.tsunami');
    embed.spliceFields(1, 0, {
      name: tsunami.alert ? `⚠️ ${tsunamiLabel}` : tsunamiLabel,
      value: tsunami.text,
      inline: true,
    });
  }

  // 最大震度の観測地点(上位数件)
  const topPoints = formatTopObservationPoints(data.points, maxScale, lang);
  if (topPoints) {
    embed.addFields({ name: pointsText, value: topPoints, inline: false });
  }

  embed.setFooter({ text: mapCredit }).setTimestamp();

  if (mapAttachment) embed.setImage(`attachment://${mapAttachment.name}`);

  return { embed, mapAttachment };
}

module.exports = { buildEarthquakeEmbed, buildMapAttachment };
