require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const ytdlp = require('yt-dlp-exec');
const axios = require('axios');
const express = require('express');
const ffmpegPath = require('ffmpeg-static');
process.env.FFMPEG_PATH = ffmpegPath;

const PORT = process.env.PORT || 3000;
const PREFIX = process.env.PREFIX || '.';
const OWNER = process.env.OWNER || 'Malvin C';
const BANNER_URL = process.env.BANNER_URL;
const CHANNEL_LINK = process.env.CHANNEL_LINK;
const GROUP_LINK = process.env.GROUP_LINK;

let latestPairingCode = 'Waiting for code...';
const app = express();
app.get('/pair', (req, res) => res.send(`<html><body style="background:#0f0f0f;color:#fff;text-align:center;padding-top:20vh;font-family:sans-serif"><h1 style="color:#25D366">🎵 LEARN MUSIC</h1><p>WhatsApp > Linked Devices > Link with phone number</p><div style="font-size:2.5rem;background:#1f1f1f;padding:20px;border-radius:12px;display:inline-block;letter-spacing:3px">${latestPairingCode}</div></body></html>`));
app.listen(PORT, () => console.log(`🌐 Pair: /pair`));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const sock = makeWASocket({ logger: pino({ level: 'silent' }), auth: state, browser: Browsers.macOS('Chrome') });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u) => {
        if (u.pairingCode) latestPairingCode = u.pairingCode;
        if (u.connection === 'open') latestPairingCode = 'CONNECTED ✅';
        if (u.connection === 'close') { if (new Boom(u.lastDisconnect?.error)?.output?.statusCode!== DisconnectReason.loggedOut) startBot(); }
    });

    const sendMenu = async (from) => {
        const diamondMenu = `◆━━━━━━━━━━━━━━◆
   ✦ LEARN MUSIC ✦
◆━━━━━━━━━━━━━━◆

◆ ${PREFIX}play <text/url>
◆ ${PREFIX}vplay <text/url>
◆ ${PREFIX}ytmp3 <url>
◆ ${PREFIX}ytmp4 <url>
◆ ${PREFIX}song <text>
◆ ${PREFIX}video <text>
◆ ${PREFIX}spotify <url>
◆ ${PREFIX}lyrics <song>
◆ ${PREFIX}sticker
◆ ${PREFIX}take <name>
◆ ${PREFIX}tts <text>
◆ ${PREFIX}gpt <text>
◆ ${PREFIX}img <text>
◆ ${PREFIX}weather <city>
◆ ${PREFIX}github <user>
◆ ${PREFIX}calc <1+1>
◆ ${PREFIX}menu
◆ ${PREFIX}ping
◆ ${PREFIX}owner
◆ ${PREFIX}alive

◆━━━━━━━━━━━━━━◆`;

        await sock.sendMessage(from, {
            image: { url: BANNER_URL },
            caption: diamondMenu,
            footer: '✦ v2.0 ✦',
            buttons: [
                {buttonId:`${PREFIX}play`,buttonText:{displayText:'🎵 Play'},type:1},
                {buttonId:`${PREFIX}vplay`,buttonText:{displayText:'🎥 Video'},type:1},
                {buttonId:`${PREFIX}ping`,buttonText:{displayText:'📡 Ping'},type:1}
            ],
            headerType: 4
        });
    }

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;
        const from = m.key.remoteJid;
        const text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.buttonsResponseMessage?.selectedButtonId || '';
        const q = text.split(' ').slice(1).join(' ');

        if (text.startsWith(`${PREFIX}play `) || text.startsWith(`${PREFIX}ytmp3 `) || text.startsWith(`${PREFIX}song `)) {
            if(!q) return sock.sendMessage(from,{text:`Use: ${PREFIX}play adele`});
            await sock.sendMessage(from, {text:`🔎 Audio: ${q}...`});
            try{const r=await ytdlp(q,{dumpSingleJson:true,noPlaylist:true,defaultSearch:'ytsearch1'});await sock.sendMessage(from,{audio:{url:r.url},mimetype:'audio/mpeg',fileName:`${r.title}.mp3`});}catch{e:sock.sendMessage(from,{text:'❌ Audio fail'});}
        }
        if (text.startsWith(`${PREFIX}vplay `) || text.startsWith(`${PREFIX}ytmp4 `) || text.startsWith(`${PREFIX}video `)) {
            if(!q) return sock.sendMessage(from,{text:`Use: ${PREFIX}vplay adele`});
            await sock.sendMessage(from, {text:`🔎 Video: ${q}...`});
            try{const r=await ytdlp(q,{dumpSingleJson:true,noPlaylist:true,defaultSearch:'ytsearch1',format:'best[height<=480]'});await sock.sendMessage(from,{video:{url:r.url},mimetype:'video/mp4',caption:r.title});}catch{e:sock.sendMessage(from,{text:'❌ Video fail'});}
        }
        if (text.startsWith(`${PREFIX}spotify `)) sock.sendMessage(from,{text:'❌ Spotify needs API. Use ${PREFIX}play instead.'});
        if (text.startsWith(`${PREFIX}lyrics `)) { try{const r=await axios.get(`https://api.lyrics.ovh/v1/${q}`);sock.sendMessage(from,{text:`*${q}*\n\n${r.data.lyrics||'Not found'}`});}catch{e:sock.sendMessage(from,{text:'❌ Lyrics not found'});}}
        if (text === `${PREFIX}sticker`) { if(m.message.imageMessage||m.message.videoMessage){const buf=await sock.downloadMediaMessage(m);await sock.sendMessage(from,{sticker:buf});}else sock.sendMessage(from,{text:'Reply to image/video'});}
        if (text.startsWith(`${PREFIX}take `)) sock.sendMessage(from,{text:'❌ Use WA Sticker app for pack name'});
        if (text.startsWith(`${PREFIX}tts `)) sock.sendMessage(from,{audio:{url:`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(q)}&tl=en&client=tw`},mimetype:'audio/mpeg'});
        if (text.startsWith(`${PREFIX}gpt `)) { try{const r=await axios.get(`https://api.gptgo.ai/api?q=${q}`);sock.sendMessage(from,{text:r.data});}catch{e:sock.sendMessage(from,{text:'❌ AI error'});}}
        if (text.startsWith(`${PREFIX}img `)) sock.sendMessage(from,{image:{url:`https://image.pollinations.ai/prompt/${encodeURIComponent(q)}`},caption:q});
        if (text.startsWith(`${PREFIX}weather `)) { try{const r=await axios.get(`https://wttr.in/${q}?format=3`);sock.sendMessage(from,{text:r.data});}catch{e:sock.sendMessage(from,{text:'❌ City not found'});}}
        if (text.startsWith(`${PREFIX}github `)) { try{const r=await axios.get(`https://api.github.com/users/${q}`);sock.sendMessage(from,{text:`*${r.data.login}*\nFollowers: ${r.data.followers}\nBio: ${r.data.bio||'N/A'}\n${r.data.html_url}`});}catch{e:sock.sendMessage(from,{text:'❌ User not found'});}}
        if (text.startsWith(`${PREFIX}calc `)) { try{sock.sendMessage(from,{text:`= ${eval(q)}`});}catch{e:sock.sendMessage(from,{text:'❌ Invalid math'});}}
        if (text === `${PREFIX}menu`) sendMenu(from);
        if (text === `${PREFIX}ping`) sock.sendMessage(from, {text:`📡 Pong! ${Date.now()-m.messageTimestamp*1000}ms`});
        if (text === `${PREFIX}owner`) sock.sendMessage(from, {text:`*👑 ${OWNER}*\n${CHANNEL_LINK}`});
        if (text === `${PREFIX}alive`) sock.sendMessage(from, {text:`✅ LEARN MUSIC BOT IS ALIVE\nRender v2.0`});
    });
}
startBot();