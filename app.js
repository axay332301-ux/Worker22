// =========================================================
// RWA SKY PORTAL - MULTI-TOKEN & SLIDE NAVIGATION (app.js)
// =========================================================
const DEFAULT_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjQ3NTYzMTYiLCJ0aW1lc3RhbXAiOjE3OTE5Nzc2MTIsIml2X3ZlciI6MzMsInNlc3Npb24iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKcFpDSTZJalEzTlRZek1UWWlMQ0psYldGcGJDSTZJbk5oYm1SbFpYQnJZWE4zWVc0eU5UUkFaMjFoYVd3dVkyOXRJaXdpYm1GdFpTSTZJbk5oYm1SbFpYQWlMQ0owWlc1aGJuUlVlWEJsSWpvaWRYTmxjaUlzSW5SbGJtRnVkRTVoYldVaU9pSnliM3BuWVhKZlpHSWlMQ0owWlc1aGJuUkpaQ0k2SWlJc0ltUnBjM0J2YzJGaWJHVWlPbVpoYkhObGZRLjNLTWRpUHRjZ3BpYkMyMWhPNTlrVFRreTJkdlk0d19YR0F3UnE4N3o4aE0ifQ.LN3ukePscrf6LVISc9oJcyRh4V5sipHnTVUBvRcwRHk";

const API_BASE = "https://rozgarapinew.teachx.in";
const AES_KEY = CryptoJS.enc.Utf8.parse("638udh3829162018");
const WORKER_PROXY = "https://proplayer.allswbatch22.workers.dev/stream?url=";

// Multi-Token Storage Initialization
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
    if (signedPdf && signedPdf.includes("URLPrefix=")) {
        try {
            const b64 = signedPdf.split("URLPrefix=")[1].split("&")[0].split("~")[0];
            const decoded = atob(decodeURIComponent(b64));
            if (decoded.startsWith("http")) return decoded;
        } catch {}
    }
    return signedPdf || dec || "";
}

// Fallback Local Database
const DB = {
    paidCourses: [
        { id: "571", course_name: "SSC GD भर्ती 2027 (वीर बैच)", exam_category: "RWA SSC EXAMS • PAID", exam_logo: "https://appx-wsb-gcp-mcdn.akamai.net.in/exam/2022-02-07-0.9839972577217094.png" }
    ],
    paidSubjects: [
        { subjectid: "3610", subject_name: "History (वीर बैच)", subject_logo: "" },
        { subjectid: "1", subject_name: "Maths", subject_logo: "https://appxcontent.kaxa.in/subject/2024-04-10-0.8626713728066564.jpg" },
        { subjectid: "3527", subject_name: "Physics Dharmendra Sir", subject_logo: "" }
    ],
    paidTopics: {
        "3610": [{ topicid: "42301", topic_name: "सिंधु सभ्यता" }]
    },
    paidLectures: {
        "42301": [
            {
                id: "349275",
                Title: "History By Parul Mam || सिंधु सभ्यता",
                date_and_time: "08-10-2026 at 02:00 pm",
                thumbnail: "https://appx-content-v2.classx.co.in/paid_course3/2026-10-07-0_3401609217976156.jpg",
                file_link: "yc79PF7PfaItE6uX7lAA8ABqbrWNB1WgbrzGsR2wlcFMhAR2tn+h+ETmGcuzjpU5lIYYSRnaL7bMlKrf7UouOCRvHozzqOa6f7eXz7ZPaEE0fRd/NiEP2WEQYJbqwKEM+MU8uRUEXFx4/07LTnptyQ==:ZmVkY2JhOTg3NjU0MzIxMA==",
                download_links: [
                    { quality: "720p", path: "m7hcRsBTJp5eNY5aTdn8qpPBOzdeUeGZQY2wVY0qocyzI/GQp7GTpQTXEQI3QwV4TBS4t/fcLhrLe6ZhZ45UCH+PnnUxKByF74TDwQBmgL8IryqFfW2RBko3ChFPEicQTi3gci9AKv0/IhnCF+NqXBt9k0YzrosmgyXn3Oh6AkPFrQ8XsVMQ7udZ3fwSrS+Y:ZmVkY2JhOTg3NjU0MzIxMA==" }
                ]
            }
        ]
    },
    freeBatches: [
        { id: "free_101", course_name: "RWA Free YouTube Marathon Series", exam_logo: "https://placehold.co/600x320/0284c7/ffffff?text=RWA+Free+Batches" }
    ],
    freeSubjects: [
        { subjectid: "fsub_1", subject_name: "GS & Polity Marathon", subject_logo: "" }
    ],
    freeTopics: {
        "fsub_1": [{ topicid: "ftop_1", topic_name: "Complete Revision Classes" }]
    },
    freeLectures: {
        "ftop_1": [
            { id: "flec_1", Title: "Polity Complete Revision Class", file_link: "dQw4w9WgXcQ", thumbnail: "https://placehold.co/600x320/0f172a/38bdf8?text=Free+Class" }
        ]
    },
    quizQuestions: [
        { q: "भारतीय संविधान में मौलिक कर्तव्य किस देश से लिए गए हैं?", opts: ["अमेरिका", "रूस (USSR)", "ब्रिटेन", "आयरलैंड"], ans: 1 },
        { q: "सिंधु घाटी सभ्यता का बंदरगाह नगर कौन सा था?", opts: ["कालीबंगा", "लोथल", "रोपड़", "बनावली"], ans: 1 },
        { q: "पंचायती राज व्यवस्था का शुभारंभ भारत में कहाँ हुआ?", opts: ["नागौर (राजस्थान)", "सूरत (गुजरात)", "पटना (बिहार)", "झाँसी (UP)"], ans: 0 }
    ],
    comments: [{ user: "RWA System", text: "Welcome! Aap yahan class ke important timestamps aur notes likh sakte hain." }]
};

