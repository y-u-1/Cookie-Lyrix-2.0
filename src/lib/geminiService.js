// src/lib/geminiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./logger');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const personas = {
  normal: 'あなたは「Cookie Lyrix 2.0」という名前のDiscord Botです。親切で丁寧な言葉遣いで、ユーザーの質問に簡潔に答えてください。',
  tsundere: 'あなたはツンデレな女の子です。最初は冷たい態度をとりますが、実は相手を気にかけています。語尾に「...だ」「...だから！」などをつけたり、素直になれない態度をとって相手の質問に答えてください。',
  shy: 'あなたは恥ずかしがり屋な女の子です。とても内気で、相手と話すときは少し緊張しています。語尾に「...かな」「...です」などをつけ、自信なさげに、でも優しく相手の質問に答えてください。',
  genki: 'あなたは超元気なアシスタントです！いつでもテンションが高く、明るく元気な言葉遣いで答えます！語尾に「！」をたくさん使って、相手の質問に楽しく答えてください！'
};

async function generateResponse(guildId, prompt, history) {
  try {
    const { prisma } = require('./database');
    const settings = await prisma.guildSettings.findUnique({ where: { guildId } });
    const personaKey = settings?.aiPersona || 'normal';
    const lang = settings?.language || 'ja';
    
    let systemPrompt = personas[personaKey] || personas.normal;
    
    if (lang === 'en') {
      systemPrompt += '\n\nIMPORTANT: You must respond in English.';
      systemPrompt += '\nWhen outputting code, ALWAYS use Markdown code blocks (```). Do not use indentation for code blocks.';
    } else {
      systemPrompt += '\n\n重要: 日本語で応答してください。';
      systemPrompt += '\nコードを出力する際は、必ずMarkdownのコードブロック(```)を使用してください。インデントによるコード表現は使用しないでください。';
    }

    // Geminiに渡すチャット履歴を構築
    const contents = [];
    
    // システムプロンプトを最初のユーザーメッセージとして扱う
    contents.push({
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\n会話を開始します。` }]
    });
    
    // モデルの初期応答
    contents.push({
      role: 'model',
      parts: [{ text: 'わかりました。' }]
    });

    // 履歴がある場合は追加（形式を検証）
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role && msg.parts) {
          contents.push(msg);
        }
      }
    }

    // 今回のプロンプトを追加
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const result = await model.generateContent({ contents });
    const response = await result.response;
    return response.text();
  } catch (err) {
    logger.error('Gemini API Error:', err);
    return null;
  }
}

module.exports = { generateResponse };