/* =========================================================
   ASMANI SKY VIDEO PLAYER SCRIPT (player.js)
   ========================================================= */

let video = document.getElementById('video');
let hlsScreen = document.getElementById('hlsScreen');
let ytScreen = document.getElementById('ytScreen');
let ytFrame = document.getElementById('ytFrame');
let playBtn = document.getElementById('toggle');
let backBtn = document.getElementById('back');
let nextBtn = document.getElementById('next');
let muteBtn = document.getElementById('mute');
let fsBtn = document.getElementById('fs');
let pipBtn = document.getElementById('pip');
let downloadBtn = document.getElementById('download');
let seekbar = document.getElementById('seek');
let timeDisplay = document.getElementById('time');
let bufferLoader = document.getElementById('bufferLoader');
let settingsMenu = document.getElementById('settingsMenu');
let qualityList = document.getElementById('qualityList');

let hlsInstance = null;
let currentVideoDuration = 0;

// Initialize Player Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    if (!video) return;

    // Play / Pause Toggle
    playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (video.paused) {
            video.play().catch(err => console.log(err));
        } else {
            video.pause();
        }
    });

    video.addEventListener('play', () => { playBtn.innerText = "⏸"; });
    video.addEventListener('pause', () => { playBtn.innerText = "▶"; });

    // 10s Rewind & Forward
    backBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        video.currentTime = Math.max(0, video.currentTime - 10);
    });

    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
    });

    // Mute / Unmute
    muteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        video.muted = !video.muted;
        muteBtn.innerText = video.muted ? "🔇" : "🔊";
    });

    // Seekbar Update
    video.addEventListener('timeupdate', () => {
        if (!isNaN(video.duration) && video.duration > 0) {
            let percent = (video.currentTime / video.duration) * 1000;
            seekbar.value = percent;
            timeDisplay.innerText = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
        }
    });

    seekbar.addEventListener('input', (e) => {
        e.stopPropagation();
        if (!isNaN(video.duration) && video.duration > 0) {
            let time = (seekbar.value / 1000) * video.duration;
            video.currentTime = time;
        }
    });

    // Buffering Spinner States
    video.addEventListener('waiting', () => {
        if (bufferLoader) bufferLoader.classList.remove('hidden');
    });
    video.addEventListener('playing', () => {
        if (bufferLoader) bufferLoader.classList.add('hidden');
    });
    video.addEventListener('canplay', () => {
        if (bufferLoader) bufferLoader.classList.add('hidden');
    });

    // Picture-in-Picture
    if (pipBtn) {
        pipBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else if (document.pictureInPictureEnabled) {
                    await video.requestPictureInPicture();
                }
            } catch (err) {
                console.log("PiP Error:", err);
            }
        });
    }

    // =========================================================
    // FULLSCREEN ENHANCEMENT: HIDE ALL BUTTONS EXCEPT BACK BUTTON
    // =========================================================
    if (fsBtn) {
        fsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleAsmaniFullscreen();
        });
    }

    // Download Button simulation
    if (downloadBtn) {
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            startVideoDownload();
        });
    }
});

// Load Video Source (HLS or MP4)
function loadVideoSource(url, title = "Class Video") {
    let titleEl = document.getElementById('playingTitle');
    if (titleEl) titleEl.innerText = `▶ ${title}`;

    if (hlsScreen) hlsScreen.classList.remove('hidden');
    if (ytScreen) ytScreen.classList.add('hidden');

    if (Hls.isSupported() && url.includes('.m3u8')) {
        if (hlsInstance) {
            hlsInstance.destroy();
        }
        hlsInstance = new Hls();
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            video.play().catch(err => console.log(err));
            populateQualityLevels(hlsInstance.levels);
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && url.includes('.m3u8')) {
        // Native Safari HLS support
        video.src = url;
        video.addEventListener('loadedmetadata', () => {
            video.play().catch(err => console.log(err));
        });
    } else {
        // Standard MP4 / WebM
        if (hlsInstance) {
            hlsInstance.destroy();
            hlsInstance = null;
        }
        video.src = url;
        video.load();
        video.play().catch(err => console.log(err));
    }
}

