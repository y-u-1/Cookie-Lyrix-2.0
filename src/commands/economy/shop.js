// src/commands/economy/shop.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('../../lib/database');
const { getCoins, removeCoins, addCoins } = require('../../lib/levelService');
const { tGuild } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('個人商店を利用します / Use the private shop')
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('出品一覧を表示 / List items')
    )
    .addSubcommand((sub) =>
      sub
        .setName('sell')
        .setDescription('アイテムを出品 / List an item')
        .addStringOption((opt) => opt.setName('name').setDescription('商品名 / Item name').setRequired(true))
        .addIntegerOption((opt) => opt.setName('price').setDescription('価格 / Price').setMinValue(1).setRequired(true))
        .addIntegerOption((opt) => opt.setName('quantity').setDescription('在庫数 / Quantity').setMinValue(1).setRequired(false))
        .addStringOption((opt) => opt.setName('description').setDescription('説明文 / Description').setRequired(false))
        .addStringOption((opt) => opt.setName('image_url').setDescription('画像URL / Image URL').setRequired(false))
        .addRoleOption((opt) => opt.setName('role').setDescription('購入者に付与するロール / Role to grant').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('buy')
        .setDescription('アイテムを購入 / Buy an item')
        .addStringOption((opt) => opt.setName('id').setDescription('商品ID / Item ID').setRequired(true))
    ),
  async execute(interaction) {
    // buyサブコマンドがロール付与(Discord API)やDB操作を複数回行った後に
    // 応答していたため、先頭で一律deferしてから各処理を行う。
    // (ephemeralはdefer時にしか指定できないため、sellのみ非公開のまま維持する)
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: sub === 'sell' });

    if (sub === 'list') {
      const listings = await prisma.privateShopListing.findMany({
        where: { guildId: interaction.guild.id, active: true, quantity: { gt: 0 } },
      });

      if (listings.length === 0) {
        const msg = await tGuild(interaction.guild.id, 'shop.no_listings');
        const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(msg);
        return interaction.editReply({ embeds: [embed]});
      }

      const lines = listings.map((l) => {
        const desc = l.description ? `\n> ${l.description}` : '';
        return `**${l.name}** (ID: \`${l.id}\`)\n> 価格: ${l.price} コイン | 在庫: ${l.quantity}${desc}`;
      });
      
      const title = await tGuild(interaction.guild.id, 'shop.list_title');
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(title)
        .setDescription(lines.join('\n\n'));
      
      await interaction.editReply({ embeds: [embed] });

    } else if (sub === 'sell') {
      const name = interaction.options.getString('name');
      const price = interaction.options.getInteger('price');
      const quantity = interaction.options.getInteger('quantity') ?? 1;
      const description = interaction.options.getString('description');
      const imageUrl = interaction.options.getString('image_url');
      const role = interaction.options.getRole('role');

      const listing = await prisma.privateShopListing.create({
        data: {
          guildId: interaction.guild.id,
          sellerId: interaction.user.id,
          name,
          price,
          quantity,
          description,
          imageUrl,
          roleId: role?.id ?? null,
        },
      });

      const msg = await tGuild(interaction.guild.id, 'shop.listed', { name: name, price: price });
      const detail = await tGuild(interaction.guild.id, 'shop.listed_detail', { id: listing.id, quantity });
      const footerText = await tGuild(interaction.guild.id, 'shop.footer_wait');
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(`${msg}\n${detail}`)
        .setFooter({ text: footerText });
      
      await interaction.editReply({ embeds: [embed]});

    } else if (sub === 'buy') {
      const id = interaction.options.getString('id');
      
      // 条件付き更新: 在庫がある場合のみ購入処理
      const updateResult = await prisma.privateShopListing.updateMany({
        where: { id, active: true, quantity: { gt: 0 } },
        data: { quantity: { decrement: 1 } }
      });

      if (updateResult.count === 0) {
        const msg = await tGuild(interaction.guild.id, 'shop.not_found');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.editReply({ embeds: [embed]});
      }

      // 在庫を引いた後、商品情報を取得
      const listing = await prisma.privateShopListing.findUnique({ where: { id } });

      const buyerCoins = await getCoins(interaction.guild.id, interaction.user.id);
      if (buyerCoins < listing.price) {
        // 残高不足の場合、在庫を戻す
        await prisma.privateShopListing.update({ where: { id }, data: { quantity: { increment: 1 } } });
        const msg = await tGuild(interaction.guild.id, 'shop.insufficient_funds');
        const embed = new EmbedBuilder().setColor(0xED4245).setDescription(msg);
        return interaction.editReply({ embeds: [embed]});
      }

      // 購入処理
      await removeCoins(interaction.guild.id, interaction.user.id, listing.price);
      await addCoins(interaction.guild.id, listing.sellerId, listing.price);

      // 在庫0になったら非アクティブ化
      if (listing.quantity - 1 === 0) {
        await prisma.privateShopListing.update({ where: { id }, data: { active: false } });
      }

      // ロール付与
      if (listing.roleId) {
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (member) await member.roles.add(listing.roleId).catch(() => {});
      }

      const msg = await tGuild(interaction.guild.id, 'shop.purchased', { name: listing.name, price: listing.price });
      const embed = new EmbedBuilder().setColor(0x57F287).setDescription(msg).setThumbnail(listing.imageUrl || null);
      await interaction.editReply({ embeds: [embed] });

      // 販売者に通知
      try {
        const seller = await interaction.client.users.fetch(listing.sellerId);
        const sellerMsg = await tGuild(interaction.guild.id, 'shop.seller_notification', {
          name: listing.name,
          buyer: interaction.user.tag,
          price: listing.price,
        });
        const sellerEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setDescription(sellerMsg);
        await seller.send({ embeds: [sellerEmbed] });
      } catch (e) {}
    }
  },
};