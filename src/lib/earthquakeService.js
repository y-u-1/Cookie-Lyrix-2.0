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

module.exports = { fetchEarthquakeData, getScaleColor, getScaleText };