// Load YouTube Embed Source
function loadYouTubeSource(ytUrl, title = "Live / Free YouTube Class") {
    let titleEl = document.getElementById('playingTitle');
    if (titleEl) titleEl.innerText = `▶ ${title}`;

    if (hlsScreen) hlsScreen.classList.add('hidden');
    if (ytScreen) ytScreen.classList.remove('hidden');

    let embedUrl = ytUrl;
    if (ytUrl.includes('watch?v=')) {
        embedUrl = ytUrl.replace('watch?v=', 'embed/');
    } else if (ytUrl.includes('youtu.be/')) {
        let id = ytUrl.split('youtu.be/')[1]?.split('?')[0];
        embedUrl = `https://www.youtube.com/embed/${id}`;
    }
    if (ytFrame) ytFrame.src = embedUrl;
}

// Toggle Asmani Fullscreen Mode
function toggleAsmaniFullscreen() {
    if (!hlsScreen) return;

    if (!document.fullscreenElement && !hlsScreen.classList.contains('fullscreen-mode')) {
        // Enter Fullscreen Mode
        if (hlsScreen.requestFullscreen) {
            hlsScreen.requestFullscreen().catch(err => {
                // Fallback CSS fullscreen if API restricted
                hlsScreen.classList.add('fullscreen-mode');
            });
        } else {
            hlsScreen.classList.add('fullscreen-mode');
        }
        if (fsBtn) fsBtn.innerText = "⤹";
    } else {
        // Exit Fullscreen Mode
        if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(err => {});
        }
        hlsScreen.classList.remove('fullscreen-mode');
        if (fsBtn) fsBtn.innerText = "⛶";
    }
}

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && hlsScreen) {
        hlsScreen.classList.remove('fullscreen-mode');
        if (fsBtn) fsBtn.innerText = "⛶";
    }
});

// Toggle OTT Settings Menu
function toggleSettingsMenu() {
    if (settingsMenu) {
        settingsMenu.classList.toggle('active');
    }
}

// Populate Quality Levels from HLS
function populateQualityLevels(levels) {
    if (!qualityList) return;
    qualityList.innerHTML = `<div class="q-option active" onclick="setQuality(-1, this); event.stopPropagation();">Auto</div>`;
    
    levels.forEach((lvl, index) => {
        let qName = lvl.height ? `${lvl.height}p` : `Level ${index + 1}`;
        qualityList.innerHTML += `<div class="q-option" onclick="setQuality(${index}, this); event.stopPropagation();">${qName}</div>`;
    });
}

function setQuality(levelIdx, el) {
    if (hlsInstance) {
        hlsInstance.currentLevel = levelIdx;
    }
    document.querySelectorAll('.q-option').forEach(opt => opt.classList.remove('active'));
    if (el) el.classList.add('active');
    toggleSettingsMenu();
}

// Change Video Playback Speed
function changeSpd(spd, el) {
    video.playbackRate = spd;
    document.querySelectorAll('.spd-option').forEach(opt => opt.classList.remove('active'));
    if (el) el.classList.add('active');
    toggleSettingsMenu();
}

// Format Seconds to MM:SS
function formatTime(seconds) {
    let m = Math.floor(seconds / 60);
    let s = Math.floor(seconds % 60);
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
}

// Simulated Video Download
function startVideoDownload() {
    let box = document.getElementById('downloadBox');
    let bar = document.getElementById('bar');
    let text = document.getElementById('downloadText');
    if (!box || !bar || !text) return;

    box.style.display = 'block';
    let progress = 0;
    let interval = setInterval(() => {
        progress += 5;
        bar.style.width = `${progress}%`;
        text.innerText = `Downloading video streams... ${progress}%`;
        if (progress >= 100) {
            clearInterval(interval);
            text.innerText = `✅ Download completed successfully! Check downloads.`;
            setTimeout(() => { box.style.display = 'none'; }, 4000);
        }
    }, 150);
}
