// src/commands/giveaway/giveawayCommandFactory.js
const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');
const {
  createGiveaway, endGiveaway, rerollGiveaway, deleteGiveaway, fixGiveaway, refreshActivePanel,
  setWeight, parseDuration, parseHexColor, saveTemplate, listTemplates, getTemplate, deleteTemplate,
} = require('./giveawayService');

function buildGiveawayCommand({ name, description }) {
  const builder = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

  builder.addSubcommand((sub) => {
    sub
      .setName('start')
      .setDescription('ギブアウェイを作成します / Create a giveaway')
      .addStringOption((opt) => opt.setName('prize').setDescription('景名 / Prize').setRequired(true))
      .addStringOption((opt) => opt.setName('duration').setDescription('期間 (例: 10m, 1h, 1d) / Duration').setRequired(true))
      .addIntegerOption((opt) => opt.setName('winners').setDescription('当選者数 / Winners').setMinValue(1).setMaxValue(50).setRequired(true))
      .addChannelOption((opt) => opt.setName('channel').setDescription('チャンネル / Channel').addChannelTypes(ChannelType.GuildText).setRequired(false))
      .addUserOption((opt) => opt.setName('host').setDescription('主催者 / Host').setRequired(false))
      .addAttachmentOption((opt) => opt.setName('image').setDescription('画像 / Image').setRequired(false))
      .addAttachmentOption((opt) => opt.setName('thumbnail').setDescription('サムネイル / Thumbnail').setRequired(false))
      .addRoleOption((opt) => opt.setName('required_role').setDescription('参加必須ロール / Required role').setRequired(false))
      .addIntegerOption((opt) => opt.setName('required_level').setDescription('参加必須レベル / Required level').setMinValue(1).setRequired(false))
      .addRoleOption((opt) => opt.setName('requirement_bypass_role').setDescription('要件バイパスロール / Bypass role').setRequired(false))
      .addRoleOption((opt) => opt.setName('giveaway_winners_role').setDescription('当選者ロール / Winners role').setRequired(false))
      .addStringOption((opt) => opt.setName('color').setDescription('Hexカラー / Hex color').setRequired(false))
      .addStringOption((opt) => opt.setName('end_color').setDescription('終了時Hexカラー / End hex color').setRequired(false))
      .addStringOption((opt) => opt.setName('giveaway_create_message').setDescription('作成時メッセージ / Creation message').setRequired(false))
      .addStringOption((opt) => opt.setName('giveaway_winners_dm_message').setDescription('当選者DMメッセージ / Winners DM message').setRequired(false))
      .addIntegerOption((opt) => opt.setName('coin_prize').setDescription('コイン景品 / Coin prize').setMinValue(1).setRequired(false));
    return sub;
  });

  builder.addSubcommand((sub) => sub.setName('end').setDescription('ギブアウェイを終了 / End a giveaway').addStringOption((opt) => opt.setName('id').setDescription('Giveaway ID').setRequired(true)));
  builder.addSubcommand((sub) => sub.setName('reroll').setDescription('当選者を再抽選 / Reroll winner').addStringOption((opt) => opt.setName('id').setDescription('Giveaway ID').setRequired(true)));
  builder.addSubcommand((sub) => sub.setName('delete').setDescription('ギブアウェイを削除 / Delete a giveaway').addStringOption((opt) => opt.setName('id').setDescription('Giveaway ID').setRequired(true)));

  builder.addSubcommand((sub) => {
    sub
      .setName('edit')
      .setDescription('ギブアウェイを編集 / Edit a giveaway')
      .addStringOption((opt) => opt.setName('id').setDescription('Giveaway ID').setRequired(true))
      .addStringOption((opt) => opt.setName('prize').setDescription('新しい景名 / New prize').setRequired(false))
      .addStringOption((opt) => opt.setName('duration').setDescription('新しい期間 / New duration').setRequired(false))
      .addIntegerOption((opt) => opt.setName('winners').setDescription('新しい当選者数 / New winners').setMinValue(1).setMaxValue(50).setRequired(false))
      .addIntegerOption((opt) => opt.setName('required_level').setDescription('新しい必須レベル (0で解除) / New required level').setMinValue(0).setRequired(false))
      .addUserOption((opt) => opt.setName('user').setDescription('当選倍率を変更するユーザー / User to adjust multiplier').setRequired(false))
      .addNumberOption((opt) => opt.setName('multiplier').setDescription('当選倍率 (例: 2 = 2倍) / Multiplier').setMinValue(0.01).setMaxValue(100).setRequired(false));
    return sub;
  });

  builder.addSubcommand((sub) => sub.setName('fix').setDescription('ギブアウェイを修復 / Fix a giveaway').addStringOption((opt) => opt.setName('id').setDescription('Giveaway ID').setRequired(true)));

  builder.addSubcommand((sub) => sub.setName('creator-roles').setDescription('作成権限ロール設定 / Set creator roles')
    .addStringOption((opt) => opt.setName('action').setDescription('add, remove, list').addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'list', value: 'list' }).setRequired(true))
    .addRoleOption((opt) => opt.setName('role').setDescription('Role').setRequired(false)));

  builder.addSubcommand((sub) => sub.setName('manager-roles').setDescription('管理権限ロール設定 / Set manager roles')
    .addStringOption((opt) => opt.setName('action').setDescription('add, remove, list').addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'list', value: 'list' }).setRequired(true))
    .addRoleOption((opt) => opt.setName('role').setDescription('Role').setRequired(false)));

  builder.addSubcommand((sub) => sub.setName('list').setDescription('進行中のリスト / List active giveaways'));

  builder.addSubcommandGroup((group) =>
    group.setName('template').setDescription('テンプレート管理 / Manage templates')
      .addSubcommand((action) => action.setName('save').setDescription('テンプレート保存 / Save template')
        .addStringOption((opt) => opt.setName('name').setDescription('Template name').setRequired(true))
        .addStringOption((opt) => opt.setName('duration').setDescription('Duration').setRequired(false))
        .addIntegerOption((opt) => opt.setName('winners').setDescription('Winners').setMinValue(1).setMaxValue(50).setRequired(false))
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addUserOption((opt) => opt.setName('host').setDescription('Host').setRequired(false))
        .addRoleOption((opt) => opt.setName('required_role').setDescription('Required role').setRequired(false))
        .addIntegerOption((opt) => opt.setName('required_level').setDescription('Required level').setMinValue(1).setRequired(false))
        .addRoleOption((opt) => opt.setName('requirement_bypass_role').setDescription('Bypass role').setRequired(false))
        .addRoleOption((opt) => opt.setName('giveaway_winners_role').setDescription('Winners role').setRequired(false))
        .addStringOption((opt) => opt.setName('color').setDescription('Hex color').setRequired(false))
        .addStringOption((opt) => opt.setName('end_color').setDescription('End hex color').setRequired(false))
        .addStringOption((opt) => opt.setName('giveaway_winners_dm_message').setDescription('DM message').setRequired(false))
        .addIntegerOption((opt) => opt.setName('coin_prize').setDescription('Coin prize').setMinValue(1).setRequired(false)))
      .addSubcommand((action) => action.setName('list').setDescription('テンプレート一覧 / List templates'))
      .addSubcommand((action) => action.setName('use').setDescription('テンプレート使用 / Use template')
        .addStringOption((opt) => opt.setName('name').setDescription('Template name').setRequired(true))
        .addStringOption((opt) => opt.setName('prize').setDescription('Prize').setRequired(true))
        .addStringOption((opt) => opt.setName('duration').setDescription('Duration').setRequired(true))
        .addIntegerOption((opt) => opt.setName('winners').setDescription('Winners').setMinValue(1).setMaxValue(50).setRequired(false))
        .addChannelOption((opt) => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addUserOption((opt) => opt.setName('host').setDescription('Host').setRequired(false)))
      .addSubcommand((action) => action.setName('delete').setDescription('テンプレート削除 / Delete template')
        .addStringOption((opt) => opt.setName('name').setDescription('Template name').setRequired(true)))
  );

  return {
    data: builder,
    async execute(interaction) {
      // start(パネル投稿)・end(当選発表)など、Discord APIへの実通信やDB書き込みを
      // 伴うサブコマンドが複数あるため、先頭で一律deferしてから各処理に振り分ける。
      await interaction.deferReply({ ephemeral: true });

      const group = interaction.options.getSubcommandGroup();
      const sub = interaction.options.getSubcommand();
      
      if (sub === 'start') return handleStart(interaction);
      if (sub === 'end') return handleEnd(interaction);
      if (sub === 'reroll') return handleReroll(interaction);
      if (sub === 'delete') return handleDelete(interaction);
      if (sub === 'edit') return handleEdit(interaction);
      if (sub === 'fix') return handleFix(interaction);
      if (sub === 'creator-roles') return handleRoles(interaction, `${name}-create`);
      if (sub === 'manager-roles') return handleRoles(interaction, `${name}-manage`);
      if (sub === 'list') return handleList(interaction);
      if (group === 'template') return handleTemplate(interaction, sub);
    },
  };
}

