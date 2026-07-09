const { 
    Client, 
    GatewayIntentBits, 
    Partials,
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

// 🛠️ DM ve Rol Eventlerinin Kesin Çalışması İçin Gelişmiş Intent ve Partial Yapısı
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember, Partials.User]
});

// ==========================================
// 🔥 Gelişmiş Ayarlar Menüsü 🔥
// ==========================================
const YETKILI_ROLLER = ['1519479137360674868', '1499692023496572968']; 
const IP_BAN_YETKILI_ROL = '1519479137360674868'; 
const IP_BAN_LOG_KANAL_ID = '1524324280844685493'; 
// ==========================================

const cekilisKatilimcilari = new Map();
const gameCooldown = new Map(); 
const dbDosyasi = './ekonomi.json';

if (!fs.existsSync(dbDosyasi)) {
    fs.writeFileSync(dbDosyasi, JSON.stringify({}, null, 4));
}

function veriOku() { return JSON.parse(fs.readFileSync(dbDosyasi, 'utf8')); }
function veriYaz(data) { fs.writeFileSync(dbDosyasi, JSON.stringify(data, null, 4)); }

// Gelişmiş Sicil Destekli Profil Oluşturucu
function profilGereksinim(userId) {
    const data = veriOku();
    if (!data[userId]) {
        data[userId] = { 
            bakiye: 100, 
            banka: 0, 
            xp: 0, 
            seviye: 1, 
            gunlukZaman: 0, 
            uyariSayisi: 0,
            sicil: {
                tutanaklar: [], // { sebep: "", yetkili: "", tarih: "" }
                muteler: [],    // { sure: "", sebep: "", yetkili: "", tarih: "" }
                banlar: []      // { tür: "Ban/Kick", sebep: "", yetkili: "", tarih: "" }
            }
        }; 
        veriYaz(data);
    }
    // Eğer eski veritabanı varsa ve sicil objesi yoksa dinamik olarak ekle
    if (!data[userId].sicil) {
        data[userId].sicil = { tutanaklar: [], muteler: [], banlar: [] };
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cooldownKontrol(userId) {
    const cooldownSuresi = 5000; 
    if (gameCooldown.has(userId)) {
        const kalanZaman = gameCooldown.get(userId) + cooldownSuresi - Date.now();
        if (kalanZaman > 0) return (kalanZaman / 1000).toFixed(1);
    }
    gameCooldown.set(userId, Date.now());
    return null;
}

// ==========================================
// 🛡️ DİNAMİK ROL GÜNCELLEME (DM BİLDİRİMİ EVENTİ)
// ==========================================
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    // Eski veya yeni hal cache'de yoksa sunucudan çekmesini zorunlu kılıyoruz
    if (oldMember.partial) { try { await oldMember.fetch(); } catch (e) { return; } }
    if (newMember.partial) { try { await newMember.fetch(); } catch (e) { return; } }

    // ➕ Rol Eklendiğinde Tetiklenen Kısım
    const eklenenRoller = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    if (eklenenRoller.size > 0) {
        eklenenRoller.forEach(async (role) => {
            if (role.name === '@everyone') return;
            const rolEkleEmbed = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('🎉 | Tebrikler, Yeni Rol Tanımlandı!')
                .setThumbnail(newMember.guild.iconURL({ dynamic: true }) || null)
                .setDescription(`**${newMember.guild.name}** sunucusunda yönetim kadrosu tarafınıza yeni bir ayrıcalık tanımladı!`)
                .addFields(
                    { name: '🛡️ Verilen Rol:', value: `🔹 **${role.name}**`, inline: true },
                    { name: '🆔 Rol Kimliği:', value: `\`${role.id}\``, inline: true }
                )
                .setFooter({ text: `${newMember.guild.name} • Ayrıcalık Yönetim Sistemi` })
                .setTimestamp();
            try { await newMember.send({ embeds: [rolEkleEmbed] }); } catch(e) { console.log(`[DM Hata] ${newMember.user.tag} kullanıcısına rol ekleme DM'i kapalı.`); }
        });
    }

    // ➖ Rol Silindiğinde Tetiklenen Kısım
    const silinenRoller = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
    if (silinenRoller.size > 0) {
        silinenRoller.forEach(async (role) => {
            if (role.name === '@everyone') return;
            const rolSilEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('📉 | Rol Güncellemesi Bilgilendirmesi')
                .setThumbnail(newMember.guild.iconURL({ dynamic: true }) || null)
                .setDescription(`**${newMember.guild.name}** sunucusunda üzerinizde bulunan bir yetki/rol kaldırılmıştır.`)
                .addFields(
                    { name: '❌ Alınan Rol:', value: `🔻 **${role.name}**`, inline: true },
                    { name: '🆔 Rol Kimliği:', value: `\`${role.id}\``, inline: true }
                )
                .setFooter({ text: `${newMember.guild.name} • Rol Yönetim Sistemi` })
                .setTimestamp();
            try { await newMember.send({ embeds: [rolSilEmbed] }); } catch(e) { console.log(`[DM Hata] ${newMember.user.tag} kullanıcısına rol silme DM'i kapalı.`); }
        });
    }
});

