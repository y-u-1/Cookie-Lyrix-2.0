// src/commands/general/ai.js
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { prisma } = require('../../lib/database');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ai')
    .setDescription('AI機能を管理します / Manage AI features')
    .addSubcommand((sub) =>
      sub
        .setName('persona')
        .setDescription('AIの性格を変更します / Change AI persona')
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('性格 / Persona type')
            .setRequired(true)
            .addChoices(
              { name: '通常 (Normal)', value: 'normal' },
              { name: 'ツンデレ (Tsundere)', value: 'tsundere' },
              { name: '恥ずかしがり屋 (Shy)', value: 'shy' },
              { name: '元気 (Genki)', value: 'genki' }
            )
        )
    ),
  category: '一般 / General',
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'persona') {
      const persona = interaction.options.getString('type');
      
      await prisma.guildSettings.upsert({
        where: { guildId: interaction.guild.id },
        update: { aiPersona: persona },
        create: { guildId: interaction.guild.id, aiPersona: persona },
      });

      const msg = await tGuild(interaction.guild.id, 'ai.persona_set', { persona });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};