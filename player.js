// =========================================================
// RWA ULTIMATE PREMIUM OTT PLAYER ENGINE (player.js)
// =========================================================
const PROXY = "https://proplayer.allswbatch22.workers.dev/stream?url=";
const SEGMENT = "https://proplayer.allswbatch22.workers.dev/proxy?url=";

const v = document.getElementById("video");
const input = document.getElementById("url");
const bufferLoader = document.getElementById("bufferLoader");

let hls = null;
let cachedToken = "";

function showLoader(show) {
    if (!bufferLoader) return;
    if (show) bufferLoader.classList.remove("hidden");
    else bufferLoader.classList.add("hidden");
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
        let mainUrl = input ? input.value.trim() : "";

        let match = mainUrl.match(/(edge-cache-token=[^&]+)/);
        if (match) {
            cachedToken = match[1];
        }

        if (cachedToken && !originalUrl.includes("edge-cache-token=")) {
            originalUrl += (originalUrl.includes("?") ? "&" : "?") + cachedToken;
        }

        if (segment(originalUrl) && !originalUrl.includes("workers.dev")) {
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
    if (v) {
        v.pause();
        v.removeAttribute("src");
        v.load();
    }
    const ytFrame = document.getElementById("ytFrame");
    if (ytFrame) ytFrame.src = "";
    showLoader(false);
}

// Close button function
window.closePlayerBox = function() {
    stopPlayer();
    const menu = document.getElementById("settingsMenu");
    if (menu) menu.classList.remove("show");
    if (typeof showSlide === "function") {
        showSlide("slideExplorer");
    }
};

function start() {
    let raw = input ? input.value.trim() : "";
    if (!raw) return;

    stopPlayer();
    showLoader(true);

    const isYT = (!raw.startsWith("http") && raw.length >= 10 && raw.length <= 15) || raw.includes("youtube.com") || raw.includes("youtu.be");

    if (isYT) {
        showLoader(false);
        document.getElementById("hlsScreen").classList.add("hidden");
        document.getElementById("ytScreen").classList.remove("hidden");

        let ytId = raw;
        if (raw.includes("v=")) ytId = raw.split("v=")[1].split("&")[0];
        else if (raw.includes("youtu.be/")) ytId = raw.split("youtu.be/")[1].split("?")[0];

        const ytFrame = document.getElementById("ytFrame");
        if (ytFrame) ytFrame.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
        return;
    }

    document.getElementById("ytScreen").classList.add("hidden");
    document.getElementById("hlsScreen").classList.remove("hidden");

    if (!valid(raw)) {
        showLoader(false);
        return;
    }

    let src = manifest(raw);

    if (Hls.isSupported()) {
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30,
            maxBufferLength: 25,
            loader: BackendLoader
        });

        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            showLoader(false);
            populateQualitySettings(data.levels || []);
            v.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_, d) => {
            if (d.fatal) {
                showLoader(false);
                if (d.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    try { hls.recoverMediaError(); } catch {}
                }
            }
        });

        hls.attachMedia(v);
    } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = src;
        v.onloadedmetadata = () => {
            showLoader(false);
            v.play().catch(() => {});
        };
    }
}

// Populate both API qualities (240p/360p/480p/720p) & HLS internal levels
function populateQualitySettings(hlsLevels) {
    const qList = document.getElementById("qualityList");
    if (!qList) return;

    let html = "";

    // 1. Check if lecture has multiple server links (720p, 480p, 360p, 240p) in app.js
    const activeInfo = (typeof state !== "undefined" && state.activeKey && state.mediaMap) ? state.mediaMap[state.activeKey] : null;
    const serverQuals = activeInfo && activeInfo.qualities ? Object.keys(activeInfo.qualities) : [];

    // 2. If HLS master manifest itself has multi-bitrate levels
    if (hlsLevels && hlsLevels.length > 1) {
        html += `<div class="q-option active" onclick="changeHlsLevel(-1, this)">Auto</div>`;
        hlsLevels.forEach((lvl, idx) => {
            let label = lvl.height ? `${lvl.height}p` : `Level ${idx + 1}`;
            html += `<div class="q-option" onclick="changeHlsLevel(${idx}, this)">${label}</div>`;
        });
    } else if (serverQuals.length > 0) {
        serverQuals.forEach((qKey, idx) => {
            const isAct = (input.value === activeInfo.qualities[qKey]) || idx === 0;
            html += `<div class="q-option ${isAct ? 'active' : ''}" onclick="switchServerQuality('${qKey.replace(/'/g, "")}', this)">${qKey}</div>`;
        });
    } else {
        html = `<div class="q-option active" onclick="changeHlsLevel(-1, this)">720p HD</div>
                <div class="q-option" onclick="changeHlsLevel(0, this)">480p</div>
                <div class="q-option" onclick="changeHlsLevel(0, this)">360p</div>
                <div class="q-option" onclick="changeHlsLevel(0, this)">240p</div>`;
    }

    qList.innerHTML = html;
}