async function findGiveaway(interaction) {
  const shortId = interaction.options.getString('id').trim().toUpperCase();
  return prisma.giveaway.findFirst({ where: { guildId: interaction.guildId, shortId } });
}

async function replyMsg(interaction, msgKey, params = {}) {
  const msg = await tGuild(interaction.guildId, msgKey, params);
  return interaction.editReply({ content: msg });
}

async function handleStart(interaction) {
  const prize = interaction.options.getString('prize');
  const durationInput = interaction.options.getString('duration');
  const winners = interaction.options.getInteger('winners');
  const channel = interaction.options.getChannel('channel') ?? interaction.channel;
  const host = interaction.options.getUser('host') ?? interaction.user;
  const imageAttachment = interaction.options.getAttachment('image');
  const thumbnailAttachment = interaction.options.getAttachment('thumbnail');
  const requiredRole = interaction.options.getRole('required_role');
  const requiredLevel = interaction.options.getInteger('required_level');
  const bypassRole = interaction.options.getRole('requirement_bypass_role');
  const winnersRole = interaction.options.getRole('giveaway_winners_role');
  const colorInput = interaction.options.getString('color');
  const endColorInput = interaction.options.getString('end_color');
  const creationMessage = interaction.options.getString('giveaway_create_message');
  const winnersDmMessage = interaction.options.getString('giveaway_winners_dm_message');
  const coinPrize = interaction.options.getInteger('coin_prize');

  const durationMs = parseDuration(durationInput);
  if (!durationMs) return replyMsg(interaction, 'giveaway.start.invalid_duration');
  if ((colorInput && parseHexColor(colorInput) === null) || (endColorInput && parseHexColor(endColorInput) === null)) {
    return replyMsg(interaction, 'giveaway.start.invalid_color');
  }

  const imageUrl = imageAttachment && imageAttachment.contentType?.startsWith('image/') ? imageAttachment.url : null;
  const thumbnailUrl = thumbnailAttachment && thumbnailAttachment.contentType?.startsWith('image/') ? thumbnailAttachment.url : null;

  const { giveaway } = await createGiveaway({
    guild: interaction.guild, channel, host, prize, winnerCount: winners, durationMs, imageUrl, thumbnailUrl,
    color: parseHexColor(colorInput), endColor: parseHexColor(endColorInput),
    requiredRoleId: requiredRole?.id ?? null, requiredLevel: requiredLevel ?? null,
    bypassRoleId: bypassRole?.id ?? null, winnersRoleId: winnersRole?.id ?? null,
    winnersDmMessage, coinPrize, creationMessage,
  });

  return replyMsg(interaction, 'giveaway.start.success', { id: giveaway.shortId });
}

