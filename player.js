/* =========================================================
   RWA SKY PRO PORTAL — OTT VIDEO PLAYER & FULLSCREEN ENGINE (player.js)
   Features:
   - HLS (.m3u8) & Direct MP4 Playback with Quality Switcher
   - Fullscreen Clean Mode: Hides all bottom buttons in fullscreen
     and shows ONLY the Top-Left "⬅ Back" button
   - Video Segment Downloader (.ts / .mp4) with Progress Bar
   ========================================================= */

let hlsInstance = null;
let currentPlayingUrl = "";
let activeQualityLevels = [];

const videoEl      = document.getElementById("video");
const seekEl       = document.getElementById("seek");
const timeEl       = document.getElementById("time");
const toggleBtn    = document.getElementById("toggle");
const backBtn      = document.getElementById("back");
const nextBtn      = document.getElementById("next");
const muteBtn      = document.getElementById("mute");
const pipBtn       = document.getElementById("pip");
const fsBtn        = document.getElementById("fs");
const downloadBtn  = document.getElementById("download");
const hlsScreenEl  = document.getElementById("hlsScreen");
const ytScreenEl   = document.getElementById("ytScreen");
const ytFrameEl    = document.getElementById("ytFrame");
const bufferLoader = document.getElementById("bufferLoader");
const settingsMenu = document.getElementById("settingsMenu");

/* =========================================================
   1. FORMAT SECONDS TO MM:SS OR HH:MM:SS
   ========================================================= */
