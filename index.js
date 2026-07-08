const { 
    Client, 
    GatewayIntentBits, 
    ApplicationCommandType, 
    ApplicationCommandOptionType, 
    PermissionsBitField, 
    EmbedBuilder, 
    MessageFlags, 
    ActivityType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
require('dotenv').config();
const os = require('os');
const fs = require('fs');

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
const YETKILI_ROLLER = ['1519479137360674868', '1504510912919371816']; 
const IP_BAN_YETKILI_ROL = '1519479137360674868'; 
const IP_BAN_LOG_KANAL_ID = '1524324280844685493'; 
// ----------------

const cekilisKatilimcilari = new Map();
const dbDosyasi = './ekonomi.json';

if (!fs.existsSync(dbDosyasi)) {
    fs.writeFileSync(dbDosyasi, JSON.stringify({}, null, 4));
}

function veriOku() {
    return JSON.parse(fs.readFileSync(dbDosyasi, 'utf8'));
}

function veriYaz(data) {
    fs.writeFileSync(dbDosyasi, JSON.stringify(data, null, 4));
}

function profilGereksinim(userId) {
    const data = veriOku();
    if (!data[userId]) {
        data[userId] = { bakiye: 100, xp: 0, seviye: 1, gunlukZaman: 0 }; 
        veriYaz(data);
    }
    return data[userId];
}

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
    } catch (error) {}
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

