// =========================================================
// RWA PORTAL LOGIC & MASTER LINK EXTRACTOR (app.js)
// =========================================================
const DEFAULT_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjQ3NTYzMTYiLCJ0aW1lc3RhbXAiOjE3OTE5Nzc2MTIsIml2X3ZlciI6MzMsInNlc3Npb24iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKcFpDSTZJalEzTlRZek1UWWlMQ0psYldGcGJDSTZJbk5oYm1SbFpYQnJZWE4zWVc0eU5UUkFaMjFoYVd3dVkyOXRJaXdpYm1GdFpTSTZJbk5oYm1SbFpYQWlMQ0owWlc1aGJuUlVlWEJsSWpvaWRYTmxjaUlzSW5SbGJtRnVkRTVoYldVaU9pSnliM3BuWVhKZlpHSWlMQ0owWlc1aGJuUkpaQ0k2SWlJc0ltUnBjM0J2YzJGaWJHVWlPbVpoYkhObGZRLjNLTWRpUHRjZ3BpYkMyMWhPNTlrVFRreTJkdlk0d19YR0F3UnE4N3o4aE0ifQ.LN3ukePscrf6LVISc9oJcyRh4V5sipHnTVUBvRcwRHk";

let CFG = {
    api: "https://rozgarapinew.teachx.in",
    userId: localStorage.getItem("rwa_uid") || "4756316",
    token: localStorage.getItem("rwa_tok") || DEFAULT_TOKEN
};

const AES_KEY = CryptoJS.enc.Utf8.parse("638udh3829162018");
const WORKER_PROXY = "http://127.0.0.1:8080/proxy?url=";

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

