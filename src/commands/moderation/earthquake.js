// src/commands/moderation/earthquake.js
const { SlashCommandBuilder, ChannelType, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild, getGuildLanguage } = require('../../lib/i18n');
const { buildIntensityMapImage } = require('../../lib/earthquakeMap');
const { getScaleText } = require('../../lib/earthquakeService');

const SCALE_CHOICES = [
  { name: '震度1以上 / Scale 1+', value: 10 },
  { name: '震度3以上 / Scale 3+', value: 30 },
  { name: '震度5弱以上 / Scale 5-lower+', value: 45 },
  { name: '震度7のみ / Scale 7 only', value: 70 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('earthquake')
    .setDescription('地震通知を設定します / Setup earthquake notifications')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('通知チャンネルと最小震度を設定 / Set notification channel and minimum scale')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('送信先チャンネル / Channel').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('min_scale').setDescription('通知する最小震度 / Minimum scale').addChoices(...SCALE_CHOICES).setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('地震通知を無効化 / Disable earthquake notifications')
    )
    .addSubcommand((sub) =>
      sub
        .setName('test')
        .setDescription('サンプルの地震マップを送信して見た目を確認します / Send a sample earthquake map to preview it')
    ),
  category: 'モデレーション / Moderation',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const minScale = interaction.options.getInteger('min_scale') ?? 40;

      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { earthquakeChannelId: channel.id, earthquakeMinScale: minScale },
        create: { guildId: interaction.guild.id, earthquakeChannelId: channel.id, earthquakeMinScale: minScale },
      });

      const setupLang = await getGuildLanguage(interaction.guild.id);
      const msg = await tGuild(interaction.guild.id, 'earthquake.setup_success', { channel: channel.toString(), min_scale: getScaleText(minScale, setupLang) });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'disable') {
      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { earthquakeChannelId: null },
        create: { guildId: interaction.guild.id, earthquakeChannelId: null },
      });

      const msg = await tGuild(interaction.guild.id, 'earthquake.disabled');
      const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(msg);
      await interaction.reply({ embeds: [embed], ephemeral: true });

    } else if (sub === 'test') {
      // 実際のAPIを待たずに見た目を確認できるよう、サンプルデータでマップを生成する。
      await interaction.deferReply({ ephemeral: true });

      const sample = {
        earthquake: {
          time: new Date().toISOString(),
          hypocenter: { name: '石川県能登地方', latitude: 37.5, longitude: 137.2, depth: '10km', magnitude: 6.5 },
          maxScale: 55,
        },
        points: [
          { pref: '石川県', addr: '珠洲市', scale: 55, isArea: false },
          { pref: '富山県', addr: '富山市', scale: 40, isArea: false },
          { pref: '新潟県', addr: '新潟市', scale: 30, isArea: false },
          { pref: '福井県', addr: '福井市', scale: 20, isArea: false },
          { pref: '東京都', addr: '千代田区', scale: 10, isArea: false },
        ],
      };

      const imageBuffer = buildIntensityMapImage({ points: sample.points, epicenter: sample.earthquake.hypocenter });
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'earthquake-test.png' });

      const title = await tGuild(interaction.guild.id, 'earthquake.title');
      const scaleText = await tGuild(interaction.guild.id, 'earthquake.scale');
      const magText = await tGuild(interaction.guild.id, 'earthquake.magnitude');
      const depthText = await tGuild(interaction.guild.id, 'earthquake.depth');
      const timeText = await tGuild(interaction.guild.id, 'earthquake.time');
      const epicenterText = await tGuild(interaction.guild.id, 'earthquake.epicenter');
      const testNotice = await tGuild(interaction.guild.id, 'earthquake.test_notice');

      const mapCredit = await tGuild(interaction.guild.id, 'earthquake.map_credit');
      const testLang = await getGuildLanguage(interaction.guild.id);
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`${title} - ${scaleText} ${getScaleText(sample.earthquake.maxScale, testLang)}`)
        .setDescription(testNotice)
        .setImage('attachment://earthquake-test.png')
        .addFields(
          { name: epicenterText, value: sample.earthquake.hypocenter.name, inline: true },
          { name: magText, value: `${sample.earthquake.hypocenter.magnitude}`, inline: true },
          { name: depthText, value: `${sample.earthquake.hypocenter.depth}`, inline: true },
          { name: timeText, value: new Date(sample.earthquake.time).toLocaleString('ja-JP'), inline: true }
        )
        .setFooter({ text: mapCredit })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], files: [attachment] });
    }
  },
};