function formatPlayerTime(sec) {
    if (!sec || isNaN(sec) || sec < 0) return "00:00";
    const total = Math.floor(sec);
    const hrs   = Math.floor(total / 3600);
    const mins  = Math.floor((total % 3600) / 60);
    const secs  = total % 60;
    if (hrs > 0) {
        return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/* =========================================================
   2. START / LOAD STREAM IN PLAYER (HLS M3U8, MP4 OR YOUTUBE)
   ========================================================= */
function playStreamUrl(streamUrl, title = "Class Video", availableQualities = []) {
    if (!streamUrl) {
        alert("⚠️ Video stream URL not available for this lecture.");
        return;
    }

    currentPlayingUrl = streamUrl;
    const urlInput = document.getElementById("url");
    if (urlInput) urlInput.value = streamUrl;

    const titleEl = document.getElementById("playingTitle");
    if (titleEl) titleEl.textContent = `▶ ${title}`;

    // Close settings menu if open
    if (settingsMenu) settingsMenu.classList.remove("show");

    // Check if YouTube URL or ID
    const ytId = extractYouTubeId(streamUrl);
    if (ytId) {
        stopHlsVideo();
        if (hlsScreenEl) hlsScreenEl.classList.add("hidden");
        if (ytScreenEl)  ytScreenEl.classList.remove("hidden");
        if (ytFrameEl) {
            ytFrameEl.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`;
        }
        return;
    }

    // Standard HLS / MP4 Mode
    if (ytScreenEl)  ytScreenEl.classList.add("hidden");
    if (ytFrameEl)   ytFrameEl.src = "";
    if (hlsScreenEl) hlsScreenEl.classList.remove("hidden");

    stopHlsVideo();
    showBufferSpinner(true);

    if (streamUrl.includes(".m3u8") && window.Hls && Hls.isSupported()) {
        hlsInstance = new Hls({
            enableWorker: true,
            lowLatencyMode: true
        });
        hlsInstance.loadSource(streamUrl);
        hlsInstance.attachMedia(videoEl);

        hlsInstance.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            showBufferSpinner(false);
            buildHlsQualityOptions(data.levels || [], availableQualities);
            videoEl.play().catch(() => {});
        });

        hlsInstance.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
                showBufferSpinner(false);
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    hlsInstance.startLoad();
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    hlsInstance.recoverMediaError();
                }
            }
        });
    } else {
        // Native HLS (Safari/iOS) or Direct MP4
        videoEl.src = streamUrl;
        buildExternalQualityOptions(availableQualities, streamUrl);
        videoEl.addEventListener("loadedmetadata", () => {
            showBufferSpinner(false);
            videoEl.play().catch(() => {});
        }, { once: true });
    }
}

function stopHlsVideo() {
    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }
    if (videoEl) {
        videoEl.pause();
        videoEl.removeAttribute("src");
        videoEl.load();
    }
}

function extractYouTubeId(url) {
    if (!url) return null;
    const str = String(url).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
    const m = str.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
}

function showBufferSpinner(show) {
    if (!bufferLoader) return;
    if (show) bufferLoader.classList.remove("hidden");
    else bufferLoader.classList.add("hidden");
}

/* =========================================================
   3. QUALITY & PLAYBACK SPEED SWITCHER
   ========================================================= */
function buildHlsQualityOptions(levels, externalQualities = []) {
    const qContainer = document.getElementById("qualityList");
    if (!qContainer) return;

    // If external distinct URLs (720p, 480p, 360p, 240p) were passed from API, show them too
    if (externalQualities && externalQualities.length > 0) {
        buildExternalQualityOptions(externalQualities, currentPlayingUrl);
        return;
    }

    qContainer.innerHTML = "";

    const autoBtn = document.createElement("div");
    autoBtn.className = "q-option active";
    autoBtn.textContent = "Auto";
    autoBtn.onclick = () => {
        if (hlsInstance) hlsInstance.currentLevel = -1;
        setActiveQualityBadge(autoBtn);
    };
    qContainer.appendChild(autoBtn);

    levels.forEach((lvl, idx) => {
        const label = lvl.height ? `${lvl.height}p` : `Level ${idx + 1}`;
        const btn = document.createElement("div");
        btn.className = "q-option";
        btn.textContent = label;
        btn.onclick = () => {
            if (hlsInstance) hlsInstance.currentLevel = idx;
            setActiveQualityBadge(btn);
        };
        qContainer.appendChild(btn);
    });
}

function buildExternalQualityOptions(qualitiesList = [], activeUrl = "") {
    const qContainer = document.getElementById("qualityList");
    if (!qContainer) return;
    qContainer.innerHTML = "";

    if (!qualitiesList || qualitiesList.length === 0) {
        qContainer.innerHTML = `<div class="q-option active">HD Auto</div>`;
        return;
    }

    qualitiesList.forEach(item => {
        const btn = document.createElement("div");
        const isCurrent = item.url === activeUrl;
        btn.className = `q-option ${isCurrent ? "active" : ""}`;
        btn.textContent = item.label || "720p";
        btn.onclick = () => {
            const savedTime = videoEl ? videoEl.currentTime : 0;
            const savedRate = videoEl ? videoEl.playbackRate : 1;
            setActiveQualityBadge(btn);
            playStreamUrl(item.url, document.getElementById("playingTitle")?.textContent.replace(/^▶\s*/, "") || "Class Video", qualitiesList);
            setTimeout(() => {
                if (videoEl && savedTime > 0) {
                    videoEl.currentTime = savedTime;
                    videoEl.playbackRate = savedRate;
                }
            }, 600);
        };
        qContainer.appendChild(btn);
    });
}

function setActiveQualityBadge(selectedEl) {
    document.querySelectorAll("#qualityList .q-option").forEach(el => el.classList.remove("active"));
    selectedEl.classList.add("active");
}

function toggleSettingsMenu() {
    if (!settingsMenu) return;
    settingsMenu.classList.toggle("show");
}

function changeSpd(rate, btnEl) {
    if (videoEl) videoEl.playbackRate = Number(rate);
    document.querySelectorAll(".spd-option").forEach(el => el.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");
}

/* =========================================================
   4. FULLSCREEN CLEAN MODE (HIDE ALL CONTROLS, SHOW ONLY BACK BUTTON)
   ========================================================= */
async function enterVideoFullscreen() {
    const targetScreen = (!ytScreenEl?.classList.contains("hidden")) ? ytScreenEl : hlsScreenEl;
    if (!targetScreen) return;

    // Close settings popup before entering fullscreen
    if (settingsMenu) settingsMenu.classList.remove("show");

    // Add clean fullscreen class (hides bottom controls, shows top-left ⬅ Back button)
    targetScreen.classList.add("fullscreen-clean-active");
    document.body.classList.add("video-css-fullscreen-lock");

    try {
        if (targetScreen.requestFullscreen) {
            await targetScreen.requestFullscreen();
        } else if (targetScreen.webkitRequestFullscreen) {
            await targetScreen.webkitRequestFullscreen();
        }
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock("landscape").catch(() => {});
        }
    } catch (e) {
        // Fallback CSS fullscreen remains active even if native API is restricted
    }
}

async function exitVideoFullscreen(e) {
    if (e) e.stopPropagation();

    if (hlsScreenEl) hlsScreenEl.classList.remove("fullscreen-clean-active");
    if (ytScreenEl)  ytScreenEl.classList.remove("fullscreen-clean-active");
    document.body.classList.remove("video-css-fullscreen-lock");

    try {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
            }
        }
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
    } catch (err) {}
}

// Keep state synced if user presses ESC or hardware back to exit native fullscreen
document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (hlsScreenEl) hlsScreenEl.classList.remove("fullscreen-clean-active");
        if (ytScreenEl)  ytScreenEl.classList.remove("fullscreen-clean-active");
        document.body.classList.remove("video-css-fullscreen-lock");
    }
});

/* =========================================================
   5. WIRE UP PLAYER BUTTONS & EVENTS
   ========================================================= */
if (videoEl) {
    // Tap video in normal mode to play/pause
    videoEl.addEventListener("click", () => {
        // In fullscreen clean mode, single tap on video also pauses/plays smoothly without clutter
        if (videoEl.paused) videoEl.play().catch(() => {});
        else videoEl.pause();
    });

    videoEl.addEventListener("play", () => {
        if (toggleBtn) toggleBtn.textContent = "⏸";
        showBufferSpinner(false);
    });

    videoEl.addEventListener("pause", () => {
        if (toggleBtn) toggleBtn.textContent = "▶️";
    });

    videoEl.addEventListener("waiting", () => showBufferSpinner(true));
    videoEl.addEventListener("playing", () => showBufferSpinner(false));

    videoEl.addEventListener("timeupdate", () => {
        if (!videoEl.duration) return;
        const pct = (videoEl.currentTime / videoEl.duration) * 1000;
        if (seekEl) seekEl.value = String(Math.floor(pct));
        if (timeEl) {
            timeEl.textContent = `${formatPlayerTime(videoEl.currentTime)} / ${formatPlayerTime(videoEl.duration)}`;
        }
    });
}

if (seekEl) {
    seekEl.addEventListener("input", () => {
        if (!videoEl || !videoEl.duration) return;
        const target = (Number(seekEl.value) / 1000) * videoEl.duration;
        videoEl.currentTime = target;
    });
}

if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
        if (!videoEl) return;
        if (videoEl.paused) videoEl.play().catch(() => {});
        else videoEl.pause();
    });
}

if (backBtn) {
    backBtn.addEventListener("click", () => {
        if (videoEl) videoEl.currentTime = Math.max(0, videoEl.currentTime - 10);
    });
}

if (nextBtn) {
    nextBtn.addEventListener("click", () => {
        if (videoEl && videoEl.duration) {
            videoEl.currentTime = Math.min(videoEl.duration, videoEl.currentTime + 10);
        }
    });
}

if (muteBtn) {
    muteBtn.addEventListener("click", () => {
        if (!videoEl) return;
        videoEl.muted = !videoEl.muted;
        muteBtn.textContent = videoEl.muted ? "🔇" : "🔊";
    });
}

if (pipBtn) {
    pipBtn.addEventListener("click", async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (videoEl && videoEl.requestPictureInPicture) {
                await videoEl.requestPictureInPicture();
            }
        } catch (e) {}
    });
}

if (fsBtn) {
    fsBtn.addEventListener("click", () => {
        enterVideoFullscreen();
    });
}

/* =========================================================
   6. VIDEO SEGMENT MERGER & DIRECT DOWNLOADER
   ========================================================= */
if (downloadBtn) {
    downloadBtn.addEventListener("click", async () => {
        const url = currentPlayingUrl || document.getElementById("url")?.value;
        if (!url) {
            alert("No active stream to download!");
            return;
        }

        const rawTitle = (document.getElementById("playingTitle")?.textContent || "RWA_Class")
            .replace(/^▶\s*/, "")
            .replace(/[^a-zA-Z0-9_\-\s]/g, "")
            .trim()
            .replace(/\s+/g, "_");

        // Direct MP4 link
        if (!url.includes(".m3u8")) {
            const a = document.createElement("a");
            a.href = url;
            a.target = "_blank";
            a.download = `${rawTitle || "RWA_Lecture"}.mp4`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            return;
        }

        // HLS .m3u8 Stream Segment Merger
        const dlBox  = document.getElementById("downloadBox");
        const dlText = document.getElementById("downloadText");
        const dlBar  = document.getElementById("bar");

        if (dlBox) dlBox.style.display = "block";
        if (dlText) dlText.textContent = "Fetching HLS manifest...";
        if (dlBar) dlBar.style.width = "5%";

        try {
            const baseUrl = url.substring(0, url.lastIndexOf("/") + 1);
            const res = await fetch(url);
            const text = await res.text();

            let playlistUrl = url;
            let playlistBase = baseUrl;

            // If master playlist, pick highest/first variant
            if (text.includes("#EXT-X-STREAM-INF")) {
                const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
                const subLine = lines.find(l => !l.startsWith("#"));
                if (subLine) {
                    playlistUrl = subLine.startsWith("http") ? subLine : baseUrl + subLine;
                    playlistBase = playlistUrl.substring(0, playlistUrl.lastIndexOf("/") + 1);
                }
            }

            const segRes = await fetch(playlistUrl);
            const segText = await segRes.text();
            const segLines = segText.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));

            if (segLines.length === 0) {
                throw new Error("No segments found in playlist");
            }

            const chunks = [];
            for (let i = 0; i < segLines.length; i++) {
                const segUrl = segLines[i].startsWith("http") ? segLines[i] : playlistBase + segLines[i];
                const r = await fetch(segUrl);
                const buf = await r.arrayBuffer();
                chunks.push(buf);

                const pct = Math.round(((i + 1) / segLines.length) * 100);
                if (dlBar) dlBar.style.width = `${pct}%`;
                if (dlText) dlText.textContent = `Downloading Lecture Segments: ${i + 1} / ${segLines.length} (${pct}%)`;
            }

            const blob = new Blob(chunks, { type: "video/mp2t" });
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = `${rawTitle || "RWA_Lecture"}.ts`;
            document.body.appendChild(a);
            a.click();
            a.remove();

            if (dlText) dlText.textContent = "✅ Download Complete!";
            setTimeout(() => {
                if (dlBox) dlBox.style.display = "none";
            }, 3000);
        } catch (err) {
            if (dlText) dlText.textContent = "⚠️ Browser CORS prevented segment merging. Opening direct stream URL...";
            window.open(url, "_blank");
        }
    });
}
