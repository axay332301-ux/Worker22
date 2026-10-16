// =========================================================
// RWA ULTIMATE OTT PLAYER ENGINE (player.js)
// =========================================================
const PROXY = "https://proplayer.allswbatch22.workers.dev/stream?url=";
const SEGMENT = "https://proplayer.allswbatch22.workers.dev/proxy?url=";
const v = document.getElementById("video");
const input = document.getElementById("url");
const msg = document.getElementById("msg");
const statusEl = document.getElementById("status");
let hls = null;
let cachedToken = "";

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

        if (segment(originalUrl) && !originalUrl.includes("proplayer.allswbatch22.workers.dev")) {
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
}

function start() {
    let raw = input.value.trim();
    if (!raw) {
        say("Valid URL ya YouTube ID dalein.", true);
        return;
    }

    stopPlayer();

    const isYT = (!raw.startsWith("http") && raw.length >= 10 && raw.length <= 15) || raw.includes("youtube.com") || raw.includes("youtu.be");

    if (isYT) {
        document.getElementById("hlsScreen").classList.add("hidden");
        document.getElementById("ytScreen").classList.remove("hidden");
        let ytId = raw;
        if (raw.includes("v=")) ytId = raw.split("v=")[1].split("&")[0];
        else if (raw.includes("youtu.be/")) ytId = raw.split("youtu.be/")[1].split("?")[0];

        const ytFrame = document.getElementById("ytFrame");
        if (ytFrame) ytFrame.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
        say("YouTube class chal rahi hai.");
        return;
    }

    document.getElementById("ytScreen").classList.add("hidden");
    document.getElementById("hlsScreen").classList.remove("hidden");

    if (!valid(raw)) {
        say("Valid URL dalein.", true);
        return;
    }

    let src = manifest(raw);
    say("Loading stream...");

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
            say("Stream ready.");
            
            // Quality Dropdown Populate Fix
            let qualitySel = document.getElementById("qualitySelect");
            if (!qualitySel) {
                qualitySel = document.createElement("select");
                qualitySel.id = "qualitySelect";
                qualitySel.className = "quality-dropdown";
                qualitySel.onchange = (e) => {
                    if (hls) hls.currentLevel = parseInt(e.target.value);
                };
            }

            if (data.levels && data.levels.length > 0) {
                qualitySel.innerHTML = '<option value="-1">Auto Quality</option>';
                data.levels.forEach((lvl, idx) => {
                    let qName = lvl.height ? `${lvl.height}p` : `Quality ${idx + 1}`;
                    qualitySel.innerHTML += `<option value="${idx}">${qName}</option>`;
                });
                qualitySel.style.display = "inline-block";
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
        v.onloadedmetadata = () => {
            v.play().catch(() => {});
        };
    } else {
        say("Is browser me HLS supported nahi hai.", true);
    }
}

async function downloadMerged() {
    const raw = input.value.trim();
    if (!valid(raw)) {
        say("Pehle valid HLS URL dalein.", true);
        return;
    }

    if (!hls || !hls.levels || hls.levels.length === 0 || !hls.levels[hls.currentLevel >= 0 ? hls.currentLevel : 0]?.details) {
        say("⚠️ Kripya pehle video play hone dein, fir Download dabayein.", true);
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
        let level = hls.levels[levelIndex];
        let fragments = level.details.fragments;

        if (!fragments || fragments.length === 0) throw new Error("Segments nahi mile!");

        let downloadedBuffers = [];
        let total = fragments.length;
        let match = raw.match(/(edge-cache-token=[^&]+)/);
        let tokenStr = match ? match[1] : "";

        if (fragments[0].initSegment) {
            if (text) text.textContent = "Downloading Init Segment...";
            let initUrl = fragments[0].initSegment.url;
            if (tokenStr && !initUrl.includes("edge-cache-token=")) initUrl += (initUrl.includes("?") ? "&" : "?") + tokenStr;
            if (!initUrl.includes("proplayer.probrosystemset")) initUrl = SEGMENT + encodeURIComponent(initUrl);
            let res = await fetch(initUrl);
            if (!res.ok) throw new Error("Init Segment HTTP " + res.status);
            downloadedBuffers.push(await res.arrayBuffer());
        }

        for (let i = 0; i < total; i++) {
            if (text) text.textContent = `Downloading segment: ${i + 1} / ${total}`;
            let segUrl = fragments[i].url;
            if (tokenStr && !segUrl.includes("edge-cache-token=")) {
                segUrl += (segUrl.includes("?") ? "&" : "?") + tokenStr;
            }
            if (!segUrl.includes("proplayer.probrosystemset")) {
                segUrl = SEGMENT + encodeURIComponent(segUrl);
            }
            let segRes = await fetch(segUrl);
            if (!segRes.ok) throw new Error(`Segment ${i + 1} Error`);

            let buffer = await segRes.arrayBuffer();
            downloadedBuffers.push(buffer);
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
        say("Video successfully download ho gayi hai.");
    } catch (e) {
        if (bar) bar.style.width = "0";
        if (text) text.textContent = e.message;
        say("Download failed: " + e.message, true);
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

const loadBtn = document.getElementById("load");
if (loadBtn) loadBtn.onclick = start;
if (input) {
    input.onkeydown = e => { if (e.key === "Enter") start(); };
    input.style.display = "none"; 
}

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

const speedSel = document.getElementById("speed");
if (speedSel) speedSel.onchange = e => v.playbackRate = +e.target.value;

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

// PDF buttons dynamic injection agar HTML mein na ho toh
document.addEventListener("DOMContentLoaded", () => {
    const actionRow = document.querySelector(".player-actions") || document.querySelector(".player-controls") || document.getElementById("download")?.parentNode;
    if (actionRow && !document.getElementById("pdfBtn1")) {
        const pdfContainer = document.createElement("div");
        pdfContainer.className = "pdf-buttons-group";
        pdfContainer.innerHTML = `
            <button id="pdfBtn1" class="ott-btn" style="background:#2d3748; color:#fff; padding:6px 12px; border-radius:6px; border:none; margin-right:5px; cursor:pointer;">📄 PDF 1</button>
            <button id="pdfBtn2" class="ott-btn" style="background:#2d3748; color:#fff; padding:6px 12px; border-radius:6px; border:none; cursor:pointer;">📄 PDF 2</button>
        `;
        actionRow.appendChild(pdfContainer);
        
        document.getElementById("pdfBtn1").onclick = () => alert("PDF 1 download/view feature linked!");
        document.getElementById("pdfBtn2").onclick = () => alert("PDF 2 download/view feature linked!");
    }
});
