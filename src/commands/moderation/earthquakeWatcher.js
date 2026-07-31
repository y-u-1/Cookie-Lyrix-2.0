// src/commands/moderation/earthquakeWatcher.js
// Luna Calyx 7.0を参考に、REST APIのポーリングから
// P2P地震情報のWebSocket(リアルタイム配信)に置き換えたもの。
//
// 2026-07-28 品質改善:
// - 同一地震(id)の続報/訂正が来た場合、新規メッセージを乱立させず既存メッセージを編集する
// - 津波情報・最大震度観測地点・震度に応じたEmbed色など、表示内容を強化(共通ビルダーに集約)
// - WebSocketの無応答を検知して自動再接続するping/pong監視(ウォッチドッグ)を追加
// 2026-07-29 品質改善:
// - 緊急地震速報(警報/EEW, code: 556)に対応。地震情報(551)と同様に
//   同一イベント(issue.eventId)の続報(serial更新)は既存メッセージを編集し、
//   取消(cancelled)が届いた場合もその旨に更新する。
const WebSocket = require('ws');
const { prisma } = require('../../lib/database');
const { buildEarthquakeEmbed, buildEEWEmbed } = require('../../lib/earthquakeEmbedBuilder');
const logger = require('../../lib/logger');

const WS_URL = 'wss://api.p2pquake.net/v2/ws';
const RECONNECT_DELAY_MS = 10 * 1000;
const MAX_RECONNECT_DELAY_MS = 5 * 60 * 1000; // 429などが連続した場合の上限(5分)
const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30秒ごとにpingを送る
const HEARTBEAT_TIMEOUT_MS = 45 * 1000;  // 45秒以内にpongが無ければ切断とみなす
const EVENT_CACHE_TTL_MS = 60 * 60 * 1000; // 続報を紐付けるための保持時間(1時間)

// 同一地震(data.id)ごとに、どのギルドのどのチャンネル/メッセージへ送信済みかを記録する。
// 続報(訂正)が来た際は新規送信ではなく、このメッセージを編集する。
// プロセス再起動で消えても実害は小さい(古いイベントの続報は稀なため)。
const sentMessages = new Map(); // eventId -> Map<guildId, { channelId, messageId }>
const eventTimestamps = new Map(); // eventId -> 最終更新時刻(古いエントリの掃除用)

function rememberSentMessage(eventId, guildId, channelId, messageId) {
  if (!sentMessages.has(eventId)) sentMessages.set(eventId, new Map());
  sentMessages.get(eventId).set(guildId, { channelId, messageId });
  eventTimestamps.set(eventId, Date.now());
}

function cleanupOldEvents() {
  const now = Date.now();
  for (const [eventId, ts] of eventTimestamps) {
    if (now - ts > EVENT_CACHE_TTL_MS) {
      eventTimestamps.delete(eventId);
      sentMessages.delete(eventId);
    }
  }
}

async function broadcast(client, data) {
  cleanupOldEvents();

  const maxScale = data.earthquake?.maxScale ?? -1;
  const eventId = data.id ?? null;
  const isCorrection = eventId ? sentMessages.has(eventId) : false;

  const guilds = await prisma.guildSettings.findMany({
    where: { earthquakeChannelId: { not: null } },
  });
  if (guilds.length === 0) return;

  for (const guild of guilds) {
    if (maxScale < guild.earthquakeMinScale) continue;

    const existing = isCorrection ? sentMessages.get(eventId)?.get(guild.guildId) : null;

    try {
      const { embed, mapAttachment } = await buildEarthquakeEmbed(guild.guildId, data, !!existing);

      if (existing) {
        // 続報/訂正: 既存メッセージを編集する(チャンネル再取得は失敗に備えcatch)
        const channel = await client.channels.fetch(existing.channelId).catch(() => null);
        const message = channel ? await channel.messages.fetch(existing.messageId).catch(() => null) : null;

        if (message) {
          await message
            .edit({ embeds: [embed], files: mapAttachment ? [mapAttachment] : [] })
            .catch(() => {});
          continue;
        }
        // 編集対象が見つからない場合(手動削除など)は新規送信にフォールバックする
      }

      const channel = await client.channels.fetch(guild.earthquakeChannelId).catch(() => null);
      if (!channel) continue;

      const sent = await channel
        .send({ embeds: [embed], files: mapAttachment ? [mapAttachment] : [] })
        .catch(() => null);

      if (sent && eventId) {
        rememberSentMessage(eventId, guild.guildId, channel.id, sent.id);
      }
    } catch (err) {
      logger.error(`地震情報の送信に失敗しました (guild: ${guild.guildId}):`, err);
    }
  }
}

