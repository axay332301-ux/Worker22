// =========================================================
// RWA ULTIMATE PREMIUM OTT PLAYER ENGINE (player.js)
// =========================================================
const PROXY = "https://proplayer.allswbatch22.workers.dev/stream?url=";
const SEGMENT = "https://proplayer.allswbatch22.workers.dev/proxy?url=";
const v = document.getElementById("video");
const input = document.getElementById("url");
const msg = document.getElementById("msg");
const statusEl = document.getElementById("status");
let hls = null;
let cachedToken = "";

// Status text ko hamesha ke liye hidden/blank rakhne ke liye
if (statusEl) statusEl.style.display = "none";

function say(t, e = false) {
    if (msg) {
        msg.textContent = t;
        msg.style.color = e ? "#ff9696" : "#98a4b6";
    }
}

function valid(u) {
    try {
        return ["http:", "https:"].includes(new URL(u).protocol);
    } catch {
        return false;
    }
}

function manifest(u) {
    try {
        const x = new URL(u);
        if (x.hostname.includes("workers.dev") && x.searchParams.has("url")) return u;
        if (x.pathname.toLowerCase().includes(".m3u8") || x.hostname.includes("classx.co.in") || x.hostname.includes("akamai.net.in")) {
            return PROXY + encodeURIComponent(u);
        }
    } catch {}
    return u;
}

function segment(u) {
    return /\.(ts|m4s|mp4|aac|mp3|vtt|webvtt)(\?|$)/i.test(u.split("?")[0]);
}

class BackendLoader extends Hls.DefaultConfig.loader {
    load(ctx, cfg, cb) {
        let originalUrl = ctx.url;
        let mainUrl = input.value.trim();

        let match = mainUrl.match(/(edge-cache-token=[^&]+)/);
        if (match) {
            cachedToken = match[1];
        }

        if (cachedToken && !originalUrl.includes("edge-cache-token=")) {
            originalUrl += (originalUrl.includes("?") ? "&" : "?") + cachedToken;
        }

        if (segment(originalUrl) && !originalUrl.includes("proplayer.probrosystemset")) {
            ctx.url = SEGMENT + encodeURIComponent(originalUrl);
        } else {
            ctx.url = originalUrl;
        }

        super.load(ctx, cfg, cb);
    }
}

function stopPlayer() {
    if (hls) {
        try { hls.destroy(); } catch {}
        hls = null;
    }
    v.pause();
    v.removeAttribute("src");
    v.load();
    const ytFrame = document.getElementById("ytFrame");
    if (ytFrame) ytFrame.src = "";
    
    // Player screen hide karke close button ka kaam pura karna
    const hlsScreen = document.getElementById("hlsScreen");
    const ytScreen = document.getElementById("ytScreen");
    if (hlsScreen) hlsScreen.classList.add("hidden");
    if (ytScreen) ytScreen.classList.add("hidden");
}

function start() {
    let raw = input.value.trim();
    if (!raw) {
        say("Valid URL dalein.", true);
        return;
    }

    stopPlayer();

    const isYT = (!raw.startsWith("http") && raw.length >= 10 && raw.length <= 15) || raw.includes("youtube.com") || raw.includes("youtu.be");

    if (isYT) {
        const ytScreen = document.getElementById("ytScreen");
        const hlsScreen = document.getElementById("hlsScreen");
        if (hlsScreen) hlsScreen.classList.add("hidden");
        if (ytScreen) ytScreen.classList.remove("hidden");
        
        let ytId = raw;
        if (raw.includes("v=")) ytId = raw.split("v=")[1].split("&")[0];
        else if (raw.includes("youtu.be/")) ytId = raw.split("youtu.be/")[1].split("?")[0];

        const ytFrame = document.getElementById("ytFrame");
        if (ytFrame) ytFrame.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
        return;
    }

    const ytScreen = document.getElementById("ytScreen");
    const hlsScreen = document.getElementById("hlsScreen");
    if (ytScreen) ytScreen.classList.add("hidden");
    if (hlsScreen) hlsScreen.classList.remove("hidden");

    if (!valid(raw)) {
        say("Valid URL dalein.", true);
        return;
    }

    let src = manifest(raw);

    if (Hls.isSupported()) {
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30,
            maxBufferLength: 20,
            loader: BackendLoader
        });
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));
        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            // Quality list build inside Settings Panel
            const qList = document.getElementById("qualityList");
            if (qList) {
                qList.innerHTML = '<div class="q-option active" onclick="changeQual(-1, this)">Auto Quality</div>';
                if (data.levels && data.levels.length > 0) {
                    data.levels.forEach((lvl, idx) => {
                        let qName = lvl.height ? `${lvl.height}p` : `Quality ${idx + 1}`;
                        qList.innerHTML += `<div class="q-option" onclick="changeQual(${idx}, this)">${qName}</div>`;
                    });
                }
            }
            v.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, d) => {
            if (d.fatal) {
                say("HLS error: " + (d.details || "unknown"), true);
                if (d.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    try { hls.recoverMediaError(); } catch {}
                }
            }
        });
        hls.attachMedia(v);
    } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = src;
        v.onloadedmetadata = () => { v.play().catch(() => {}); };
    }
}