client.once('ready', async () => {
    console.log(`🚀 Ultra Detaylı ${client.user.tag} Moduyla Başarıyla Başlatıldı!`);
    client.user.setPresence({
        activities: [{ name: '👑 404 Family is The Best', type: ActivityType.Playing }],
        status: 'online',
    });

    const commands = [
        { name: 'yardım', description: 'ℹ️ Botun tüm komutlarını ve kullanım rehberini gösterir' },
        {
            name: 'profil',
            description: '📊 Bakiyenizi, seviyenizi ve aktiflik istatistiklerinizi gösterir',
            options: [{ name: 'kullanici', description: 'Profiline bakılacak üye', type: ApplicationCommandOptionType.User, required: false }]
        },
        {
            name: 'sicil',
            description: '🚨 Belirtilen üyenin tüm ceza, tutanak, mute ve ban geçmişini dökümler',
            options: [{ name: 'üye', description: 'Siciline bakılacak sunucu üyesi', type: ApplicationCommandOptionType.User, required: true }]
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
        { name: 'günlük', description: '🎁 Her 24 saatte bir şansınıza göre ücretsiz hediye nakit verir' },
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
            description: '🪙 Belirttiğiniz miktar ile canlı yazı tura oynarsınız (5sn Cooldown)',
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
            description: '🎲 Bot ile canlı zar kapıştırma oyunu oynarsınız (5sn Cooldown)',
            options: [{ name: 'miktar', description: 'Ortaya koyulacak miktar', type: ApplicationCommandOptionType.Integer, required: true }]
        },
        {
            name: 'slots',
            description: '🎰 Şansınızı canlı slot makinesinde denersiniz (5sn Cooldown)',
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
                { name: 'sure', description: 'Dakika cinsinden süre', type: ApplicationCommandOptionType.Integer, required: true },
                { name: 'sebep', description: 'Susturma gerekçesi', type: ApplicationCommandOptionType.String, required: false }
            ]
        },
        {
            name: 'susturarak',
            description: '🔊 Cezalı bir kullanıcının susturma süresini erkenden kaldırır',
            options: [{ name: 'kullanici', description: 'Susturması açılacak üye', type: ApplicationCommandOptionType.User, required: true }]
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
            name: 'temizle',
            description: '🧹 Belirtilen miktarda son atılan mesajı kanaldan toplu olarak siler',
            options: [
                { name: 'sayi', description: 'Silinecek mesaj miktarı (1 - 100 arası)', type: ApplicationCommandOptionType.Integer, required: true }
            ]
        },
        { name: 'istatistik', description: '⚙️ Botun ping, uptime ve donanım verilerini gösterir' }
    ];

    await client.application.commands.set(commands);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const data = veriOku();
    
    if (!data[userId]) {
        data[userId] = { bakiye: 100, banka: 0, xp: 0, seviye: 1, gunlukZaman: 0, uyariSayisi: 0, sicil: { tutanaklar: [], muteler: [], banlar: [] } };
    }

    const kazanilanBakiye = Math.floor(Math.random() * 5) + 1;
    const kazanilanXp = Math.floor(Math.random() * 11) + 5;

    data[userId].bakiye += kazanilanBakiye;
    data[userId].xp += kazanilanXp;

    const gerekenXp = data[userId].seviye * 100;
    if (data[userId].xp >= gerekenXp) {
        data[userId].xp -= gerekenXp;
        data[userId].seviye += 1;
        
        const seviyeOdulu = data[userId].seviye * 100;
        data[userId].bakiye += seviyeOdulu;

        const lvlEmbed = new EmbedBuilder()
            .setTitle('🚀 | KADEMESEL GELİŞİM SAĞLANDI!')
            .setDescription(`🎉 Tebrikler ${message.author.toString()}, sunucumuzda mesaj atarak **Level ${data[userId].seviye}** seviyesine ulaştın!`)
            .addFields({ name: '🎁 Seviye Ödülü Alındı:', value: `🪙 **+${seviyeOdulu} adet [404 Nakit]** cüzdanınıza başarıyla aktarıldı!` })
            .setColor('#57F287');
        
        message.channel.send({ embeds: [lvlEmbed] }).then(m => setTimeout(() => m.delete().catch(() => null), 8000));
    }

    veriYaz(data);

    if (message.content.toLowerCase() === 'sa') {
        const cevaplar = [
            `Aleyküm Selam hoca, hoş geldin! Gözümüz yollarda kalmıştı. 😎`,
            `As, hoş geldin! Sonunda biri ortama neşe getirdi. 🎉`,
            `Aleyküm Selam! Geç otur şöyle, ne ikram edelim? ☕`,
            `As! Hoş geldin kral, biz de tam senden bahsediyorduk. 👑`
        ];
        return message.reply(cevaplar[Math.floor(Math.random() * cevaplar.length)]);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        const [action, msgId] = interaction.customId.split('_');
        
        if (action === 'helpmenu') {
            const yardimEmbed = new EmbedBuilder()
                .setTitle('👑 404 Family Bot - Ultra Gelişmiş Komut Rehberi')
                .setDescription('Marpel ve Erensi altyapısıyla harmanlanmış en üst düzey komut listemiz aşağıdadır:')
                .setColor('#5865F2')
                .addFields(
                    { name: '🪙 OwO Ekonomi ve Mini Eğlence Oyunları', value: `> \`/profil\` - Detaylı seviye ve varlık paneli.\n> \`/bakiye\` - Hızlı cüzdan ve nakit sorgusu.\n> \`/gönder\` - Güvenli hesaplar arası nakit transferi.\n> \`/günlük\` - 24 saatlik hediye ödül kasası.\n> \`/yazıtura\` - Ortaya nakit bahis koyup yazı tura oynama.\n> \`/zar\` - Bot ile canlı zar kapıştırma turnuvası.\n> \`/slots\` - Şanslı slot meyve makinesi.` },
                    { name: '🛡️ Güçlü Moderasyon ve Yönetici Komutları', value: `> \`/sicil\` - Üyenin detaylı ceza, tutanak ve ban geçmişi.\n> \`/cekilis\` - Canlı saniyeli sayaçlı normal çekiliş.\n> \`/404cekilis\` - Otomatik teslimatlı Nakit çekilişi.\n> \`/temizle\` - Kanaldaki kalabalığı toplu temizler.\n> \`/tamyasakla\` - Üyeyi sunucudan uzaklaştırır (Ban).\n> \`/ipyasakla\` - Üyeyi kalıcı IP altyapısıyla engeller.\n> \`/sustur\` - İstenen süre kadar timeout atar.\n> \`/susturarak\` - Cezalı üyenin cezasını erkenden bozar.\n> \`/uyar\` - Üyeye kalıcı uyarı puanı sicili işler.\n> \`/kick\` - Üyeyi tek seferlik sunucudan dışarı atar.` }
                )
                .setFooter({ text: '404 Family • Her Zaman En İyisi', iconURL: interaction.guild.iconURL() }).setTimestamp();
            
            return interaction.reply({ embeds: [yardimEmbed], flags: [MessageFlags.Ephemeral] });
        }

        if (!cekilisKatilimcilari.has(msgId)) return interaction.reply({ content: '❌ Bu çekiliş aktif değil veya süresi dolmuş.', flags: [MessageFlags.Ephemeral] });
        const liste = cekilisKatilimcilari.get(msgId);

        if (action === 'katil') {
            if (liste.includes(interaction.user.id)) {
                const index = liste.indexOf(interaction.user.id);
                liste.splice(index, 1);
                cekilisKatilimcilari.set(msgId, liste);
                await interaction.reply({ content: '👋 Çekilişten başarıyla ayrıldınız.', flags: [MessageFlags.Ephemeral] });
            } else {
                liste.push(interaction.user.id);
                cekilisKatilimcilari.set(msgId, liste);
                await interaction.reply({ content: '🎉 Çekilişe başarıyla katıldınız! Bol şans.', flags: [MessageFlags.Ephemeral] });
            }

            try {
                const guncelMesaj = await interaction.channel.messages.fetch(msgId);
                if (guncelMesaj && guncelMesaj.embeds[0]) {
                    const eskiEmbed = guncelMesaj.embeds[0];
                    const yeniEmbed = EmbedBuilder.from(eskiEmbed);
                    
                    let desc = eskiEmbed.description;
                    desc = desc.replace(/> 👥 \*\*Katılımcı Sayısı:\*\* `\d+`|>\s👥\s\*\*Katılımcı Sayısı:\*\*\s`\d+`/g, `> 👥 **Katılımcı Sayısı:** \`${liste.length}\``);
                    desc = desc.replace(/> 👥 \*\*Toplam Katılımcı:\*\* `\d+`|>\s👥\s\*\*Toplam Katılımcı:\*\*\s`\d+`/g, `> 👥 **Toplam Katılımcı:** \`${liste.length}\``);
                    yeniEmbed.setDescription(desc);

                    const guncelButonlar = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`katil_${msgId}`).setLabel('🎉 Katıl / Ayrıl').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`liste_${msgId}`).setLabel(`👥 Katılımcılar (${liste.length})`).setStyle(ButtonStyle.Primary)
                    );
                    await guncelMesaj.edit({ embeds: [yeniEmbed], components: [guncelButonlar] });
                }
            } catch(e) {}
            return;
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

    const miniOyunlar = ['slots', 'yazıtura', 'zar'];
    if (miniOyunlar.includes(commandName)) {
        const kalanSaniye = cooldownKontrol(interaction.user.id);
        if (kalanSaniye) {
            return interaction.reply({ 
                content: `⏳ **Yavaşla Dostum!** Mini oyun komutları arasında ortak cooldown var. Tekrar oynamak için **${kalanSaniye} saniye** beklemelisin.`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }
    }

    const herkesKullanabilir = ['istatistik', 'yardım', 'profil', 'bakiye', 'gönder', 'yazıtura', 'zar', 'slots', 'günlük'];

    if (commandName === 'ipyasakla') {
        if (!ipBanYetkiKontrol(interaction)) return interaction.reply({ content: '❌ Bu özel koruma komutunu sadece tanımlı IP-Ban yetkilileri kullanabilir.', flags: [MessageFlags.Ephemeral] });
    } else if (!herkesKullanabilir.includes(commandName)) {
        if (!yetkiKontrol(interaction)) return interaction.reply({ content: '❌ Bu komutu kullanmak için yetkiniz yetersiz.', flags: [MessageFlags.Ephemeral] });
    }

    // ==========================================
    // 🚨 YENİ SİCİL SORGULAMA KOMUTU 🚨
    // ==========================================
    if (commandName === 'sicil') {
        const hedefKullanici = options.getUser('üye');
        const uVeri = profilGereksinim(hedefKullanici.id);
        const sicil = uVeri.sicil;

        const sTutanaklar = sicil.tutanaklar.length > 0 
            ? sicil.tutanaklar.map((t, i) => `**[${i+1}]** 📅 \`${t.tarih}\` | 📝 **Sebep:** \`${t.sebep}\` | 👮 **Yetkili:** \`${t.yetkili}\``).join('\n') 
            : '🟢 Temiz! Kayıtlı resmi tutanak (uyarı) bulunmuyor.';

        const sMuteler = sicil.muteler.length > 0 
            ? sicil.muteler.map((m, i) => `**[${i+1}]** 📅 \`${m.tarih}\` | ⏱️ \`${m.sure} Dk\` | 📝 **Sebep:** \`${m.sebep}\` | 👮 **Yetkili:** \`${m.yetkili}\``).join('\n') 
            : '🟢 Temiz! Herhangi bir susturma cezası kaydı yok.';

        const sBanlar = sicil.banlar.length > 0 
            ? sicil.banlar.map((b, i) => `**[${i+1}]** 📅 \`${b.tarih}\` | 🚫 \`[${b.tür}]\` | 📝 **Sebep:** \`${b.sebep}\` | 👮 **Yetkili:** \`${b.yetkili}\``).join('\n') 
            : '🟢 Temiz! Sunucudan atılma veya yasaklanma kaydı yok.';

        const sicilEmbed = new EmbedBuilder()
            .setTitle(`🚨 | ${hedefKullanici.username} - Sunucu Sicil Dosyası`)
            .setThumbnail(hedefKullanici.displayAvatarURL({ dynamic: true }))
            .setColor('#E74C3C')
            .setDescription(`Aşağıda bu kullanıcının sunucuda aldığı tüm disiplin işlemleri ve tutanak gerekçeleri listelenmiştir:`)
            .addFields(
                { name: `🚨 Resmi Uyarı Tutanakları (${sicil.tutanaklar.length})`, value: sTutanaklar },
                { name: `🔇 Susturma / Timeout Geçmişi (${sicil.muteler.length})`, value: sMuteler },
                { name: `🚫 Ağır Cezalar (Ban / Kick Geçmişi) (${sicil.banlar.length})`, value: sBanlar }
            )
            .setFooter({ text: '404 Family Disiplin Masası Arşivi' })
            .setTimestamp();

        return interaction.reply({ embeds: [sicilEmbed] });
    }

    // --- TEMİZLE KOMUTU ---
    if (commandName === 'temizle') {
        const silinecekMiktar = options.getInteger('sayi');
        if (silinecekMiktar < 1 || silinecekMiktar > 100) {
            return interaction.reply({ content: '❌ Tek seferde en az **1**, en fazla **100** mesaj silebilirsiniz.', flags: [MessageFlags.Ephemeral] });
        }
        await channel.bulkDelete(silinecekMiktar, true).then(async (mesajlar) => {
            const temizleEmbed = new EmbedBuilder()
                .setTitle('🧹 | SÜPÜRME İŞLEMİ TAMAMLANDI')
                .setDescription(`🚀 Kanaldan son atılan **${mesajlar.size}** mesaj başarıyla kazındı ve imha edildi!`)
                .addFields({ name: '👮 İşlemi Yapan Yetkili:', value: `${interaction.user.toString()}` })
                .setColor('#3498DB').setTimestamp();
            await interaction.reply({ embeds: [temizleEmbed] });
            setTimeout(() => { interaction.deleteReply().catch(() => null); }, 6000);
        }).catch(() => {
            return interaction.reply({ content: '❌ Mesajlar silinirken bir hata oluştu! (Not: 14 günden eski mesajlar toplu silinemez.)', flags: [MessageFlags.Ephemeral] });
        });
    }

    // --- GÜNLÜK ÖDÜL ---
    if (commandName === 'günlük') {
        const uVeri = profilGereksinim(interaction.user.id);
        const beklemeSuresi = 24 * 60 * 60 * 1000; 
        const kalanZaman = uVeri.gunlukZaman + beklemeSuresi - Date.now();

        if (kalanZaman > 0) {
            const saat = Math.floor(kalanZaman / (1000 * 60 * 60));
            const dakika = Math.floor((kalanZaman % (1000 * 60 * 60)) / (1000 * 60));
            return interaction.reply({ content: `⏳ Günlük ödülünü zaten aldın! Tekrar alabilmek için **${saat} saat ${dakika} dakika** beklemelisin.`, flags: [MessageFlags.Ephemeral] });
        }

        const hediyePara = Math.floor(Math.random() * 201) + 50; 
        const data = veriOku();
        data[interaction.user.id].bakiye += hediyePara;
        data[interaction.user.id].gunlukZaman = Date.now();
        veriYaz(data);

        const dailyEmbed = new EmbedBuilder()
            .setTitle('🎁 | GÜNLÜK ÖDÜL KASASI AÇILDI!')
            .setDescription(`🎉 Harika! Bugünlük şansına tam **+${hediyePara} adet [404 Nakit]** cüzdanına ekliyor!`)
            .addFields({ name: '💰 Yeni Güncel Bakiyeniz:', value: `\`${data[interaction.user.id].bakiye} adet [404 Nakit]\`` })
            .setColor('#57F287').setTimestamp();
        return interaction.reply({ embeds: [dailyEmbed] });
    }

    // --- NORMAL ÇEKİLİŞ ---
    if (commandName === 'cekilis') {
        let kalanSure = options.getInteger('sure');
        const odul = options.getString('odul');
        await interaction.reply({ content: '✨ Çekiliş kuruluyor...', flags: [MessageFlags.Ephemeral] });

        // 📩 Çekiliş Başladığında Üyelere DM Bildirimi Gönderme Paneli
        const tumUyeler = await guild.members.fetch();
        tumUyeler.forEach(async (m) => {
            if (m.user.bot) return;
            const dmCekilisBildirim = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🎁 | Sunucuda Yeni Bir Çekiliş Başladı!')
                .setDescription(`**${guild.name}** sunucumuzda harika bir çekiliş şöleni başladı. Şansını kaçırmak istemiyorsan hemen gel ve butona bas!`)
                .addFields(
                    { name: '🏆 Verilecek Büyük Ödül:', value: `🎁 **${odul}**` },
                    { name: '⏱️ Katılım Süresi:', value: `\`${kalanSure} Saniye\`` }
                ).setTimestamp();
            try { await m.send({ embeds: [dmCekilisBildirim] }); } catch(e) {}
        });

        const msg = await channel.send({ content: '⏳ Çekiliş paneli hazırlanıyor...' });
        const cekilisId = msg.id;
        cekilisKatilimcilari.set(cekilisId, []);

        const embed = new EmbedBuilder()
            .setTitle('🎁 | 404 FAMILY - ÇEKİLİŞ ŞÖLENİ')
            .setDescription(`Sunucumuzda yeni bir çekiliş maratonu başladı! Katılmak için aşağıdaki butona tıklayın!`)
            .addFields(
                { name: '🏆 Çekiliş Ödülü:', value: `🎁 **${odul}**`, inline: true },
                { name: '⏳ Kalan Süre:', value: `⏱️ **${kalanSure} saniye**`, inline: true },
                { name: '👥 Toplam Katılımcı:', value: `\`0\``, inline: false }
            )
            .setColor('#5865F2').setTimestamp();

        const butonlar = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`katil_${cekilisId}`).setLabel('🎉 Katıl / Ayrıl').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`liste_${cekilisId}`).setLabel('👥 Katılımcılar (0)').setStyle(ButtonStyle.Primary)
        );
        await msg.edit({ content: '🔔 @everyone **Yeni bir çekiliş başladı!**', embeds: [embed], components: [butonlar], allowedMentions: { parse: ['everyone'] } });

        const interval = setInterval(async () => {
            kalanSure -= 3;
            if (kalanSure <= 0) { clearInterval(interval); return; }
            try {
                const anlikListe = cekilisKatilimcilari.get(cekilisId) || [];
                const guncelEmbed = new EmbedBuilder()
                    .setTitle('🎁 | 404 FAMILY - ÇEKİLİŞ ŞÖLENİ')
                    .setDescription(`Sunucumuzda yeni bir çekiliş maratonu başladı! Katılmak için aşağıdaki butona tıklayın!`)
                    .addFields(
                        { name: '🏆 Çekiliş Ödülü:', value: `🎁 **${odul}**`, inline: true },
                        { name: '⏳ Kalan Süre:', value: `⏱️ **${kalanSure} saniye**`, inline: true },
                        { name: '👥 Toplam Katılımcı:', value: `\`${anlikListe.length}\``, inline: false }
                    )
                    .setColor('#5865F2').setTimestamp();
                await msg.edit({ embeds: [guncelEmbed] });
            } catch (err) { clearInterval(interval); }
        }, 3000);

        setTimeout(async () => {
            clearInterval(interval);
            try {
                const finalListe = cekilisKatilimcilari.get(cekilisId) || [];
                const pasifButonlar = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`disabled_katil`).setLabel('🎉 Katılım Sonlandı').setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId(`disabled_liste`).setLabel(`👥 Toplam Katılımcı (${finalListe.length})`).setStyle(ButtonStyle.Secondary).setDisabled(true)
                );

                if (finalListe.length === 0) {
                    const bitisEmbed = new EmbedBuilder().setTitle('🎉 | Çekiliş Sona Erdi').setDescription(`🏆 **Ödül:** \`${odul}\`\n❌ **Sonuç:** Katılım olmadığı için kazanan seçilemedi.`).setColor('#4F545C').setTimestamp();
                    await msg.edit({ embeds: [bitisEmbed], components: [pasifButonlar] });
                    cekilisKatilimcilari.delete(cekilisId);
                    return channel.send({ content: `⚠️ Çekilişe kimse katılmadığı için talihli çıkmadı.` });
                }

                const kazananId = finalListe[Math.floor(Math.random() * finalListe.length)];
                const bitisEmbed = new EmbedBuilder()
                    .setTitle('🎉 | ÇEKİLİŞ SONUÇLANDI 🎉')
                    .setDescription(`Büyük çekiliş maratonu başarıyla tamamlandı ve şanslı kişi belirlendi!`)
                    .addFields(
                        { name: '🏆 Kazanılan Ödül:', value: `🎁 **${odul}**`, inline: true },
                        { name: '🍀 Şanslı Talihli:', value: `<@${kazananId}>`, inline: true }
                    )
                    .setColor('#2ECC71').setTimestamp();

                await msg.edit({ embeds: [bitisEmbed], components: [pasifButonlar] });
                await channel.send({ content: `🎊 Dehşet Tebrikler <@${kazananId}>! **${odul}** ödülünü kazandın! Hepsini güle güle kullan!` });
                cekilisKatilimcilari.delete(cekilisId);
            } catch (err) {}
        }, options.getInteger('sure') * 1000);
    }

    // --- 404 NAKİT ÇEKİLİŞİ ---
    if (commandName === '404cekilis') {
        let kalanSure = options.getInteger('sure');
        const miktar = options.getInteger('miktar');

        if (miktar <= 0) return interaction.reply({ content: '❌ Geçersiz miktar.', flags: [MessageFlags.Ephemeral] });
        await interaction.reply({ content: '🪙 Otomatik nakit çekilişi kuruluyor...', flags: [MessageFlags.Ephemeral] });

        // 📩 404 Çekilişi Başladığında Üyelere DM Bildirimi
        const tumUyeler = await guild.members.fetch();
        tumUyeler.forEach(async (m) => {
            if (m.user.bot) return;
            const dmCekilisBildirim = new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle('🪙 | Sunucuda Büyük Nakit Çekilişi Başladı!')
                .setDescription(`**${guild.name}** sunucumuzda cüzdanları dolduracak dev bir ekonomi çekilişi başladı!`)
                .addFields(
                    { name: '💰 Dağıtılacak Nakit:', value: `🪙 **${miktar} adet [404 Nakit]**` },
                    { name: '⏱️ Kalan Süre:', value: `\`${kalanSure} Saniye\`` }
                ).setTimestamp();
            try { await m.send({ embeds: [dmCekilisBildirim] }); } catch(e) {}
        });

        const msg = await channel.send({ content: '⏳ 404 Nakit Çekiliş paneli hazırlanıyor...' });
        const cekilisId = msg.id;
        cekilisKatilimcilari.set(cekilisId, []);

        const embed = new EmbedBuilder()
            .setTitle('🪙 | 404 FAMILY - BÜYÜK HESAP DAĞITIMI')
            .setDescription(`Sistem tarafından otomatik yüklemeli devasa bir nakit dağıtımı başladı!`)
            .addFields(
                { name: '💰 Çekiliş Ödülü:', value: `🪙 **${miktar} adet [404 Nakit]**`, inline: true },
                { name: '⏳ Kalan Süre:', value: `⏱️ **${kalanSure} saniye**`, inline: true },
                { name: '👥 Toplam Katılımcı:', value: `\`0\``, inline: false }
            )
            .setColor('#FEE75C').setTimestamp();

        const butonlar = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`katil_${cekilisId}`).setLabel('🎉 Katıl / Ayrıl').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`liste_${cekilisId}`).setLabel('👥 Katılımcılar (0)').setStyle(ButtonStyle.Primary)
        );
        await msg.edit({ content: '🔔 @everyone **Büyük Nakit Çekilişi Başladı!**', embeds: [embed], components: [butonlar], allowedMentions: { parse: ['everyone'] } });

        const interval = setInterval(async () => {
            kalanSure -= 3;
            if (kalanSure <= 0) { clearInterval(interval); return; }
            try {
                const anlikListe = cekilisKatilimcilari.get(cekilisId) || [];
                const guncelEmbed = new EmbedBuilder()
                    .setTitle('🪙 | 404 FAMILY - BÜYÜK HESAP DAĞITIMI')
                    .setDescription(`Sistem tarafından otomatik yüklemeli devasa bir nakit dağıtımı başladı!`)
                    .addFields(
                        { name: '💰 Çekiliş Ödülü:', value: `🪙 **${miktar} adet [404 Nakit]**`, inline: true },
                        { name: '⏳ Kalan Süre:', value: `⏱️ **${kalanSure} saniye**`, inline: true },
                        { name: '👥 Toplam Katılımcı:', value: `\`${anlikListe.length}\``, inline: false }
                    )
                    .setColor('#FEE75C').setTimestamp();
                await msg.edit({ embeds: [guncelEmbed] });
            } catch (err) { clearInterval(interval); }
        }, 3000);

        setTimeout(async () => {
            clearInterval(interval);
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
                    .setTitle('🎉 | NAKİT ÇEKİLİŞİ SONUÇLANDI 🎉')
                    .setDescription(`Büyük para dağıtımı sona erdi! Şanslı üyenin cüzdanı havadan dolduruldu.`)
                    .addFields(
                        { name: '💰 Dağıtılan Ödül:', value: `🪙 **${miktar} adet [404 Nakit]**`, inline: true },
                        { name: '🍀 Şanslı Talihli:', value: `<@${kazananId}>`, inline: true }
                    )
                    .setFooter({ text: '🌟 Ödül sistem tarafından cüzdana otomatik aktarılmıştır.' })
                    .setColor('#2ECC71').setTimestamp();

                await msg.edit({ embeds: [bitisEmbed], components: [pasifButonlar] });
                await channel.send({ content: `🎊 Muazzam Tebrikler <@${kazananId}>! Çekilişi havada yakaladın ve **${miktar} adet [404 Nakit]** cüzdanına otomatik yüklendi!` });
                cekilisKatilimcilari.delete(cekilisId);
            } catch (err) {}
        }, options.getInteger('sure') * 1000);
    }

    // --- PROFiL ---
    if (commandName === 'profil') {
        const hedefUye = options.getUser('kullanici') || interaction.user;
        const uVeri = profilGereksinim(hedefUye.id);
        const gerekenXp = uVeri.seviye * 100;
        const profilEmbed = new EmbedBuilder()
            .setTitle(`📊 | ${hedefUye.username} - Detaylı Kart Bilgisi`)
            .setThumbnail(hedefUye.displayAvatarURL({ dynamic: true }))
            .setColor('#5865F2')
            .addFields(
                { name: '🪙 Cüzdan Bakiyesi:', value: `\`💰 ${uVeri.bakiye} adet [404 Nakit]\``, inline: true },
                { name: '🌟 Mevcut Aşama:', value: `\`✨ Level ${uVeri.seviye}\``, inline: true },
                { name: '📊 İlerleme Durumu (XP):', value: `\`📈 ${uVeri.xp} / ${requiredXp} XP\` (Sonraki seviyeye \`${gerekenXp - uVeri.xp}\` XP kaldı.)`, inline: false },
                { name: '⚠️ Sicil Geçmişi:', value: `\`🚨 Toplam Uyarı: ${uVeri.uyariSayisi || 0}\``, inline: false }
            ).setTimestamp();
        return interaction.reply({ embeds: [profilEmbed] });
    }

    // --- BAKİYE ---
    if (commandName === 'bakiye') {
        const hedefUye = options.getUser('kullanici') || interaction.user;
        const uVeri = profilGereksinim(hedefUye.id);
        const bakiyeEmbed = new EmbedBuilder()
            .setTitle('🪙 | HESAP CÜZDANI DETAYI')
            .setDescription(`${hedefUye.toString()} kullanıcısının sunucu üzerindeki güncel finansal durumu:`)
            .addFields({ name: '💵 Toplam Birikim:', value: `**${uVeri.bakiye}** \`adet [404 Nakit]\`` })
            .setColor('#FEE75C').setThumbnail(hedefUye.displayAvatarURL({ dynamic: true })).setTimestamp();
        return interaction.reply({ embeds: [bakiyeEmbed] });
    }

    // --- PARA GÖNDER ---
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
            .setTitle('💸 | GÜVENLİ HESAP TRANSFERİ')
            .setDescription(`Varlık aktarım işlemi başarıyla onaylandı ve tamamlandı!`)
            .addFields(
                { name: '📤 Gönderen Taraf:', value: `${interaction.user.toString()}`, inline: true },
                { name: '📥 Alıcı Taraf:', value: `${alici.toString()}`, inline: true },
                { name: '💰 Transfer Miktarı:', value: `\`${miktar} adet [404 Nakit]\``, inline: false }
            )
            .setColor('#57F287').setTimestamp();
        return interaction.reply({ embeds: [transferEmbed] });
    }

    // --- YAZI TURA ---
    if (commandName === 'yazıtura') {
        const userId = interaction.user.id;
        const miktar = options.getInteger('miktar');
        const tahmin = options.getString('tahmin');
        const uVeri = profilGereksinim(userId);

        if (miktar <= 0) return interaction.reply({ content: '❌ Geçersiz bahis miktarı.', flags: [MessageFlags.Ephemeral] });
        if (uVeri.bakiye < miktar) return interaction.reply({ content: `❌ Yetersiz bakiye!`, flags: [MessageFlags.Ephemeral] });

        const baslangicEmbed = new EmbedBuilder()
            .setTitle('🪙 | PARA HAVA ATILDI! 🪙')
            .setColor('#FEE75C')
            .setDescription(`> **[ 🔄 Madeni para havada hızla dönüyor... ]**\n\nBahse Yatırılan: **${miktar} adet [404 Nakit]**`).setTimestamp();

        await interaction.reply({ embeds: [baslangicEmbed] });
        await sleep(1500); 

        const sonuclar = ['yazi', 'tura'];
        const rastgeleSonuc = sonuclar[Math.floor(Math.random() * sonuclar.length)];
        const durumMetni = rastgeleSonuc === 'yazi' ? '🪙 **YAZI**' : '🪙 **TURA**';

        const data = veriOku();
        const finalEmbed = new EmbedBuilder().setTimestamp();

        if (tahmin === rastgeleSonuc) {
            data[userId].bakiye += miktar;
            finalEmbed.setTitle('🎉 | KAZANDINIZ! TEBRİKLER').setColor('#57F287')
                .setDescription(`Para yere çakıldı ve ${durumMetni} geldi!\nHesabına **+${miktar} adet [404 Nakit]** ganimet eklendi.\n💰 Toplam Varlığın: **${data[userId].bakiye}**`);
        } else {
            data[userId].bakiye -= miktar;
            finalEmbed.setTitle('❌ | KAYBETTİNİZ... ŞANSINA KÜS').setColor('#ED4245')
                .setDescription(`Para yere çakıldı ve ${durumMetni} geldi...\nHesabından **-${miktar} adet [404 Nakit]** uçup gitti.\n💰 Toplam Varlığın: **${data[userId].bakiye}**`);
        }
        veriYaz(data);
        return interaction.editReply({ embeds: [finalEmbed] });
    }

    // --- ZAR ---
    if (commandName === 'zar') {
        const userId = interaction.user.id;
        const miktar = options.getInteger('miktar');
        const uVeri = profilGereksinim(userId);

        if (miktar <= 0) return interaction.reply({ content: '❌ Geçersiz bahis miktarı.', flags: [MessageFlags.Ephemeral] });
        if (uVeri.bakiye < miktar) return interaction.reply({ content: `❌ Yetersiz bakiye!`, flags: [MessageFlags.Ephemeral] });

        const zarSallaniyorEmbed = new EmbedBuilder()
            .setTitle('🎲 | ZAR KUPASI SALLANIYOR... 🎲')
            .setColor('#FEE75C')
            .setDescription(`> **[ Zarlar kupanın içinde takırdıyor! 🔄 ]**\n\nBakalım şans tanrıları kimden yana olacak? 👀`).setTimestamp();

        await interaction.reply({ embeds: [zarSallaniyorEmbed] });
        await sleep(1000);
        const oyuncuZar = Math.floor(Math.random() * 6) + 1;
        await interaction.editReply({
            embeds: [new EmbedBuilder().setTitle('🎲 | ZAR KUPASI SALLANIYOR... 🎲').setColor('#FEE75C').setDescription(`> 🎲 Senin Zarın: **${oyuncuZar}**\n> 🤖 Botun Zarı: **🔄 Yuvarlanıyor...**`).setTimestamp()]
        });

        await sleep(1000);
        const botZar = Math.floor(Math.random() * 6) + 1;

        const data = veriOku();
        const sonucEmbed = new EmbedBuilder().setTimestamp();

        if (oyuncuZar > botZar) {
            data[userId].bakiye += miktar;
            sonucEmbed.setTitle('🎉 | MASAYI DAĞITTIN! KAZANDIN').setColor('#57F287').setDescription(`🎲 Senin Zarın: **${oyuncuZar}** | 🤖 Botun Zarı: **${botZar}**\n\nMüthiş hamle! Botu alt ettin ve kasadan **+${miktar} adet [404 Nakit]** çektin.`);
        } else if (botZar > oyuncuZar) {
            data[userId].bakiye -= miktar;
            sonucEmbed.setTitle('❌ | BOT DAHA BÜYÜK ATTI! KAYBETTİN').setColor('#ED4245').setDescription(`🎲 Senin Zarın: **${oyuncuZar}** | 🤖 Botun Zarı: **${botZar}**\n\nGeçmiş olsun, bot hileli gibi attı ve masaya **-${miktar} adet [404 Nakit]** bıraktın.`);
        } else {
            sonucEmbed.setTitle('🤝 | ZARLAR EŞİTLENDİ! BERABERE').setColor('#FEE75C').setDescription(`🎲 Senin Zarın: **${oyuncuZar}** | 🤖 Botun Zarı: **${botZar}**\n\nZarlar yenişemedi! Paranın tek kuruşuna dokunulmadan iade edildi.`);
        }
        veriYaz(data);
        return interaction.editReply({ embeds: [sonucEmbed] });
    }

    // --- SLOTS ---
    if (commandName === 'slots') {
        const userId = interaction.user.id;
        const miktar = options.getInteger('miktar');
        const uVeri = profilGereksinim(userId);

        if (miktar <= 0) return interaction.reply({ content: '❌ Geçersiz bahis miktarı.', flags: [MessageFlags.Ephemeral] });
        if (uVeri.bakiye < miktar) return interaction.reply({ content: `❌ Yetersiz bakiye!`, flags: [MessageFlags.Ephemeral] });

        const donmeEmbed = new EmbedBuilder()
            .setTitle('🎰 | KUMAR MAKİNESİ DÖNÜYOR... 🎰')
            .setColor('#FEE75C')
            .setDescription(`> ┃ 🔄 ┃ 🔄 ┃ 🔄 ┃\n\nKollar çekildi, makine çılgınlar gibi dönüyor! 💸`).setTimestamp();

        await interaction.reply({ embeds: [donmeEmbed] });
        const slotOgeleri = ['🍒', '💎', '🍊', '🔔', '🍀'];
        
        await sleep(800);
        const s1 = slotOgeleri[Math.floor(Math.random() * slotOgeleri.length)];
        await interaction.editReply({
            embeds: [new EmbedBuilder().setTitle('🎰 | KUMAR MAKİNESİ DÖNÜYOR... 🎰').setColor('#FEE75C').setDescription(`> ┃ ${s1} ┃ 🔄 ┃ 🔄 ┃\n\nİlk çark kilitlendi!`).setTimestamp()]
        });

        await sleep(800);
        const s2 = slotOgeleri[Math.floor(Math.random() * slotOgeleri.length)];
        await interaction.editReply({
            embeds: [new EmbedBuilder().setTitle('🎰 | KUMAR MAKİNESİ DÖNÜYOR... 🎰').setColor('#FEE75C').setDescription(`> ┃ ${s1} ┃ ${s2} ┃ 🔄 ┃\n\nİkinci çark kilitlendi!`).setTimestamp()]
        });

        await sleep(800);
        const s3 = slotOgeleri[Math.floor(Math.random() * slotOgeleri.length)];

        const data = veriOku();
        const finalEmbed = new EmbedBuilder().setTimestamp();

        if (s1 === s2 && s2 === s3) {
            const kazanc = miktar * 3; 
            data[userId].bakiye += kazanc;
            finalEmbed.setTitle('🎰 🔥 MEGA JACKPOT WIN! 🔥 🎰').setColor('#57F287').setDescription(`> ┃ ${s1} ┃ ${s2} ┃ ${s3} ┃\n\nİnanılmaz! Kusursuz üçleme yakaladın ve kasayı patlatıp **+${kazanc} adet [404 Nakit]** kaldırdın!`);
        } else if (s1 === s2 || s2 === s3 || s1 === s3) {
            data[userId].bakiye += miktar;
            finalEmbed.setTitle('🎉 | KÜÇÜK KAZANÇ SAĞLANDI').setColor('#3498DB').setDescription(`> ┃ ${s1} ┃ ${s2} ┃ ${s3} ┃\n\nİkili kombinasyon oturdu, paranı amorti ettin! **+${miktar} adet [404 Nakit]** eklendi.`);
        } else {
            data[userId].bakiye -= miktar;
            finalEmbed.setTitle('❌ | MAKİNE SIFIR ÇEKTİ! KAYBETTİN').setColor('#ED4245').setDescription(`> ┃ ${s1} ┃ ${s2} ┃ ${s3} ┃\n\nHiçbir simge birbirini tutmadı. Sisteme **-${miktar} adet [404 Nakit]** kaptırdın.`);
        }
        veriYaz(data);
        return interaction.editReply({ embeds: [finalEmbed] });
    }

    if (commandName === 'yardım') {
        const embed = new EmbedBuilder()
            .setTitle(`⚡ | ${client.user.username} - Sistem Destek Komuta Merkezi`)
            .setDescription(`Selamlar **${interaction.user.username}**, sunucunun asayişini sağlamak ve ortamı eğlenceli kılmak için tam donanımlı olarak emrindeyim! Tüm komutları görmek için alttaki butona abanabilirsin.`)
            .setColor('#5865F2').setThumbnail(client.user.avatarURL()).setTimestamp();
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('helpmenu_view').setLabel('📚 Tüm Komut Panelini Listele').setStyle(ButtonStyle.Primary));
        return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (commandName === 'istatistik') {
        const uptime = process.uptime();
        const d = Math.floor(uptime / (3600*24)); const h = Math.floor(uptime % (3600*24) / 3600); const m = Math.floor(uptime % 3600 / 60);
        const statsEmbed = new EmbedBuilder().setTitle(`⚙️ | SİSTEMİN DONANIMSAL ANALİZLERİ`).setColor('#5865F2')
            .addFields(
                { name: '🤖 Bot Gecikmeleri', value: `> **Anlık Ping:** \`${client.ws.ping}ms\`\n> **Çalışma Süresi:** \`${d} Gün, ${h} Saat, ${m} Dakika\`` },
                { name: '💻 Sunucu Donanımı', value: `> **Platform:** \`${os.platform()}\`\n> **Önbellek (RAM) Tüketimi:** \`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\`` }
            ).setTimestamp();
        return interaction.reply({ embeds: [statsEmbed] });
    }

    // ==========================================
    // 🚫 MODERASYON KOMUTLARI (SİCİL VERİ KAYITLI VE DM SEVKİYATLI)
    // ==========================================

    if (commandName === 'tamyasakla') {
        const member = options.getMember('kullanici'); 
        const sebep = options.getString('sebep') || 'Belirtilmedi';
        if (!member) return interaction.reply({ content: '❌ Kullanıcı bulunamadı veya sunucuda değil.', flags: [MessageFlags.Ephemeral] });

        // 📝 Sicil Veritabanına Kayıt
        profilGereksinim(member.id);
        const dbData = veriOku();
        dbData[member.id].sicil.banlar.push({ tür: 'BAN', sebep: sebep, yetkili: yetkili.tag, tarih: new Date().toLocaleString('tr-TR') });
        veriYaz(dbData);

        // 📩 Kullanıcıya Ultra Detaylı DM Bildirimi
        const dmEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🚫 | Sunucudan Kalıcı Olarak Yasaklandınız!')
            .setDescription(`**${guild.name}** sunucumuzun kurallarını ihlal ettiğiniz gerekçesiyle uzaklaştırıldınız.`)
            .addFields(
                { name: '📝 Ceza Gerekçesi:', value: `\`${sebep}\``, inline: true },
                { name: '👮 İşlemi Uygulayan:', value: `**${yetkili.tag}**`, inline: true }
            )
            .setFooter({ text: 'Eğer bir hata olduğunu düşünüyorsanız üst yönetimle iletişime geçin.' }).setTimestamp();
        
        try { await member.send({ embeds: [dmEmbed] }); } catch(e) {}

        await member.ban({ reason: `Yetkili: ${yetkili.tag} | Gerekçe: ${sebep}` });

        const banEmbed = new EmbedBuilder()
            .setColor('#ED4245')
            .setTitle('🚫 | KALICI YASAKLAMA İŞLEMİ')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Uzaklaştırılan Üye:', value: `${member} (\`${member.id}\`)`, inline: true },
                { name: '👮 Yetkili Moderatör:', value: `${interaction.user.toString()}`, inline: true },
                { name: '📝 Geçerli Sebep:', value: `\`${sebep}\``, inline: false }
            ).setTimestamp();
        return interaction.reply({ embeds: [banEmbed] });
    }

    if (commandName === 'ipyasakla') {
        const member = options.getMember('kullanici');
        const sebep = options.getString('sebep') || 'Ağ Güvenliği / Ağır Kural İhlali';
        if (!member) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });

        profilGereksinim(member.id);
        const dbData = veriOku();
        dbData[member.id].sicil.banlar.push({ tür: 'IP-BAN', sebep: sebep, yetkili: yetkili.tag, tarih: new Date().toLocaleString('tr-TR') });
        veriYaz(dbData);

        const dmEmbed = new EmbedBuilder()
            .setColor('#7a0000')
            .setTitle('💥 | IP ALTYAPISIYLA TAMAMEN ENGELLENDİNİZ!')
            .setDescription(`**${guild.name}** sunucusundan tüm ağ adresleriniz (IP) bloke edilerek kalıcı olarak men edildiniz.`)
            .addFields(
                { name: '📝 Ağır Gerekçe:', value: `\`${sebep}\`` },
                { name: '👮 İşlemi Yapan Üst Yetkili:', value: `**${yetkili.tag}**` }
            ).setTimestamp();
        try { await member.send({ embeds: [dmEmbed] }); } catch(e) {}

        await guild.bans.create(member.id, { deleteMessageSeconds: 604800, reason: `IP BAN | Yetkili: ${yetkili.tag} | Sebep: ${sebep}` });

        const gizliLogKanali = guild.channels.cache.get(IP_BAN_LOG_KANAL_ID);
        if (gizliLogKanali) {
            const gizliArsivEmbed = new EmbedBuilder()
                .setTitle('🗄️ | GÜVENLİK ARŞİVİ: DEEP IP BAN KAYDI')
                .addFields(
                    { name: '👤 Cezalandırılan:', value: `${member.user.tag}`, inline: true },
                    { name: '🆔 Kullanıcı ID:', value: `\`${member.id}\``, inline: true },
                    { name: '📝 Ağır Sebep:', value: `\`${sebep}\``, inline: false }
                ).setColor('#7a0000').setTimestamp();
            await gizliLogKanali.send({ embeds: [gizliArsivEmbed] });
        }

        const ipBanEmbed = new EmbedBuilder()
            .setColor('#7a0000')
            .setTitle('💥 | SİSTEMSEL IP ENGELLEMESİ')
            .setDescription(`Sunucunun huzurunu bozan zararlı odağın tüm ağ bağlantıları kesilerek sunucudan kara listeye alındı!`)
            .addFields(
                { name: '👤 IP Banlanan:', value: `${member.user.toString()}`, inline: true },
                { name: '👮 Güvenlik Görevlisi:', value: `${interaction.user.toString()}`, inline: true }
            ).setTimestamp();
        return interaction.reply({ embeds: [ipBanEmbed] });
    }

    if (commandName === 'sustur') {
        const member = options.getMember('kullanici'); 
        const sure = options.getInteger('sure');
        const sebep = options.getString('sebep') || 'Belirtilmedi';
        if (!member) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });

        // 📝 Sicil Mute Kaydı
        profilGereksinim(member.id);
        const dbData = veriOku();
        dbData[member.id].sicil.muteler.push({ sure: sure, sebep: sebep, yetkili: yetkili.tag, tarih: new Date().toLocaleString('tr-TR') });
        veriYaz(dbData);

        const dmEmbed = new EmbedBuilder()
            .setColor('#E67E22')
            .setTitle('🔇 | Sunucuda Susturuldunuz! (Timeout)')
            .setDescription(`**${guild.name}** sunucusunda sesli ve yazılı kanallarda geçici olarak engellendiniz.`)
            .addFields(
                { name: '⏱️ Ceza Süresi:', value: `\`${sure} Dakika\``, inline: true },
                { name: '📝 Ceza Sebebi:', value: `\`${sebep}\``, inline: true },
                { name: '👮 Cezayı Veren:', value: `**${yetkili.tag}**`, inline: false }
            ).setTimestamp();
        try { await member.send({ embeds: [dmEmbed] }); } catch(e) {}

        await member.timeout(sure * 60 * 1000, `Yetkili: ${yetkili.tag} | Sebep: ${sebep}`);

        const muteEmbed = new EmbedBuilder()
            .setColor('#E67E22')
            .setTitle('🔇 | GEÇİCİ SUSTURMA (TIMEOUT) UYGULANDI')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Susturulan Üye:', value: `${member} (\`${member.id}\`)`, inline: true },
                { name: '⏱️ Susturma Süresi:', value: `\`${sure} Dakika\``, inline: true },
                { name: '👮 Sorumlu Yetkili:', value: `${interaction.user.toString()}`, inline: false },
                { name: '📝 Ceza Gerekçesi:', value: `\`${sebep}\``, inline: false }
            ).setTimestamp();
        return interaction.reply({ embeds: [muteEmbed] });
    }

    if (commandName === 'susturarak') {
        const member = options.getMember('kullanici');
        if (!member) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });

        const dmEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('🔊 | Susturma Cezanız Erkenden Kaldırıldı!')
            .setDescription(`**${guild.name}** sunucusundaki mevcut timeout cezanız yetkililer tarafından affedildi. Yeniden konuşabilirsiniz!`)
            .setTimestamp();
        try { await member.send({ embeds: [dmEmbed] }); } catch(e) {}

        await member.timeout(null); 

        const unmuteEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('🔊 | TIMEOUT CEZASI İPTAL EDİLDİ')
            .setDescription(`${member.toString()} kullanıcısının cezası, ${interaction.user.toString()} tarafından erkenden kaldırıldı ve konuşma hakkı iade edildi.`)
            .setTimestamp();
        return interaction.reply({ embeds: [unmuteEmbed] });
    }

    if (commandName === 'uyar') {
        const member = options.getMember('kullanici');
        const sebep = options.getString('sebep') || 'Kural İhlali / Uyarı gerektiren davranış';
        if (!member) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });

        profilGereksinim(member.id);
        const dbData = veriOku();
        dbData[member.id].uyariSayisi = (dbData[member.id].uyariSayisi || 0) + 1;
        
        // 📝 Sicil Tutanak Kaydı
        dbData[member.id].sicil.tutanaklar.push({ sebep: sebep, yetkili: yetkili.tag, tarih: new Date().toLocaleString('tr-TR') });
        veriYaz(dbData);

        // 📩 Uyarı DM Sevkiyatı
        const dmEmbed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('⚠️ | RESMİ UYARI (TUTANAK) ALDINIZ!')
            .setDescription(`**${guild.name}** sunucusunda kuralları ihlal ettiğiniz için sicilinize yeni bir tutanak işlenmiştir.`)
            .addFields(
                { name: '📝 Tutanak Gerekçesi:', value: `\`${sebep}\``, inline: true },
                { name: '📊 Toplam Uyarı Sayınız:', value: `🚨 **${dbData[member.id].uyariSayisi}**`, inline: true },
                { name: '👮 İşlem Yapan Yetkili:', value: `**${yetkili.tag}**`, inline: false }
            )
            .setFooter({ text: 'Lütfen tekrarlamamaya ve sunucu nizamına uymaya özen gösterin.' }).setTimestamp();
        try { await member.send({ embeds: [dmEmbed] }); } catch(e) {}

        const uyarEmbed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('⚠️ | RESMİ UYARI İŞLEMİ')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Uyarılan Üye:', value: `${member} (\`${member.id}\`)`, inline: true },
                { name: '🚨 Güncel Uyarı Sicili:', value: `\`${dbData[member.id].uyariSayisi}. Uyarı\``, inline: true },
                { name: '👮 Tutanak Tutan Yetkili:', value: `${interaction.user.toString()}`, inline: false },
                { name: '📝 Tutanak Gerekçesi:', value: `\`${sebep}\``, inline: false }
            ).setTimestamp();
        return interaction.reply({ embeds: [uyarEmbed] });
    }

    if (commandName === 'kick') {
        const member = options.getMember('kullanici');
        const sebep = options.getString('sebep') || 'Belirtilmedi';
        if (!member) return interaction.reply({ content: '❌ Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });

        profilGereksinim(member.id);
        const dbData = veriOku();
        dbData[member.id].sicil.banlar.push({ tür: 'KICK', sebep: sebep, yetkili: yetkili.tag, tarih: new Date().toLocaleString('tr-TR') });
        veriYaz(dbData);

        const dmEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('👢 | Sunucudan Atıldınız! (Kick)')
            .setDescription(`**${guild.name}** sunucusundan atıldınız. Bu ceza kalıcı değildir, bağlantıyı kullanarak geri gelebilirsiniz.`)
            .addFields({ name: '📝 Atılma Sebebi:', value: `\`${sebep}\`` }).setTimestamp();
        try { await member.send({ embeds: [dmEmbed] }); } catch(e) {}

        await member.kick(`Yetkili: ${yetkili.tag} | Sebep: ${sebep}`);

        const kickEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('👢 | SUNUCUDAN DIŞARI ATMA (KICK)')
            .addFields(
                { name: '👤 Atılan Üye:', value: `${member.user.tag}`, inline: true },
                { name: '👮 Kapıyı Gösteren Yetkili:', value: `${interaction.user.toString()}`, inline: true },
                { name: '📝 Atılma Gerekçesi:', value: `\`${sebep}\``, inline: false }
            ).setTimestamp();
        return interaction.reply({ embeds: [kickEmbed] });
    }

    // --- KİLİT SİSTEMİ ---
    if (commandName === 'kilit') {
        const durum = options.getString('durum');
        if (durum === 'ac') {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
            const kilitAcEmbed = new EmbedBuilder().setTitle('🔓 | KANAL ERİŞİME AÇILDI').setDescription(`Kanal üzerindeki kilit ${interaction.user.toString()} tarafından kaldırıldı. Herkes yazabilir!`).setColor('#2ECC71').setTimestamp();
            await interaction.reply({ embeds: [kilitAcEmbed] });
        } else {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
            const kilitKapatEmbed = new EmbedBuilder().setTitle('🔒 | KANAL SOHBETE KİLİTLENDİ').setDescription(`Kanal üzerindeki yazma izinleri ${interaction.user.toString()} tarafından donduruldu. Sadece yetkililer yazabilir!`).setColor('#ED4245').setTimestamp();
            await interaction.reply({ embeds: [kilitKapatEmbed] });
        }
    }

    // --- DUYURU VE TOPLU DM SİSTEMİ ---
    if (commandName === 'duyuru') {
        const duyuruMetni = options.getString('mesaj');
        const embed = new EmbedBuilder().setTitle('📢 | SUNUCU DUYURUSU VE BİLGİLENDİRME').setDescription(`${duyuruMetni}`).setColor('#5865F2').setFooter({ text: '404 Family Yönetim Kurulu' }).setTimestamp();
        
        await interaction.reply({ content: '✅ Duyuru yapıldı ve üyelere DM bildirimleri sevk ediliyor...', flags: [MessageFlags.Ephemeral] });
        await channel.send({ content: '@everyone', embeds: [embed] });

        // 📩 Sunucudaki Tüm Üyelere Duyuruyu DM Olarak Atma Paneli
        const tumUyeler = await guild.members.fetch();
        tumUyeler.forEach(async (m) => {
            if (m.user.bot) return;
            const dmDuyuruEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`📢 | ${guild.name} Sunucusundan Yeni Duyuru!`)
                .setDescription(`${duyuruMetni}`)
                .setFooter({ text: 'Gelişmelerden anında haberdar olmanız için gönderilmiştir.' })
                .setTimestamp();
            try { await m.send({ embeds: [dmDuyuruEmbed] }); } catch(e) {}
        });
    }

    if (commandName === 'unban') {
        const userId = options.getString('id'); 
        await guild.members.unban(userId);
        const unbanEmbed = new EmbedBuilder().setTitle('🔓 | AMNESTİ / YASAK KALDIRMA').setDescription(`\`${userId}\` ID'li kullanıcının yasağı ${interaction.user.toString()} tarafından başarıyla affedildi.`).setColor('#2ECC71').setTimestamp();
        await interaction.reply({ embeds: [unbanEmbed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