async function broadcastEEW(client, data) {
  cleanupOldEvents();

  // areas[]の中から最も高い予測震度(scaleFrom)を探し、ギルドのしきい値判定に使う
  const areas = data.areas ?? [];
  let worstScaleFrom = -1;
  for (const a of areas) {
    if (typeof a.scaleFrom === 'number' && a.scaleFrom > worstScaleFrom) worstScaleFrom = a.scaleFrom;
  }

  // eventId(同一地震の識別子。serialが増える度に続報が来る)で追跡する。
  // dataの直下のidではなく issue.eventId を使う点が地震情報(551)と異なる。
  const eventId = data.issue?.eventId ?? null;
  const trackingKey = eventId ? `eew:${eventId}` : null;
  const isCorrection = trackingKey ? sentMessages.has(trackingKey) : false;

  const guilds = await prisma.guildSettings.findMany({
    where: { earthquakeChannelId: { not: null } },
  });
  if (guilds.length === 0) return;

  for (const guild of guilds) {
    // キャンセル済みイベントは、そもそも一度も送っていなければ何もしない(送信済みの場合のみ取消表示に更新する)
    const existing = isCorrection ? sentMessages.get(trackingKey)?.get(guild.guildId) : null;
    if (!data.cancelled && worstScaleFrom < guild.earthquakeMinScale && !existing) continue;

    try {
      const { embed, mapAttachment } = await buildEEWEmbed(guild.guildId, data, !!existing);

      if (existing) {
        const channel = await client.channels.fetch(existing.channelId).catch(() => null);
        const message = channel ? await channel.messages.fetch(existing.messageId).catch(() => null) : null;

        if (message) {
          await message
            .edit({ embeds: [embed], files: mapAttachment ? [mapAttachment] : [] })
            .catch(() => {});
          continue;
        }
      }

      const channel = await client.channels.fetch(guild.earthquakeChannelId).catch(() => null);
      if (!channel) continue;

      const sent = await channel
        .send({ embeds: [embed], files: mapAttachment ? [mapAttachment] : [] })
        .catch(() => null);

      if (sent && trackingKey) {
        rememberSentMessage(trackingKey, guild.guildId, channel.id, sent.id);
      }
    } catch (err) {
      logger.error(`緊急地震速報の送信に失敗しました (guild: ${guild.guildId}):`, err);
    }
  }
}

function startEarthquakeWatcher(client) {
  let ws;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let heartbeatTimeoutTimer = null;
  let reconnectAttempts = 0;

  // 指数バックオフ(10s, 20s, 40s, ... 最大5分)。
  // 429(レート制限)のような接続失敗が連続した際に、間隔を空けずに再接続を
  // 繰り返してサーバーへ負荷をかけ続けてしまわないようにする。
  function getReconnectDelay() {
    const delay = RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts);
    return Math.min(delay, MAX_RECONNECT_DELAY_MS);
  }

  function clearHeartbeatTimers() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (heartbeatTimeoutTimer) clearTimeout(heartbeatTimeoutTimer);
    heartbeatTimer = null;
    heartbeatTimeoutTimer = null;
  }

  // WebSocketが応答不能(無音のまま固まる)になっていないかを定期的に確認する。
  // p2pquakeは仕様上10分でサーバー側から切断されるが、それ以前にネットワーク的に
  // 無応答になるケースに備え、pingへの応答が無ければ強制的に再接続する。
  function startHeartbeat() {
    clearHeartbeatTimers();
    heartbeatTimer = setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      heartbeatTimeoutTimer = setTimeout(() => {
        logger.error('地震速報WebSocketが無応答のため再接続します');
        ws.terminate(); // 'close'イベントが発火し、再接続処理につながる
      }, HEARTBEAT_TIMEOUT_MS);

      ws.ping();
    }, HEARTBEAT_INTERVAL_MS);
  }

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.on('open', () => {
      logger.success('地震速報の受信を開始しました(WebSocket)');
      reconnectAttempts = 0; // 接続に成功したのでバックオフをリセットする
      startHeartbeat();
    });

    ws.on('pong', () => {
      if (heartbeatTimeoutTimer) clearTimeout(heartbeatTimeoutTimer);
    });

    ws.on('message', async (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.code === 551) await broadcast(client, data);      // 551: 地震情報
        else if (data.code === 556) await broadcastEEW(client, data); // 556: 緊急地震速報(警報)
      } catch (err) {
        logger.error('地震速報の処理エラー:', err);
      }
    });

    ws.on('close', () => {
      clearHeartbeatTimers();
      // p2pquakeのWebSocketエンドポイントは仕様上10分で強制切断されるため、
      // これは異常ではなく想定内の切断。自動的に再接続する。
      if (reconnectTimer) return;
      const delay = getReconnectDelay();
      reconnectAttempts += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    });

    ws.on('error', (err) => {
      logger.error('地震速報WebSocketエラー:', err.message ?? err);
    });
  }

  connect();
}

module.exports = { startEarthquakeWatcher, broadcast, broadcastEEW };