// Global Quality & Speed Change Handler
window.changeQual = function(idx, el) {
    if (hls) hls.currentLevel = idx;
    document.querySelectorAll(".q-option").forEach(o => o.classList.remove("active"));
    if (el) el.classList.add("active");
    toggleSettingsMenu();
};

window.changeSpd = function(rate, el) {
    v.playbackRate = rate;
    document.querySelectorAll(".spd-option").forEach(o => o.classList.remove("active"));
    if (el) el.classList.add("active");
    toggleSettingsMenu();
};

function toggleSettingsMenu() {
    const menu = document.getElementById("settingsMenu");
    if (menu) menu.classList.toggle("show");
}

async function downloadMerged() {
    const raw = input.value.trim();
    if (!valid(raw)) { say("Pehle valid HLS URL dalein.", true); return; }

    if (!hls || !hls.levels || hls.levels.length === 0) {
        say("⚠️ Kripya pehle video play hone dein.", true);
        return;
    }

    const box = document.getElementById("downloadBox");
    const text = document.getElementById("downloadText");
    const bar = document.getElementById("bar");
    if (box) box.classList.add("show");
    if (bar) bar.style.width = "2%";
    if (text) text.textContent = "Fetching segments...";

    try {
        let levelIndex = hls.currentLevel >= 0 ? hls.currentLevel : 0;
        let fragments = hls.levels[levelIndex].details.fragments;
        let downloadedBuffers = [];
        let total = fragments.length;
        let match = raw.match(/(edge-cache-token=[^&]+)/);
        let tokenStr = match ? match[1] : "";

        for (let i = 0; i < total; i++) {
            if (text) text.textContent = `Downloading segment: ${i + 1} / ${total}`;
            let segUrl = fragments[i].url;
            if (tokenStr && !segUrl.includes("edge-cache-token=")) segUrl += (segUrl.includes("?") ? "&" : "?") + tokenStr;
            if (!segUrl.includes("proplayer.probrosystemset")) segUrl = SEGMENT + encodeURIComponent(segUrl);
            let segRes = await fetch(segUrl);
            if (!segRes.ok) throw new Error(`Segment ${i + 1} Error`);
            downloadedBuffers.push(await segRes.arrayBuffer());
            if (bar) bar.style.width = Math.round(((i + 1) / total) * 100) + "%";
        }

        if (text) text.textContent = "Merging segments...";
        const blob = new Blob(downloadedBuffers, { type: "video/mp4" });
        const finalUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = finalUrl;
        a.download = `RWA_Video_${Math.floor(Math.random() * 10000)}.mp4`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(finalUrl), 60000);
        if (bar) bar.style.width = "100%";
        if (text) text.textContent = "Download complete!";
    } catch (e) {
        if (text) text.textContent = e.message;
    }
}

