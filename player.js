// =========================================================
// RWA ADVANCED HLS PLAYER & DOWNLOADER ENGINE (player.js)
// =========================================================
// Termux Bridge Server URL
const PROXY = "https://deutsch-screensavers-interactive-stylish.trycloudflare.com/stream?url=";
const SEGMENT = "https://deutsch-screensavers-interactive-stylish.trycloudflare.com/proxy?url=";
const v = document.getElementById("video");
const input = document.getElementById("url");
const msg = document.getElementById("msg");
const statusEl = document.getElementById("status");
let hls = null;
let cachedToken = "";

function say(t, e = false) {
    msg.textContent = t;
    msg.style.color = e ? "#ff9696" : "#98a4b6";
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

        // 1. Main input URL se token extract karke cache karna[span_7](start_span)[span_7](end_span)
        let match = mainUrl.match(/(edge-cache-token=[^&]+)/);
        if (match) {
            cachedToken = match[1];
        }

        // 2. Har segment URL ke sath automatic token jodna[span_8](start_span)[span_8](end_span)
        if (cachedToken && !originalUrl.includes("edge-cache-token=")) {
            originalUrl += (originalUrl.includes("?") ? "&" : "?") + cachedToken;
        }

        if (segment(originalUrl) && !originalUrl.includes("proplayer.probrosystemset.workers.dev")) {
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
    document.getElementById("ytFrame").src = "";
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

        document.getElementById("ytFrame").src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
        statusEl.textContent = "Playing YouTube";
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
    statusEl.textContent = "Loading…";
    say("Manifest loading via Proxy...");

    if (Hls.isSupported()) {
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30,
            maxBufferLength: 20,
            loader: BackendLoader
        });
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(src));
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            statusEl.textContent = "Ready";
            say("Stream ready.");
            v.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, d) => {
            if (d.fatal) {
                statusEl.textContent = "Error";
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
            statusEl.textContent = "Ready";
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
        say("⚠️ Kripya pehle 'PLAY' button dabayein, jab video play hone lage tab Download par click karein.", true);
        return;
    }

    const box = document.getElementById("downloadBox");
    const text = document.getElementById("downloadText");
    const bar = document.getElementById("bar");
    box.classList.add("show");
    bar.style.width = "2%";
    text.textContent = "HLS Player se segments fetch kar rahe hain...";
    statusEl.textContent = "Downloading…";

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
            text.textContent = "Downloading Init Segment...";
            let initUrl = fragments[0].initSegment.url;
            if (tokenStr && !initUrl.includes("edge-cache-token=")) initUrl += (initUrl.includes("?") ? "&" : "?") + tokenStr;
            if (!initUrl.includes("proplayer.probrosystemset")) initUrl = SEGMENT + encodeURIComponent(initUrl);
            let res = await fetch(initUrl);
            if (!res.ok) throw new Error("Init Segment HTTP " + res.status);
            downloadedBuffers.push(await res.arrayBuffer());
        }

        for (let i = 0; i < total; i++) {
            text.textContent = `Downloading segment: ${i + 1} / ${total}`;
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
            bar.style.width = Math.round(((i + 1) / total) * 100) + "%";
        }

        text.textContent = "Segments merge ho rahe hain...";
        const blob = new Blob(downloadedBuffers, { type: "video/mp4" });
        const finalUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = finalUrl;
        a.download = `RWA_Video_${Math.floor(Math.random() * 10000)}.mp4`;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(finalUrl), 60000);
        bar.style.width = "100%";
        text.textContent = "Download complete!";
        statusEl.textContent = "Ready";
        say("Video successfully download ho gayi hai.");
    } catch (e) {
        bar.style.width = "0";
        statusEl.textContent = "Error";
        text.textContent = e.message;
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

document.getElementById("load").onclick = start;
input.onkeydown = e => { if (e.key === "Enter") start(); };
document.getElementById("toggle").onclick = () => v.paused ? v.play() : v.pause();
v.onplay = () => document.getElementById("toggle").textContent = "⏸";
v.onpause = () => document.getElementById("toggle").textContent = "▶";
document.getElementById("back").onclick = () => v.currentTime = Math.max(0, v.currentTime - 10);
document.getElementById("next").onclick = () => v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10);
document.getElementById("mute").onclick = () => {
    v.muted = !v.muted;
    document.getElementById("mute").textContent = v.muted ? "🔇" : "🔊";
};
document.getElementById("speed").onchange = e => v.playbackRate = +e.target.value;
document.getElementById("download").onclick = downloadMerged;
document.getElementById("pip").onclick = async () => {
    try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else await v.requestPictureInPicture();
    } catch {}
};
document.getElementById("fs").onclick = async () => {
    try {
        if (!document.fullscreenElement) await document.getElementById("hlsScreen").requestFullscreen();
        else await document.exitFullscreen();
    } catch {}
};
v.ontimeupdate = () => {
    let d = v.duration;
    if (Number.isFinite(d) && d > 0) document.getElementById("seek").value = v.currentTime / d * 1000;
    document.getElementById("time").textContent = fmt(v.currentTime) + " / " + fmt(d);
};
document.getElementById("seek").oninput = e => {
    if (Number.isFinite(v.duration)) v.currentTime = e.target.value / 1000 * v.duration;
};
v.onwaiting = () => statusEl.textContent = "Buffering…";
v.onplaying = () => statusEl.textContent = "Playing";
v.onended = () => statusEl.textContent = "Ended";