async function handleEnd(interaction) {
  const giveaway = await findGiveaway(interaction);
  if (!giveaway) return replyMsg(interaction, 'giveaway.end.not_found');
  if (giveaway.status !== 'ACTIVE') return replyMsg(interaction, 'giveaway.end.already_ended');
  await endGiveaway(interaction.client, giveaway.id);
  return replyMsg(interaction, 'giveaway.end.success');
}

async function handleReroll(interaction) {
  const giveaway = await findGiveaway(interaction);
  if (!giveaway) return replyMsg(interaction, 'giveaway.reroll.not_found');
  if (giveaway.status !== 'ENDED') return replyMsg(interaction, 'giveaway.reroll.not_ended');
  const result = await rerollGiveaway(interaction.client, giveaway.id);
  if (!result.winnerIds?.length) return replyMsg(interaction, 'giveaway.reroll.no_entries');
  return replyMsg(interaction, 'giveaway.reroll.success');
}

async function handleDelete(interaction) {
  const giveaway = await findGiveaway(interaction);
  if (!giveaway) return replyMsg(interaction, 'giveaway.end.not_found');
  await deleteGiveaway(interaction.client, giveaway.id);
  // 削除はシンプルに固定的なメッセージでも良いが、多言語化するならキーを追加する必要がある。ここでは英語をデフォルトに。
  return interaction.editReply({ content: '### Giveaway Deleted\nThe giveaway was successfully deleted.' });
}