function fmt(x) {
    if (!Number.isFinite(x)) return "00:00";
    x = Math.floor(x);
    let h = Math.floor(x / 3600), m = Math.floor(x % 3600 / 60), s = x % 60;
    return h ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Controls Binding
const loadBtn = document.getElementById("load");
if (loadBtn) loadBtn.onclick = start;
if (input) { input.style.display = "none"; }

const toggleBtn = document.getElementById("toggle");
if (toggleBtn) toggleBtn.onclick = () => v.paused ? v.play() : v.pause();

v.onplay = () => { if (toggleBtn) toggleBtn.textContent = "⏸"; };
v.onpause = () => { if (toggleBtn) toggleBtn.textContent = "▶"; };

const backBtn = document.getElementById("back");
if (backBtn) backBtn.onclick = () => v.currentTime = Math.max(0, v.currentTime - 10);

const nextBtn = document.getElementById("next");
if (nextBtn) nextBtn.onclick = () => v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10);

const muteBtn = document.getElementById("mute");
if (muteBtn) muteBtn.onclick = () => {
    v.muted = !v.muted;
    muteBtn.textContent = v.muted ? "🔇" : "🔊";
};

const dlBtn = document.getElementById("download");
if (dlBtn) dlBtn.onclick = downloadMerged;

const pipBtn = document.getElementById("pip");
if (pipBtn) pipBtn.onclick = async () => {
    try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else await v.requestPictureInPicture();
    } catch {}
};

const fsBtn = document.getElementById("fs");
if (fsBtn) fsBtn.onclick = async () => {
    try {
        const screenEl = document.getElementById("hlsScreen");
        if (!document.fullscreenElement && screenEl) await screenEl.requestFullscreen();
        else await document.exitFullscreen();
    } catch {}
};

// Close Button Fix (Sabhhi close buttons ko bind kar diya hai)
document.querySelectorAll(".close-btn, [id*='Close'], button:has-text('Close')").forEach(btn => {
    btn.onclick = stopPlayer;
});
const specificClose = document.getElementById("closePlayer") || document.querySelector(".close");
if (specificClose) specificClose.onclick = stopPlayer;

// Timing & Seek Bar positioning alignment
v.ontimeupdate = () => {
    let d = v.duration;
    const seekEl = document.getElementById("seek");
    const timeEl = document.getElementById("time");
    if (Number.isFinite(d) && d > 0 && seekEl) seekEl.value = v.currentTime / d * 1000;
    if (timeEl) timeEl.textContent = fmt(v.currentTime) + " / " + fmt(d);
};

const seekEl = document.getElementById("seek");
if (seekEl) seekEl.oninput = e => {
    if (Number.isFinite(v.duration)) v.currentTime = e.target.value / 1000 * v.duration;
};

// PDF buttons & Settings Menu Injection (Agar HTML mein na ho)
document.addEventListener("DOMContentLoaded", () => {
    // Hide status text element completely
    if (statusEl) statusEl.remove();

    // Add Settings & PDF UI dynamically if needed
    const playerWrapper = document.querySelector(".player-wrapper") || document.getElementById("hlsScreen");
    if (playerWrapper && !document.getElementById("settingsMenu")) {
        const settingsDiv = document.createElement("div");
        settingsDiv.id = "settingsMenu";
        settingsDiv.className = "ott-settings-popup";
        settingsDiv.innerHTML = `
            <div class="sett-header">⚙️ Player Settings <span onclick="toggleSettingsMenu()" style="cursor:pointer; float:right;">✕</span></div>
            <div class="sett-section">
                <div class="sett-title">Quality</div>
                <div id="qualityList" class="sett-options"></div>
            </div>
            <div class="sett-section">
                <div class="sett-title">Playback Speed</div>
                <div class="sett-options">
                    <div class="spd-option" onclick="changeSpd(0.5, this)">0.5x</div>
                    <div class="spd-option active" onclick="changeSpd(1, this)">1.0x</div>
                    <div class="spd-option" onclick="changeSpd(1.5, this)">1.5x</div>
                    <div class="spd-option" onclick="changeSpd(2, this)">2.0x</div>
                </div>
            </div>
        `;
        playerWrapper.appendChild(settingsDiv);
    }
});
