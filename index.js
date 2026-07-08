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
const fs = require('fs'); // Ekonomi verilerini kaydetmek için gerekli

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

// Veritabanı Dosyası Yoksa Oluştur ve Yükle
if (!fs.existsSync(dbDosyasi)) {
    fs.writeFileSync(dbDosyasi, JSON.stringify({}, null, 4));
}

function veriOku() {
    return JSON.parse(fs.readFileSync(dbDosyasi, 'utf8'));
}

function veriYaz(data) {
    fs.writeFileSync(dbDosyasi, JSON.stringify(data, null, 4));
}

// Kullanıcı Profili Yoksa Varsayılan Verilerle Oluşturma Fonksiyonu
function profilGereksinim(userId) {
    const data = veriOku();
    if (!data[userId]) {
        data[userId] = {
            bakiye: 0,
            xp: 0,
            seviye: 1
        };
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
        activities: [{ 
            name: '404 Family is The Best', 
            type: ActivityType.Playing 
        }],
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
                    choices: [
                        { name: 'Kanalı Kilitle 🔒', value: 'kilitle' },
                        { name: 'Kanalı Aç 🔓', value: 'ac' }
                    ]
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
            options: [
                { name: 'mesaj', description: 'Duyurulacak metin içeriği', type: ApplicationCommandOptionType.String, required: true }
            ]
        },
        {
            name: 'uyar',
            description: '⚠️ Kuralları ihlal eden üyeyi uyarır ve DM ile bilgilendirir',
            options: [
                { name: 'kullanici', description: 'Uyarılacak üye', type: ApplicationCommandOptionType.User, required: true },
                { name: 'sebep', description: 'Uyarı gerekçesi', type: ApplicationCommandOptionType.String, required: false }
            ]
        },
        {
            name: 'unban',
            description: '🔓 Yasaklanmış bir üyenin engelini ID kullanarak kaldırır',
            options: [
                { name: 'id', description: 'Yasağı kaldırılacak üyenin Discord ID\'si', type: ApplicationCommandOptionType.String, required: true }
            ]
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

// --- MESAJ ATTIKÇA XP & 404 BAKİYE KAZANMA SİSTEMİ (OwO Tarzı) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Ekonomi Verilerini Güncelleme
    const userId = message.author.id;
    const data = veriOku();
    
    if (!data[userId]) {
        data[userId] = { bakiye: 0, xp: 0, seviye: 1 };
    }

    // Rastgele 1 ila 5 arası 404 Bakiyesi, 5 ila 15 arası XP ekle
    const kazanilanBakiye = Math.floor(Math.random() * 5) + 1;
    const kazanilanXp = Math.floor(Math.random() * 11) + 5;

    data[userId].bakiye += kazanilanBakiye;
    data[userId].xp += kazanilanXp;

    // Seviye Atlama Algoritması (Her seviye için gereken XP: Seviye * 100)
    const gerekenXp = data[userId].seviye * 100;
    if (data[userId].xp >= gerekenXp) {
        data[userId].xp -= gerekenXp;
        data[userId].seviye += 1;
        
        // Şık Seviye Atlama Mesajı
        const lvlEmbed = new EmbedBuilder()
            .setTitle('🎉 Seviye Atladın!')
            .setDescription(`Tebrikler ${message.author.toString()}, sunucuda mesaj göndererek **Level ${data[userId].seviye}** oldun! 🚀`)
            .setColor('#57F287');
        
        message.channel.send({ embeds: [lvlEmbed] }).then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    veriYaz(data);

    // Eski 'sa' Tepki Sistemi
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
    // --- BUTON ETKİNLİKLERİ ---
    if (interaction.isButton()) {
        const [action, msgId] = interaction.customId.split('_');
        
        if (action === 'helpmenu') {
            const yardimEmbed = new EmbedBuilder()
                .setTitle('📚 404 Family Bot - Gelişmiş Komut Rehberi')
                .setDescription('Marpel ve Erensi altyapısıyla hazırlanan modern komut listemiz aşağıdadır:')
                .setColor('#5865F2')
                .addFields(
                    { name: '🪙 OwO Tipi Ekonomi & Aktiflik', value: `> \`/profil\` - Seviyenizi, XP'nizi ve 404 paranızı listeler.\n> \`/bakiye\` - Cüzdanınızdaki güncel bakiyeyi söyler.\n> \`/gönder\` - Başka bir hesaba 404 nakit parası transfer eder.` },
                    { name: '🛡️ Yetkili Moderasyon Komutları', value: `> \`/tamyasakla\` - Üyeyi sunucudan banlar.\n> \`/ipyasakla\` - Üyeyi IP adresiyle kalıcı engeller.\n> \`/sustur\` - Belirtilen dakika kadar timeout atar.\n> \`/susturarak\` - Üyenin susturmasını erken kaldırır.\n> \`/uyar\` - Üyeye uyarı puanı ekler.\n> \`/kick\` - Üyeyi sunucudan dışarı atar.\n> \`/unban\` - ID ile yasak kaldırır.` },
                    { name: '⚙️ Yönetim & Sistem Komutları', value: `> \`/kilit\` - Kanalı kilitleyip açmaya yarar.\n> \`/duyuru\` - Etiketli ve DM destekli duyuru geçer.\n> \`/cekilis\` - Yeni nesil butonlu çekiliş başlatır.\n> \`/istatistik\` - Botun canlı donanım durumunu raporlar.` }
                )
                .setFooter({ text: '404 Family • Her Zaman En İyisi', iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            
            return interaction.reply({ embeds: [yardimEmbed], flags: [MessageFlags.Ephemeral] });
        }

        if (!cekilisKatilimcilari.has(msgId)) {
            return interaction.reply({ content: '❌ Bu çekiliş aktif değil veya süresi dolmuş.', flags: [MessageFlags.Ephemeral] });
        }
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
                .setColor('#5865F2')
                .setTimestamp();
            return interaction.reply({ embeds: [listeEmbed], flags: [MessageFlags.Ephemeral] });
        }
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, channel, guild, user: yetkili } = interaction;

    // Yetki İstisnaları (Ekonomi, Yardım ve İstatistik komutları için yetki gerekmez)
    const muafKomutlar = ['istatistik', 'yardım', 'profil', 'bakiye', 'gönder'];

    if (commandName === 'ipyasakla') {
        if (!ipBanYetkiKontrol(interaction)) return interaction.reply({ content: '❌ Bu özel koruma komutunu sadece tanımlı IP-Ban yetkilileri kullanabilir.', flags: [MessageFlags.Ephemeral] });
    } else if (!muafKomutlar.includes(commandName)) {
        if (!yetkiKontrol(interaction)) return interaction.reply({ content: '❌ Bu moderasyon komutunu kullanmak için yetkiniz yetersiz.', flags: [MessageFlags.Ephemeral] });
    }

    // --- EKONOMİ KOMUTLARI ---

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
                { name: '📊 Aktiflik Gelişimi (XP)', value: `\`${uVeri.xp} / ${gerekenXp} XP\` (Sonraki seviyeye \`${gerekenXp - uVeri.xp}\` kaldı.)`, inline: false }
            )
            .setFooter({ text: 'Mesaj göndererek daha fazla 404 ve XP kazanabilirsin!', iconURL: guild.iconURL() })
            .setTimestamp();

        return interaction.reply({ embeds: [profilEmbed] });
    }

    if (commandName === 'bakiye') {
        const hedefUye = options.getUser('kullanici') || interaction.user;
        const uVeri = profilGereksinim(hedefUye.id);

        const bakiyeEmbed = new EmbedBuilder()
            .setTitle('💰 Cüzdan Durumu')
            .setDescription(`${hedefUye.toString()} cüzdanında şu anda **${uVeri.bakiye}** \`404\` nakit para bulunduruyor.`)
            .setColor('#FEE75C')
            .setTimestamp();

        return interaction.reply({ embeds: [bakiyeEmbed] });
    }

    if (commandName === 'gönder') {
        const alici = options.getUser('kullanici');
        const miktar = options.getInteger('miktar');

        if (alici.id === interaction.user.id) return interaction.reply({ content: '❌ Kendinize para gönderemezsiniz.', flags: [MessageFlags.Ephemeral] });
        if (alici.bot) return interaction.reply({ content: '❌ Bot hesaplarına para transferi yapılamaz.', flags: [MessageFlags.Ephemeral] });
        if (miktar <= 0) return interaction.reply({ content: '❌ Lütfen 0\'dan büyük geçerli bir miktar girin.', flags: [MessageFlags.Ephemeral] });

        const gonderenVeri = profilGereksinim(interaction.user.id);
        profilGereksinim(alici.id); // Alıcının hesabı yoksa aç

        if (gonderenVeri.bakiye < miktar) {
            return interaction.reply({ content: `❌ Yetersiz bakiye! Mevcut paranız: **${gonderenVeri.bakiye} 404**`, flags: [MessageFlags.Ephemeral] });
        }

        // Parayı aktar ve veritabanını kaydet
        const data = veriOku();
        data[interaction.user.id].bakiye -= miktar;
        data[alici.id].bakiye += miktar;
        veriYaz(data);

        const transferEmbed = new EmbedBuilder()
            .setTitle('💸 Başarılı Transfer')
            .setDescription(`🎉 ${interaction.user.toString()} başarıyla ${alici.toString()} kullanıcısına **${miktar} 404** nakit gönderdi!`)
            .setColor('#57F287')
            .setTimestamp();

        return interaction.reply({ embeds: [transferEmbed] });
    }

    // --- ESKİ SİSTEM VE YARDIM MODÜLLERİ ---
    if (commandName === 'yardım') {
        const embed = new EmbedBuilder()
            .setTitle(`⚡ ${client.user.username} - Yardım Merkezi`)
            .setDescription(`Merhaba **${interaction.user.username}**, sunucunun yönetim kalitesini artırmak için buradayım! Aşağıdaki interaktif butonu kullanarak tüm özelliklerime göz atabilirsin.\n\n` +
                            `> 🛠️ **Profil Entegrasyonu:** Ayrıca ismimin üstüne tıklayıp \`Komutlar\` sekmesinden de hızlıca bana talimat verebilirsin!`)
            .setColor('#5865F2')
            .setThumbnail(client.user.avatarURL())
            .setFooter({ text: '404 Family Destek Sistemi', iconURL: guild.iconURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('helpmenu_view').setLabel('📚 Komut Listesini Aç').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setLabel('Sunucuya Ekle').setStyle(ButtonStyle.Link).setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)
        );

        return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (commandName === 'istatistik') {
        const uptime = process.uptime();
        const d = Math.floor(uptime / (3600*24));
        const h = Math.floor(uptime % (3600*24) / 3600);
        const m = Math.floor(uptime % 3600 / 60);
        const s = Math.floor(uptime % 60);

        const statsEmbed = new EmbedBuilder()
            .setTitle(`⚙️ ${client.user.username} - Sistem İstatistikleri`)
            .setColor('#5865F2')
            .setThumbnail(client.user.avatarURL())
            .addFields(
                { name: '🤖 Bot Bilgileri', value: `> **Gecikme (Ping):** \`${client.ws.ping}ms\`\n> **Çalışma Süresi:** \`${d} Gün, ${h} Saat, ${m} Dakika\`\n> **Kullanıcı Sayısı:** \`${client.users.cache.size}\`\n> **Sunucu Sayısı:** \`${client.guilds.cache.size}\``, inline: false },
                { name: '💻 Sunucu / Host Bilgileri', value: `> **Node.js Sürümü:** \`${process.version}\`\n> **İşletim Sistemi:** \`${os.platform()} (${os.arch()})\`\n> **Bellek Kullanımı:** \`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB / ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB\``, inline: false }
            )
            .setFooter({ text: '404 Family Bilgi Sistemi', iconURL: guild.iconURL() })
            .setTimestamp();

        return interaction.reply({ embeds: [statsEmbed] });
    }

    if (commandName === 'tamyasakla') {
        const user = options.getMember('kullanici');
        const sebep = options.getString('sebep') || 'Belirtilmedi';
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });
        if (user.roles.highest.position >= guild.members.me.roles.highest.position) return interaction.reply({ content: '❌ Bu kullanıcının rolü benden üstte/eşit olduğu için yasaklayamam.', flags: [MessageFlags.Ephemeral] });

        const dmEmbed = new EmbedBuilder()
            .setTitle('⛔ Sunucudan Yasaklandınız')
            .setDescription(`**${guild.name}** sunucusundan kalıcı olarak uzaklaştırıldınız.`)
            .addFields({ name: '🛡️ Yetkili', value: `${yetkili.tag}` }, { name: '📝 Sebep', value: sebep })
            .setColor('#ED4245').setTimestamp();

        await guvenliDM(user, { embeds: [dmEmbed] });
        await user.ban({ reason: `Yetkili: ${yetkili.tag} | Sebep: ${sebep}` });
        
        const logEmbed = new EmbedBuilder()
            .setTitle('🛡️ Üye Sunucudan Yasaklandı')
            .setDescription(`**Yasaklanan:** ${user.toString()} (\`${user.id}\`)\n**Yetkili:** ${yetkili.toString()}\n**Sebep:** \`${sebep}\``)
            .setColor('#ED4245').setTimestamp();
        
        await interaction.reply({ content: `✅ ${user.user.tag} başarıyla yasaklandı.`, flags: [MessageFlags.Ephemeral] });
        await channel.send({ embeds: [logEmbed] });
    }

    if (commandName === 'ipyasakla') {
        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
        const user = options.getMember('kullanici');
        const sebep = options.getString('sebep') || 'Belirtilmedi';
        if (!user) return interaction.editReply({ content: 'Kullanıcı bulunamadı.' });
        if (user.roles.highest.position >= guild.members.me.roles.highest.position || user.id === guild.ownerId) return interaction.editReply({ content: '❌ Hiyerarşi nedeniyle bu kullanıcıya IP-Ban atılamaz.' });

        const dmEmbed = new EmbedBuilder()
            .setTitle('💥 Ağır Ceza: IP Yasaklaması')
            .setDescription(`**${guild.name}** sunucusundan IP adresinizle birlikte kalıcı olarak engellendiniz.`)
            .addFields({ name: '🛡️ Yetkili', value: `${yetkili.tag}` }, { name: '📝 Sebep', value: sebep })
            .setColor('#990000').setTimestamp();

        await guvenliDM(user, { embeds: [dmEmbed] });
        await guild.bans.create(user.id, { deleteMessageSeconds: 604800, reason: `IP BAN | Yetkili: ${yetkili.tag} | Sebep: ${sebep}` });

        const gizliLogKanali = guild.channels.cache.get(IP_BAN_LOG_KANAL_ID);
        if (gizliLogKanali) {
            const gizliArsivEmbed = new EmbedBuilder()
                .setTitle('🗄️ Güvenlik Arşivi: IP Ban Kaydı')
                .setDescription(`Sunucuda bir üyeye ait IP adresi Discord sistemi tarafından kara listeye alındı.`)
                .addFields(
                    { name: '👤 Yasaklanan Kullanıcı', value: `${user.user.tag} (${user.toString()})`, inline: true },
                    { name: '🆔 Kullanıcı ID', value: `\`${user.id}\``, inline: true },
                    { name: '🛡️ Cezayı Veren Yetkili', value: `${yetkili.toString()} (\`${yetkili.tag}\`)`, inline: false },
                    { name: '📝 Yasaklanma Nedeni', value: `\`${sebep}\``, inline: false },
                    { name: '🔒 IP Durumu', value: `\`Discord Tarafından Donanımsal Olarak Engellendi\``, inline: false }
                )
                .setColor('#7a0000')
                .setThumbnail(user.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: '404 Family Güvenlik Veritabanı' })
                .setTimestamp();

            await gizliLogKanali.send({ embeds: [gizliArsivEmbed] });
        }

        const logEmbed = new EmbedBuilder()
            .setTitle('💥 IP Yasaklaması Atıldı')
            .setDescription(`**Uzaklaştırılan:** ${user.toString()}\n**Uzaklaştıran Yetkili:** ${yetkili.toString()}\n**Neden:** \`${sebep}\``)
            .setColor('#990000').setTimestamp();

        await interaction.editReply({ content: '✅ IP Ban işlemi başarıyla uygulandı.' });
        await channel.send({ embeds: [logEmbed] });
    }

    if (commandName === 'sustur') {
        const user = options.getMember('kullanici');
        const sure = options.getInteger('sure');
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });

        const bitisZamani = Math.floor((Date.now() + sure * 60 * 1000) / 1000);
        await user.timeout(sure * 60 * 1000);
        
        const dmEmbed = new EmbedBuilder()
            .setTitle('🔇 Susturuldunuz')
            .setDescription(`**${guild.name}** sunucusunda sesli ve yazılı kanallarda susturuldunuz.`)
            .addFields({ name: '⏳ Süre', value: `\`${sure} Dakika\` (Açılış: <t:${bitisZamani}:R>)` })
            .setColor('#4F545C').setTimestamp();

        await guvenliDM(user, { embeds: [dmEmbed] });

        const logEmbed = new EmbedBuilder()
            .setTitle('🔇 Kullanıcı Susturuldu')
            .setDescription(`**Susturulan:** ${user.toString()}\n**Süre:** \`${sure} Dakika\`\n**Yasağın Kalkacağı An:** <t:${bitisZamani}:R>\n**İşlemi Yapan:** ${yetkili.toString()}`)
            .setColor('#FEE75C').setTimestamp();

        await interaction.reply({ content: `✅ Kullanıcı ${sure} dakika susturuldu.`, flags: [MessageFlags.Ephemeral] });
        await channel.send({ embeds: [logEmbed] });
    }

    if (commandName === 'susturarak') {
        const user = options.getMember('kullanici');
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });

        await user.timeout(null);
        const dmEmbed = new EmbedBuilder()
            .setTitle('🔊 Susturmanız Kaldırıldı')
            .setDescription(`**${guild.name}** sunucusundaki susturma cezanız erken kaldırıldı.`)
            .setColor('#57F287').setTimestamp();

        await guvenliDM(user, { embeds: [dmEmbed] });

        const logEmbed = new EmbedBuilder()
            .setTitle('🔊 Susturma Kaldırıldı')
            .setDescription(`**Cezası Kaldırılan:** ${user.toString()}\n**İşlemi Yapan Yetkili:** ${yetkili.toString()}`)
            .setColor('#57F287').setTimestamp();

        await interaction.reply({ content: '✅ Kullanıcının susturması kaldırıldı.', flags: [MessageFlags.Ephemeral] });
        await channel.send({ embeds: [logEmbed] });
    }

    if (commandName === 'kilit') {
        const durum = options.getString('durum');
        if (durum === 'ac') {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null });
            const embed = new EmbedBuilder().setTitle('🔓 Kanal Kilidi Açıldı').setDescription(`Bu kanal tekrar üyelere yazı alanı olarak aktif edildi.`).setColor('#57F287').setTimestamp();
            await interaction.reply({ embeds: [embed] });
        } else {
            await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
            const embed = new EmbedBuilder().setTitle('🔒 Kanal Kilitlendi').setDescription(`Bu kanal geçici bir süreliğine moderatörler tarafından kilitlenmiştir.`).setColor('#ED4245').setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
    }

    if (commandName === 'cekilis') {
        let kalanSure = options.getInteger('sure');
        const odul = options.getString('odul');
        await interaction.reply({ content: '✨ Modern çekiliş paneli kuruluyor...', flags: [MessageFlags.Ephemeral] });

        const cekilisId = interaction.id;
        cekilisKatilimcilari.set(cekilisId, []);

        const embed = new EmbedBuilder()
            .setTitle('🎁 404 Family - Çekiliş Şöleni')
            .setDescription(`Sunucumuzda yeni bir çekiliş başladı! Katılmak için aşağıdaki yeşil butona basmanız yeterlidir.\n\n` +
                            `> 🏆 **Ödül:** \`${odul}\`\n` +
                            `> ⏳ **Kalan Süre:** \`${kalanSure} saniye\`\n` +
                            `> 👥 **Katılımcı Sayısı:** \`0\``)
            .setColor('#5865F2')
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setFooter({ text: 'Erensi & Marpel Style Giveaway', iconURL: client.user.avatarURL() })
            .setTimestamp();

        const butonlar = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`katil_${cekilisId}`).setLabel('🎉 Katıl / Ayrıl').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`liste_${cekilisId}`).setLabel('👥 Katılımcılar (0)').setStyle(ButtonStyle.Primary)
        );

        const msg = await channel.send({ content: '🔔 @everyone **Yeni bir çekiliş başladı!**', embeds: [embed], components: [butonlar], allowedMentions: { parse: ['everyone'] } });

        const uyelerCekilis = await guild.members.fetch();
        (async () => {
            for (const [id, uye] of uyelerCekilis) {
                if (!uye.user.bot) {
                    await guvenliDM(uye, { content: `🎉 **${guild.name}** sunucusunda muhteşem bir çekiliş başladı! Ödül: **${odul}**. Hemen sunucuya gelip katıl butonuna bas!` });
                    await sleep(3000);
                }
            }
        })();

        const interval = setInterval(async () => {
            kalanSure -= 3;
            if (kalanSure <= 0) { clearInterval(interval); return; }
            try {
                const anlikListe = cekilisKatilimcilari.get(cekilisId) || [];
                const guncelEmbed = new EmbedBuilder()
                    .setTitle('🎁 404 Family - Çekiliş Şöleni')
                    .setDescription(`Sunucumuzda yeni bir çekiliş başladı! Katılmak için aşağıdaki yeşil butona basmanız yeterlidir.\n\n` +
                                    `> 🏆 **Ödül:** \`${odul}\`\n` +
                                    `> ⏳ **Kalan Süre:** \`${kalanSure} saniye\`\n` +
                                    `> 👥 **Katılımcı Sayısı:** \`${anlikListe.length}\``)
                    .setColor('#5865F2').setThumbnail(guild.iconURL({ dynamic: true })).setTimestamp();

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
                    const bitisEmbed = new EmbedBuilder().setTitle('🎉 Çekiliş Sona Erdi').setDescription(`🏆 **Ödül:** \`${odul}\`\n❌ **Sonuç:** Katılım olmadığı için kazanan seçilemedi.`).setColor('#4F545C').setTimestamp();
                    await msg.edit({ embeds: [bitisEmbed], components: [pasifButonlar] });
                    cekilisKatilimcilari.delete(cekilisId);
                    return channel.send({ content: `⚠️ Çekilişe kimse katılmadığı için talihli çıkmadı.` });
                }

                const kazananId = finalListe[Math.floor(Math.random() * finalListe.length)];
                const bitisEmbed = new EmbedBuilder()
                    .setTitle('🎉 ÇEKİLİŞ SONUÇLANDI 🎉')
                    .setDescription(`Büyük çekiliş maratonu tamamlandı! İşte ödülün sahibi:\n\n` +
                                    `> 🏆 **Ödül:** \`${odul}\`\n` +
                                    `> 🍀 **Şanslı Talihli:** <@${kazananId}>`)
                    .setColor('#2ECC71').setThumbnail(guild.iconURL({ dynamic: true })).setTimestamp();

                await msg.edit({ embeds: [bitisEmbed], components: [pasifButonlar] });
                await channel.send({ content: `🎊 Tebrikler <@${kazananId}>! **${odul}** çekilişini kazandın!` });
                cekilisKatilimcilari.delete(cekilisId);
            } catch (err) {}
        }, options.getInteger('sure') * 1000);
    }

    if (commandName === 'duyuru') {
        const duyuruMetni = options.getString('mesaj');
        const embed = new EmbedBuilder()
            .setTitle('📢 Sunucu Duyurusu')
            .setDescription(`${duyuruMetni}`)
            .setColor('#5865F2')
            .setFooter({ text: `Yayınlayan Yetkili: ${yetkili.tag}` })
            .setTimestamp();

        await interaction.reply({ content: '📢 Duyuru paneli aktif ediliyor...', flags: [MessageFlags.Ephemeral] });
        await channel.send({ content: '@everyone', embeds: [embed], allowedMentions: { parse: ['everyone'] } });

        const uyelerDuyuru = await guild.members.fetch();
        (async () => {
            for (const [id, uye] of uyelerDuyuru) {
                if (!uye.user.bot) {
                    await guvenliDM(uye, { embeds: [embed] });
                    await sleep(3000);
                }
            }
        })();
    }

    if (commandName === 'uyar') {
        const user = options.getMember('kullanici');
        const sebep = options.getString('sebep') || 'Sebep belirtilmedi';
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });

        const dmEmbed = new EmbedBuilder()
            .setTitle('⚠️ Resmi Uyarı Bildirimi')
            .setDescription(`**${guild.name}** sunucu kurallarına uymadığınız için resmi uyarı aldınız.`)
            .addFields({ name: '📝 Gerekçe', value: sebep })
            .setColor('#FEE75C').setTimestamp();

        await guvenliDM(user, { embeds: [dmEmbed] });

        const logEmbed = new EmbedBuilder()
            .setTitle('⚠️ Üye Uyarıldı')
            .setDescription(`**Uyarılma Alan:** ${user.toString()}\n**Yetkili:** ${yetkili.toString()}\n**Gerekçe:** \`${sebep}\``)
            .setColor('#FEE75C').setTimestamp();

        await interaction.reply({ content: '✅ Kullanıcı uyarıldı.', flags: [MessageFlags.Ephemeral] });
        await channel.send({ embeds: [logEmbed] });
    }

    if (commandName === 'unban') {
        const userId = options.getString('id');
        await guild.members.unban(userId);
        
        const logEmbed = new EmbedBuilder()
            .setTitle('🔓 Yasak Kaldırıldı')
            .setDescription(`**Yasağı Açılan ID:** \`${userId}\`\n**İşlemi Yapan Yetkili:** ${yetkili.toString()}`)
            .setColor('#57F287').setTimestamp();

        await interaction.reply({ content: `✅ Yasak kaldırıldı.`, flags: [MessageFlags.Ephemeral] });
        await channel.send({ embeds: [logEmbed] });
    }

    if (commandName === 'kick') {
        const user = options.getMember('kullanici');
        const sebep = options.getString('sebep') || 'Belirtilmedi';
        if (!user) return interaction.reply({ content: 'Kullanıcı bulunamadı.', flags: [MessageFlags.Ephemeral] });

        const dmEmbed = new EmbedBuilder()
            .setTitle('👢 Sunucudan Atıldınız')
            .setDescription(`**${guild.name}** sunucusundan atıldınız.`)
            .addFields({ name: '📝 Sebep', value: sebep })
            .setColor('#ED4245').setTimestamp();

        await guvenliDM(user, { embeds: [dmEmbed] });
        await user.kick(`Yetkili: ${yetkili.tag} | Sebep: ${sebep}`);
        
        const logEmbed = new EmbedBuilder()
            .setTitle('👢 Üye Atıldı (Kick)')
            .setDescription(`**Atılan Üye:** ${user.toString()}\n**Yetkili:** ${yetkili.toString()}\n**Sebep:** \`${sebep}\``)
            .setColor('#ED4245').setTimestamp();

        await interaction.reply({ content: `✅ Kullanıcı atıldı.`, flags: [MessageFlags.Ephemeral] });
        await channel.send({ embeds: [logEmbed] });
    }
});