async function handleEdit(interaction) {
  const giveaway = await findGiveaway(interaction);
  if (!giveaway) return replyMsg(interaction, 'giveaway.end.not_found');
  if (giveaway.status !== 'ACTIVE') return replyMsg(interaction, 'giveaway.end.already_ended');

  const prize = interaction.options.getString('prize');
  const durationInput = interaction.options.getString('duration');
  const winners = interaction.options.getInteger('winners');
  const requiredLevel = interaction.options.getInteger('required_level');

  const data = {};
  if (prize) data.prize = prize;
  if (winners) data.winnerCount = winners;
  if (requiredLevel != null) data.requiredLevel = requiredLevel === 0 ? null : requiredLevel;
  if (durationInput) {
    const ms = parseDuration(durationInput);
    if (!ms) return replyMsg(interaction, 'giveaway.start.invalid_duration');
    data.endsAt = new Date(Date.now() + ms);
  }

  if (Object.keys(data).length) {
    await prisma.giveaway.update({ where: { id: giveaway.id }, data });
    await refreshActivePanel(interaction.client, giveaway.id);
  }

  const user = interaction.options.getUser('user');
  const multiplier = interaction.options.getNumber('multiplier');
  if (user && multiplier != null) {
    const result = await setWeight(interaction.guildId, giveaway.shortId, user.id, multiplier);
    if (result.error === 'not_entered') return replyMsg(interaction, 'giveaway.weight.not_entered', { user: user.toString() });
  }

  return interaction.editReply({ content: '### Giveaway Updated\nThe giveaway settings were updated.' });
}

async function handleFix(interaction) {
  const giveaway = await findGiveaway(interaction);
  if (!giveaway) return replyMsg(interaction, 'giveaway.end.not_found');
  const result = await fixGiveaway(interaction.client, giveaway.id);
  if (result.error) return interaction.editReply({ content: '### Error\nCould not fix the giveaway.' });
  return interaction.editReply({ content: `### Giveaway Fixed\nAction: \`${result.action}\`` });
}

async function handleRoles(interaction) {
  // Giveaway系は管理者専用のため、ロール委任機能(creator-roles/manager-roles)は無効化している。
  return replyMsg(interaction, 'giveaway.roles_disabled');
}

