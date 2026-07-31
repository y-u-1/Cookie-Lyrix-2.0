// src/commands/economy/code.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 40; i++) {
    if (i > 0 && i % 8 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('code')
    .setDescription('ギフトコードを管理します / Manage gift codes')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('generate')
        .setDescription('コードを生成 / Generate a code')
        .addIntegerOption((opt) => opt.setName('coins').setDescription('付与するコイン数 / Coins to grant').setMinValue(0).setRequired(false))
        .addRoleOption((opt) => opt.setName('role').setDescription('付与するロール / Role to grant').setRequired(false))
        .addIntegerOption((opt) => opt.setName('xp').setDescription('付与するXP / XP to grant').setMinValue(1).setRequired(false))
        .addStringOption((opt) => opt.setName('image_url').setDescription('DMで送る画像URL / Image URL to send in DM').setRequired(false))
        .addStringOption((opt) => opt.setName('dm_message').setDescription('DMで送るメッセージ / DM message to send').setRequired(false))
        .addStringOption((opt) => opt.setName('message').setDescription('引き換え時のカスタムメッセージ / Custom message').setRequired(false))
        .addStringOption((opt) => 
          opt.setName('max_uses')
            .setDescription('先着何名まで有効か (数字または x で無制限) / Max total uses (number or x)')
            .setRequired(false))
        .addStringOption((opt) => 
          opt.setName('max_uses_per_user')
            .setDescription('1人当たりの使用回数 (数字または x で無制限) / Max uses per user (number or x)')
            .setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('edit')
        .setDescription('コードの設定を編集 / Edit code settings')
        .addStringOption((opt) => opt.setName('code').setDescription('編集するコード / Code to edit').setRequired(true))
        .addIntegerOption((opt) => opt.setName('coins').setDescription('新しいコイン数 / New coins').setMinValue(0).setRequired(false))
        .addRoleOption((opt) => opt.setName('role').setDescription('新しいロール / New role').setRequired(false))
        .addIntegerOption((opt) => opt.setName('xp').setDescription('新しいXP / New XP').setMinValue(1).setRequired(false))
        .addStringOption((opt) => opt.setName('image_url').setDescription('新しい画像URL / New image URL').setRequired(false))
        .addStringOption((opt) => opt.setName('dm_message').setDescription('新しいDMメッセージ / New DM message').setRequired(false))
        .addStringOption((opt) => opt.setName('message').setDescription('新しいカスタムメッセージ / New custom message').setRequired(false))
        .addStringOption((opt) => 
          opt.setName('max_uses')
            .setDescription('新しい先着人数 (数字または x) / New max total uses (number or x)')
            .setRequired(false))
        .addStringOption((opt) => 
          opt.setName('max_uses_per_user')
            .setDescription('新しい1人当たりの回数 (数字または x) / New max uses per user (number or x)')
            .setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('コードを削除 / Delete a code')
        .addStringOption((opt) => opt.setName('code').setDescription('削除するコード / Code to delete').setRequired(true))
    ),
  category: 'エコノミー / Economy',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    const parseUses = async (input) => {
      if (!input) return 1;
      if (input.toLowerCase() === 'x') return 0;
      const parsed = parseInt(input, 10);
      if (isNaN(parsed) || parsed < 1) return -1;
      return parsed;
    };

    if (sub === 'generate') {
      const coins = interaction.options.getInteger('coins') ?? 0;
      const role = interaction.options.getRole('role');
      const xp = interaction.options.getInteger('xp');
      const imageUrl = interaction.options.getString('image_url');
      const dmMessage = interaction.options.getString('dm_message');
      const message = interaction.options.getString('message');
      
      const maxUses = await parseUses(interaction.options.getString('max_uses'));
      const maxUsesPerUser = await parseUses(interaction.options.getString('max_uses_per_user'));

      if (maxUses === -1 || maxUsesPerUser === -1) {
        const errMsg = await tGuild(interaction.guild.id, 'code.invalid_uses');
        return interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral });
      }

      if (coins === 0 && !role && !xp && !imageUrl && !dmMessage) {
        const errMsg = await tGuild(interaction.guild.id, 'code.no_rewards');
        return interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral });
      }

      const code = generateCode();

      await prisma.redeemCode.create({
        data: {
          guildId: interaction.guild.id,
          code,
          coins: BigInt(coins), // BigIntに変換
          roleId: role?.id ?? null,
          xp: xp ? BigInt(xp) : null,
          imageUrl,
          dmMessage,
          customMessage: message,
          maxUses,
          maxUsesPerUser,
        },
      });

      const unlimitedText = await tGuild(interaction.guild.id, 'code.unlimited');
      const totalText = maxUses === 0 ? unlimitedText : `${maxUses}`;
      const userText = maxUsesPerUser === 0 ? unlimitedText : `${maxUsesPerUser}`;
      
      const msg = await tGuild(interaction.guild.id, 'code.generated', { code, coins });
      const detailMsg = await tGuild(interaction.guild.id, 'code.generated_detail', { total: totalText, user: userText });
      
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(`${msg}\n${detailMsg}`);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } else if (sub === 'edit') {
      const codeInput = interaction.options.getString('code');
      const coins = interaction.options.getInteger('coins');
      const role = interaction.options.getRole('role');
      const xp = interaction.options.getInteger('xp');
      const imageUrl = interaction.options.getString('image_url');
      const dmMessage = interaction.options.getString('dm_message');
      const message = interaction.options.getString('message');
      const maxUsesInput = interaction.options.getString('max_uses');
      const maxUsesPerUserInput = interaction.options.getString('max_uses_per_user');

      const data = {};
      if (coins !== null) data.coins = BigInt(coins); // BigIntに変換
      if (role) data.roleId = role.id;
      if (xp !== null) data.xp = BigInt(xp);
      if (imageUrl !== null) data.imageUrl = imageUrl;
      if (dmMessage !== null) data.dmMessage = dmMessage;
      if (message !== null) data.customMessage = message;
      
      if (maxUsesInput) {
        const parsed = await parseUses(maxUsesInput);
        if (parsed === -1) {
          const errMsg = await tGuild(interaction.guild.id, 'code.invalid_uses');
          return interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral });
        }
        data.maxUses = parsed;
      }

      if (maxUsesPerUserInput) {
        const parsed = await parseUses(maxUsesPerUserInput);
        if (parsed === -1) {
          const errMsg = await tGuild(interaction.guild.id, 'code.invalid_uses');
          return interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral });
        }
        data.maxUsesPerUser = parsed;
      }

      if (Object.keys(data).length === 0) {
        const errMsg = await tGuild(interaction.guild.id, 'code.no_edit_target');
        return interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral });
      }

      const updated = await prisma.redeemCode.updateMany({
        where: { code: codeInput.toUpperCase(), guildId: interaction.guild.id },
        data,
      });

      if (updated.count === 0) {
        const msg = await tGuild(interaction.guild.id, 'code.not_found');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      const msg = await tGuild(interaction.guild.id, 'code.edited', { code: codeInput.toUpperCase() });
      const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(msg);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } else if (sub === 'delete') {
      const code = interaction.options.getString('code').toUpperCase();
      const deleted = await prisma.redeemCode.deleteMany({
        where: { code, guildId: interaction.guild.id },
      });

      if (deleted.count === 0) {
        const msg = await tGuild(interaction.guild.id, 'code.not_found');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      const msg = await tGuild(interaction.guild.id, 'code.deleted', { code });
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};