// Otomatik Rol Değişikliği Bildirimleri
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    const eklenenRoller = newRoles.filter(role => !oldRoles.has(role.id));
    const silinenRoller = oldRoles.filter(role => !newRoles.has(role.id));

    if (eklenenRoller.size > 0) {
        const rolIsimleri = eklenenRoller.map(r => r.name).join(', ');
        const dmEmbed = new EmbedBuilder()
            .setTitle('➕ Rol Tanımlandı')
            .setDescription(`**${newMember.guild.name}** sunucusunda üzerinize yeni rol atandı.`)
            .addFields({ name: '✨ Alınan Rol(ler)', value: `\`${rolIsimleri}\`` })
            .setColor('#57F287').setTimestamp();
        await guvenliDM(newMember, { embeds: [dmEmbed] });
    }

    if (silinenRoller.size > 0) {
        const rolIsimleri = silinenRoller.map(r => r.name).join(', ');
        const dmEmbed = new EmbedBuilder()
            .setTitle('➖ Rol Kaldırıldı')
            .setDescription(`**${newMember.guild.name}** sunucusunda üzerinizdeki rol kaldırıldı.`)
            .addFields({ name: '🗑️ Alınan Rol(ler)', value: `\`${rolIsimleri}\`` })
            .setColor('#ED4245').setTimestamp();
        await guvenliDM(newMember, { embeds: [dmEmbed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
