const { Client, GatewayIntentBits, ApplicationCommandType, ApplicationCommandOptionType, PermissionsBitField, EmbedBuilder, MessageFlags, ActivityType } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

// --- AYARLAR ---
const YETKILI_ROLLER = ['1519479137360674868', '1504510912919371816']; // Genel komutları kullanabilecek rol ID'leri
const IP_BAN_YETKILI_ROL = '1519479137360674868'; // /ipyasakla komutunu kullanabilecek TEK rol ID'si
// ----------------

function yetkiKontrol(interaction) {
    return interaction.member.roles.cache.some(role => YETKILI_ROLLER.includes(role.id)) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
}

function ipBanYetkiKontrol(interaction) {
    return interaction.member.roles.cache.has(IP_BAN_YETKILI_ROL) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
}

async function guvenliDM(member, mesaj) {
    try {
        if (typeof mesaj === 'string') {
            await member.send({ content: mesaj });
        } else {
            await member.send(mesaj);
        }
    } catch (error) {
        // Kullanıcının DM'leri kapalıysa botun çökmesini önler
    }
}

// Güvenli toplu DM göndermek için gecikme fonksiyonu (Mil saniye cinsinden)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

client.once('clientReady', async () => {
    console.log(`${client.user.tag} aktif!`);

    // --- BOT DURUMU (CUSTOM STATUS / OYNUYOR) ---
    client.user.setPresence({
        activities: [{ 
            name: '404 Family is The Best!', 
            type: ActivityType.Playing // Oynuyor olarak gösterir
        }],
        status: 'online', // Botu çevrimiçi (yeşil) gösterir

    const commands = [
        {
            name: 'tamyasakla',
            description: 'Kullanıcıyı tamamen yasaklar',
            options: [
                { name: 'kullanici', description: 'Yasaklanacak kullanıcı', type: ApplicationCommandOptionType.User, required: true },
                { name: 'sebep', description: 'Yasaklama sebebi', type: ApplicationCommandOptionType.String, required: false }
            ]
        },
        {
            name: 'ipyasakla',
            description: 'Kullanıcıyı IP adresiyle birlikte yasaklar (Özel Yetki)',
            options: [
                { name: 'kullanici', description: 'IP yasaklaması atılacak kullanıcı', type: ApplicationCommandOptionType.User, required: true },
                { name: 'sebep', description: 'Yasaklama sebebi', type: ApplicationCommandOptionType.String, required: false }
            ]
        },
        {
            name: 'sustur',
            description: 'Kullanıcıyı süreli olarak susturur (Timeout)',
            options: [
                { name: 'kullanici', description: 'Susturulacak kullanıcı', type: ApplicationCommandOptionType.User, required: true },
                { name: 'sure', description: 'Dakika cinsinden süre', type: ApplicationCommandOptionType.Integer, required: true }
            ]
        },
        {
            name: 'susturarak',
            description: 'Kullanıcının susturmasını (Timeout) kaldırır',
            options: [
                { name: 'kullanici', description: 'Susturması kaldırılacak kullanıcı', type: ApplicationCommandOptionType.User, required: true }
            ]
        },
        {
            name: 'kilit',
            description: 'Bulunduğunuz kanalı kilitler veya açar',
            options: [
                {
                    name: 'durum',
                    description: 'Kilitle veya Aç',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: [
                        { name: 'Kilitle', value: 'kilitle' },
                        { name: 'Aç', value: 'ac' }
                    ]
                }
            ]
        },
        {
            name: 'cekilis',
            description: 'Canlı süreli çekiliş başlatır (@everyone ve Üyelere DM)',
            options: [
                { name: 'sure', description: 'Saniye cinsinden süre', type: ApplicationCommandOptionType.Integer, required: true },
                { name: 'odul', description: 'Çekiliş ödülü', type: ApplicationCommandOptionType.String, required: true }
            ]
        },
        {
            name: 'duyuru',
            description: 'Sunucuda duyuru yapar (@everyone ve Üyelere DM)',
            options: [
                { name: 'mesaj', description: 'Duyurulacak metin', type: ApplicationCommandOptionType.String, required: true }
            ]
        },
        {
            name: 'uyar',
            description: 'Kullanıcıyı uyarır ve DM gönderir',
            options: [
                { name: 'kullanici', description: 'Uyarılacak kullanıcı', type: ApplicationCommandOptionType.User, required: true },
                { name: 'sebep', description: 'Uyarı sebebi', type: ApplicationCommandOptionType.String, required: false }
            ]
        },
        {
            name: 'unban',
            description: 'Kullanıcının yasağını (Normal veya IP) kaldırır',
            options: [
                { name: 'id', description: 'Yasağı kaldırılacak kullanıcı ID\'si', type: ApplicationCommandOptionType.String, required: true }
            ]
        },
        {
            name: 'kick',
            description: 'Kullanıcıyı sunucudan atar',
            options: [
                { name: 'kullanici', description: 'Sunucudan atılacak kullanıcı', type: ApplicationCommandOptionType.User, required: true },
                { name: 'sebep', description: 'Atılma sebebi', type: ApplicationCommandOptionType.String, required: false }
            ]
        }
    ];

    await client.application.commands.set(commands);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (message.content.toLowerCase() === 'sa') {
        const cevaplar = [
            `Aleyküm Selam hoca, hoş geldin! Gözümüz yollarda kalmıştı. 😎`,
            `As, hoş geldin! Sonunda biri ortama neşe getirdi. 🎉`,
            `Aleyküm Selam! Geç otur şöyle, ne ikram edelim? ☕`,
            `As! Hoş geldin kral, biz de tam senden bahsediyorduk. 👑`
        ];
        const rastgele = cevaplar[Math.floor(Math.random() * cevaplar.length)];
        return message.reply(rastgele);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, channel, guild, user: yetkili } = interaction;

    // Yetki Kontrolleri
    if (commandName === 'ipyasakla') {
        if (!ipBanYetkiKontrol(interaction)) {
            return interaction.reply({ content: 'Bu özel komutu kullanmak için gerekli role sahip değilsiniz.', ephemeral: true });
        }
    } else {
        if (!yetkiKontrol(interaction)) {
            return interaction.reply({ content: 'Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz.', ephemeral: true });
        }
    }

    if (commandName === 'tamyasakla') {
        const user = options.getMember('kullanici');
        const sebep = options.getString('sebep') || 'Sebep belirtilmedi';
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });

        const dmEmbed = new EmbedBuilder()
            .setTitle('❌ Sunucudan Yasaklandınız')
            .setDescription(`**${guild.name}** sunucusundan tamamen yasaklandınız.`)
            .addFields(
                { name: 'Yasaklayan Yetkili', value: `${yetkili.tag}`, inline: true },
                { name: 'Sebep', value: sebep, inline: true }
            )
            .setColor('#ff0000')
            .setTimestamp();

        await guvenliDM(user, { embeds: [dmEmbed] });
        await user.ban({ reason: `Yetkili: ${yetkili.tag} | Sebep: ${sebep}` });
        await interaction.reply({ content: `${user.user.tag} başarıyla yasaklandı.` });
        await channel.send({ content: `${user.user.tag} sunucudan tamamen yasaklanmıştır. Yetkili: ${yetkili.toString()}` });
    }

    if (commandName === 'ipyasakla') {
        await interaction.deferReply({ ephemeral: true });

        const user = options.getMember('kullanici');
        const sebep = options.getString('sebep') || 'Sebep belirtilmedi';
        if (!user) return interaction.editReply({ content: 'Kullanıcı bulunamadı.' });

        const dmEmbed = new EmbedBuilder()
            .setTitle('💥 IP Yasaklaması Alındı')
            .setDescription(`**${guild.name}** sunucusundan IP adresinizle birlikte yasaklandınız.`)
            .addFields(
                { name: 'Yasaklayan Yetkili', value: `${yetkili.tag}`, inline: true },
                { name: 'Sebep', value: sebep, inline: true }
            )
            .setColor('#7a0000')
            .setTimestamp();

        await guvenliDM(user, { embeds: [dmEmbed] });

        try {
            await guild.bans.create(user.id, { 
                deleteMessageSeconds: 60 * 60 * 24 * 7, 
                reason: `IP BAN | Yetkili: ${yetkili.tag} | Sebep: ${sebep}` 
            });

            await interaction.editReply({ content: `${user.user.tag} IP adresiyle birlikte uzaklaştırıldı.` });
            await channel.send({ content: `${user.user.tag} sunucudan IP adresiyle birlikte uzaklaştırılmıştır. Yetkili: ${yetkili.toString()}` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Kullanıcı yasaklanırken bir hata oluştu. Botun rolünün en üstte olduğundan emin olun.' });
        }
    }

    if (commandName === 'sustur') {
        const user = options.getMember('kullanici');
        const sure = options.getInteger('sure');
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });

        await user.timeout(sure * 60 * 1000);
        
        const dmEmbed = new EmbedBuilder()
            .setTitle('🔇 Susturuldunuz')
            .setDescription(`**${guild.name}** sunucusunda susturuldunuz.`)
            .addFields(
                { name: 'Süre', value: `${sure} Dakika`, inline: true },
                { name: 'Yetkili', value: `${yetkili.tag}`, inline: true }
            )
            .setColor('#333333')
            .setTimestamp();

        await guvenliDM(user, { embeds: [dmEmbed] });
        await interaction.reply({ content: `${user.user.tag} ${sure} dakika süreyle susturuldu.`, ephemeral: true });
        await channel.send({ content: `${user.user.tag} sunucuda ${sure} dakika süreyle susturulmuştur. Yetkili: ${yetkili.toString()}` });
    }

    if (commandName === 'susturarak') {
        const user = options.getMember('kullanici');
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });

        await user.timeout(null);

        const dmEmbed = new Builder()
            .setTitle('🔊 Susturmanız Kaldırıldı')
            .setDescription(`**${guild.name}** sunucusundaki susturmanız kaldırıldı.`)
            .addFields({ name: 'İşlemi Yapan Yetkili', value: `${yetkili.tag}`, inline: true })
            .setColor('#00ff00')
            .setTimestamp();

        await guvenliDM(user, { embeds: [dmEmbed] });
        await interaction.reply({ content: `${user.user.tag} kullanıcısının susturması kaldırıldı.`, ephemeral: true });
        await channel.send({ content: `${user.user.tag} kullanıcısının susturması kaldırılmıştır. Yetkili: ${yetkili.toString()}` });
    }

    if (commandName === 'kilit') {
        const durum = options.getString('durum');

        if (durum === 'ac') {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
            await interaction.reply({ content: 'Kanal kilidi açıldı.' });
        } else {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
            await interaction.reply({ content: 'Kanal kilitlendi.' });
        }
    }

    if (commandName === 'cekilis') {
        let kalanSure = options.getInteger('sure');
        const odul = options.getString('odul');

        await interaction.reply({ content: 'Çekiliş sistemi kuruluyor ve üyelere DM bildirimi gönderiliyor...', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🎉 ÇEKİLİŞ BAŞLADI 🎉')
            .setDescription(`Ödül: **${odul}**\nKalan Süre: **${kalanSure} saniye**\nKatılımcı Sayısı: **0**\nKatılmak için aşağıdaki 🎉 tepkisine tıklayın!`)
            .addFields({ name: 'Çekilişi Düzenleyen', value: `${yetkili.tag} (${yetkili.toString()})` })
            .setColor('#ff0000')
            .setTimestamp();

        const msg = await channel.send({ content: '@everyone yeni çekiliş başladı!', embeds: [embed], allowedMentions: { parse: ['everyone'] } });
        await msg.react('🎉');

        // --- ÇEKİLİŞ TOPLU DM SİSTEMİ ---
        const dmEmbedCekilis = new EmbedBuilder()
            .setTitle('🎉 Sunucuda Çekiliş Başladı!')
            .setDescription(`**${guild.name}** sunucusunda harika bir çekiliş başladı, kaçırma!`)
            .addFields({ name: '🎁 Ödül', value: odul })
            .setColor('#ff0000')
            .setTimestamp();

        const uyelerCekilis = await guild.members.fetch();
        (async () => {
            for (const [id, uye] of uyelerCekilis) {
                if (!uye.user.bot) {
                    await guvenliDM(uye, { embeds: [dmEmbedCekilis] });
                    await sleep(3000); // 3 saniye gecikme (Güvenlik Duvarı İçin)
                }
            }
        })();
        // ---------------------------------

        const interval = setInterval(async () => {
            kalanSure -= 3;
            if (kalanSure <= 0) {
                clearInterval(interval);
                return;
            }

            try {
                const tazeMesaj = await channel.messages.fetch(msg.id);
                const tepki = tazeMesaj.reactions.cache.get('🎉');
                let sayi = 0;
                if (tepki) {
                    const kullanicilar = await tepki.users.fetch();
                    sayi = kullanicilar.filter(u => !u.bot).size;
                }

                const guncelEmbed = new EmbedBuilder()
                    .setTitle('🎉 ÇEKİLİŞ DEVAM EDİYOR 🎉')
                    .setDescription(`Ödül: **${odul}**\nKalan Süre: **${kalanSure} saniye**\nKatılımcı Sayısı: **${sayi}**\nKatılmak için aşağıdaki 🎉 tepkisine tıklayın!`)
                    .addFields({ name: 'Çekilişi Düzenleyen', value: `${yetkili.tag} (${yetkili.toString()})` })
                    .setColor('#ff0000')
                    .setTimestamp();

                await msg.edit({ embeds: [guncelEmbed] });
            } catch (err) {
                clearInterval(interval);
            }
        }, 3000);

        setTimeout(async () => {
            try {
                const tazeMesaj = await channel.messages.fetch(msg.id);
                const tepki = tazeMesaj.reactions.cache.get('🎉');
                const kullanicilar = await tepki.users.fetch();
                const adaylar = kullanicilar.filter(u => !u.bot).map(u => u);

                if (adaylar.length === 0) {
                    const bitisEmbed = new EmbedBuilder()
                        .setTitle('🎉 ÇEKİLİŞ BİTTİ 🎉')
                        .setDescription(`Ödül: **${odul}**\nKatılımcı olmamasından dolayı kazanan seçilemedi.`)
                        .addFields({ name: 'Çekilişi Düzenleyen', value: `${yetkili.tag} (${yetkili.toString()})` })
                        .setColor('#555555')
                        .setTimestamp();
                    
                    await msg.edit({ embeds: [bitisEmbed] });
                    return channel.send({ content: `Çekilişe kimse katılmadığı için kazanan olmadı.` });
                }

                const kazanan = adaylar[Math.floor(Math.random() * adaylar.length)];
                
                const bitisEmbed = new EmbedBuilder()
                    .setTitle('🎉 ÇEKİLİŞ BİTTİ 🎉')
                    .setDescription(`Ödül: **${odul}**\nKazanan: ${kazanan.toString()}`)
                    .addFields({ name: 'Çekilişi Düzenleyen', value: `${yetkili.tag} (${yetkili.toString()})` })
                    .setColor('#00ff00')
                    .setTimestamp();

                await msg.edit({ embeds: [bitisEmbed] });
                await channel.send({ content: `🎉 Tebrikler ${kazanan.toString()}! **${odul}** çekilişini kazandın!` });
                
                const kazananUye = guild.members.cache.get(kazanan.id);
                if (kazananUye) {
                    const kazananDmEmbed = new EmbedBuilder()
                        .setTitle('🎁 Çekiliş Kazandınız!')
                        .setDescription(`**${guild.name}** sunucusunda düzenlenen çekilişi kazandınız.`)
                        .addFields(
                            { name: 'Kazanılan Ödül', value: odul, inline: true },
                            { name: 'Çekilişi Yapan Yetkili', value: yetkili.tag, inline: true }
                        )
                        .setColor('#00ff00')
                        .setTimestamp();

                    await guvenliDM(kazananUye, { embeds: [kazananDmEmbed] });
                }
            } catch (err) {}
        }, options.getInteger('sure') * 1000);
    }

    if (commandName === 'duyuru') {
        const duyuruMetni = options.getString('mesaj');

        const embed = new EmbedBuilder()
            .setTitle('📢 DUYURU')
            .setDescription(duyuruMetni)
            .addFields({ name: 'Duyuruyu Yayınlayan', value: `${yetkili.tag} (${yetkili.toString()})` })
            .setColor('#00ff00')
            .setTimestamp();

        await interaction.reply({ content: 'Duyuru kanala gönderiliyor ve üyelere tek tek DM ile iletiliyor...', ephemeral: true });
        await channel.send({ content: '@everyone', embeds: [embed], allowedMentions: { parse: ['everyone'] } });

        // --- DUYURU TOPLU DM SİSTEMİ ---
        const dmEmbedDuyuru = new EmbedBuilder()
            .setTitle(`📢 ${guild.name} Sunucusundan Yeni Duyuru!`)
            .setDescription(duyuruMetni)
            .setColor('#00ff00')
            .setTimestamp();

        const uyelerDuyuru = await guild.members.fetch();
        (async () => {
            for (const [id, uye] of uyelerDuyuru) {
                if (!uye.user.bot) {
                    await guvenliDM(uye, { embeds: [dmEmbedDuyuru] });
                    await sleep(3000); // 3 saniye gecikme (Güvenlik Duvarı İçin)
                }
            }
        })();
        // -------------------------------
    }

    if (commandName === 'uyar') {
        const user = options.getMember('kullanici');
        const sebep = options.getString('sebep') || 'Sebep belirtilmedi';
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });

        const dmEmbed = new EmbedBuilder()
            .setTitle('⚠️ Uyarı Aldınız')
            .setDescription(`**${guild.name}** sunucusunda uyarıldınız.`)
            .addFields(
                { name: 'Uyarılma Sebebi', value: sebep },
                { name: 'Uyaran Yetkili', value: yetkili.tag }
            )
            .setColor('#ffff00')
            .setTimestamp();

        await guvenliDM(user, { embeds: [dmEmbed] });
        await interaction.reply({ content: `${user.user.tag} başarıyla uyarıldı ve DM yoluyla bilgilendirildi.`, ephemeral: true });
        await channel.send({ content: `${user.user.tag} yetkili tarafından uyarılmıştır. Yetkili: ${yetkili.toString()}\nSebep: ${sebep}` });
    }

    if (commandName === 'unban') {
        const userId = options.getString('id');

        await guild.members.unban(userId);
        await interaction.reply({ content: `ID'si girilen kullanıcının yasağı başarıyla kaldırıldı.`, ephemeral: true });
        await channel.send({ content: `\`${userId}\` ID'li kullanıcının yasağı (Normal/IP) kaldırılmıştır. İşlemi Yapan: ${yetkili.toString()}` });

        try {
            const fetchUser = await client.users.fetch(userId);
            if (fetchUser) {
                const unbanDmEmbed = new EmbedBuilder()
                    .setTitle('🔓 Yasağınız Kaldırıldı')
                    .setDescription(`**${guild.name}** sunucusundaki yasağınız kaldırıldı. Artık sunucuya tekrar giriş yapabilirsiniz.`)
                    .addFields({ name: 'İşlemi Yapan Yetkili', value: yetkili.tag })
                    .setColor('#00ff00')
                    .setTimestamp();
                await fetchUser.send({ embeds: [unbanDmEmbed] }).catch(() => null);
            }
        } catch (e) {}
    }

    if (commandName === 'kick') {
        const user = options.getMember('kullanici');
        const sebep = options.getString('sebep') || 'Sebep belirtilmedi';
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', ephemeral: true });

        const dmEmbed = new EmbedBuilder()
            .setTitle('👢 Sunucudan Atıldınız')
            .setDescription(`**${guild.name}** sunucusundan atıldınız.`)
            .addFields(
                { name: 'Atılma Sebebi', value: sebep },
                { name: 'İşlemi Yapan Yetkili', value: yetkili.tag }
            )
            .setColor('#ff5500')
            .setTimestamp();

        await guvenliDM(user, { embeds: [dmEmbed] });
        await user.kick(`Yetkili: ${yetkili.tag} | Sebep: ${sebep}`);
        await interaction.reply({ content: `${user.user.tag} sunucudan atıldı.`, ephemeral: true });
        await channel.send({ content: `${user.user.tag} sunucudan atılmıştır. Yetkili: ${yetkili.toString()}\nSebep: ${sebep}` });
    }
});

