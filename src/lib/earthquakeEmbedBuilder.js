// src/lib/earthquakeEmbedBuilder.js
// 地震情報のEmbedを組み立てる共通処理。
// ライブ配信(earthquakeWatcher.js)とプレビュー(/earthquake test)の両方から使い、
// 表示内容が食い違わないようにする。
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { tGuild, getGuildLanguage } = require('./i18n');
const { getScaleText, getScaleColorInt, formatMagnitude, getTsunamiInfo, formatScaleRange } = require('./earthquakeService');
const { buildIntensityMapImage } = require('./earthquakeMap');
const logger = require('./logger');

const MAX_OBSERVATION_POINTS = 5;
const MAX_EEW_AREAS = 8;

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
      name: tsunami.alert ? `**${tsunamiLabel}**` : tsunamiLabel,
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

/**
 * 緊急地震速報(警報)(P2P地震情報APIのcode: 556)からEmbedを組み立てる。
 * 観測点データが無いため、震度分布マップの代わりに震源位置だけを示す簡易マップを使う。
 * @param {string} guildId
 * @param {object} data - EEWイベントデータ
 * @param {boolean} isUpdate - 同一イベントの続報(serial更新)の場合
 * @returns {Promise<{ embed: EmbedBuilder, mapAttachment: AttachmentBuilder|null }>}
 */
async function buildEEWEmbed(guildId, data, isUpdate = false) {
  const lang = await getGuildLanguage(guildId);
  const title = await tGuild(guildId, 'eew.title');
  const updatedLabel = isUpdate ? ` (${await tGuild(guildId, 'earthquake.updated')})` : '';
  const disclaimerText = await tGuild(guildId, 'eew.disclaimer');

  if (data.cancelled) {
    const cancelledLabel = await tGuild(guildId, 'eew.cancelled');
    const embed = new EmbedBuilder()
      .setColor(0x99AAB5)
      .setTitle(`${title}${updatedLabel} - ${cancelledLabel}`)
      .setFooter({ text: disclaimerText })
      .setTimestamp();
    return { embed, mapAttachment: null };
  }

  const unknownText = await tGuild(guildId, 'earthquake.unknown');
  const epicenterText = await tGuild(guildId, 'earthquake.epicenter');
  const magText = await tGuild(guildId, 'earthquake.magnitude');
  const originTimeText = await tGuild(guildId, 'eew.origin_time');
  const areasText = await tGuild(guildId, 'eew.areas_field');
  const maxScaleLabelText = await tGuild(guildId, 'eew.max_scale');

  const hypocenter = data.earthquake?.hypocenter;
  const magnitude = formatMagnitude(hypocenter?.magnitude);
  const hypocenterName = hypocenter?.name || unknownText;
  const originTime = data.earthquake?.originTime ? new Date(data.earthquake.originTime).toLocaleString('ja-JP') : '-';

  // areas[]の中から、予測震度が最も高い地域を探す(タイトル・色に使う代表値)
  const areas = data.areas ?? [];
  let worstScaleFrom = -1;
  let worstArea = null;
  for (const a of areas) {
    if (typeof a.scaleFrom === 'number' && a.scaleFrom > worstScaleFrom) {
      worstScaleFrom = a.scaleFrom;
      worstArea = a;
    }
  }
  const maxScaleLabel = worstArea ? formatScaleRange(worstArea.scaleFrom, worstArea.scaleTo, lang) : unknownText;

  const embed = new EmbedBuilder()
    .setColor(getScaleColorInt(worstScaleFrom))
    .setTitle(`${title} - ${maxScaleLabelText} ${maxScaleLabel}${updatedLabel}`)
    .addFields(
      { name: epicenterText, value: hypocenterName, inline: true },
      { name: magText, value: magnitude ?? unknownText, inline: true },
      { name: originTimeText, value: originTime, inline: true }
    );

  // 予測震度が高い順に地域を並べて表示
  const sortedAreas = [...areas]
    .sort((a, b) => (b.scaleFrom ?? -1) - (a.scaleFrom ?? -1))
    .slice(0, MAX_EEW_AREAS);

  if (sortedAreas.length > 0) {
    const lines = sortedAreas.map((a) => `${a.name}: ${formatScaleRange(a.scaleFrom, a.scaleTo, lang)}`);
    embed.addFields({ name: areasText, value: lines.join('\n'), inline: false });
  }

  // 観測点データが無いため、震源位置の目安として簡易マップを表示する(震度の色分けは行わない)
  let mapAttachment = null;
  if (hypocenter && hypocenter.latitude !== -200 && hypocenter.longitude !== -200) {
    try {
      const buf = buildIntensityMapImage({ points: [], epicenter: hypocenter });
      if (buf) mapAttachment = new AttachmentBuilder(buf, { name: 'eew-map.png' });
    } catch (err) {
      logger.error('EEWマップの生成に失敗しました:', err);
    }
  }
  if (mapAttachment) embed.setImage(`attachment://${mapAttachment.name}`);

  embed.setFooter({ text: disclaimerText }).setTimestamp();

  return { embed, mapAttachment };
}

module.exports = { buildEarthquakeEmbed, buildEEWEmbed, buildMapAttachment };