client.once('clientReady', async () => {
    console.log(`${client.user.tag} aktif!`);

    client.user.setPresence({
        activities: [{ name: '404 Family is The Best', type: ActivityType.Playing }],
        status: 'online',
    });

    const commands = [
        {
            name: 'yardım',
            description: 'ℹ️ Botun tüm komutlarını ve kullanım rehberini gösterir'
        },
        {
            name: 'profil',
            description: '📊 Bakiyenizi, seviyenizi ve aktiflik istatistiklerinizi gösterir',
            options: [{ name: 'kullanici', description: 'Profiline bakılacak üye', type: ApplicationCommandOptionType.User, required: false }]
        },
        {
            name: 'bakiye',
            description: '💰 Mevcut bakiyenizi hızlıca sorgular',
            options: [{ name: 'kullanici', description: 'Bakiyesine bakılacak üye', type: ApplicationCommandOptionType.User, required: false }]
        },
        {
            name: 'gönder',
            description: '💸 Başka bir üyeye cüzdanınızdan nakit transfer edersiniz',
            options: [
                { name: 'kullanici', description: 'Para gönderilecek üye', type: ApplicationCommandOptionType.User, required: true },
                { name: 'miktar', description: 'Gönderilecek miktar', type: ApplicationCommandOptionType.Integer, required: true }
            ]
        },
        {
            name: 'günlük',
            description: '🎁 Her 24 saatte bir şansınıza göre ücretsiz hediye nakit verir'
        },
        {
            name: '404cekilis',
            description: '🪙 Belirtilen miktar ödüllü otomatik teslimatlı nakit çekilişi başlatır (Yetkili)',
            options: [
                { name: 'sure', description: 'Saniye cinsinden çekiliş süresi', type: ApplicationCommandOptionType.Integer, required: true },
                { name: 'miktar', description: 'Dağıtılacak para miktarı', type: ApplicationCommandOptionType.Integer, required: true }
            ]
        },
        {
            name: 'yazıtura',
            description: '🪙 Belirttiğiniz miktar ile yazı tura oynarsınız',
            options: [
                { name: 'miktar', description: 'Ortaya koyulacak miktar', type: ApplicationCommandOptionType.Integer, required: true },
                { 
                    name: 'tahmin', 
                    description: 'Yazı mı Tura mı?', 
                    type: ApplicationCommandOptionType.String, 
                    required: true,
                    choices: [{ name: 'Yazı', value: 'yazi' }, { name: 'Tura', value: 'tura' }]
                }
            ]
        },
        {
            name: 'zar',
            description: '🎲 Bot ile zar kapıştırma oyunu oynarsınız',
            options: [{ name: 'miktar', description: 'Ortaya koyulacak miktar', type: ApplicationCommandOptionType.Integer, required: true }]
        },
        {
            name: 'slots',
            description: '🎰 Şansınızı şık slot makinesinde denersiniz',
            options: [{ name: 'miktar', description: 'Ortaya koyulacak miktar', type: ApplicationCommandOptionType.Integer, required: true }]
        },
        {
            name: 'tamyasakla',
            description: '🛡️ Belirtilen kullanıcıyı sunucudan tamamen yasaklar (Ban)',
            options: [
                { name: 'kullanici', description: 'Yasaklanacak üye', type: ApplicationCommandOptionType.User, required: true },
                { name: 'sebep', description: 'Yasaklama gerekçesi', type: ApplicationCommandOptionType.String, required: false }
            ]
        },
        {
            name: 'ipyasakla',
            description: '💥 Kullanıcıyı IP adresiyle birlikte sunucudan uzaklaştırır',
            options: [
                { name: 'kullanici', description: 'IP ban atılacak üye', type: ApplicationCommandOptionType.User, required: true },
                { name: 'sebep', description: 'Uzaklaştırma gerekçesi', type: ApplicationCommandOptionType.String, required: false }
            ]
        },
        {
            name: 'sustur',
            description: '🔇 Kullanıcıyı belirtilen süre kadar susturur (Timeout)',
            options: [
                { name: 'kullanici', description: 'Susturulacak üye', type: ApplicationCommandOptionType.User, required: true },
                { name: 'sure', description: 'Dakika cinsinden süre', type: ApplicationCommandOptionType.Integer, required: true }
            ]
        },
        {
            name: 'susturarak',
            description: '🔊 Cezalı bir kullanıcının susturma süresini erkenden kaldırır',
            options: [
                { name: 'kullanici', description: 'Susturması açılacak üye', type: ApplicationCommandOptionType.User, required: true }
            ]
        },
        {
            name: 'kilit',
            description: '🔒 Bulunduğunuz metin kanalını yazıya kapatır veya açar',
            options: [
                {
                    name: 'durum',
                    description: 'Kanalın kilit durumunu seçin',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    choices: [{ name: 'Kanalı Kilitle 🔒', value: 'kilitle' }, { name: 'Kanalı Aç 🔓', value: 'ac' }]
                }
            ]
        },
        {
            name: 'cekilis',
            description: '🎁 Standart (Normal Ödüllü) butonlu çekiliş sistemi başlatır',
            options: [
                { name: 'sure', description: 'Saniye cinsinden çekiliş süresi', type: ApplicationCommandOptionType.Integer, required: true },
                { name: 'odul', description: 'Verilecek çekiliş ödülü', type: ApplicationCommandOptionType.String, required: true }
            ]
        },
        {
            name: 'duyuru',
            description: '📢 Tüm sunucuya @everyone etiketiyle şık duyuru paneli gönderir',
            options: [{ name: 'mesaj', description: 'Duyurulacak metin içeriği', type: ApplicationCommandOptionType.String, required: true }]
        },
        {
            name: 'uyar',
            description: '⚠️ Kuralları ihlal eden üyeyi uyarır',
            options: [
                { name: 'kullanici', description: 'Uyarılacak üye', type: ApplicationCommandOptionType.User, required: true },
                { name: 'sebep', description: 'Uyarı gerekçesi', type: ApplicationCommandOptionType.String, required: false }
            ]
        },
        {
            name: 'unban',
            description: '🔓 Yasaklanmış bir üyenin engelini ID kullanarak kaldırır',
            options: [{ name: 'id', description: 'Yasağı kaldırılacak üyenin Discord ID\'si', type: ApplicationCommandOptionType.String, required: true }]
        },
        {
            name: 'kick',
            description: '👢 Belirtilen üyeyi sunucudan tek seferlik atar',
            options: [
                { name: 'kullanici', description: 'Sunucudan atılacak üye', type: ApplicationCommandOptionType.User, required: true },
                { name: 'sebep', description: 'Atılma gerekçesi', type: ApplicationCommandOptionType.String, required: false }
            ]
        },
        {
            name: 'istatistik',
            description: '⚙️ Botun ping, uptime ve donanım verilerini gösterir'
        }
    ];

    await client.application.commands.set(commands);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const data = veriOku();
    
    if (!data[userId]) {
        data[userId] = { bakiye: 100, xp: 0, seviye: 1, gunlukZaman: 0 };
    }

    const kazanilanBakiye = Math.floor(Math.random() * 5) + 1;
    const kazanilanXp = Math.floor(Math.random() * 11) + 5;

    data[userId].bakiye += kazanilanBakiye;
    data[userId].xp += kazanilanXp;

    const gerekenXp = data[userId].seviye * 100;
    if (data[userId].xp >= gerekenXp) {
        data[userId].xp -= gerekenXp;
        data[userId].seviye += 1;
        
        const lvlEmbed = new EmbedBuilder()
            .setTitle('🎉 Seviye Atladın!')
            .setDescription(`Tebrikler ${message.author.toString()}, sunucuda aktif kalarak **Level ${data[userId].seviye}** oldun! 🚀`)
            .setColor('#57F287');
        
        message.channel.send({ embeds: [lvlEmbed] }).then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    veriYaz(data);

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
    if (interaction.isButton()) {
        const [action, msgId] = interaction.customId.split('_');
        
        if (action === 'helpmenu') {
            const yardimEmbed = new EmbedBuilder()
                .setTitle('📚 404 Family Bot - Gelişmiş Komut Rehberi')
                .setDescription('Marpel ve Erensi altyapısıyla hazırlanan modern komut listemiz aşağıdadır:')
                .setColor('#5865F2')
                .addFields(
                    { name: '🪙 OwO Ekonomi ve Mini Oyunlar (Herkes Kullanabilir)', value: `> \`/profil\` - Seviyenizi ve bakiyenizi listeler.\n> \`/bakiye\` - Cüzdan durumunu söyler.\n> \`/gönder\` - Başka bir hesaba nakit transfer eder.\n> \`/günlük\` - 24 saatlik hediye paranızı toplarsınız.\n> \`/yazıtura\` - Bahis ortaya koyup yazı-tura oynarsınız.\n> \`/zar\` - Botla karşılıklı zar kapıştırırsınız.\n> \`/slots\` - Şanslı slot makinesini çevirirsiniz.` },
                    { name: '🛡️ Yetkili Moderasyon Komutları', value: `> \`/404cekilis\` - Otomatik teslimatlı Nakit çekilişi kurar.\n> \`/tamyasakla\` - Üyeyi sunucudan banlar.\n> \`/ipyasakla\` - Üyeyi IP adresiyle kalıcı engeller.\n> \`/sustur\` - Belirtilen dakika kadar timeout atar.\n> \`/susturarak\` - Üyenin susturmasını erken kaldırır.\n> \`/uyar\` - Üyeye uyarı puanı ekler.\n> \`/kick\` - Üyeyi sunucudan dışarı atar.` }
                )
                .setFooter({ text: '404 Family • Her Zaman En İyisi' }).setTimestamp();
            
            return interaction.reply({ embeds: [yardimEmbed], flags: [MessageFlags.Ephemeral] });
        }

        if (!cekilisKatilimcilari.has(msgId)) return interaction.reply({ content: '❌ Bu çekiliş aktif değil veya süresi dolmuş.', flags: [MessageFlags.Ephemeral] });
        const liste = cekilisKatilimcilari.get(msgId);

        if (action === 'katil') {
            if (liste.includes(interaction.user.id)) {
                const index = liste.indexOf(interaction.user.id);
                liste.splice(index, 1);
                cekilisKatilimcilari.set(msgId, liste);
                return interaction.reply({ content: '👋 Çekilişten başarıyla ayrıldınız.', flags: [MessageFlags.Ephemeral] });
            } else {
                liste.push(interaction.user.id);
                cekilisKatilimcilari.set(msgId, liste);
                return interaction.reply({ content: '🎉 Çekilişe başarıyla katıldınız! Bol şans.', flags: [MessageFlags.Ephemeral] });
            }
        }

        if (action === 'liste') {
            if (liste.length === 0) return interaction.reply({ content: '👥 Henüz katılan üye yok.', flags: [MessageFlags.Ephemeral] });
            const isimler = liste.slice(0, 30).map((id, index) => `${index + 1}. <@${id}>`).join('\n');
            const listeEmbed = new EmbedBuilder()
                .setTitle('👥 Aktif Katılımcı Listesi')
                .setDescription(`Toplam Katılımcı: **${liste.length}**\n\n${isimler}${liste.length > 30 ? '\n*...ve daha fazlası*' : ''}`)
                .setColor('#5865F2').setTimestamp();
            return interaction.reply({ embeds: [listeEmbed], flags: [MessageFlags.Ephemeral] });
        }
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, channel, guild, user: yetkili } = interaction;

    // --- HERKESE AÇIK KOMUTLAR ---
    const herkesKullanabilir = ['istatistik', 'yardım', 'profil', 'bakiye', 'gönder', 'yazıtura', 'zar', 'slots', 'günlük'];

    if (commandName === 'ipyasakla') {
        if (!ipBanYetkiKontrol(interaction)) return interaction.reply({ content: '❌ Bu özel koruma komutunu sadece tanımlı IP-Ban yetkilileri kullanabilir.', flags: [MessageFlags.Ephemeral] });
    } else if (!herkesKullanabilir.includes(commandName)) {
        if (!yetkiKontrol(interaction)) return interaction.reply({ content: '❌ Bu komutu kullanmak için yetkiniz yetersiz.', flags: [MessageFlags.Ephemeral] });
    }

    // --- GÜNLÜK ÖDÜL SİSTEMİ ---
    if (commandName === 'günlük') {
        const uVeri = profilGereksinim(interaction.user.id);
        const beklemeSuresi = 24 * 60 * 60 * 1000; // 24 Saat
        const kalanZaman = uVeri.gunlukZaman + beklemeSuresi - Date.now();

        if (kalanZaman > 0) {
            const saat = Math.floor(kalanZaman / (1000 * 60 * 60));
            const dakika = Math.floor((kalanZaman % (1000 * 60 * 60)) / (1000 * 60));
            return interaction.reply({ content: `⏳ Günlük ödülünü zaten aldın! Tekrar alabilmek için **${saat} saat ${dakika} dakika** beklemelisin.`, flags: [MessageFlags.Ephemeral] });
        }

        const hediyePara = Math.floor(Math.random() * 201) + 50; // 50 - 250 arası
        const data = veriOku();
        data[interaction.user.id].bakiye += hediyePara;
        data[interaction.user.id].gunlukZaman = Date.now();
        veriYaz(data);

        const dailyEmbed = new EmbedBuilder()
            .setTitle('🎁 Günlük Hediye Dağıtımı')
            .setDescription(`🎉 Harika! Bugünlük şansına tam **+${hediyePara} adet [404 Nakit]** cüzdanına eklendi!\n\nYeni Toplam Bakiyen: **${data[interaction.user.id].bakiye} adet [404 Nakit]**`)
            .setColor('#57F287')
            .setTimestamp();

        return interaction.reply({ embeds: [dailyEmbed] });
    }

    // --- OTOMATİK TESLİMATLI ÇEKİLİŞ ---
    if (commandName === '404cekilis') {
        let kalanSure = options.getInteger('sure');
        const miktar = options.getInteger('miktar');

        if (miktar <= 0) return interaction.reply({ content: '❌ Geçersiz miktar.', flags: [MessageFlags.Ephemeral] });
        await interaction.reply({ content: '🪙 Otomatik nakit çekilişi kuruluyor...', flags: [MessageFlags.Ephemeral] });

        const cekilisId = interaction.id;
        cekilisKatilimcilari.set(cekilisId, []);

        const embed = new EmbedBuilder()
            .setTitle('🪙 404 Family - Büyük Para Çekilişi')
            .setDescription(`Sistem tarafından otomatik teslimatlı devasa bir nakit dağıtımı başladı!\n\n` +
                            `> 💰 **Çekiliş Ödülü:** \`${miktar} adet [404 Nakit]\`\n` +
                            `> ⏳ **Kalan Süre:** \`${kalanSure} saniye\`\n` +
                            `> 👥 **Katılımcı Sayısı:** \`0\``)
            .setColor('#FEE75C')
            .setFooter({ text: 'Kazananın hesabına para otomatik aktarılacaktır.' }).setTimestamp();

        const butonlar = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`katil_${cekilisId}`).setLabel('🎉 Katıl / Ayrıl').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`liste_${cekilisId}`).setLabel('👥 Katılımcılar (0)').setStyle(ButtonStyle.Primary)
        );

        const msg = await channel.send({ content: '🔔 @everyone **Büyük Nakit Çekilişi Başladı!**', embeds: [embed], components: [butonlar], allowedMentions: { parse: ['everyone'] } });

        const interval = setInterval(async () => {
            kalanSure -= 3;
            if (kalanSure <= 0) { clearInterval(interval); return; }
            try {
                const anlikListe = cekilisKatilimcilari.get(cekilisId) || [];
                const guncelEmbed = new EmbedBuilder()
                    .setTitle('🪙 404 Family - Büyük Para Çekilişi')
                    .setDescription(`Sistem tarafından otomatik teslimatlı devasa bir nakit dağıtımı başladı!\n\n` +
                                    `> 💰 **Çekiliş Ödülü:** \`${miktar} adet [404 Nakit]\`\n` +
                                    `> ⏳ **Kalan Süre:** \`${kalanSure} saniye\`\n` +
                                    `> 👥 **Katılımcı Sayısı:** \`${anlikListe.length}\``)
                    .setColor('#FEE75C').setTimestamp();

                const guncelButonlar = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`katil_${cekilisId}`).setLabel('🎉 Katıl / Ayrıl').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`liste_${cekilisId}`).setLabel(`👥 Katılımcılar (${anlikListe.length})`).setStyle(ButtonStyle.Primary)
                );
                await msg.edit({ embeds: [guncelEmbed], components: [guncelButonlar] });
            } catch (err) { clearInterval(interval); }
        }, 3000);

        setTimeout(async () => {
            try {
                const finalListe = cekilisKatilimcilari.get(cekilisId) || [];
                const pasifButonlar = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`disabled_katil`).setLabel('🎉 Katılım Sonlandı').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId(`disabled_liste`).setLabel(`👥 Toplam Katılımcı (${finalListe.length})`).setStyle(ButtonStyle.Secondary).setDisabled(true)
                );

                if (finalListe.length === 0) {
                    const bitisEmbed = new EmbedBuilder().setTitle('🪙 Çekiliş Sona Erdi').setDescription(`❌ **Sonuç:** Katılım olmadığı için talihli seçilemedi.`).setColor('#4F545C').setTimestamp();
                    await msg.edit({ embeds: [bitisEmbed], components: [pasifButonlar] });
                    cekilisKatilimcilari.delete(cekilisId);
                    return channel.send({ content: `⚠️ Çekilişe kimse katılmadığı için para kasada kaldı.` });
                }

                const kazananId = finalListe[Math.floor(Math.random() * finalListe.length)];
                
                profilGereksinim(kazananId);
                const data = veriOku();
                data[kazananId].bakiye += miktar;
                veriYaz(data);

                const bitisEmbed = new EmbedBuilder()
                    .setTitle('🎉 ÇEKİLİŞ SONUÇLANDI 🎉')
                    .setDescription(`Büyük para dağıtımı sona erdi! Şanslı üyenin cüzdanı dolduruldu.\n\n` +
                                    `> 💰 **Dağıtılan Ödül:** \`${miktar} adet [404 Nakit]\`\n` +
                                    `> 🍀 **Şanslı Talihli:** <@${kazananId}>\n\n🌟 *Ödül sistem tarafından otomatik yüklenmiştir. \`/bakiye\` yazarak kontrol edebilir!*`)
                    .setColor('#2ECC71').setThumbnail(guild.iconURL({ dynamic: true })).setTimestamp();

                await msg.edit({ embeds: [bitisEmbed], components: [pasifButonlar] });
                await channel.send({ content: `🎊 Tebrikler <@${kazananId}>! Çekilişi kazandın ve **${miktar} adet [404 Nakit]** hesabına otomatik yüklendi!` });
                cekilisKatilimcilari.delete(cekilisId);
            } catch (err) {}
        }, options.getInteger('sure') * 1000);
    }

    // --- PROFiL SORGULAMA ---
    if (commandName === 'profil') {
        const hedefUye = options.getUser('kullanici') || interaction.user;
        const uVeri = profilGereksinim(hedefUye.id);
        const gerekenXp = uVeri.seviye * 100;

        const profilEmbed = new EmbedBuilder()
            .setTitle(`📊 ${hedefUye.username} - Oyuncu Profili`)
            .setThumbnail(hedefUye.displayAvatarURL({ dynamic: true }))
            .setColor('#5865F2')
            .addFields(
                { name: '🪙 Hesap Bakiyesi', value: `\`${uVeri.bakiye} adet [404 Nakit]\``, inline: true },
                { name: '✨ Seviye (Level)', value: `\`🌟 Level ${uVeri.seviye}\``, inline: true },
                { name: '📊 Aktiflik Gelişimi (XP)', value: `\`${uVeri.xp} / ${generenXp = uVeri.seviye * 100} XP\` (Sonraki seviyeye \`${gerekenXp - uVeri.xp}\` kaldı.)`, inline: false }
            ).setTimestamp();

        return interaction.reply({ embeds: [profilEmbed] });
    }

    if (commandName === 'bakiye') {
        const hedefUye = options.getUser('kullanici') || interaction.user;
        const uVeri = profilGereksinim(hedefUye.id);

        const bakiyeEmbed = new EmbedBuilder()
            .setTitle('💰 Cüzdan Durumu')
            .setDescription(`${hedefUye.toString()} cüzdanında şu anda **${uVeri.bakiye}** \`adet [404 Nakit]\` para bulunduruyor.`)
            .setColor('#FEE75C').setTimestamp();

        return interaction.reply({ embeds: [bakiyeEmbed] });
    }

    if (commandName === 'gönder') {
        const alici = options.getUser('kullanici');
        const miktar = options.getInteger('miktar');

        if (alici.id === interaction.user.id) return interaction.reply({ content: '❌ Kendinize para gönderemezsiniz.', flags: [MessageFlags.Ephemeral] });
        if (alici.bot) return interaction.reply({ content: '❌ Bot hesaplarına transfer yapılamaz.', flags: [MessageFlags.Ephemeral] });
        if (miktar <= 0) return interaction.reply({ content: '❌ Lütfen geçerli bir miktar girin.', flags: [MessageFlags.Ephemeral] });

        const gonderenVeri = profilGereksinim(interaction.user.id);
        profilGereksinim(alici.id);

        if (gonderenVeri.bakiye < miktar) return interaction.reply({ content: `❌ Yetersiz bakiye! Mevcut paranız: **${gonderenVeri.bakiye} adet [404 Nakit]**`, flags: [MessageFlags.Ephemeral] });

        const data = veriOku();
        data[interaction.user.id].bakiye -= miktar;
        data[alici.id].bakiye += miktar;
        veriYaz(data);

        const transferEmbed = new EmbedBuilder()
            .setTitle('💸 Başarılı Transfer')
            .setDescription(`🎉 ${interaction.user.toString()} başarıyla ${alici.toString()} kullanıcısına **${miktar} adet [404 Nakit]** gönderdi!`)
            .setColor('#57F287').setTimestamp();

        return interaction.reply({ embeds: [transferEmbed] });
    }

    if (commandName === 'yazıtura') {
        const miktar = options.getInteger('miktar');
        const tahmin = options.getString('tahmin');
        const uVeri = profilGereksinim(interaction.user.id);

        if (miktar <= 0) return interaction.reply({ content: '❌ Geçersiz bahis miktarı.', flags: [MessageFlags.Ephemeral] });
        if (uVeri.bakiye < miktar) return interaction.reply({ content: `❌ Yetersiz bakiyesi!`, flags: [MessageFlags.Ephemeral] });

        const sonuclar = ['yazi', 'tura'];
        const rastgeleSonuc = sonuclar[Math.floor(Math.random() * sonuclar.length)];
        const durumMetni = rastgeleSonuc === 'yazi' ? '🪙 **YAZI**' : '🪙 **TURA**';

        const data = veriOku();
        if (tahmin === rastgeleSonuc) {
            data[interaction.user.id].bakiye += miktar;
            const embed = new EmbedBuilder().setTitle('🎉 Kazandın!').setDescription(`Para fırlatıldı ve ${durumMetni} geldi!\nHesabına **+${miktar} adet [404 Nakit]** eklendi. Yeni bakiyen: **${data[interaction.user.id].bakiye}**`).setColor('#57F287');
            interaction.reply({ embeds: [embed] });
        } else {
            data[interaction.user.id].bakiye -= miktar;
            const embed = new EmbedBuilder().setTitle('❌ Kaybettin...').setDescription(`Para fırlatıldı ve ${durumMetni} geldi!\nHesabından **-${miktar} adet [404 Nakit]** kesildi. Yeni bakiyen: **${data[interaction.user.id].bakiye}**`).setColor('#ED4245');
            interaction.reply({ embeds: [embed] });
        }
        veriYaz(data);
    }

    if (commandName === 'zar') {
        const miktar = options.getInteger('miktar');
        const uVeri = profilGereksinim(interaction.user.id);

        if (miktar <= 0) return interaction.reply({ content: '❌ Geçersiz bahis miktarı.', flags: [MessageFlags.Ephemeral] });
        if (uVeri.bakiye < miktar) return interaction.reply({ content: `❌ Yetersiz bakiyesi!`, flags: [MessageFlags.Ephemeral] });

        const oyuncuZar = Math.floor(Math.random() * 6) + 1;
        const botZar = Math.floor(Math.random() * 6) + 1;

        const data = veriOku();
        let sonucEmbed = new EmbedBuilder().setTimestamp();

        if (oyuncuZar > botZar) {
            data[interaction.user.id].bakiye += miktar;
            sonucEmbed.setTitle('🎉 Sen Kazandın!').setColor('#57F287').setDescription(`🎲 Senin Zarın: **${oyuncuZar}** | 🤖 Botun Zarı: **${botZar}**\n\nHarika! **+${miktar} adet [404 Nakit]** kazandın.`);
        } else if (botZar > oyuncuZar) {
            data[interaction.user.id].bakiye -= miktar;
            sonucEmbed.setTitle('❌ Bot Kazandı...').setColor('#ED4245').setDescription(`🎲 Senin Zarın: **${oyuncuZar}** | 🤖 Botun Zarı: **${botZar}**\n\nŞansına küs, **-${miktar} adet [404 Nakit]** kaybettin.`);
        } else {
            sonucEmbed.setTitle('🤝 Berabere!').setColor('#FEE75C').setDescription(`🎲 Senin Zarın: **${oyuncuZar}** | 🤖 Botun Zarı: **${botZar}**\n\nZarlar eşit geldi, paran iade edildi!`);
        }
        veriYaz(data);
        return interaction.reply({ embeds: [sonucEmbed] });
    }

    if (commandName === 'slots') {
        const miktar = options.getInteger('miktar');
        const uVeri = profilGereksinim(interaction.user.id);

        if (miktar <= 0) return interaction.reply({ content: '❌ Geçersiz bahis miktarı.', flags: [MessageFlags.Ephemeral] });
        if (uVeri.bakiye < miktar) return interaction.reply({ content: `❌ Yetersiz bakiyesi!`, flags: [MessageFlags.Ephemeral] });

        const slotOgeleri = ['🍒', '💎', '🍊', '🔔', '🍀'];
        const s1 = slotOgeleri[Math.floor(Math.random() * slotOgeleri.length)];
        const s2 = slotOgeleri[Math.floor(Math.random() * slotOgeleri.length)];
        const s3 = slotOgeleri[Math.floor(Math.random() * slotOgeleri.length)];

        const data = veriOku();
        const slotEmbed = new EmbedBuilder().setTimestamp();

        if (s1 === s2 && s2 === s3) {
            const kazanc = miktar * 3; data[interaction.user.id].bakiye += kazanc;
            slotEmbed.setTitle('🎰 MEGA WIN! SLOTS 🎰').setColor('#57F287').setDescription(`> ┃ ${s1} ┃ ${s2} ┃ ${s3} ┃\n\nMüthiş! Üçlü kombinasyon tutturdun ve **+${kazanc} adet [404 Nakit]** kazandın!`);
        } else if (s1 === s2 || s2 === s3 || s1 === s3) {
            data[interaction.user.id].bakiye += miktar;
            slotEmbed.setTitle('🎉 Küçük Kazanç! Slots').setColor('#3498DB').setDescription(`> ┃ ${s1} ┃ ${s2} ┃ ${s3} ┃\n\nİkili yakaladın ve paranı katladın! **+${miktar} adet [404 Nakit]** eklendi.`);
        } else {
            data[interaction.user.id].bakiye -= miktar;
            slotEmbed.setTitle('❌ Kaybettin... Slots').setColor('#ED4245').setDescription(`> ┃ ${s1} ┃ ${s2} ┃ ${s3} ┃\n\nHiçbir simge uyuşmadı. **-${miktar} adet [404 Nakit]** kaybettin.`);
        }
        veriYaz(data);
        return interaction.reply({ embeds: [slotEmbed] });
    }

    if (commandName === 'yardım') {
        const embed = new EmbedBuilder()
            .setTitle(`⚡ ${client.user.username} - Yardım Merkezi`)
            .setDescription(`Merhaba **${interaction.user.username}**, sunucunun yönetim kalitesini ve eğlencesini artırmak için buradayım! Aşağıdaki butondan tüm özelliklerime göz atabilirsin.`)
            .setColor('#5865F2').setThumbnail(client.user.avatarURL()).setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('helpmenu_view').setLabel('📚 Komut Listesini Aç').setStyle(ButtonStyle.Primary)
        );
        return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (commandName === 'istatistik') {
        const uptime = process.uptime();
        const d = Math.floor(uptime / (3600*24)); const h = Math.floor(uptime % (3600*24) / 3600); const m = Math.floor(uptime % 3600 / 60);
        const statsEmbed = new EmbedBuilder().setTitle(`⚙️ ${client.user.username} - Sistem İstatistikleri`).setColor('#5865F2')
            .addFields(
                { name: '🤖 Bot Bilgileri', value: `> **Ping:** \`${client.ws.ping}ms\`\n> **Uptime:** \`${d} Gün, ${h} Saat, ${m} Dakika\`` },
                { name: '💻 Host', value: `> **OS:** \`${os.platform()}\`\n> **Ram Kullanımı:** \`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\`` }
            ).setTimestamp();
        return interaction.reply({ embeds: [statsEmbed] });
    }

    if (commandName === 'tamyasakla') {
        const user = options.getMember('kullanici'); const sebep = options.getString('sebep') || 'Belirtilmedi';
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });
        await user.ban({ reason: `Yetkili: ${yetkili.tag} | Sebep: ${sebep}` });
        await interaction.reply({ content: `✅ İşlem başarılı.`, flags: [MessageFlags.Ephemeral] });
    }

    if (commandName === 'ipyasakla') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const user = options.getMember('kullanici');
        if (!user) return interaction.editReply({ content: 'Kullanıcı bulunamadı.' });
        await guild.bans.create(user.id, { deleteMessageSeconds: 604800, reason: `IP BAN | Yetkili: ${yetkili.tag}` });

        const gizliLogKanali = guild.channels.cache.get(IP_BAN_LOG_KANAL_ID);
        if (gizliLogKanali) {
            const gizliArsivEmbed = new EmbedBuilder().setTitle('🗄️ Güvenlik Arşivi: IP Ban Kaydı')
                .addFields({ name: '👤 Kullanıcı', value: `${user.user.tag}` }, { name: '🆔 Kullanıcı ID', value: `\`${user.id}\`` }).setColor('#7a0000').setTimestamp();
            await gizliLogKanali.send({ embeds: [gizliArsivEmbed] });
        }
        await interaction.editReply({ content: '✅ IP Ban başarıyla atıldı.' });
    }

    if (commandName === 'sustur') {
        const user = options.getMember('kullanici'); const sure = options.getInteger('sure');
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });
        await user.timeout(sure * 60 * 1000);
        await interaction.reply({ content: `✅ Kullanıcı ${sure} dakika susturuldu.`, flags: [MessageFlags.Ephemeral] });
    }

    if (commandName === 'susturarak') {
        const user = options.getMember('kullanici');
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });
        await user.timeout(null); await interaction.reply({ content: '✅ Susturma kaldırıldı.', flags: [MessageFlags.Ephemeral] });
    }

    if (commandName === 'kilit') {
        const durum = options.getString('durum');
        if (durum === 'ac') {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
            await interaction.reply({ content: '🔓 Kanal kilidi açıldı.' });
        } else {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
            await interaction.reply({ content: '🔒 Kanal kilitlendi.' });
        }
    }

    if (commandName === 'cekilis') {
        let kalanSure = options.getInteger('sure'); const odul = options.getString('odul');
        await interaction.reply({ content: '✨ Çekiliş kuruluyor...', flags: [MessageFlags.Ephemeral] });
        const cekilisId = interaction.id; cekilisKatilimcilari.set(cekilisId, []);

        const embed = new EmbedBuilder().setTitle('🎁 Çekiliş Şöleni').setDescription(`🏆 Ödül: \`${odul}\`\n⏳ Süre: \`${kalanSure}sn\``).setColor('#5865F2');
        const butonlar = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`katil_${cekilisId}`).setLabel('🎉 Katıl / Ayrıl').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`liste_${cekilisId}`).setLabel('👥 Katılımcılar').setStyle(ButtonStyle.Primary)
        );
        const msg = await channel.send({ embeds: [embed], components: [butonlar] });

        setTimeout(async () => {
            const finalListe = cekilisKatilimcilari.get(cekilisId) || [];
            if (finalListe.length === 0) return channel.send({ content: `⚠️ Çekilişe katılan olmadı.` });
            const kazananId = finalListe[Math.floor(Math.random() * finalListe.length)];
            await channel.send({ content: `🎊 Tebrikler <@${kazananId}>! **${odul}** kazandın!` });
        }, kalanSure * 1000);
    }

    if (commandName === 'duyuru') {
        const duyuruMetni = options.getString('mesaj');
        const embed = new EmbedBuilder().setTitle('📢 Sunucu Duyurusu').setDescription(`${duyuruMetni}`).setColor('#5865F2');
        await interaction.reply({ content: 'Duyuru geçildi.', flags: [MessageFlags.Ephemeral] });
        await channel.send({ content: '@everyone', embeds: [embed] });
    }

    if (commandName === 'uyar') {
        await interaction.reply({ content: '✅ Kullanıcı uyarıldı.', flags: [MessageFlags.Ephemeral] });
    }

    if (commandName === 'unban') {
        const userId = options.getString('id'); await guild.members.unban(userId);
        await interaction.reply({ content: `✅ Yasak kaldırıldı.`, flags: [MessageFlags.Ephemeral] });
    }

    if (commandName === 'kick') {
        const user = options.getMember('kullanici');
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });
        await user.kick(); await interaction.reply({ content: `✅ Kullanıcı atıldı.`, flags: [MessageFlags.Ephemeral] });
    }
});

client.login(process.env.DISCORD_TOKEN);