// Otomatik DM Sistemleri (Log Kayıtları)
client.on('guildAuditLogEntryCreate', async (auditLog, guild) => {
    const { action, targetId } = auditLog;

    if (action === 22) { 
        const member = await guild.members.fetch(targetId).catch(() => null);
        if (member) {
            const dmEmbed = new EmbedBuilder()
                .setTitle('❌ Banlandınız')
                .setDescription(`**${guild.name}** sunucusundan uzaklaştırıldınız.`)
                .setColor('#ff0000')
                .setTimestamp();

            await guvenliDM(member, { embeds: [dmEmbed] });
        }
    }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    const eklenenRoller = newRoles.filter(role => !oldRoles.has(role.id));
    const silinenRoller = oldRoles.filter(role => !newRoles.has(role.id));

    if (eklenenRoller.size > 0) {
        const rolIsimleri = eklenenRoller.map(r => r.name).join(', ');
        const dmEmbed = new EmbedBuilder()
            .setTitle('➕ Yeni Rol Eklendi')
            .setDescription(`**${newMember.guild.name}** sunucusunda size yeni rol(ler) tanımlandı.`)
            .addFields({ name: 'Eklenen Rol(ler)', value: rolIsimleri })
            .setColor('#00ff00')
            .setTimestamp();

        await guvenliDM(newMember, { embeds: [dmEmbed] });
    }

    if (silinenRoller.size > 0) {
        const rolIsimleri = silinenRoller.map(r => r.name).join(', ');
        const dmEmbed = new EmbedBuilder()
            .setTitle('➖ Rol Kaldırıldı')
            .setDescription(`**${newMember.guild.name}** sunucusunda üzerinizden rol(ler) alındı.`)
            .addFields({ name: 'Silinen Rol(ler)', value: rolIsimleri })
            .setColor('#ff0000')
            .setTimestamp();

        await guvenliDM(newMember, { embeds: [dmEmbed] });
    }

    if (!oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil) {
        const dmEmbed = new EmbedBuilder()
            .setTitle('🔇 Susturuldunuz')
            .setDescription(`**${newMember.guild.name}** sunucusunda ceza sistemleri tarafından susturuldunuz (Timeout).`)
            .setColor('#333333')
            .setTimestamp();

        await guvenliDM(newMember, { embeds: [dmEmbed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