const DB = {
    paidCourses: [
        { id: "571", course_name: "SSC GD भर्ती 2027 (वीर बैच)**", exam_category: "RWA SSC EXAMS • PAID", exam_logo: "https://appx-wsb-gcp-mcdn.akamai.net.in/exam/2022-02-07-0.9839972577217094.png" }
    ],
    paidSubjects: [
        { subjectid: "3610", subject_name: "History (वीर बैच)", subject_logo: "" },
        { subjectid: "1", subject_name: "Maths", subject_logo: "https://appxcontent.kaxa.in/subject/2024-04-10-0.8626713728066564.jpg" },
        { subjectid: "3527", subject_name: "Physics Dharmendra Sir", subject_logo: "" }
    ],
    paidTopics: {
        "3610": [{ topicid: "42301", topic_name: "सिंधु सभ्यता##" }]
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
    freeBatches: [], freeSubjects: [], freeTopics: {}, freeLectures: {}, quizQuestions: [],
    comments: [{ user: "System", text: "Portal initialized successfully." }]
};

let state = {
    cat: "paid", view: "batches", courseId: "571", courseName: "SSC GD भर्ती 2027",
    subjectId: null, subjectName: "", topicId: null, topicName: "",
    mediaMap: {}, activeKey: null, currentPdfUrl: "", quizScore: 0
};

async function fetchAPI(endpoint, fallbackGetter) {
    const statusBadge = document.getElementById("apiStatus");
    try {
        const res = await fetch(`${CFG.api}${endpoint}`, {
            headers: {
                "Client-Service": "Appx",
                "Auth-Key": "appxapi",
                "source": "website",
                "Authorization": CFG.token,
                "User-ID": CFG.userId
            }
        });
        const json = await res.json();
        if (json && json.data && (Array.isArray(json.data) ? json.data.length > 0 : Object.keys(json.data).length > 0)) {
            statusBadge.textContent = "● Live Server Connected";
            return json.data;
        }
        throw new Error("Empty");
    } catch {
        statusBadge.textContent = "● Hybrid Mode Active";
        return fallbackGetter();
    }
}

function switchCategory(cat) {
    state.cat = cat;
    document.getElementById("backBtn").classList.add("hidden");
    document.getElementById("subTabs").classList.add("hidden");
    document.getElementById("btnPaid").className = cat === "paid" ? "primary text-xs" : "text-xs";
    document.getElementById("btnFree").className = cat === "free" ? "primary text-xs" : "text-xs";

    if (cat === "paid") renderPaidBatches();
    else renderFreeBatches();
}

async function renderPaidBatches() {
    state.view = "batches";
    document.getElementById("crumbText").textContent = "Purchased Courses";
    document.getElementById("headingText").textContent = "My Paid Batches";
    const list = await fetchAPI(`/get/course_by_id?id=571`, () => DB.paidCourses);
    const grid = document.getElementById("mainGrid");
    grid.innerHTML = "";

    (Array.isArray(list) ? list : DB.paidCourses).forEach(c => {
        grid.innerHTML += `
            <div onclick="openPaidCourse('${c.id}', '${(c.course_name || "").replace(/'/g, "")}')" class="grid-card overflow-hidden cursor-pointer flex flex-col justify-between">
                <img src="${c.exam_logo}" onerror="this.src='https://placehold.co/600x320/101620/4777ff?text=RWA+Batch'" class="w-full h-44 object-cover">
                <div class="p-4">
                    <span class="text-[10px] text-emerald-400 font-bold">BATCH #${c.id}</span>
                    <h3 class="font-bold text-base mt-1">${c.course_name}</h3>
                    <p class="text-xs text-amber-400 mt-2 font-bold">Open Subjects & Classes ➔</p>
                </div>
            </div>`;
    });
}

function openPaidCourse(id, name) {
    state.courseId = id;
    state.courseName = name;
    document.getElementById("backBtn").classList.remove("hidden");
    document.getElementById("subTabs").classList.remove("hidden");
    document.getElementById("crumbText").textContent = `Batch #${id}`;
    document.getElementById("headingText").textContent = name;
    loadCourseTab("subjects");
}

async function loadCourseTab(tab) {
    ["subjects", "live", "tests", "telegram"].forEach(t => {
        document.getElementById("sub_" + t).className = (t === tab) ? "primary text-xs" : "text-xs";
    });
    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-8 text-center text-slate-400 text-xs">Loading...</div>`;

    if (tab === "subjects") {
        state.view = "subjects";
        const subs = await fetchAPI(`/get/allsubjectfrmlivecourseclass?courseid=${state.courseId}&start=-1`, () => DB.paidSubjects);
        grid.innerHTML = "";
        subs.forEach(s => {
            const name = s.subject_name || s.subjectname;
            const logo = s.subject_logo || `https://placehold.co/80x80/101620/4777ff?text=${encodeURIComponent(name.slice(0, 3))}`;
            grid.innerHTML += `
                <div onclick="openPaidTopics('${s.subjectid}', '${name.replace(/'/g, "")}')" class="grid-card p-4 flex items-center gap-3.5 cursor-pointer">
                    <img src="${logo}" onerror="this.src='https://placehold.co/80x80/101620/4777ff?text=SUB'" class="w-14 h-14 rounded-xl object-cover">
                    <div>
                        <span class="text-[10px] text-slate-400">Subject #${s.subjectid}</span>
                        <h4 class="font-bold text-sm sm:text-base">${name}</h4>
                        <p class="text-xs text-amber-400 mt-0.5">Open Topics ➔</p>
                    </div>
                </div>`;
        });
    } else if (tab === "live") {
        const res = await fetchAPI(`/get/live_upcoming_course_classv2?courseid=${state.courseId}&start=-1`, () => ({ upcoming: [] }));
        const list = Array.isArray(res) ? res : (res.upcoming || res.live || []);
        grid.innerHTML = "";
        renderLectureList(list);
    } else if (tab === "tests") {
        grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400">Click 'Mock Test' on top navbar.</div>`;
    } else if (tab === "telegram") {
        grid.innerHTML = `
            <div class="grid-card p-5 flex justify-between items-center">
                <div><h4 class="font-bold text-base">RWA Doubt Group</h4></div>
                <a href="https://t.me/+ACPxjpf6oKQxM2U1" target="_blank" class="primary px-4 py-2 rounded-lg text-xs no-underline">Join ➔</a>
            </div>`;
    }
}

async function openPaidTopics(subId, subName) {
    state.view = "topics";
    state.subjectId = subId;
    state.subjectName = subName;
    document.getElementById("subTabs").classList.add("hidden");
    document.getElementById("headingText").textContent = subName;

    const topics = await fetchAPI(`/get/alltopicfrmlivecourseclass?courseid=${state.courseId}&subjectid=${subId}&start=-1`, () => DB.paidTopics[subId] || []);
    const grid = document.getElementById("mainGrid");
    grid.innerHTML = "";

    topics.forEach(t => {
        const name = t.topic_name || t.topicname;
        grid.innerHTML += `
            <div onclick="openPaidLectures('${t.topicid}', '${name.replace(/'/g, "")}')" class="grid-card p-5 flex justify-between items-center cursor-pointer">
                <div><h4 class="font-bold text-base mt-0.5">📂 ${name}</h4></div>
                <span class="text-xs text-amber-400 font-bold">Classes ➔</span>
            </div>`;
    });
}

async function openPaidLectures(topId, topName) {
    state.view = "lectures";
    state.topicId = topId;
    state.topicName = topName;
    document.getElementById("headingText").textContent = topName;

    const classes = await fetchAPI(
        `/get/livecourseclassbycoursesubtopconceptapiv3?courseid=${state.courseId}&subjectid=${state.subjectId}&topicid=${topId}&conceptid=1&start=0`,
        () => DB.paidLectures[topId] || []
    );
    document.getElementById("mainGrid").innerHTML = "";
    renderLectureList(classes);
}

// =====================================================
// MASTER LINK EXTRACTOR (Prioritizes transcoded-videos .m3u8)
// =====================================================
function extractQualitiesFromItem(item) {
    const qMap = {};

    // Helper to prioritize and clean links (Avoid vodclasses eof.m3u8 dummy links)
    function addValidLink(qualityName, rawEncPath) {
        let u = decryptAppX(rawEncPath);
        if (u && u.startsWith("http")) {
            // Filter out dummy/empty eof playlists
            if (u.includes("playlist_eof.m3u8")) return;
            // Prioritize transcoded-videos master m3u8
            if (u.includes(".m3u8") && !u.includes("workers.dev")) {
                u = WORKER_PROXY + encodeURIComponent(u);
            }
            qMap[qualityName] = u;
        }
    }

    // 1. Check encrypted_links (These contain the real 720p/480p transcoded master links with edge-cache-token)[span_1](start_span)[span_1](end_span)
    (item.encrypted_links || []).forEach(q => {
        addValidLink((q.quality || "HD") + " Master HLS", q.path);
    });

    // 2. Check livestream_links
    (item.livestream_links || []).forEach(q => {
        addValidLink(q.quality || "Live HLS", q.path);
    });

    // 3. Check download_links
    (item.download_links || []).forEach(q => {
        addValidLink((q.quality || "MP4") + " Direct", q.path);
    });

    // 4. Fallback to main file_link only if no other master link exists
    const decFile = decryptAppX(item.file_link || "");
    if (decFile && decFile.startsWith("http") && !decFile.includes("playlist_eof.m3u8")) {
        let finalU = decFile.includes(".m3u8") && !decFile.includes("workers.dev") ? WORKER_PROXY + encodeURIComponent(decFile) : decFile;
        if (!Object.values(qMap).includes(finalU)) {
            qMap["Main Stream"] = finalU;
        }
    }

    return qMap;
}

function renderLectureList(list) {
    const grid = document.getElementById("mainGrid");
    if (!list || !list.length) {
        grid.innerHTML = `<div class="col-span-full py-10 text-center text-slate-400">No classes found.</div>`;
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
                    ${item.thumbnail ? `<img src="${item.thumbnail}" onerror="this.style.display='none'" class="w-full h-40 object-cover">` : ""}
                    <div class="p-4">
                        <span class="text-[10px] text-amber-400 font-bold">CLASS #${item.id || ""}</span>
                        <h4 class="font-bold text-base mt-1">${item.Title}</h4>
                    </div>
                </div>
                <div class="p-3.5 border-t border-[#273142] flex flex-wrap gap-2">
                    <button onclick="playClassInRwaPlayer('${key}')" class="primary flex-1 text-xs">▶ Watch</button>
                    ${pdf1 ? `<button onclick="openPdf('${key}', 1)" class="text-xs">📄 PDF</button>` : ""}
                </div>
            </div>`;
    });
}

// 100% Guaranteed Master Link Delivery to Player
async function playClassInRwaPlayer(key) {
    state.activeKey = key;
    const info = state.mediaMap[key];
    if (!info) return;

    document.getElementById("playerSection").classList.remove("hidden");
    document.getElementById("playingTitle").textContent = "▶ " + info.title;
    window.scrollTo({ top: 0, behavior: "smooth" });

    const urlInput = document.getElementById("url");
    const qSel = document.getElementById("qualitySelect");
    
    urlInput.value = "Fetching original master links from server...";

    // Fetch fresh secure streams from server API
    if (state.cat === "paid" && info.id) {
        const fresh = await fetchAPI(`/get/fetchVideoDetailsById?course_id=${state.courseId}&video_id=${info.id}&ytflag=0&folder_wise_course=0&lc_app_api_url=`, () => null);
        if (fresh && typeof fresh === "object") {
            const freshMap = extractQualitiesFromItem(fresh);
            info.qualities = { ...freshMap, ...info.qualities };
        }
    }

    const validKeys = Object.keys(info.qualities).filter(k => {
        const u = info.qualities[k];
        return u && u.startsWith("http") && !u.includes("playlist_eof.m3u8");
    });

    if (validKeys.length > 0) {
        qSel.innerHTML = validKeys.map(k => `<option value="${k}">${k}</option>`).join("");
        qSel.classList.remove("hidden");
        
        // Prioritize 720p Master or HLS Master
        const bestKey = validKeys.find(k => k.includes("720p") || k.includes("Master")) || validKeys[0];
        qSel.value = bestKey;
        urlInput.value = info.qualities[bestKey];
        
        if (typeof start === "function") start();
    } else {
        qSel.classList.add("hidden");
        urlInput.value = "";
        document.getElementById("status").textContent = "Error";
        document.getElementById("msg").textContent = "⚠️ Original Master link nahi mila. Token check karein.";
        document.getElementById("msg").style.color = "#ff9696";
    }
}

function changeLectureQuality(qLabel) {
    const info = state.mediaMap[state.activeKey];
    if (info && info.qualities[qLabel]) {
        document.getElementById("url").value = info.qualities[qLabel];
        if (typeof start === "function") start();
    }
}

// PDF & Utility Functions
function openPdf(key, num) {
    const info = state.mediaMap[key];
    const u = num === 2 ? info.pdf2 : info.pdf1;
    if (!u) return;

    state.currentPdfUrl = u;
    document.getElementById("pdfTitle").textContent = `📄 ${info.title}`;
    document.getElementById("rawPdfLink").href = u;
    document.getElementById("pdfBox").classList.remove("hidden");
    setPdfMode("appx");
    document.getElementById("pdfBox").scrollIntoView({ behavior: "smooth" });
}

function setPdfMode(mode) {
    const frame = document.getElementById("pdfFrame");
    const u = state.currentPdfUrl;
    if (mode === "appx") {
        frame.src = `https://pdfweb.classx.co.in/pdfjs-latest/web/viewer.html?file=${encodeURIComponent(u)}&save_flag=1&is_encrypted=0`;
    } else {
        frame.src = `https://docs.google.com/viewer?url=${encodeURIComponent(u)}&embedded=true`;
    }
}

function closePdfBox() {
    document.getElementById("pdfFrame").src = "";
    document.getElementById("pdfBox").classList.add("hidden");
}

function goBack() {
    if (state.cat === "paid") {
        if (state.view === "lectures") openPaidTopics(state.subjectId, state.subjectName);
        else if (state.view === "topics") openPaidCourse(state.courseId, state.courseName);
        else renderPaidBatches();
    } else {
        if (state.view === "lectures") openFreeTopics(state.subjectId, state.subjectName);
        else if (state.view === "topics") openFreeSubjects(state.courseId, state.courseName);
        else renderFreeBatches();
    }
}

function filterGrid() {
    const q = document.getElementById("searchBox").value.toLowerCase();
    document.querySelectorAll(".grid-card").forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(q) ? "" : "none";
    });
}

function toggleModal(id) {
    if (id === "tokenModal") {
        document.getElementById("cfgUserId").value = CFG.userId;
        document.getElementById("cfgToken").value = CFG.token;
    }
    document.getElementById(id).classList.toggle("hidden");
}

function saveConfig() {
    CFG.userId = document.getElementById("cfgUserId").value.trim();
    CFG.token = document.getElementById("cfgToken").value.trim();
    localStorage.setItem("rwa_uid", CFG.userId);
    localStorage.setItem("rwa_tok", CFG.token);
    toggleModal("tokenModal");
    switchCategory(state.cat);
}

function openTestModal() { document.getElementById("testModal").classList.remove("hidden"); }

switchCategory("paid");