async function handleList(interaction) {
  const giveaways = await prisma.giveaway.findMany({
    where: { guildId: interaction.guildId, status: 'ACTIVE' },
    include: { _count: { select: { entries: true } } },
    orderBy: { endsAt: 'asc' },
  });

  if (!giveaways.length) return replyMsg(interaction, 'giveaway.list.empty');

  const lines = giveaways.map((g) => {
    const unix = Math.floor(new Date(g.endsAt).getTime() / 1000);
    return `**${g.shortId}** - ${g.prize} (Entries: ${g._count.entries} | Ends: <t:${unix}:R>)`;
  });

  const title = await tGuild(interaction.guildId, 'giveaway.list.title');
  return interaction.editReply({ content: `${title}\n\n${lines.join('\n')}` });
}

async function handleTemplate(interaction, action) {
  if (action === 'save') {
    const name = interaction.options.getString('name');
    const durationInput = interaction.options.getString('duration');
    const durationMs = durationInput ? parseDuration(durationInput) : null;
    if (durationInput && !durationMs) return replyMsg(interaction, 'giveaway.template.invalid_duration');

    await saveTemplate(interaction.guildId, name, {
      durationMs,
      winnerCount: interaction.options.getInteger('winners'),
      channelId: interaction.options.getChannel('channel')?.id,
      hostId: interaction.options.getUser('host')?.id,
      requiredRoleId: interaction.options.getRole('required_role')?.id,
      requiredLevel: interaction.options.getInteger('required_level'),
      bypassRoleId: interaction.options.getRole('requirement_bypass_role')?.id,
      winnersRoleId: interaction.options.getRole('giveaway_winners_role')?.id,
      color: parseHexColor(interaction.options.getString('color')),
      endColor: parseHexColor(interaction.options.getString('end_color')),
      winnersDmMessage: interaction.options.getString('giveaway_winners_dm_message'),
      coinPrize: interaction.options.getInteger('coin_prize'),
    });
    return replyMsg(interaction, 'giveaway.template.saved', { name });
  }

  if (action === 'list') {
    const templates = await listTemplates(interaction.guildId);
    if (!templates.length) return replyMsg(interaction, 'giveaway.template.no_templates');
    const lines = templates.map((t) => {
      const duration = t.durationMs ? `${Math.floor(t.durationMs / 60000)}min` : 'no duration';
      const winners = t.winnerCount ? `${t.winnerCount} winners` : 'no winners';
      return `**${t.name}** - ${winners}, ${duration}`;
    });
    const title = await tGuild(interaction.guildId, 'giveaway.template.list_title');
    return interaction.editReply({ content: `${title}\n\n${lines.join('\n')}` });
  }

  if (action === 'use') {
    const name = interaction.options.getString('name');
    const template = await getTemplate(interaction.guildId, name);
    if (!template) return replyMsg(interaction, 'giveaway.template.not_found');

    const prize = interaction.options.getString('prize');
    const durationInput = interaction.options.getString('duration');
    const winners = interaction.options.getInteger('winners') ?? template.winnerCount ?? 1;
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const host = interaction.options.getUser('host') ?? interaction.user;

    const durationMs = durationInput ? parseDuration(durationInput) : template.durationMs;
    if (!durationMs) return replyMsg(interaction, 'giveaway.template.invalid_duration');

    const { giveaway } = await createGiveaway({
      guild: interaction.guild, channel, host, prize, winnerCount: winners, durationMs,
      imageUrl: template.imageUrl, thumbnailUrl: template.thumbnailUrl, color: template.color, endColor: template.endColor,
      requiredRoleId: template.requiredRoleId, bypassRoleId: template.bypassRoleId, winnersRoleId: template.winnersRoleId,
      requiredLevel: template.requiredLevel, winnersDmMessage: template.winnersDmMessage, coinPrize: template.coinPrize,
    });
    return replyMsg(interaction, 'giveaway.start.success', { id: giveaway.shortId });
  }

  if (action === 'delete') {
    const name = interaction.options.getString('name');
    const result = await deleteTemplate(interaction.guildId, name);
    if (result.error) return replyMsg(interaction, 'giveaway.template.not_found');
    return replyMsg(interaction, 'giveaway.template.deleted', { name });
  }
}

module.exports = { buildGiveawayCommand };