let state = {
    currentSlide: "slideHome",
    previousSlide: "slideHome",
    cat: "paid",
    view: "batches",
    courseId: "571",
    courseName: "SSC GD भर्ती 2027",
    activeTokenObj: TOKENS[0],
    courseTokenMap: {},
    subjectId: null,
    subjectName: "",
    topicId: null,
    topicName: "",
    mediaMap: {},
    activeKey: null,
    currentPdfUrl: "",
    quizScore: 0
};

// =====================================================
// SLIDE NAVIGATION ENGINE (Every section opens in a slide)
// =====================================================
function showSlide(slideId) {
    if (state.currentSlide !== slideId) {
        state.previousSlide = state.currentSlide;
    }
    state.currentSlide = slideId;

    ["slideHome", "slideExplorer", "slidePlayer", "slideTokens", "slidePdf"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === slideId) {
            el.classList.remove("hidden-slide");
            el.classList.add("active-slide");
        } else {
            el.classList.remove("active-slide");
            el.classList.add("hidden-slide");
        }
    });

    const backBtn = document.getElementById("globalBackBtn");
    if (backBtn) {
        if (slideId === "slideHome") backBtn.classList.add("hidden");
        else backBtn.classList.remove("hidden");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function goHomeHub() {
    if (typeof stopPlayer === "function") stopPlayer();
    showSlide("slideHome");
}

function openTokenSlide() {
    renderTokenManagerList();
    showSlide("slideTokens");
}

function openExplorerSlide(cat) {
    state.cat = cat;
    showSlide("slideExplorer");
    if (cat === "paid") renderPaidBatches();
    else renderFreeBatches();
}

function handleGlobalBack() {
    if (state.currentSlide === "slidePdf") {
        closePdfSlide();
        return;
    }
    if (state.currentSlide === "slidePlayer") {
        closePlayerBox();
        return;
    }
    if (state.currentSlide === "slideTokens") {
        goHomeHub();
        return;
    }
    if (state.currentSlide === "slideExplorer") {
        if (state.view === "lectures") {
            if (state.cat === "paid") openPaidTopics(state.subjectId, state.subjectName);
            else openFreeTopics(state.subjectId, state.subjectName);
        } else if (state.view === "topics") {
            if (state.cat === "paid") openPaidCourse(state.courseId, state.courseName);
            else openFreeCourse(state.courseId, state.courseName);
        } else if (state.view === "subjects") {
            if (state.cat === "paid") renderPaidBatches();
            else renderFreeBatches();
        } else {
            goHomeHub();
        }
    }
}

// =====================================================
// API CALLER WITH SPECIFIC TOKEN SUPPORT
// =====================================================
async function fetchAPIWithToken(endpoint, tokenObj, fallbackGetter) {
    const statusBadge = document.getElementById("apiStatus");
    const useTok = tokenObj || state.activeTokenObj || TOKENS[0];
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                "Client-Service": "Appx",
                "Auth-Key": "appxapi",
                "source": "website",
                "Authorization": useTok.token,
                "User-ID": useTok.userId || "4756316"
            }
        });
        const json = await res.json();
        if (json && json.data && (Array.isArray(json.data) ? json.data.length > 0 : Object.keys(json.data).length > 0)) {
            if (statusBadge) statusBadge.textContent = `● Connected (${TOKENS.length} Token${TOKENS.length > 1 ? 's' : ''})`;
            return json.data;
        }
        throw new Error("Empty");
    } catch {
        if (statusBadge) statusBadge.textContent = "● Smart Hybrid Mode";
        return fallbackGetter ? fallbackGetter() : [];
    }
}