window.changeHlsLevel = function(idx, el) {
    if (hls) hls.currentLevel = idx;
    document.querySelectorAll("#qualityList .q-option").forEach(o => o.classList.remove("active"));
    if (el) el.classList.add("active");
    toggleSettingsMenu();
};

window.switchServerQuality = function(qKey, el) {
    const currentTime = v ? v.currentTime : 0;
    document.querySelectorAll("#qualityList .q-option").forEach(o => o.classList.remove("active"));
    if (el) el.classList.add("active");
    toggleSettingsMenu();
    if (typeof changeLectureQuality === "function") {
        changeLectureQuality(qKey, currentTime);
    }
};

window.changeSpd = function(rate, el) {
    if (v) v.playbackRate = rate;
    document.querySelectorAll(".spd-option").forEach(o => o.classList.remove("active"));
    if (el) el.classList.add("active");
    toggleSettingsMenu();
};

window.toggleSettingsMenu = function() {
    const menu = document.getElementById("settingsMenu");
    if (menu) menu.classList.toggle("show");
};

async function downloadMerged() {
    const raw = input ? input.value.trim() : "";
    if (!valid(raw) || !hls || !hls.levels || hls.levels.length === 0) return;

    const box = document.getElementById("downloadBox");
    const text = document.getElementById("downloadText");
    const bar = document.getElementById("bar");
    if (box) box.classList.add("show");
    if (bar) bar.style.width = "2%";
    if (text) text.textContent = "Preparing segments...";

    try {
        let levelIndex = hls.currentLevel >= 0 ? hls.currentLevel : 0;
        let fragments = hls.levels[levelIndex].details.fragments;
        let downloadedBuffers = [];
        let total = fragments.length;
        let match = raw.match(/(edge-cache-token=[^&]+)/);
        let tokenStr = match ? match[1] : "";

        for (let i = 0; i < total; i++) {
            if (text) text.textContent = `Downloading: ${i + 1} / ${total} (${Math.round(((i + 1) / total) * 100)}%)`;
            let segUrl = fragments[i].url;
            if (tokenStr && !segUrl.includes("edge-cache-token=")) segUrl += (segUrl.includes("?") ? "&" : "?") + tokenStr;
            if (!segUrl.includes("workers.dev")) segUrl = SEGMENT + encodeURIComponent(segUrl);
            let segRes = await fetch(segUrl);
            if (!segRes.ok) throw new Error(`Segment ${i + 1} Error`);
            downloadedBuffers.push(await segRes.arrayBuffer());
            if (bar) bar.style.width = Math.round(((i + 1) / total) * 100) + "%";
        }

        if (text) text.textContent = "Merging video file...";
        const blob = new Blob(downloadedBuffers, { type: "video/mp4" });
        const finalUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = finalUrl;
        a.download = `RWA_Class_${Math.floor(Math.random() * 10000)}.mp4`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(finalUrl), 60000);
        if (text) text.textContent = "✅ Download Complete!";
        setTimeout(() => { if (box) box.classList.remove("show"); }, 4000);
    } catch (e) {
        if (text) text.textContent = "⚠️ Download error: " + e.message;
    }
}

function fmt(x) {
    if (!Number.isFinite(x)) return "00:00";
    x = Math.floor(x);
    let h = Math.floor(x / 3600), m = Math.floor(x % 3600 / 60), s = x % 60;
    return h
        ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Bind Player Controls
const toggleBtn = document.getElementById("toggle");
if (toggleBtn) toggleBtn.onclick = () => v.paused ? v.play() : v.pause();

v.onplay = () => { if (toggleBtn) toggleBtn.textContent = "⏸"; showLoader(false); };
v.onpause = () => { if (toggleBtn) toggleBtn.textContent = "▶"; };
v.onwaiting = () => showLoader(true);
v.onplaying = () => showLoader(false);
v.oncanplay = () => showLoader(false);

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
        else if (v.requestPictureInPicture) await v.requestPictureInPicture();
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
