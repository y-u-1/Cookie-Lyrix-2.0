// src/lib/earthquakeService.js
const logger = require('./logger');

async function fetchEarthquakeData() {
  try {
    // 直近の地震情報を取得（最大10件）
    const response = await fetch('https://api.p2pquake.net/v2/jma/quake?limit=10');
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (err) {
    logger.error('Failed to fetch earthquake data:', err);
    return null;
  }
}

function getScaleColor(scale) {
  switch (scale) {
    case 10: return '#666666'; // 震度1
    case 20: return '#0099CC'; // 震度2
    case 30: return '#00CC00'; // 震度3
    case 40: return '#FFCC00'; // 震度4
    case 45: return '#FF9900'; // 震度5弱
    case 50: return '#FF0000'; // 震度5強
    case 55: return '#CC0000'; // 震度6弱
    case 60: return '#990000'; // 震度6強
    case 70: return '#660000'; // 震度7
    default: return '#FFFFFF';
  }
}

function getScaleText(scale, lang = 'ja') {
  if (lang === 'en') {
    switch (scale) {
      case 10: return '1';
      case 20: return '2';
      case 30: return '3';
      case 40: return '4';
      case 45: return 'Lower 5';
      case 50: return 'Upper 5';
      case 55: return 'Lower 6';
      case 60: return 'Upper 6';
      case 70: return '7';
      default: return 'Unknown';
    }
  }
  switch (scale) {
    case 10: return '1';
    case 20: return '2';
    case 30: return '3';
    case 40: return '4';
    case 45: return '5弱';
    case 50: return '5強';
    case 55: return '6弱';
    case 60: return '6強';
    case 70: return '7';
    default: return '不明';
  }
}

function getScaleColorInt(scale) {
  return parseInt(getScaleColor(scale).replace('#', ''), 16);
}

/** magnitudeが-1やnull/undefinedの場合(不明)を考慮してフォーマットする */
function formatMagnitude(magnitude) {
  if (magnitude === null || magnitude === undefined || magnitude === -1) return null;
  return `M${magnitude}`;
}

/**
 * P2P地震情報APIのearthquake.domesticTsunami値をローカライズされたテキストに変換する。
 * 値: None, Unknown, Checking, NonEffective, Watch, Warning, MajorWarning
 * @returns {{ text: string, alert: boolean }} alertはtrueの場合、注意喚起として強調表示すべき
 */
function getTsunamiInfo(domesticTsunami, lang = 'ja') {
  const table = {
    ja: {
      None: null, // 対象外の場合はフィールド自体を表示しない
      Unknown: '不明（現在確認中）',
      Checking: '調査中',
      NonEffective: '被害の心配なし',
      Watch: '津波注意報',
      Warning: '津波警報',
      MajorWarning: '大津波警報',
    },
    en: {
      None: null,
      Unknown: 'Unknown (checking)',
      Checking: 'Checking',
      NonEffective: 'No damage expected',
      Watch: 'Tsunami Advisory',
      Warning: 'Tsunami Warning',
      MajorWarning: 'Major Tsunami Warning',
    },
  };
  const dict = table[lang] ?? table.ja;
  if (domesticTsunami === undefined || domesticTsunami === null) return { text: null, alert: false };
  const text = Object.prototype.hasOwnProperty.call(dict, domesticTsunami) ? dict[domesticTsunami] : dict.Unknown;
  const alert = domesticTsunami === 'Watch' || domesticTsunami === 'Warning' || domesticTsunami === 'MajorWarning';
  return { text, alert };
}

/**
 * 緊急地震速報(EEW)の地域ごとの予測震度(scaleFrom〜scaleTo)を文字列にする。
 * scaleTo=99は「~程度以上」を意味する特殊値。
 */
function formatScaleRange(scaleFrom, scaleTo, lang = 'ja') {
  const overText = lang === 'en' ? ' or more' : '程度以上';
  const unknownText = lang === 'en' ? 'Unknown' : '不明';
  if (scaleFrom === -1 || scaleFrom === undefined) return unknownText;
  if (scaleTo === 99) return `${getScaleText(scaleFrom, lang)}${overText}`;
  if (scaleFrom === scaleTo) return getScaleText(scaleFrom, lang);
  return `${getScaleText(scaleFrom, lang)}\u2013${getScaleText(scaleTo, lang)}`;
}

module.exports = { fetchEarthquakeData, getScaleColor, getScaleColorInt, getScaleText, formatMagnitude, getTsunamiInfo, formatScaleRange };