// =====================================================
// MULTI-TOKEN PAID BATCHES AGGREGATOR
// =====================================================
async function renderPaidBatches() {
    state.view = "batches";
    document.getElementById("subTabs").classList.add("hidden");
    document.getElementById("crumbText").textContent = `All Tokens Merged (${TOKENS.length})`;
    document.getElementById("headingText").textContent = "🎓 Purchased Paid Batches";

    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-12 text-center font-bold text-slate-700">🔄 Fetching Paid Batches from ${TOKENS.length} saved token(s)...</div>`;

    let mergedCourses = [];
    const seenIds = new Set();

    // Loop through every added token and fetch its purchased courses
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

    if (mergedCourses.length === 0) {
        DB.paidCourses.forEach(c => {
            state.courseTokenMap[c.id] = TOKENS[0];
            mergedCourses.push({ ...c, _tokenLabel: TOKENS[0].label });
        });
    }

    grid.innerHTML = "";
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
                            <span class="text-[10px] font-bold text-sky-700 truncate">🔑 ${c._tokenLabel || "Saved Token"}</span>
                        </div>
                        <h3 class="font-black text-base text-slate-900 mt-2">${c.course_name}</h3>
                    </div>
                </div>
                <div class="px-4 pb-4">
                    <div class="btn-watch w-full text-center text-xs">Open Batch Subjects ➔</div>
                </div>
            </div>`;
    });
}

// Free Batches Renderer
async function renderFreeBatches() {
    state.view = "batches";
    document.getElementById("subTabs").classList.add("hidden");
    document.getElementById("crumbText").textContent = "Free Portal";
    document.getElementById("headingText").textContent = "🆓 RWA Free Batches";

    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-10 text-center font-bold text-slate-700">Loading Free Batches...</div>`;

    const freeData = await fetchAPIWithToken(`/get/courselist?start=-1`, TOKENS[0], () => DB.freeBatches);
    const list = (Array.isArray(freeData) && freeData.length > 0) ? freeData : DB.freeBatches;

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
                    <div class="btn-pdf1 w-full text-center text-xs mt-3">Open Free Classes ➔</div>
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

async function openFreeCourse(id, name) {
    state.courseId = id;
    state.courseName = name;
    state.view = "subjects";
    document.getElementById("subTabs").classList.add("hidden");
    document.getElementById("crumbText").textContent = "Free Batch";
    document.getElementById("headingText").textContent = name;

    const subs = await fetchAPIWithToken(`/get/allsubjectfrmlivecourseclass?courseid=${id}&start=-1`, TOKENS[0], () => DB.freeSubjects);
    const grid = document.getElementById("mainGrid");
    grid.innerHTML = "";
    (subs.length ? subs : DB.freeSubjects).forEach(s => {
        const sname = (s.subject_name || "Free Subject").replace(/'/g, "");
        grid.innerHTML += `
            <div onclick="openFreeTopics('${s.subjectid}', '${sname}')" class="grid-card p-5 flex items-center justify-between cursor-pointer">
                <div>
                    <span class="text-[10px] font-extrabold text-teal-700 uppercase">Free Subject</span>
                    <h4 class="font-black text-base text-slate-900 mt-0.5">📘 ${s.subject_name}</h4>
                </div>
                <span class="btn-pdf1 text-xs">Topics ➔</span>
            </div>`;
    });
}

async function openFreeTopics(subId, subName) {
    state.view = "topics";
    state.subjectId = subId;
    state.subjectName = subName;
    document.getElementById("headingText").textContent = subName;
    const topics = DB.freeTopics[subId] || [{ topicid: "ftop_1", topic_name: "All Classes" }];
    const grid = document.getElementById("mainGrid");
    grid.innerHTML = "";
    topics.forEach(t => {
        grid.innerHTML += `
            <div onclick="openFreeLectures('${t.topicid}', '${t.topic_name}')" class="grid-card p-5 flex justify-between items-center cursor-pointer">
                <h4 class="font-black text-base text-slate-900">📂 ${t.topic_name}</h4>
                <span class="btn-watch text-xs">Watch Classes ➔</span>
            </div>`;
    });
}

function openFreeLectures(topId, topName) {
    state.view = "lectures";
    state.topicId = topId;
    state.topicName = topName;
    document.getElementById("headingText").textContent = topName;
    const list = DB.freeLectures[topId] || [];
    document.getElementById("mainGrid").innerHTML = "";
    renderLectureList(list);
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
        const subs = await fetchAPIWithToken(`/get/allsubjectfrmlivecourseclass?courseid=${state.courseId}&start=-1`, state.activeTokenObj, () => DB.paidSubjects);
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
        const res = await fetchAPIWithToken(`/get/live_upcoming_course_classv2?courseid=${state.courseId}&start=-1`, state.activeTokenObj, () => ({ upcoming: [] }));
        const list = Array.isArray(res) ? res : (res.upcoming || res.live || []);
        grid.innerHTML = "";
        renderLectureList(list);
    } else if (tab === "tests") {
        grid.innerHTML = `
            <div class="col-span-full sky-card p-8 text-center">
                <h3 class="text-xl font-black text-slate-900">📝 Interactive Mock Test Ready</h3>
                <p class="text-xs text-slate-600 mt-1 mb-4">Apni taiyari check karne ke liye abhi test start karein.</p>
                <button onclick="openTestModal()" class="btn-watch text-xs px-6 py-3">Start Mock Test Now ➔</button>
            </div>`;
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

    const topics = await fetchAPIWithToken(`/get/alltopicfrmlivecourseclass?courseid=${state.courseId}&subjectid=${subId}&start=-1`, state.activeTokenObj, () => DB.paidTopics[subId] || []);
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
        () => DB.paidLectures[topId] || []
    );
    document.getElementById("mainGrid").innerHTML = "";
    renderLectureList(classes);
}

// =====================================================
// MASTER LINK & MULTI-QUALITY EXTRACTOR (240p/360p/480p/720p)
// =====================================================
function extractQualitiesFromItem(item) {
    const qMap = {};

    function addValidLink(qualityName, rawEncPath) {
        let u = decryptAppX(rawEncPath);
        if (u && u.startsWith("http")) {
            if (u.includes("playlist_eof.m3u8")) return;
            if (u.includes(".m3u8") && !u.includes("workers.dev")) {
                u = WORKER_PROXY + encodeURIComponent(u);
            }
            qMap[qualityName] = u;
        }
    }

    (item.encrypted_links || []).forEach(q => {
        addValidLink((q.quality || "720p"), q.path);
    });

    (item.livestream_links || []).forEach(q => {
        addValidLink(q.quality || "Live HD", q.path);
    });

    (item.download_links || []).forEach(q => {
        addValidLink((q.quality || "480p"), q.path);
    });

    const decFile = decryptAppX(item.file_link || "");
    if (decFile) {
        if (decFile.startsWith("http") && !decFile.includes("playlist_eof.m3u8")) {
            let finalU = decFile.includes(".m3u8") && !decFile.includes("workers.dev") ? WORKER_PROXY + encodeURIComponent(decFile) : decFile;
            if (!Object.values(qMap).includes(finalU)) {
                qMap["720p HD"] = finalU;
            }
        } else if (!decFile.startsWith("http") && decFile.length >= 10 && decFile.length <= 15) {
            qMap["YouTube HD"] = decFile;
        }
    }

    return qMap;
}

function renderLectureList(list) {
    const grid = document.getElementById("mainGrid");
    if (!list || !list.length) {
        grid.innerHTML = `<div class="col-span-full sky-card p-10 text-center font-bold text-slate-600">Is folder mein abhi koi class nahi hai.</div>`;
        return;
    }

    list.forEach((item, i) => {
        const key = `lec_${item.id || i}`;
        const qMap = extractQualitiesFromItem(item);
        const pdf1 = resolvePdfUrl(item.pdf_link || item.ypdf_link, item.ypdf_link2);
        const pdf2 = resolvePdfUrl(item.pdf_link2, item.ypdf_link2);

        state.mediaMap[key] = {
            id: item.id,
            title: item.Title || "Class Lecture",
            qualities: qMap,
            pdf1: pdf1,
            pdf2: pdf2
        };

        grid.innerHTML += `
            <div class="grid-card overflow-hidden flex flex-col justify-between">
                <div>
                    ${item.thumbnail ? `<img src="${item.thumbnail}" onerror="this.style.display='none'" class="w-full h-44 object-cover">` : ""}
                    <div class="p-4">
                        <span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">CLASS #${item.id || (i + 1)}</span>
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

// =====================================================
// DEDICATED PLAYER SLIDE LAUNCHER (With Linked PDFs)
// =====================================================
async function playClassInRwaPlayer(key) {
    state.activeKey = key;
    const info = state.mediaMap[key];
    if (!info) return;

    // Open Player in its own Dedicated Slide
    showSlide("slidePlayer");
    document.getElementById("playingTitle").textContent = "▶ " + info.title;

    // Bind PDF 1 & PDF 2 buttons inside the Player to the exact same lecture PDFs
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

    // Fetch fresh multi-quality links (720p, 480p, 360p, 240p) from API
    if (state.cat === "paid" && info.id) {
        const fresh = await fetchAPIWithToken(
            `/get/fetchVideoDetailsById?course_id=${state.courseId}&video_id=${info.id}&ytflag=0&folder_wise_course=0&lc_app_api_url=`,
            state.activeTokenObj,
            () => null
        );
        if (fresh && typeof fresh === "object") {
            const freshMap = extractQualitiesFromItem(fresh);
            info.qualities = { ...freshMap, ...info.qualities };

            // Also update PDFs if returned in fresh details
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
        const bestKey = validKeys.find(k => k.includes("720") || k.includes("Master") || k.includes("HD")) || validKeys[0];
        urlInput.value = info.qualities[bestKey];
        if (typeof start === "function") start();
    }
}

// Triggered when user clicks PDF 1 or PDF 2 inside the video player
window.openActivePlayerPdf = function(num) {
    if (!state.activeKey) return;
    openPdf(state.activeKey, num);
};

function changeLectureQuality(qLabel, resumeTime = 0) {
    const info = state.mediaMap[state.activeKey];
    if (info && info.qualities[qLabel]) {
        document.getElementById("url").value = info.qualities[qLabel];
        if (typeof start === "function") start();
        if (resumeTime > 0) {
            const vid = document.getElementById("video");
            const restore = () => {
                vid.currentTime = resumeTime;
                vid.removeEventListener("loadedmetadata", restore);
            };
            vid.addEventListener("loadedmetadata", restore);
        }
    }
}

// =====================================================
// DEDICATED PDF SLIDE VIEWER
// =====================================================
function openPdf(key, num) {
    const info = state.mediaMap[key];
    if (!info) return;
    const u = num === 2 ? info.pdf2 : info.pdf1;
    if (!u) return;

    // Pause video if playing
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

// =====================================================
// MULTI-TOKEN MANAGER LOGIC
// =====================================================
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
                        <span class="text-xs text-slate-500 font-bold">(UID: ${t.userId || "Auto"})</span>
                    </div>
                    <p class="text-[11px] font-mono text-slate-500 mt-1 truncate">${shortTok}</p>
                </div>
                <div class="flex items-center gap-2">
                    ${TOKENS.length > 1 ? `<button onclick="deleteToken('${t.id}')" class="btn-nav bg-rose-600 text-white border-0 text-xs">🗑 Delete</button>` : `<span class="text-[11px] font-bold text-emerald-600">● Default Active</span>`}
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
}

function deleteToken(id) {
    if (TOKENS.length <= 1) return;
    TOKENS = TOKENS.filter(t => t.id !== id);
    localStorage.setItem("rwa_tokens_list", JSON.stringify(TOKENS));
    renderTokenManagerList();
}

// =====================================================
// SEARCH, COMMENTS & MOCK TEST UTILITIES
// =====================================================
function filterGrid() {
    const q = document.getElementById("searchBox").value.toLowerCase();
    document.querySelectorAll("#mainGrid .grid-card").forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(q) ? "" : "none";
    });
}

function renderComments() {
    const list = document.getElementById("commentList");
    const count = document.getElementById("commentCount");
    if (!list || !count) return;
    count.textContent = DB.comments.length;
    list.innerHTML = DB.comments.map(c => `
        <div class="bg-slate-800/90 border border-slate-700 rounded-xl p-2.5">
            <span class="font-extrabold text-sky-400 text-[11px]">${c.user}:</span>
            <p class="text-slate-200 mt-0.5">${c.text}</p>
        </div>
    `).join("");
}

function postComment() {
    const inp = document.getElementById("commentInput");
    if (!inp || !inp.value.trim()) return;
    DB.comments.push({ user: "Student", text: inp.value.trim() });
    inp.value = "";
    renderComments();
}

function toggleModal(id) {
    document.getElementById(id).classList.toggle("hidden");
}

function openTestModal() {
    renderQuiz();
    document.getElementById("testModal").classList.remove("hidden");
}

function renderQuiz() {
    state.quizScore = 0;
    document.getElementById("quizScoreText").textContent = `Score: 0 / ${DB.quizQuestions.length}`;
    const box = document.getElementById("quizContainer");
    box.innerHTML = DB.quizQuestions.map((item, qIdx) => `
        <div class="bg-sky-50 border border-sky-200 rounded-2xl p-4">
            <p class="font-extrabold text-sm text-slate-900 mb-2.5">Q${qIdx + 1}. ${item.q}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${item.opts.map((opt, oIdx) => `
                    <button onclick="checkQuizAns(this, ${qIdx},${oIdx})" class="text-left bg-white border border-sky-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 hover:bg-sky-100">${opt}</button>
                `).join("")}
            </div>
        </div>
    `).join("");
}

window.checkQuizAns = function(btn, qIdx, oIdx) {
    const parent = btn.parentElement;
    if (parent.dataset.answered) return;
    parent.dataset.answered = "true";
    const correct = DB.quizQuestions[qIdx].ans;
    if (oIdx === correct) {
        btn.style.background = "#10b981";
        btn.style.color = "#fff";
        state.quizScore++;
    } else {
        btn.style.background = "#f43f5e";
        btn.style.color = "#fff";
    }
    document.getElementById("quizScoreText").textContent = `Score: ${state.quizScore} / ${DB.quizQuestions.length}`;
};

// Initialize Portal on Home Hub Slide
updateTokenBadge();
renderComments();
showSlide("slideHome");
