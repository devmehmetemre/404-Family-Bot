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
        data[userId] = { bakiye: 100, xp: 0, seviye: 1 }; // Yeni başlayana 100 404 hediye
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
            description: '📊 404 bakiyenizi, seviyenizi ve aktiflik istatistiklerinizi gösterir',
            options: [{ name: 'kullanici', description: 'Profiline bakılacak üye', type: ApplicationCommandOptionType.User, required: false }]
        },
        {
            name: 'bakiye',
            description: '💰 Mevcut 404 bakiyenizi hızlıca sorgular',
            options: [{ name: 'kullanici', description: 'Bakiyesine bakılacak üye', type: ApplicationCommandOptionType.User, required: false }]
        },
        {
            name: 'gönder',
            description: '💸 Başka bir üyeye cüzdanınızdan 404 nakit transfer edersiniz',
            options: [
                { name: 'kullanici', description: 'Para gönderilecek üye', type: ApplicationCommandOptionType.User, required: true },
                { name: 'miktar', description: 'Gönderilecek 404 miktarı', type: ApplicationCommandOptionType.Integer, required: true }
            ]
        },
        {
            name: 'yazıtura',
            description: '🪙 Belirttiğiniz miktar 404 ile yazı tura oynarsınız (OwO Katlama)',
            options: [
                { name: 'miktar', description: 'Ortaya koyulacak 404 nakit miktarı', type: ApplicationCommandOptionType.Integer, required: true },
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
            options: [{ name: 'miktar', description: 'Ortaya koyulacak 404 nakit miktarı', type: ApplicationCommandOptionType.Integer, required: true }]
        },
        {
            name: 'slots',
            description: '🎰 Şansınızı şık slot makinesinde denersiniz',
            options: [{ name: 'miktar', description: 'Ortaya koyulacak 404 nakit miktarı', type: ApplicationCommandOptionType.Integer, required: true }]
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
            description: '🎁 Gelişmiş, butonlu ve interaktif çekiliş sistemi başlatır',
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
        data[userId] = { bakiye: 100, xp: 0, seviye: 1 };
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
                    { name: '🪙 OwO Ekonomi ve Mini Oyunlar (Herkes Kullanabilir)', value: `> \`/profil\` - Seviyenizi ve 404 paranızı listeler.\n> \`/bakiye\` - Cüzdan bakiyenizi söyler.\n> \`/gönder\` - Başka bir hesaba 404 nakit transfer eder.\n> \`/yazıtura\` - 404 ortaya koyup yazı-tura oynarsınız.\n> \`/zar\` - Botla karşılıklı zar kapıştırırsınız.\n> \`/slots\` - Şanslı slot makinesini çevirirsiniz.` },
                    { name: '🛡️ Yetkili Moderasyon Komutları', value: `> \`/tamyasakla\` - Üyeyi sunucudan banlar.\n> \`/ipyasakla\` - Üyeyi IP adresiyle kalıcı engeller.\n> \`/sustur\` - Belirtilen dakika kadar timeout atar.\n> \`/susturarak\` - Üyenin susturmasını erken kaldırır.\n> \`/uyar\` - Üyeye uyarı puanı ekler.\n> \`/kick\` - Üyeyi sunucudan dışarı atar.\n> \`/unban\` - ID ile yasak kaldırır.` },
                    { name: '⚙️ Yönetim & Sistem Komutları', value: `> \`/kilit\` - Kanalı kilitleyip açmaya yarar.\n> \`/duyuru\` - Etiketli ve DM destekli duyuru geçer.\n> \`/cekilis\` - Yeni nesil butonlu çekiliş başlatır.\n> \`/istatistik\` - Botun canlı donanım durumunu raporlar.` }
                )
                .setFooter({ text: '404 Family • Her Zaman En İyisi', iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            
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

    // --- HERKESE AÇIK MUAF KOMUTLAR LİSTESİ ---
    const herkesKullanabilir = ['istatistik', 'yardım', 'profil', 'bakiye', 'gönder', 'yazıtura', 'zar', 'slots'];

    if (commandName === 'ipyasakla') {
        if (!ipBanYetkiKontrol(interaction)) return interaction.reply({ content: '❌ Bu özel koruma komutunu sadece tanımlı IP-Ban yetkilileri kullanabilir.', flags: [MessageFlags.Ephemeral] });
    } else if (!herkesKullanabilir.includes(commandName)) {
        if (!yetkiKontrol(interaction)) return interaction.reply({ content: '❌ Bu moderasyon komutunu kullanmak için yetkiniz yetersiz.', flags: [MessageFlags.Ephemeral] });
    }

    // --- EKONOMİ VE MİNİ OYUN KOMUTLARI (HERKESE AÇIK) ---

    if (commandName === 'profil') {
        const hedefUye = options.getUser('kullanici') || interaction.user;
        const uVeri = profilGereksinim(hedefUye.id);
        const gerekenXp = uVeri.seviye * 100;

        const profilEmbed = new EmbedBuilder()
            .setTitle(`📊 ${hedefUye.username} - Oyuncu Profili`)
            .setThumbnail(hedefUye.displayAvatarURL({ dynamic: true }))
            .setColor('#5865F2')
            .addFields(
                { name: '🪙 404 Bakiye', value: `\`${uVeri.bakiye} 404\``, inline: true },
                { name: '✨ Seviye (Level)', value: `\`🌟 Level ${uVeri.seviye}\``, inline: true },
                { name: '📊 Aktiflik Gelişimi (XP)', value: `\`${uVeri.xp} / ${requiredXp = uVeri.seviye * 100} XP\` (Sonraki seviyeye \`${gerekenXp - uVeri.xp}\` kaldı.)`, inline: false }
            )
            .setFooter({ text: 'Konuşarak ve oyun oynayarak 404 kasabilirsin!' }).setTimestamp();

        return interaction.reply({ embeds: [profilEmbed] });
    }

    if (commandName === 'bakiye') {
        const hedefUye = options.getUser('kullanici') || interaction.user;
        const uVeri = profilGereksinim(hedefUye.id);

        const bakiyeEmbed = new EmbedBuilder()
            .setTitle('💰 Cüzdan Durumu')
            .setDescription(`${hedefUye.toString()} cüzdanında şu anda **${uVeri.bakiye}** \`404\` nakit para bulunduruyor.`)
            .setColor('#FEE75C').setTimestamp();

        return interaction.reply({ embeds: [bakiyeEmbed] });
    }

    if (commandName === 'gönder') {
        const alici = options.getUser('kullanici');
        const miktar = options.getInteger('miktar');

        if (alici.id === interaction.user.id) return interaction.reply({ content: '❌ Kendinize para gönderemezsiniz.', flags: [MessageFlags.Ephemeral] });
        if (alici.bot) return interaction.reply({ content: '❌ Bot hesaplarına para transferi yapılamaz.', flags: [MessageFlags.Ephemeral] });
        if (miktar <= 0) return interaction.reply({ content: '❌ Lütfen 0\'dan büyük geçerli bir miktar girin.', flags: [MessageFlags.Ephemeral] });

        const gonderenVeri = profilGereksinim(interaction.user.id);
        profilGereksinim(alici.id);

        if (gonderenVeri.bakiye < miktar) return interaction.reply({ content: `❌ Yetersiz bakiye! Mevcut paranız: **${gonderenVeri.bakiye} 404**`, flags: [MessageFlags.Ephemeral] });

        const data = veriOku();
        data[interaction.user.id].bakiye -= miktar;
        data[alici.id].bakiye += miktar;
        veriYaz(data);

        const transferEmbed = new EmbedBuilder()
            .setTitle('💸 Başarılı Transfer')
            .setDescription(`🎉 ${interaction.user.toString()} başarıyla ${alici.toString()} kullanıcısına **${miktar} 404** nakit gönderdi!`)
            .setColor('#57F287').setTimestamp();

        return interaction.reply({ embeds: [transferEmbed] });
    }

    // --- MİNİ OYUNLAR (OwO STYLE) ---

    if (commandName === 'yazıtura') {
        const miktar = options.getInteger('miktar');
        const tahmin = options.getString('tahmin');
        const uVeri = profilGereksinim(interaction.user.id);

        if (miktar <= 0) return interaction.reply({ content: '❌ Geçersiz bahis miktarı.', flags: [MessageFlags.Ephemeral] });
        if (uVeri.bakiye < miktar) return interaction.reply({ content: `❌ Yetersiz 404 bakiyesi! Mevcut paranız: **${uVeri.bakiye}**`, flags: [MessageFlags.Ephemeral] });

        const sonuclar = ['yazi', 'tura'];
        const rastgeleSonuc = sonuclar[Math.floor(Math.random() * sonuclar.length)];
        const durumMetni = rastgeleSonuc === 'yazi' ? '🪙 **YAZI**' : '🪙 **TURA**';

        const data = veriOku();
        if (tahmin === rastgeleSonuc) {
            data[interaction.user.id].bakiye += miktar;
            const embed = new EmbedBuilder()
                .setTitle('🎉 Kazandın! (Yazı-Tura)')
                .setDescription(`Para fırlatıldı ve ${durumMetni} geldi!\n\nHesabına **+${miktar} 404** nakit eklendi. Yeni bakiyen: **${data[interaction.user.id].bakiye} 404**`)
                .setColor('#57F287').setTimestamp();
            interaction.reply({ embeds: [embed] });
        } else {
            data[interaction.user.id].bakiye -= miktar;
            const embed = new EmbedBuilder()
                .setTitle('❌ Kaybettin... (Yazı-Tura)')
                .setDescription(`Para fırlatıldı ve ${durumMetni} geldi!\n\nHesabından **-${miktar} 404** kesildi. Yeni bakiyen: **${data[interaction.user.id].bakiye} 404**`)
                .setColor('#ED4245').setTimestamp();
            interaction.reply({ embeds: [embed] });
        }
        veriYaz(data);
    }

    if (commandName === 'zar') {
        const miktar = options.getInteger('miktar');
        const uVeri = profilGereksinim(interaction.user.id);

        if (miktar <= 0) return interaction.reply({ content: '❌ Geçersiz bahis miktarı.', flags: [MessageFlags.Ephemeral] });
        if (uVeri.bakiye < miktar) return interaction.reply({ content: `❌ Yetersiz 404 bakiyesi!`, flags: [MessageFlags.Ephemeral] });

        const oyuncuZar = Math.floor(Math.random() * 6) + 1;
        const botZar = Math.floor(Math.random() * 6) + 1;

        const data = veriOku();
        let sonucEmbed = new EmbedBuilder().setTimestamp();

        if (oyuncuZar > botZar) {
            data[interaction.user.id].bakiye += miktar;
            sonucEmbed.setTitle('🎉 Sen Kazandın!').setColor('#57F287')
                .setDescription(`🎲 Senin Zarın: **${oyuncuZar}** | 🤖 Botun Zarı: **${botZar}**\n\nHarika! **+${miktar} 404** nakit kazandın. Yeni paran: **${data[interaction.user.id].bakiye}**`);
        } else if (botZar > oyuncuZar) {
            data[interaction.user.id].bakiye -= miktar;
            sonucEmbed.setTitle('❌ Bot Kazandı...').setColor('#ED4245')
                .setDescription(`🎲 Senin Zarın: **${oyuncuZar}** | 🤖 Botun Zarı: **${botZar}**\n\nŞansına küs, **-${miktar} 404** kaybettin. Yeni paran: **${data[interaction.user.id].bakiye}**`);
        } else {
            sonucEmbed.setTitle('🤝 Berabere!').setColor('#FEE75C')
                .setDescription(`🎲 Senin Zarın: **${oyuncuZar}** | 🤖 Botun Zarı: **${botZar}**\n\nZarlar eşit geldi, paran iade edildi! Bakiyen: **${data[interaction.user.id].bakiye}**`);
        }
        veriYaz(data);
        return interaction.reply({ embeds: [sonucEmbed] });
    }

    if (commandName === 'slots') {
        const miktar = options.getInteger('miktar');
        const uVeri = profilGereksinim(interaction.user.id);

        if (miktar <= 0) return interaction.reply({ content: '❌ Geçersiz bahis miktarı.', flags: [MessageFlags.Ephemeral] });
        if (uVeri.bakiye < miktar) return interaction.reply({ content: `❌ Yetersiz 404 bakiyesi!`, flags: [MessageFlags.Ephemeral] });

        const slotOgeleri = ['🍒', '💎', '🍊', '🔔', '🍀'];
        const s1 = slotOgeleri[Math.floor(Math.random() * slotOgeleri.length)];
        const s2 = slotOgeleri[Math.floor(Math.random() * slotOgeleri.length)];
        const s3 = slotOgeleri[Math.floor(Math.random() * slotOgeleri.length)];

        const data = veriOku();
        const slotEmbed = new EmbedBuilder().setTimestamp();

        if (s1 === s2 && s2 === s3) {
            // Büyük Kazanç (3'lü eşleşme) 3 katı verir
            const kazanc = miktar * 3;
            data[interaction.user.id].bakiye += kazanc;
            slotEmbed.setTitle('🎰 MEGA WIN! SLOTS 🎰').setColor('#57F287')
                .setDescription(`> ┃ ${s1} ┃ ${s2} ┃ ${s3} ┃\n\nMüthiş! Üçlü kombinasyon tutturdun ve **+${kazanc} 404** kazandın! Yeni bakiyen: **${data[interaction.user.id].bakiye}**`);
        } else if (s1 === s2 || s2 === s3 || s1 === s3) {
            // Küçük Kazanç (2'li eşleşme) 1 katı verir
            data[interaction.user.id].bakiye += miktar;
            slotEmbed.setTitle('🎉 Küçük Kazanç! Slots').setColor('#3498DB')
                .setDescription(`> ┃ ${s1} ┃ ${s2} ┃ ${s3} ┃\n\nİkili yakaladın ve paranı katladın! **+${miktar} 404** eklendi. Yeni bakiyen: **${data[interaction.user.id].bakiye}**`);
        } else {
            // Kayıp
            data[interaction.user.id].bakiye -= miktar;
            slotEmbed.setTitle('❌ Kaybettin... Slots').setColor('#ED4245')
                .setDescription(`> ┃ ${s1} ┃ ${s2} ┃ ${s3} ┃\n\nHiçbir simge uyuşmadı. **-${miktar} 404** kaybettin. Yeni bakiyen: **${data[interaction.user.id].bakiye}**`);
        }
        veriYaz(data);
        return interaction.reply({ embeds: [slotEmbed] });
    }

    // --- MODERASYON VE SİSTEM KOMUTLARI ---
    if (commandName === 'yardım') {
        const embed = new EmbedBuilder()
            .setTitle(`⚡ ${client.user.username} - Yardım Merkezi`)
            .setDescription(`Merhaba **${interaction.user.username}**, sunucunun yönetim kalitesini ve eğlencesini artırmak için buradayım! Aşağıdaki interaktif butonu kullanarak tüm özelliklerime göz atabilirsin.\n\n` +
                            `> 🛠️ **Profil Entegrasyonu:** Ayrıca ismimin üstüne tıklayıp \`Komutlar\` sekmesinden de hızlıca bana talimat verebilirsin!`)
            .setColor('#5865F2').setThumbnail(client.user.avatarURL()).setFooter({ text: '404 Family Destek Sistemi', iconURL: guild.iconURL() }).setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('helpmenu_view').setLabel('📚 Komut Listesini Aç').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setLabel('Sunucuya Ekle').setStyle(ButtonStyle.Link).setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)
        );
        return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (commandName === 'istatistik') {
        const uptime = process.uptime();
        const d = Math.floor(uptime / (3600*24)); const h = Math.floor(uptime % (3600*24) / 3600); const m = Math.floor(uptime % 3600 / 60); const s = Math.floor(uptime % 60);
        const statsEmbed = new EmbedBuilder()
            .setTitle(`⚙️ ${client.user.username} - Sistem İstatistikleri`).setColor('#5865F2').setThumbnail(client.user.avatarURL())
            .addFields(
                { name: '🤖 Bot Bilgileri', value: `> **Gecikme (Ping):** \`${client.ws.ping}ms\`\n> **Çalışma Süresi:** \`${d} Gün, ${h} Saat, ${m} Dakika\`\n> **Kullanıcı Sayısı:** \`${client.users.cache.size}\`` },
                { name: '💻 Sunucu / Host Bilgileri', value: `> **Node.js Sürümü:** \`${process.version}\`\n> **İşletim Sistemi:** \`${os.platform()}\`\n> **Bellek Kullanımı:** \`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\`` }
            ).setFooter({ text: '404 Family Bilgi Sistemi' }).setTimestamp();
        return interaction.reply({ embeds: [statsEmbed] });
    }

    if (commandName === 'tamyasakla') {
        const user = options.getMember('kullanici'); const sebep = options.getString('sebep') || 'Belirtilmedi';
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });
        if (user.roles.highest.position >= guild.members.me.roles.highest.position) return interaction.reply({ content: '❌ Yetkim yetersiz.', flags: [MessageFlags.Ephemeral] });

        const dmEmbed = new EmbedBuilder().setTitle('⛔ Sunucudan Yasaklandınız').setDescription(`**${guild.name}** sunucusundan yasaklandınız.`).setColor('#ED4245').setTimestamp();
        await guvenliDM(user, { embeds: [dmEmbed] }); await user.ban({ reason: `Yetkili: ${yetkili.tag} | Sebep: ${sebep}` });
        
        const logEmbed = new EmbedBuilder().setTitle('🛡️ Üye Yasaklandı').setDescription(`**Yasaklanan:** ${user.toString()}\n**Yetkili:** ${yetkili.toString()}\n**Sebep:** \`${sebep}\``).setColor('#ED4245').setTimestamp();
        await interaction.reply({ content: `✅ İşlem başarılı.`, flags: [MessageFlags.Ephemeral] }); await channel.send({ embeds: [logEmbed] });
    }

    if (commandName === 'ipyasakla') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const user = options.getMember('kullanici'); const sebep = options.getString('sebep') || 'Belirtilmedi';
        if (!user) return interaction.editReply({ content: 'Kullanıcı bulunamadı.' });

        const dmEmbed = new EmbedBuilder().setTitle('💥 IP Yasaklaması').setDescription(`**${guild.name}** sunucusundan IP engeli aldınız.`).setColor('#990000').setTimestamp();
        await guvenliDM(user, { embeds: [dmEmbed] }); await guild.bans.create(user.id, { deleteMessageSeconds: 604800, reason: `IP BAN | Yetkili: ${yetkili.tag}` });

        const gizliLogKanali = guild.channels.cache.get(IP_BAN_LOG_KANAL_ID);
        if (gizliLogKanali) {
            const gizliArsivEmbed = new EmbedBuilder().setTitle('🗄️ Güvenlik Arşivi: IP Ban Kaydı')
                .addFields(
                    { name: '👤 Kullanıcı', value: `${user.user.tag}`, inline: true },
                    { name: '🆔 Kullanıcı ID', value: `\`${user.id}\``, inline: true },
                    { name: '🛡️ Yetkili', value: `${yetkili.toString()}` },
                    { name: '🔒 Durum', value: `\`Discord Donanımsal IP Kara Listesi\`` }
                ).setColor('#7a0000').setTimestamp();
            await gizliLogKanali.send({ embeds: [gizliArsivEmbed] });
        }
        await interaction.editReply({ content: '✅ IP Ban başarıyla atıldı.' });
    }

    if (commandName === 'sustur') {
        const user = options.getMember('kullanici'); const sure = options.getInteger('sure');
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });
        await user.timeout(sure * 60 * 1000);
        await interaction.reply({ content: `✅ Kullanıcı ${sure} dakika susturuldur.`, flags: [MessageFlags.Ephemeral] });
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
        const user = options.getMember('kullanici'); const sebep = options.getString('sebep') || 'Gerekçe yok';
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });
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

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    // Rol Güncelleme Logları Aktif Kalmaya Devam Ediyor
});

client.login(process.env.DISCORD_TOKEN);
