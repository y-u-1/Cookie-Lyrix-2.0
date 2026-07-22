// src/lib/embedUtils.js
// Discordの埋め込みフィールドは1つの値につき1024文字までという制限があり、
// 超過するとEmbedBuilder.addFields()がその場で例外を投げてコマンド全体が失敗する。
// ランキング表示など、行数が可変でコイン数なども大きくなり得る箇所で使う。

const MAX_FIELD_VALUE_LENGTH = 1024;

// 行の配列を改行で結合しつつ、1024文字を超える場合は安全に切り詰める。
function joinLinesSafely(lines, maxLength = MAX_FIELD_VALUE_LENGTH) {
  if (!lines || lines.length === 0) return null;

  let result = '';
  for (const line of lines) {
    const candidate = result ? `${result}\n${line}` : line;
    if (candidate.length > maxLength - 4) {
      // 末尾に "…" を付けて、それでも上限を超えないことを保証する
      return result ? `${result}\n…` : line.slice(0, maxLength - 1) + '…';
    }
    result = candidate;
  }
  return result;
}

module.exports = { joinLinesSafely, MAX_FIELD_VALUE_LENGTH };
