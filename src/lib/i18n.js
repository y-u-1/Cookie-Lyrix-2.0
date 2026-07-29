// src/lib/i18n.js
const { prisma } = require('./database');

const messages = {
  ja: {
    // General
    ping_title: '通信状況',
    ping_desc: '現在のレイテンシ状況は以下の通りです。\n\n',
    ping_status: '> **ステータス:** {status}\n> **WebSocket Ping:** `{ws}ms`\n> **API応答速度:** `{api}ms`',
    status_good: '良好',
    status_warn: 'やや遅延',
    status_bad: '不良',
    
    lang_title: '言語設定',
    lang_changed_desc: '### 言語が変更されました\nこのサーバーの言語設定を **{lang}** に設定しました。',
    lang_name_ja: '日本語',
    lang_name_en: 'English',
    lang_err: '### エラー\n言語の変更に失敗しました。',
    help_title: 'Cookie Lyrix 2.0 - コマンド一覧',
    help_desc: '利用可能なコマンド一覧です。',
    
    // Permissions
    no_permission: '### アクセス拒否\nこのコマンドを使用する権限がありません。',
    role_required: '### エラー\nadd または remove を実行するにはロールを指定してください。',
    role_added: '### ロール追加\n{role} にこのカテゴリの使用権限を付与しました。',
    role_removed: '### ロール削除\n{role} からこのカテゴリの使用権限を剥奪しました。',
    no_roles_configured: '### 設定なし\nこのカテゴリに設定されているロールはありません。\n管理者権限を持つユーザー（またはデフォルトの権限）が使用できます。',
    roles_list: '### {key} のロール一覧',

    // Generic errors
    'error.invalid_user': '### エラー\n有効なユーザーを指定してください。',
    'error.interaction_generic': '処理中にエラーが発生しました。',
    'error.command_generic': 'コマンドの実行中にエラーが発生しました。',

    // Giveaway
    'giveaway.start.invalid_duration': '### 無効な時間指定\n形式は `10m`, `1h`, `1d` のように指定してください。',
    'giveaway.start.invalid_color': '### 無効なカラーコード\n`#RRGGBB` 形式で指定してください。',
    'giveaway.start.success': '### ギブアウェイ作成完了\nID: `{id}` で作成しました。',
    'giveaway.end.not_found': '### エラー\n指定されたIDのギブアウェイが見つかりませんでした。',
    'giveaway.end.already_ended': '### エラー\nこのギブアウェイはすでに終了しています。',
    'giveaway.end.success': '### ギブアウェイ終了\nギブアウェイを強制終了しました。',
    'giveaway.reroll.not_found': '### エラー\n指定されたIDのギブアウェイが見つかりませんでした。',
    'giveaway.reroll.not_ended': '### エラー\nまだ終了していないギブアウェイです。',
    'giveaway.reroll.no_entries': '### エラー\n参加者がいないため再抽選できません。',
    'giveaway.reroll.success': '### 再抽選完了\n当選者を再抽選しました。',
    'giveaway.list.empty': '### 確認結果\n現在進行中のギブアウェイはありません。',
    'giveaway.list.title': '進行中のギブアウェイ',
    'giveaway.roles_disabled': '### エラー\nGiveaway系コマンドは管理者専用のため、ロールへの権限委任は無効化されています。',
    'giveaway.enter.ended': '### 終了済み\nこのギブアウェイはすでに終了しています。',
    'giveaway.enter.rate_limit': '### スパム制限\n参加ボタンの連押は制限されています。少し時間をおいてから再度お試しください。',
    'giveaway.enter.account_too_new': '### アカウント年齢不足\n参加には {min_age} 日以上のアカウントが必要です。\nあなたのアカウント年齢: {account_age} 日',
    'giveaway.enter.missing_role': '### 権限不足\nこのギブアウェイに参加するには {role} が必要です。',
    'giveaway.leave.button': '参加を取り消す',
    'giveaway.enter.button': '参加する',
    'giveaway.enter.already_entered_with_leave': '### 参加済み\nすでにこのギブアウェイに参加しています。\n参加を取り消す場合は以下のボタンをクリックしてください。',
    'giveaway.enter.confirmed': '### 参加確定\n**{prize}** の抽選に参加しました！',
    'giveaway.leave.success': '### 参加を取り消しました\nこのギブアウェイへの参加を取り消しました。',
    'giveaway.participants.button': '参加者一覧',
    'giveaway.participants.title': '参加者一覧',
    'giveaway.weight.not_entered': '### エラー\nユーザー {user} はこのギブアウェイに参加していません。',
    'giveaway.template.invalid_duration': '### 無効な時間指定\n形式は `10m`, `1h`, `1d` のように指定してください。',
    'giveaway.template.saved': '### テンプレート保存完了\nテンプレート **{name}** を保存しました。',
    'giveaway.template.no_templates': '### 確認結果\n保存されているテンプレートはありません。',
    'giveaway.template.list_title': 'テンプレート一覧',
    'giveaway.template.not_found': '### エラー\n指定されたテンプレートが見つかりませんでした。',
    'giveaway.template.deleted': 'テンプレート削除完了\nテンプレート **{name}** を削除しました。',
    'giveaway.ended_title': 'ギブアウェイ終了',
    'giveaway.ended_winners': '当選者: {winners}',
    'giveaway.ended_no_winners': '当選者なし\n参加者がいなかったため、当選者はいません。',
    'giveaway.rerolled_title': '再抽選完了',
    'giveaway.rerolled_winners': '新しい当選者: {winners}',

    // Ticket
    'ticket.panel_created': '### チケットパネル作成\nチケットパネルをこのチャンネルに作成しました。',
    'ticket.panel_title': 'サポートチケット',
    'ticket.panel_desc': 'サポートが必要な場合は、以下のボタンをクリックしてチケットを作成してください。',
    'ticket.button_create': 'チケットを作成',
    'ticket.created_title': 'チケットを作成しました',
    'ticket.created_desc': 'スタッフが対応するまでお待ちください。\nボタンを押してチケットを閉じることができます。',
    'ticket.button_close': 'チケットを閉じる',
    'ticket.closed_title': 'チケットが閉じられました',
    'ticket.closed_desc': 'このチャンネルは10秒後に削除されます。',
    'ticket.already_open': '### エラー\nすでに開いているチケットがあります。\n先に既存のチケットを閉じてください。',
    'ticket.claimed': '### 対応開始\n{user} がこのチケットの対応を開始しました。',
    'ticket.created_channel': '### チケットを作成しました\n{channel} でスタッフと連絡を取ることができます。',
    'ticket.log_transcript': '### チケットログ\nチケットがクローズされました。\n会話履歴はテキストファイルとして添付されています。',

    // Verify
    'verify.panel_created': '### 認証パネル作成\n認証パネルをこのチャンネルに作成しました。',
    'verify.panel_title': '認証パネル',
    'verify.panel_desc': '以下のボタンをクリックして認証を行ってください。',
    'verify.button': '認証する',
    'verify.success': '### 認証成功\nようこそ！ {role} を付与しました。',
    'verify.already_verified': '### エラー\nすでに認証済みです。',
    'verify.blocked_guild': '### 認証失敗\n特定のサーバーに参加しているため、認証できません。',
    'verify.account_too_new': '### 認証失敗\nアカウント作成から {min_age} 日以上経過する必要があります。\nあなたのアカウント年齢: {account_age} 日',

    // Role Panel
    'role.panel_created': '### ロールパネル作成\nロールパネルをこのチャンネルに作成しました。',
    'role.panel_title': 'ロールパネル',
    'role.panel_desc': '以下のボタンをクリックしてロールを取得・解除できます。',
    'role.added': '### ロール付与\n{role} を付与しました。',
    'role.removed': '### ロール解除\n{role} を解除しました。',

    // Welcome / Leave
    'welcome.title': 'ようこそ！',
    'welcome.desc': '### {server} へようこそ！\n{user} さん、参加ありがとうございます。\nあなたは **{membercount}** 人目のメンバーです。\n\n> ルールを確認し、楽しんでください。',
    'leave.title': 'さようなら',
    'leave.desc': '### メンバーが退出しました\n**{username}** さんがサーバーを退出しました。\n現在のメンバー数: **{membercount}** 人',
    'welcome.setup_success': '### ウェルカムメッセージ設定\n参加メッセージの送信先チャンネルを {channel} に設定しました。',
    'leave.setup_success': '### 退出メッセージ設定\n退出メッセージの送信先チャンネルを {channel} に設定しました。',

    // Auto Role
    'autorole.setup_success': '### 自動ロール設定\n新規参加者に自動で {role} を付与するように設定しました。',
    'autorole.disabled': '### 自動ロール無効化\n自動ロール付与を無効化しました。',
    'autorole.error': '### エラー\nロールの設定に失敗しました。Botの権限が足りないか、ロールがBotより上にある可能性があります。',

    // Poll
    'poll.created': '### アンケート作成完了\nアンケートパネルをこのチャンネルに作成しました。',
    'poll.error.too_few_options': '### エラー\n選択肢は2つ以上指定してください。',
    'poll.error.too_many_options': '### エラー\n選択肢は5つまでです。',
    'poll.voted': '### 投票完了\n**{option}** に投票しました。',
    'poll.vote_removed': '### 投票取り消し\n投票を取り消しました。',
    'poll.hosted_by': '主催者',
    'poll.desc': '以下のボタンをクリックして投票してください。\nもう一度押すと投票を取り消せます。',

    // Moderation
    'mod.no_reason': '理由が指定されていません',
    'mod.warn_success': '### 警告完了\n{user} を警告しました。\n> 理由: {reason}',
    'mod.kick_success': '### キック完了\n{user} をキックしました。\n> 理由: {reason}',
    'mod.ban_success': '### BAN完了\n{user} をBANしました。\n> 理由: {reason}',
    'mod.dm_warn_title': '警告通知',
    'mod.dm_warn_desc': 'あなたは **{server}** で警告を受けました。\n> 理由: {reason}',
    'mod.dm_kick_title': 'キック通知',
    'mod.dm_kick_desc': 'あなたは **{server}** からキックされました。\n> 理由: {reason}',
    'mod.dm_ban_title': 'BAN通知',
    'mod.dm_ban_desc': 'あなたは **{server}** からBANされました。\n> 理由: {reason}',
    'mod.error_hierarchy': '### エラー\n対象ユーザーのロールが自分より上にあるため、処罰できません。',
    'mod.error_missing_perms': '### エラー\nBotに必要な権限（KickまたはBan）がありません。',
    'mod.log_title_warn': '警告ログ',
    'mod.log_title_kick': 'キックログ',
    'mod.log_title_ban': 'BANログ',
    'mod.log_user': '対象者',
    'mod.log_moderator': '執行者',
    'mod.log_reason': '理由',
    
    // Log Channel
    'log.setup_success': '### ログ設定完了\n{type} ログの送信先を {channel} に設定しました。',
    'log.setup_disabled': '### ログ無効化\n{type} ログの送信を無効化しました。',
    'log.type_moderation': 'モデレーション',
    'log.type_ticket': 'チケット',
    'log.type_member': 'メンバー',
    'log.type_message': 'メッセージ',
    'log.type_voice': 'ボイスチャンネル',
    'log.type_spam': 'スパム',
    'log.type_channel': 'チャンネル',
    'log.type_redeem': 'Redeem',

    // Leveling
    'level.rank_success': 'あなたのランクカード',
    'level.panel_created': '### リーダーボード作成\nこのチャンネルに5分ごとに更新されるリーダーボードを作成しました。',
    'level.panel_title': 'レベルランキング',
    'level.panel_desc': '5分ごとに自動更新されます。\n現在のサーバー上位30名のランキングです。',
    'level.levelup_title': 'レベルアップ！',
    'level.levelup_desc': 'おめでとうございます！ **{level}** レベルに到達しました！',
    'level.levelup_bonus': '> レベルアップボーナス: **{coins} コイン**',
    'level.no_xp': '### エラー\nまだXPを獲得していません。',
    'level.top_users': '上位30名',
    'level.no_data': 'データなし',
    'level.page': 'ページ {page}',
    'level.last_updated': '最終更新',
    'level.xp_name': 'XP',
    'level.rank_bulk_error': '### エラー\n全員のランクカードを一括で表示することはできません。',
    'level.addxp_success_all': '### XP付与完了\n全員に {amount} XP を付与しました。',
    'level.addxp_success_user': '### XP付与完了\n{user} に {amount} XP を付与しました。',
    'level.reset_success_all': '### リセット完了\n全員のレベルとXPをリセットしました。',
    'level.reset_success_user': '### リセット完了\n{user} のレベルとXPをリセットしました。',
    'level.levelup_role': '> 新しいロール: {roles}',

    // Level Roles (レベル到達ロール)
    'levelrole.set_success': '### 設定完了\nレベル **{level}** 到達時に {role} を付与するよう設定しました。',
    'levelrole.remove_success': '### 削除完了\nレベル **{level}** のロール設定を削除しました。',
    'levelrole.not_found': '### エラー\nレベル **{level}** のロール設定は見つかりませんでした。',
    'levelrole.list_title': 'レベル到達ロール一覧',
    'levelrole.list_empty': '設定されているレベルロールはありません。',
    'levelrole.error_position': '### エラー\nこのロールはBotの最高ロールより上に位置しているため付与できません。Botのロールを上に移動してください。',

    // NG Word
    'ngword.added': '### NGワード追加\n`{word}` をNGワードに追加しました。',
    'ngword.removed': '### NGワード削除\n`{word}` をNGワードから削除しました。',
    'ngword.list_title': '登録されているNGワード',
    'ngword.list_empty': '### 確認結果\n登録されているNGワードはありません。',
    'ngword.deleted_log': '### メッセージ自動削除\nNGワードが含まれていたため、メッセージを削除しました。',

    // Spam Filter
    'spam.deleted_log': '### スパム検知\n短時間での連投を検知したため、メッセージを削除しました。',
    'spam.warning': '### スパム警告\nメッセージの連投はお控えください。',
    'spam.set_success': '### スパムフィルター設定\nスパム判定の閾値を設定しました。\n> 連投回数: {threshold}回 / 期間: {window_sec}秒以内',

    // Channel Reset
    'channelreset.started': '### チャンネル初期化\nチャンネルの初期化を開始します。数秒以内に新しいチャンネルが作成されます。',
    'channelreset.error_perms': '### エラー\nBotにチャンネルの管理権限がありません。',
    'channelreset.log': '### チャンネル初期化ログ\n{user} が #{old_channel} を初期化しました。',

    // Earthquake
    'earthquake.setup_success': '### 地震通知設定\n地震情報の通知先を {channel} に設定しました。\n通知する最小震度: **震度 {min_scale}**',
    'earthquake.disabled': '### 地震通知無効化\n地震情報の通知を無効化しました。',
    'earthquake.title': '地震情報',
    'earthquake.scale': '最大震度',
    'earthquake.magnitude': 'マグニチュード',
    'earthquake.depth': '深さ',
    'earthquake.time': '発生時刻',
    'earthquake.epicenter': '震源地',
    'earthquake.points': '各地の震度',
    'earthquake.test_notice': '### これはテスト送信です\n実際の地震情報ではありません。マップの見た目を確認するためのサンプルです。',
    'earthquake.map_credit': '地図データ: 国土地理院 地球地図日本',
    'earthquake.unknown': '不明',
    'earthquake.updated': '続報',
    'earthquake.tsunami': '津波情報',

    // EEW (緊急地震速報)
    'eew.title': '緊急地震速報',
    'eew.max_scale': '最大予測震度',
    'eew.origin_time': '発生時刻',
    'eew.areas_field': '地域ごとの予測震度',
    'eew.cancelled': '取消',
    'eew.disclaimer': 'この情報は速報値であり、内容・品質は保証されません。正式な情報は気象庁の発表をご確認ください。',

    // Economy
    'economy.daily_success': '### デイリーボーナス受け取り\n2,500コインを受け取りました！\n現在の所持コイン: **{coins}**',
    'economy.daily_cooldown': '### エラー\nデイリーボーナスは1日1回のみ受け取れます。\n次回受け取りまで: <t:{timestamp}:R>',
    'economy.coins_self': '### 所持コイン\nあなたの所持コイン: **{coins}**',
    'economy.coins_check_bulk_error': '### エラー\n全員のコインを一括で確認することはできません。',
    'economy.coins_other': '### 所持コイン\n{user} の所持コイン: **{coins}**',
    'economy.coins_added': '### コイン付与\n{user} に {amount} コインを付与しました。',
    'economy.coins_removed': '### コイン剥奪\n{user} から {amount} コインを剥奪しました。',
    'economy.coins_added_all': '### コイン付与\n全員に {amount} コインを付与しました。',
    'economy.coins_removed_all': '### コイン剥奪\n全員から {amount} コインを剥奪しました。',
    'economy.coins_cleared': '### コイン全削除\n{user} のコインを0にしました。',
    'economy.coins_cleared_all': '### コイン全削除\n全員のコインを0にしました。',
    'economy.coin_panel_created': '### コインリーダーボード作成\nこのチャンネルに5分ごとに更新されるコインランキングを作成しました。',
    'economy.coin_panel_title': 'コインランキング',
    'economy.coin_leaderboard_title': 'コインランキング',
    'economy.coin_panel_desc': '5分ごとに自動更新されます。\n現在のサーバー上位30名のコインランキングです。',
    'economy.coin_name': 'コイン',
    
    // Gamble
    'gamble.invalid_amount': '### エラー\n掛け金は100コイン以上で指定してください。',
    'gamble.insufficient_funds': '### エラー\nコインが不足しています。',
    'gamble.result_75_loss': '### ギャンブル結果 (大敗)\n{amount} コイン失いました (-75%)',
    'gamble.result_25_loss': '### ギャンブル結果 (小敗)\n{amount} コイン失いました (-25%)',
    'gamble.result_50_gain': '### ギャンブル結果 (小勝)\n{amount} コイン獲得しました (+50%)',
    'gamble.result_100_gain': '### ギャンブル結果 (大勝)\n{amount} コイン獲得しました (+100%)',
    'gamble.bet_footer': '掛け金: {amount} コイン',

    // Shop
    'shop.listed': '### 出品完了\n**{name}** を {price} コインで出品しました。',
    'shop.purchased': '### 購入完了\n**{name}** を {price} コインで購入しました。',
    'shop.insufficient_funds': '### エラー\nコインが不足しています。',
    'shop.no_listings': '### 確認結果\n現在出品されている商品はありません。',
    'shop.not_found': '### エラー\n商品が見つからないか、在庫切れです。',
    'shop.list_title': '出品一覧',
    'shop.price_stock_line': '価格: {price} コイン | 在庫: {quantity}',
    'shop.out_of_stock': '### 在庫切れ\n商品の在庫がありません。',

    // Antiraid
    'antiraid.enabled': '### 荒らし対策有効化\n荒らし対策を有効にしました。',
    'antiraid.disabled': '### 荒らし対策無効化\n荒らし対策を無効にしました。',
    'antiraid.alert': '### 荒らし検知\n短時間に多数のメンバーが参加したため、{action} を実行しました。',

    // Message
    'message.sent': '### メッセージ送信完了\nメッセージを送信しました。',
    'message.error': '### エラー\nメッセージの送信に失敗しました。',
    'message.invalid_color': '### エラー\n無効なカラーコードです。',

    // Games
    'games.minesweeper_title': 'マインスイーパー',
    'games.minesweeper_desc': '以下のグリッドをクリックして遊んでください。（実態はテキスト表示）',
    'games.janken_win': '### 結果\nあなた: {player} / Bot: {bot}\n**あなたの勝ちです！**',
    'games.janken_lose': '### 結果\nあなた: {player} / Bot: {bot}\n**あなたの負けです。**',
    'games.janken_draw': '### 結果\nあなた: {player} / Bot: {bot}\n**あいこです。**',
    'games.janken_rock': 'グー',
    'games.janken_scissors': 'チョキ',
    'games.janken_paper': 'パー',
    'games.dice_title': '### サイコロ\n{user}は{sides}面ダイスを振って **{result}** が出ました！',
    'games.dice_need_both': '### エラー\n`guess`(予想)と`bet`(掛け金)は必ず両方指定してください。',
    'games.dice_guess_out_of_range': '### エラー\n予想は1〜{sides}の範囲で指定してください。',
    'games.dice_win': '**的中！**\n**+{amount} コイン**を獲得しました！',
    'games.dice_lose': '**外れ**\n**-{amount} コイン**を失いました。',
    'games.slot_title': 'スロット',
    'games.slot_insufficient_funds': '### エラー\n所持コインが足りません。',
    'games.slot_jackpot': '### 大当たり！\n{symbols}\n掛け金の**{multiplier}倍**、**{amount}コイン**を獲得しました！',
    'games.slot_win': '### 当たり！\n{symbols}\n掛け金の**{multiplier}倍**、**{amount}コイン**を獲得しました！',
    'games.slot_lose': '### はずれ\n{symbols}\n**{amount}コイン**を失いました。',
    'minesweeper.win': '### クリア！\n{player} がマインスイーパーをクリアしました！\n**+{reward} コイン**を獲得しました。',
    'minesweeper.lose': '### 爆発！\n{player} は地雷を踏んでしまいました。{lossLine}',
    'minesweeper.lose_line': '\n**-{amount} コイン**を失いました。',
    'minesweeper.playing': '{player} のマインスイーパー\n残り: **{remaining} マス**{betLine}',
    'minesweeper.bet_line': '\n掛け金: **{amount} コイン**',
    'minesweeper.expired': '### エラー\nこのゲームは終了しているか、見つかりません。',
    'minesweeper.not_your_game': '### エラー\nこれはあなたのゲームではありません。',

    // Redeem Code
    'code.generated': '### ギフトコード生成\nコード: `{code}`\n報酬: {coins} コイン',
    'code.generated_detail': '> 有効人数: **{total}**\n> 1人当たり: **{user}**',
    'code.unlimited': '無制限',
    'code.no_rewards': '### エラー\n少なくとも1つの報酬（コイン、ロール、XP、DMなど）を指定してください。',
    'code.edited': '### ギフトコード編集\nコード: `{code}` の設定を更新しました。',
    'code.deleted': '### ギフトコード削除\nコード: `{code}` を削除しました。',
    'code.not_found': '### エラー\nコードが見つからないか、すでに使用されています。',
    'code.already_used': '### エラー\nこのコードはすでに使用されています。',
    'code.redeemed': '### コード交換完了\n以下の報酬を受け取りました！\n{rewards}',
    'code.invalid_uses': '### エラー\n使用可能回数は1以上の数字、または `x` を指定してください。',
    'code.no_edit_target': '### エラー\n編集する項目（メッセージまたは使用回数）を指定してください。',
    'code.faster_ended': '### 終了\nこの先着コードは定員に達したため、終了しました。',
    'code.user_limit_reached': '### エラー\n1人当たりの使用上限({max})に達したため、このコードは使用できません。',
    'code.redeem_error': '### エラー\nコードの引き換え中にエラーが発生しました。',
    'code.list_title': '有効なギフトコード一覧',
    'code.list_empty': '有効なコードはありません。',
    'code.rewards_label': '報酬',
    'code.uses_label': '使用回数',
    'code.reward_role': 'ロール',
    'code.reward_dm': 'DM',

    // Redeem Panel
    'redeem.panel_title': 'ギフトコード引き換え',
    'redeem.panel_desc': '以下の緑色のボタンをクリックして、コードを入力してください。\nコードは `XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX` の形式です。',
    'redeem.button_label': 'コードを引き換える',
    'redeem.modal_title': 'ギフトコード入力',
    'redeem.modal_label': 'ギフトコード',
    'redeem.modal_placeholder': 'XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX',
    'redeem.dm_title': 'ギフトコード報酬',
    'redeem.dm_sent': 'DM送信',
    'redeem.dm_failed': 'DM送信失敗',
    'redeem.no_rewards': 'なし',

    // Temp VC
    'tempvc.setup_success': '### Temp VC設定\n作成用チャンネル: {channel}\nカテゴリ: {category}\nに設定しました。',
    'tempvc.disabled': '### Temp VC無効化\nTemp VC機能を無効化しました。',
    'tempvc.channel_name': '{user} のVC',

    // Starboard
    'starboard.setup_success': '### スターボード設定\n送信先チャンネル: {channel}\n必要スター数: {threshold}\nに設定しました。',
    'starboard.disabled': '### スターボード無効化\nスターボード機能を無効化しました。',
    'starboard.title': 'スターボード',
    'starboard.footer': '{stars} つ星 - {channel}',

    // Affinity
    'affinity.hug': '{user} は {target} をハグした！\n親密度が {points} 上昇しました！ (現在: {total})',
    'affinity.pat': '{user} は {target} の頭をなでなでした！\n親密度が {points} 上昇しました！ (現在: {total})',
    'affinity.self': '### エラー\n自分自身には実行できません。',
    'affinity.leaderboard_title': '親密度ランキング',
    'affinity.no_data': '### 確認結果\nまだ親密度のデータがありません。',
    'affinity.panel_created': '### 親密度リーダーボード作成\nこのチャンネルに5分ごとに更新される親密度ランキングを作成しました。',
    'affinity.panel_title': '親密度ランキング',
    'affinity.panel_desc': '5分ごとに自動更新されます。\n現在のサーバー上位30組のカップルランキングです。',
    'affinity.top_pairs': '上位30組',
    'affinity.points_name': 'ポイント',
    'affinity.pair_line': '**{rank}.** <@{user1}> と <@{user2}> - **{points} ポイント**',

    // AI
    'ai.persona_set': '### AI性格設定\nAIの性格を **{persona}** に変更しました。',
    'ai.persona_invalid': '### エラー\n無効な性格です。',
    'ai.thinking': '考え中...',
    'ai.error': '### エラー\nAIの応答生成に失敗しました。APIキーが設定されているか確認してください。',
    
    // Role Panel (追加インタラクション用)
    'role_panel.no_permission': '### エラー\n権限がありません。',
    'role_panel.modal_title': 'ロール追加設定',
    'role_panel.field_role_id': 'ロールID',
    'role_panel.field_label': 'ボタンのラベル',
    'role_panel.not_found': '### エラー\nパネルが見つかりません。',
    'role_panel.item_added': '### ロール追加完了\nパネルにロールを追加しました。',
    'role_panel.add_button_label': 'ロールを追加',
    'role_panel.item_not_found': '### エラー\nロールが見つかりません。',
    'role_panel.role_field': 'ロール',
    'role_panel.grant_button_label': '{role} を付与',

    // Verify (追加インタラクション用)
    'verify.panel_not_found': '### エラー\nパネルが見つかりません。',
    'verify.role_add_failed': '### エラー\nロールの付与に失敗しました。Botの権限を確認してください。',

    // Ticket (追加インタラクション用)
    'ticket.create_error': '### エラー\nチケットの作成中にエラーが発生しました。',
    'ticket.channel_not_ticket': '### エラー\nこのチャンネルはチケットではありません。',
    'ticket.log_title_created': 'チケット作成',
    'ticket.log_title_closed': 'チケット閉鎖',

    // Poll (追加インタラクション用)
    'poll.ended': '### エラー\nこのアンケートは終了しています。',

    // Mod (追加)
    'mod.action_failed': '### エラー\n処罰の実行に失敗しました。',

    // Shop (追加)
    'shop.footer_wait': '商品が購入されるのをお待ちください',
    'shop.listed_detail': '> ID: `{id}`\n> 在庫: {quantity}',
    'shop.seller_notification': '### 商品が購入されました\nあなたの商品 **{name}** が {buyer} によって {price} コインで購入されました。',
    'shop.deleted': '### 削除完了\n**{name}** の出品を削除しました。',
    'shop.delete_no_permission': '### エラー\n出品者本人、またはサーバー管理権限を持つユーザーのみ削除できます。',

    // Antiraid (追加)
    'antiraid.enabled_detail': '> 閾値: {threshold}人 / {windowSec}秒',

    // ログイベント埋め込みタイトル
    'log.title_channel_create': 'チャンネル作成',
    'log.title_channel_delete': 'チャンネル削除',
    'log.title_member_join': 'メンバー参加',
    'log.title_member_leave': 'メンバー退出',
    'log.title_role_added': 'ロール付与',
    'log.title_role_removed': 'ロール剥奪',
    'log.title_nickname_changed': 'ニックネーム変更',
    'log.title_avatar_changed': 'アバター変更',
    'log.title_message_send': 'メッセージ送信',
    'log.title_message_delete': 'メッセージ削除',
    'log.title_message_edit': 'メッセージ編集',
    'log.title_voice_join': 'VC参加',
    'log.title_voice_leave': 'VC退出',
    'log.title_voice_move': 'VC移動'
  },
  en: {
    // General
    ping_title: 'Connection Status',
    ping_desc: 'Current latency status is as follows.\n\n',
    ping_status: '> **Status:** {status}\n> **WebSocket Ping:** `{ws}ms`\n> **API Latency:** `{api}ms`',
    status_good: 'Excellent',
    status_warn: 'Slight Delay',
    status_bad: 'Poor',
    
    lang_title: 'Language Setting',
    lang_changed_desc: '### Language Changed\nThe language setting for this server has been set to **{lang}**.',
    lang_name_ja: 'Japanese',
    lang_name_en: 'English',
    lang_err: '### Error\nFailed to change language.',
    help_title: 'Cookie Lyrix 2.0 - Commands',
    help_desc: 'Available commands list.',

    // Permissions
    no_permission: '### Access Denied\nYou do not have permission to use this command.',
    role_required: '### Error\nA role is required for add/remove.',
    role_added: '### Role Added\n{role} can now use this category.',
    role_removed: '### Role Removed\n{role} was removed from this category.',
    no_roles_configured: '### No Roles Configured\nThere are no roles configured for this category.\nUsers with Administrator (or default Discord permissions) can use it.',
    roles_list: '### Roles for {key}',

    // Generic errors
    'error.invalid_user': '### Error\nPlease specify a valid user.',
    'error.interaction_generic': 'An error occurred while processing this action.',
    'error.command_generic': 'An error occurred while executing the command.',

    // Giveaway
    'giveaway.start.invalid_duration': '### Invalid Duration\nPlease specify the format like `10m`, `1h`, `1d`.',
    'giveaway.start.invalid_color': '### Invalid Color\nPlease specify in `#RRGGBB` format.',
    'giveaway.start.success': '### Giveaway Created\nCreated with ID: `{id}`.',
    'giveaway.end.not_found': '### Error\nGiveaway with the specified ID was not found.',
    'giveaway.end.already_ended': '### Error\nThis giveaway has already ended.',
    'giveaway.end.success': '### Giveaway Ended\nThe giveaway was force-ended.',
    'giveaway.reroll.not_found': '### Error\nGiveaway with the specified ID was not found.',
    'giveaway.reroll.not_ended': '### Error\nThis giveaway has not ended yet.',
    'giveaway.reroll.no_entries': '### Error\nCannot reroll because there are no entries.',
    'giveaway.reroll.success': '### Reroll Complete\nWinners have been rerolled.',
    'giveaway.list.empty': '### Result\nThere are no active giveaways.',
    'giveaway.list.title': 'Active Giveaways',
    'giveaway.roles_disabled': '### Error\nGiveaway commands are administrator-only, so role delegation has been disabled.',
    'giveaway.enter.ended': '### Ended\nThis giveaway has already ended.',
    'giveaway.enter.rate_limit': '### Rate Limited\nYou are clicking the button too fast. Please try again later.',
    'giveaway.enter.account_too_new': '### Account Age Insufficient\nYou need an account that is at least {min_age} days old to enter.\nYour account age: {account_age} days',
    'giveaway.enter.missing_role': '### Missing Requirement\nYou need the {role} role to enter this giveaway.',
    'giveaway.leave.button': 'Leave Giveaway',
    'giveaway.enter.button': 'Enter',
    'giveaway.enter.already_entered_with_leave': '### Already Entered\nYou are already entered in this giveaway.\nClick the button below if you want to leave.',
    'giveaway.enter.confirmed': '### Entry Confirmed\nYou have entered the giveaway for **{prize}**!',
    'giveaway.leave.success': '### Left Giveaway\nYou have left this giveaway.',
    'giveaway.participants.button': 'Participants',
    'giveaway.participants.title': 'Participants',
    'giveaway.weight.not_entered': '### Error\nUser {user} is not entered in this giveaway.',
    'giveaway.template.invalid_duration': '### Invalid Duration\nPlease specify the format like `10m`, `1h`, `1d`.',
    'giveaway.template.saved': '### Template Saved\nTemplate **{name}** has been saved.',
    'giveaway.template.no_templates': '### Result\nThere are no saved templates.',
    'giveaway.template.list_title': 'Template List',
    'giveaway.template.not_found': '### Error\nThe specified template was not found.',
    'giveaway.template.deleted': 'Template Deleted\nTemplate **{name}** has been deleted.',
    'giveaway.ended_title': 'Giveaway Ended',
    'giveaway.ended_winners': 'Winners: {winners}',
    'giveaway.ended_no_winners': 'No Winners\nNo one entered this giveaway.',
    'giveaway.rerolled_title': 'Giveaway Rerolled',
    'giveaway.rerolled_winners': 'New Winners: {winners}',

    // Ticket
    'ticket.panel_created': '### Ticket Panel Created\nA ticket panel has been created in this channel.',
    'ticket.panel_title': 'Support Ticket',
    'ticket.panel_desc': 'If you need support, please click the button below to create a ticket.',
    'ticket.button_create': 'Create Ticket',
    'ticket.created_title': 'Ticket Created',
    'ticket.created_desc': 'Please wait until a staff member responds.\nYou can close the ticket by clicking the button.',
    'ticket.button_close': 'Close Ticket',
    'ticket.closed_title': 'Ticket Closed',
    'ticket.closed_desc': 'This channel will be deleted in 10 seconds.',
    'ticket.already_open': '### Error\nYou already have an open ticket.\nPlease close the existing ticket first.',
    'ticket.claimed': '### Claimed\n{user} has claimed this ticket.',
    'ticket.created_channel': '### Ticket Created\nYou can communicate with staff in {channel}.',
    'ticket.log_transcript': '### Ticket Log\nThe ticket has been closed.\nThe conversation history is attached as a text file.',

    // Verify
    'verify.panel_created': '### Verify Panel Created\nA verify panel has been created in this channel.',
    'verify.panel_title': 'Verification Panel',
    'verify.panel_desc': 'Please click the button below to verify.',
    'verify.button': 'Verify',
    'verify.success': '### Verification Successful\nWelcome! You have been given the {role} role.',
    'verify.already_verified': '### Error\nYou are already verified.',
    'verify.blocked_guild': '### Verification Failed\nYou cannot verify because you are in a specific server.',
    'verify.account_too_new': '### Verification Failed\nYour account must be at least {min_age} days old.\nYour account age: {account_age} days',

    // Role Panel
    'role.panel_created': '### Role Panel Created\nA role panel has been created in this channel.',
    'role.panel_title': 'Role Panel',
    'role.panel_desc': 'Click the buttons below to get or remove roles.',
    'role.added': '### Role Added\nYou have been given the {role} role.',
    'role.removed': '### Role Removed\nThe {role} role has been removed.',

    // Welcome / Leave
    'welcome.title': 'Welcome!',
    'welcome.desc': '### Welcome to {server}!\nThank you for joining, {user}.\nYou are our **{membercount}** member.\n\n> Please check the rules and enjoy your stay.',
    'leave.title': 'Goodbye',
    'leave.desc': '### Member Left\n**{username}** has left the server.\nCurrent member count: **{membercount}**',
    'welcome.setup_success': '### Welcome Message Setup\nThe welcome message channel has been set to {channel}.',
    'leave.setup_success': '### Leave Message Setup\nThe leave message channel has been set to {channel}.',

    // Auto Role
    'autorole.setup_success': '### Auto Role Setup\nNew members will now automatically receive the {role} role.',
    'autorole.disabled': '### Auto Role Disabled\nAuto role assignment has been disabled.',
    'autorole.error': '### Error\nFailed to set the role. The bot may lack permissions, or the role is above the bot.',

    // Poll
    'poll.created': '### Poll Created\nA poll panel has been created in this channel.',
    'poll.error.too_few_options': '### Error\nPlease provide at least 2 options.',
    'poll.error.too_many_options': '### Error\nPlease provide no more than 5 options.',
    'poll.voted': '### Vote Confirmed\nYou voted for **{option}**.',
    'poll.vote_removed': '### Vote Removed\nYour vote has been removed.',
    'poll.hosted_by': 'Hosted by',
    'poll.desc': 'Click the buttons below to vote.\nClick again to remove your vote.',

    // Moderation
    'mod.no_reason': 'No reason provided',
    'mod.warn_success': '### Warn Successful\nWarned {user}.\n> Reason: {reason}',
    'mod.kick_success': '### Kick Successful\nKicked {user}.\n> Reason: {reason}',
    'mod.ban_success': '### Ban Successful\nBanned {user}.\n> Reason: {reason}',
    'mod.dm_warn_title': 'Warning Notification',
    'mod.dm_warn_desc': 'You have been warned in **{server}**.\n> Reason: {reason}',
    'mod.dm_kick_title': 'Kick Notification',
    'mod.dm_kick_desc': 'You have been kicked from **{server}**.\n> Reason: {reason}',
    'mod.dm_ban_title': 'Ban Notification',
    'mod.dm_ban_desc': 'You have been banned from **{server}**.\n> Reason: {reason}',
    'mod.error_hierarchy': '### Error\nCannot punish this user because their role is higher than yours or the bot\'s.',
    'mod.error_missing_perms': '### Error\nThe bot is missing required permissions (Kick or Ban).',
    'mod.log_title_warn': 'Warn Log',
    'mod.log_title_kick': 'Kick Log',
    'mod.log_title_ban': 'Ban Log',
    'mod.log_user': 'User',
    'mod.log_moderator': 'Moderator',
    'mod.log_reason': 'Reason',
    
    // Log Channel
    'log.setup_success': '### Log Setup\nThe {type} log channel has been set to {channel}.',
    'log.setup_disabled': '### Log Disabled\nThe {type} log has been disabled.',
    'log.type_moderation': 'Moderation',
    'log.type_ticket': 'Ticket',
    'log.type_member': 'Member',
    'log.type_message': 'Message',
    'log.type_voice': 'Voice Channel',
    'log.type_spam': 'Spam',
    'log.type_channel': 'Channel',
    'log.type_redeem': 'Redeem',

    // Leveling
    'level.rank_success': 'Your Rank Card',
    'level.panel_created': '### Leaderboard Created\nA leaderboard that updates every 5 minutes has been created in this channel.',
    'level.panel_title': 'Level Leaderboard',
    'level.panel_desc': 'Updates automatically every 5 minutes.\nTop 30 users in this server.',
    'level.levelup_title': 'Level Up!',
    'level.levelup_desc': 'Congratulations! You have reached level **{level}**!',
    'level.levelup_bonus': '> Level Up Bonus: **{coins} coins**',
    'level.no_xp': '### Error\nYou have not earned any XP yet.',
    'level.top_users': 'Top 30',
    'level.no_data': 'No data',
    'level.page': 'Page {page}',
    'level.last_updated': 'Last updated',
    'level.xp_name': 'XP',
    'level.rank_bulk_error': '### Error\nYou cannot bulk-display rank cards for all members.',
    'level.addxp_success_all': '### XP Granted\nGranted {amount} XP to everyone.',
    'level.addxp_success_user': '### XP Granted\nGranted {amount} XP to {user}.',
    'level.reset_success_all': '### Reset Complete\nReset level and XP for everyone.',
    'level.reset_success_user': '### Reset Complete\nReset level and XP for {user}.',
    'level.levelup_role': '> New role: {roles}',

    // Level Roles
    'levelrole.set_success': '### Configured\nWill grant {role} upon reaching level **{level}**.',
    'levelrole.remove_success': '### Removed\nRemoved the role setting for level **{level}**.',
    'levelrole.not_found': '### Error\nNo role setting found for level **{level}**.',
    'levelrole.list_title': 'Level Role Rewards',
    'levelrole.list_empty': 'No level roles configured.',
    'levelrole.error_position': '### Error\nThis role is positioned above the bot\'s highest role and cannot be granted. Please move the bot\'s role higher.',

    // NG Word
    'ngword.added': '### NG Word Added\nAdded `{word}` to the NG word list.',
    'ngword.removed': '### NG Word Removed\nRemoved `{word}` from the NG word list.',
    'ngword.list_title': 'Registered NG Words',
    'ngword.list_empty': '### Result\nThere are no registered NG words.',
    'ngword.deleted_log': '### Message Auto-Deleted\nThe message was deleted because it contained an NG word.',

    // Spam Filter
    'spam.deleted_log': '### Spam Detected\nThe message was deleted because it was posted in a short period of time.',
    'spam.warning': '### Spam Warning\nPlease refrain from posting messages in rapid succession.',
    'spam.set_success': '### Spam Filter Setup\nSpam threshold has been set.\n> Threshold: {threshold} times / Window: {window_sec} sec',

    // Channel Reset
    'channelreset.started': '### Channel Reset\nChannel reset has started. A new channel will be created in a few seconds.',
    'channelreset.error_perms': '### Error\nThe bot does not have channel management permissions.',
    'channelreset.log': '### Channel Reset Log\n{user} reset #{old_channel}.',

    // Earthquake
    'earthquake.setup_success': '### Earthquake Notification Setup\nThe earthquake notification channel has been set to {channel}.\nMinimum scale to notify: **Scale {min_scale}**',
    'earthquake.disabled': '### Earthquake Notification Disabled\nEarthquake notifications have been disabled.',
    'earthquake.title': 'Earthquake Information',
    'earthquake.scale': 'Max Scale',
    'earthquake.magnitude': 'Magnitude',
    'earthquake.depth': 'Depth',
    'earthquake.time': 'Time',
    'earthquake.epicenter': 'Epicenter',
    'earthquake.points': 'Points by Scale',
    'earthquake.test_notice': '### This is a test\nThis is not a real earthquake. It is a sample used to preview the map appearance.',
    'earthquake.map_credit': 'Map data: GSI Japan / Global Map Japan',
    'earthquake.unknown': 'Unknown',
    'earthquake.updated': 'Update',
    'earthquake.tsunami': 'Tsunami Info',

    // EEW (Earthquake Early Warning)
    'eew.title': 'Earthquake Early Warning',
    'eew.max_scale': 'Max Predicted Intensity',
    'eew.origin_time': 'Origin Time',
    'eew.areas_field': 'Predicted Intensity by Area',
    'eew.cancelled': 'Cancelled',
    'eew.disclaimer': 'This is a preliminary estimate; content and quality are not guaranteed. Check the JMA for official information.',

    // Economy
    'economy.daily_success': '### Daily Bonus Claimed\nYou received 2,500 coins!\nCurrent coins: **{coins}**',
    'economy.daily_cooldown': '### Error\nYou can only claim the daily bonus once per day.\nNext claim: <t:{timestamp}:R>',
    'economy.coins_self': '### Your Coins\nYou have **{coins}** coins.',
    'economy.coins_check_bulk_error': '### Error\nYou cannot bulk-check coins for all members.',
    'economy.coins_other': '### User Coins\n{user} has **{coins}** coins.',
    'economy.coins_added': '### Coins Added\nAdded {amount} coins to {user}.',
    'economy.coins_removed': '### Coins Removed\nRemoved {amount} coins from {user}.',
    'economy.coins_added_all': '### Coins Added\nAdded {amount} coins to all users.',
    'economy.coins_removed_all': '### Coins Removed\nRemoved {amount} coins from all users.',
    'economy.coins_cleared': '### Coins Cleared\n{user}\'s coins have been set to 0.',
    'economy.coins_cleared_all': '### Coins Cleared\nAll users\' coins have been set to 0.',
    'economy.coin_panel_created': '### Coin Leaderboard Created\nA coin leaderboard that updates every 5 minutes has been created in this channel.',
    'economy.coin_panel_title': 'Coin Leaderboard',
    'economy.coin_leaderboard_title': 'Coin Leaderboard',
    'economy.coin_panel_desc': 'Updates automatically every 5 minutes.\nTop 30 users in this server.',
    'economy.coin_name': 'coins',

    // Gamble
    'gamble.invalid_amount': '### Error\nThe bet amount must be at least 100 coins.',
    'gamble.insufficient_funds': '### Error\nYou have insufficient funds.',
    'gamble.result_75_loss': '### Gamble Result (Major Loss)\nYou lost {amount} coins (-75%)',
    'gamble.result_25_loss': '### Gamble Result (Minor Loss)\nYou lost {amount} coins (-25%)',
    'gamble.result_50_gain': '### Gamble Result (Minor Win)\nYou won {amount} coins (+50%)',
    'gamble.result_100_gain': '### Gamble Result (Major Win)\nYou won {amount} coins (+100%)',
    'gamble.bet_footer': 'Bet: {amount} coins',

    // Shop
    'shop.listed': '### Item Listed\nListed **{name}** for {price} coins.',
    'shop.purchased': '### Purchase Complete\nPurchased **{name}** for {price} coins.',
    'shop.insufficient_funds': '### Error\nYou have insufficient funds.',
    'shop.no_listings': '### Result\nThere are no items listed in the shop.',
    'shop.not_found': '### Error\nItem not found or out of stock.',
    'shop.list_title': 'Shop Listings',
    'shop.price_stock_line': 'Price: {price} coins | Stock: {quantity}',
    'shop.out_of_stock': '### Out of Stock\nThis item is out of stock.',

    // Antiraid
    'antiraid.enabled': '### Antiraid Enabled\nAntiraid protection has been enabled.',
    'antiraid.disabled': '### Antiraid Disabled\nAntiraid protection has been disabled.',
    'antiraid.alert': '### Antiraid Alert\nDetected a mass join, executing {action}.',

    // Message
    'message.sent': '### Message Sent\nThe message was sent successfully.',
    'message.error': '### Error\nFailed to send the message.',
    'message.invalid_color': '### Error\nInvalid color code.',

    // Games
    'games.minesweeper_title': 'Minesweeper',
    'games.minesweeper_desc': 'Click the grid below to play. (Actually displayed as text)',
    'games.janken_win': '### Result\nYou: {player} / Bot: {bot}\n**You win!**',
    'games.janken_lose': '### Result\nYou: {player} / Bot: {bot}\n**You lose.**',
    'games.janken_draw': '### Result\nYou: {player} / Bot: {bot}\n**Draw.**',
    'games.janken_rock': 'Rock',
    'games.janken_scissors': 'Scissors',
    'games.janken_paper': 'Paper',
    'games.dice_title': '### Dice\n{user} rolled a {sides}-sided die and got **{result}**!',
    'games.dice_need_both': '### Error\nYou must specify both `guess` and `bet` together.',
    'games.dice_guess_out_of_range': '### Error\nYour guess must be between 1 and {sides}.',
    'games.dice_win': '**Correct!**\nYou won **+{amount} coins**!',
    'games.dice_lose': '**Wrong**\nYou lost **{amount} coins**.',
    'games.slot_title': 'Slots',
    'games.slot_insufficient_funds': '### Error\nYou do not have enough coins.',
    'games.slot_jackpot': '### JACKPOT!\n{symbols}\nYou won **{multiplier}x** your bet: **{amount} coins**!',
    'games.slot_win': '### Win!\n{symbols}\nYou won **{multiplier}x** your bet: **{amount} coins**!',
    'games.slot_lose': '### No Match\n{symbols}\nYou lost **{amount} coins**.',
    'minesweeper.win': '### Cleared!\n{player} cleared the Minesweeper board!\n**+{reward} coins** earned.',
    'minesweeper.lose': '### Boom!\n{player} hit a mine.{lossLine}',
    'minesweeper.lose_line': '\n**-{amount} coins** lost.',
    'minesweeper.playing': '{player}\'s Minesweeper\nRemaining: **{remaining} cells**{betLine}',
    'minesweeper.bet_line': '\nBet: **{amount} coins**',
    'minesweeper.expired': '### Error\nThis game has ended or could not be found.',
    'minesweeper.not_your_game': '### Error\nThis is not your game.',

    // Redeem Code
    'code.generated': '### Gift Code Generated\nCode: `{code}`\nReward: {coins} coins',
    'code.generated_detail': '> Max Users: **{total}**\n> Max Uses/User: **{user}**',
    'code.unlimited': 'Unlimited',
    'code.no_rewards': '### Error\nPlease specify at least one reward (coins, role, XP, DM, etc.).',
    'code.edited': '### Gift Code Edited\nThe settings for code `{code}` have been updated.',
    'code.deleted': '### Gift Code Deleted\nCode: `{code}` has been deleted.',
    'code.not_found': '### Error\nCode not found or already used.',
    'code.already_used': '### Error\nThis code has already been used.',
    'code.redeemed': '### Code Redeemed\nYou received the following rewards!\n{rewards}',
    'code.invalid_uses': '### Error\nMax uses must be a number 1 or greater, or `x`.',
    'code.no_edit_target': '### Error\nPlease specify an item to edit (message or max uses).',
    'code.faster_ended': '### Ended\nThis faster code has reached its limit and is now over.',
    'code.redeem_error': '### Error\nAn error occurred while redeeming this code.',
    'code.user_limit_reached': '### Error\nYou have reached the per-user limit ({max}) for this code.',
    'code.list_title': 'Active Gift Codes',
    'code.list_empty': 'There are no active codes.',
    'code.rewards_label': 'Rewards',
    'code.uses_label': 'Uses',
    'code.reward_role': 'Role',
    'code.reward_dm': 'DM',

    // Redeem Panel
    'redeem.panel_title': 'Gift Code Redemption',
    'redeem.panel_desc': 'Please click the green button below to enter your code.\nThe code format is `XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX`.',
    'redeem.button_label': 'Redeem Code',
    'redeem.modal_title': 'Gift Code Input',
    'redeem.modal_label': 'Gift Code',
    'redeem.modal_placeholder': 'XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX',
    'redeem.dm_title': 'Gift Code Reward',
    'redeem.dm_sent': 'DM Sent',
    'redeem.dm_failed': 'DM Send Failed',
    'redeem.no_rewards': 'None',

    // Temp VC
    'tempvc.setup_success': '### Temp VC Setup\nCreation channel: {channel}\nCategory: {category}\nConfigured successfully.',
    'tempvc.disabled': '### Temp VC Disabled\nTemp VC feature has been disabled.',
    'tempvc.channel_name': "{user}'s VC",

    // Starboard
    'starboard.setup_success': '### Starboard Setup\nChannel: {channel}\nThreshold: {threshold} stars\nConfigured successfully.',
    'starboard.disabled': '### Starboard Disabled\nStarboard feature has been disabled.',
    'starboard.title': 'Starboard',
    'starboard.footer': '{stars} stars - {channel}',

    // Affinity
    'affinity.hug': '{user} hugged {target}!\nAffinity increased by {points}! (Current: {total})',
    'affinity.pat': '{user} patted {target}\'s head!\nAffinity increased by {points}! (Current: {total})',
    'affinity.self': '### Error\nYou cannot use this on yourself.',
    'affinity.leaderboard_title': 'Affinity Leaderboard',
    'affinity.no_data': '### Result\nNo affinity data yet.',
    'affinity.panel_created': '### Affinity Leaderboard Created\nAn affinity leaderboard that updates every 5 minutes has been created in this channel.',
    'affinity.panel_title': 'Affinity Leaderboard',
    'affinity.panel_desc': 'Updates automatically every 5 minutes.\nTop 30 couples in this server.',
    'affinity.top_pairs': 'Top 30 Couples',
    'affinity.points_name': 'points',
    'affinity.pair_line': '**{rank}.** <@{user1}> and <@{user2}> - **{points} points**',

    // AI
    'ai.persona_set': '### AI Persona Set\nAI persona has been changed to **{persona}**.',
    'ai.persona_invalid': '### Error\nInvalid persona.',
    'ai.thinking': 'Thinking...',
    'ai.error': '### Error\nFailed to generate AI response. Please check if the API key is set.',
    
    // Role Panel (additional interactions)
    'role_panel.no_permission': '### Error\nYou do not have permission.',
    'role_panel.modal_title': 'Add Role Settings',
    'role_panel.field_role_id': 'Role ID',
    'role_panel.field_label': 'Button Label',
    'role_panel.not_found': '### Error\nPanel not found.',
    'role_panel.item_added': '### Role Added\nAdded the role to the panel.',
    'role_panel.add_button_label': 'Add Role',
    'role_panel.item_not_found': '### Error\nRole not found.',
    'role_panel.role_field': 'Role',
    'role_panel.grant_button_label': 'Grant {role}',

    // Verify (additional interactions)
    'verify.panel_not_found': '### Error\nPanel not found.',
    'verify.role_add_failed': '### Error\nFailed to grant the role. Please check the bot\'s permissions.',

    // Ticket (additional interactions)
    'ticket.create_error': '### Error\nAn error occurred while creating the ticket.',
    'ticket.channel_not_ticket': '### Error\nThis channel is not a ticket.',
    'ticket.log_title_created': 'Ticket Created',
    'ticket.log_title_closed': 'Ticket Closed',

    // Poll (additional interactions)
    'poll.ended': '### Error\nThis poll has ended.',

    // Mod (additional)
    'mod.action_failed': '### Error\nFailed to execute the moderation action.',

    // Shop (additional)
    'shop.footer_wait': 'Please wait for your item to be purchased',
    'shop.listed_detail': '> ID: `{id}`\n> Stock: {quantity}',
    'shop.seller_notification': '### Item Sold\nYour item **{name}** was purchased by {buyer} for {price} coins.',
    'shop.deleted': '### Deleted\nListing for **{name}** has been deleted.',
    'shop.delete_no_permission': '### Error\nOnly the seller or a user with Manage Server permission can delete this listing.',

    // Antiraid (additional)
    'antiraid.enabled_detail': '> Threshold: {threshold} users / {windowSec}s',

    // Log event embed titles
    'log.title_channel_create': 'Channel Created',
    'log.title_channel_delete': 'Channel Deleted',
    'log.title_member_join': 'Member Joined',
    'log.title_member_leave': 'Member Left',
    'log.title_role_added': 'Role Added',
    'log.title_role_removed': 'Role Removed',
    'log.title_nickname_changed': 'Nickname Changed',
    'log.title_avatar_changed': 'Avatar Changed',
    'log.title_message_send': 'Message Sent',
    'log.title_message_delete': 'Message Deleted',
    'log.title_message_edit': 'Message Edited',
    'log.title_voice_join': 'Voice Joined',
    'log.title_voice_leave': 'Voice Left',
    'log.title_voice_move': 'Voice Moved'
  }
};

function t(lang, key, params = {}) {
  let str = messages[lang]?.[key] || messages['ja'][key] || key;
  for (const [k, v] of Object.entries(params)) {
    str = str.replaceAll(`{${k}}`, v);
  }
  return str;
}

const langCache = new Map();
const LANG_CACHE_TTL_MS = 5 * 60 * 1000;

async function getGuildLanguage(guildId) {
  const cached = langCache.get(guildId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.lang;
  }
  const settings = await prisma.guildSettings.findUnique({ where: { guildId } });
  const lang = settings?.language || 'ja';
  langCache.set(guildId, { lang, expiresAt: Date.now() + LANG_CACHE_TTL_MS });
  return lang;
}

function setGuildLanguageCache(guildId, lang) {
  langCache.set(guildId, { lang, expiresAt: Date.now() + LANG_CACHE_TTL_MS });
}

async function tGuild(guildId, key, params = {}) {
  const lang = await getGuildLanguage(guildId);
  return t(lang, key, params);
}

module.exports = { t, tGuild, setGuildLanguageCache, getGuildLanguage };