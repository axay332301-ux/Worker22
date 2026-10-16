/* =========================================================
   RWA SKY PRO PORTAL — MAIN APPLICATION ENGINE (app.js)
   Features:
   - Multi-Token Pool Manager & Course Merger
   - Paid & Free Batches, Subjects, Topics & Lectures Explorer
   - Inline PDF & Standalone PDF Viewers (AppX / Google Docs)
   - Official Paid & Free CBT Test Series, Exam Timer, Scoring & Solutions
   ========================================================= */

// Multi-Token Pool Storage Key
const LS_TOKEN_POOL_KEY = "rwa_sky_token_pool_v1";

// Default Token Pool (Includes default sandeep token)
let tokenPool = [
    {
        id: "tok_default",
        label: "Default Account (sandeep #4756316)",
        uid: "4756316",
        token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjQ3NTYzMTYiLCJlbWFpbCI6InNhbmRlZXBrYXN3YW4yNTRAZ21haWwuY29tIiwidGltZXN0YW1wIjoxNzU5MDE1MDc1fQ.1X6N7pX9qV3mK2wL8zR5yT4vB0nJ6cH8gF2dA4sE1uI"
    }
];

// Current Explorer State
let currentExplorerMode = "paid"; // "paid" | "free" | "paid_ts" | "free_ts"
let activeBatchData     = null;
let activeSubjectData   = null;
let activeTopicData     = null;

// CBT Test Series State
let currentTestObj      = null;
let cbtQuestionsList    = [];
let cbtUserAnswers      = {}; // qIndex -> optionIndex
let cbtVisitedState     = {}; // qIndex -> boolean
let cbtCurrentQIdx      = 0;
let cbtTimerSeconds     = 3600;
let cbtTimerInterval    = null;
let cbtIsSubmitted      = false;

/* =========================================================
   1. NAVIGATION & SLIDE SWITCHER
   ========================================================= */
function showOnlySlide(slideId) {
    const slides = [
        "slideHome", "slideExplorer", "slidePlayer", 
        "slideTestAttempt", "slideTokens", "slidePdf", 
        "slideProfile", "slideLogin"
    ];

    slides.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === slideId) {
            el.classList.remove("hidden-slide");
            el.classList.add("active-slide");
        } else {
            el.classList.add("hidden-slide");
            el.classList.remove("active-slide");
        }
    });

    // Auto scroll top
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function goHomeHub() {
    if (typeof stopHlsVideo === "function") stopHlsVideo();
    showOnlySlide("slideHome");
    const navNav = document.getElementById("topHeaderNav");
    if (navNav) navNav.classList.remove("hidden");
}

function handleGlobalBack() {
    goHomeHub();
}

/* =========================================================
   2. MULTI-TOKEN POOL MANAGER
   ========================================================= */
function initTokenPool() {
    try {
        const saved = JSON.parse(localStorage.getItem(LS_TOKEN_POOL_KEY));
        if (Array.isArray(saved) && saved.length > 0) {
            tokenPool = saved;
        }
    } catch (e) {}
    updateTokenCountBadge();
    renderTokenListUI();
}

function saveTokenPool() {
    localStorage.setItem(LS_TOKEN_POOL_KEY, JSON.stringify(tokenPool));
    updateTokenCountBadge();
    renderTokenListUI();
}

function updateTokenCountBadge() {
    const badge = document.getElementById("tokCountBadge");
    if (badge) badge.textContent = String(tokenPool.length);
}

function ensureUserTokenInPool(userObj) {
    if (!userObj || !userObj.token) return;
    const exists = tokenPool.some(t => t.uid === userObj.uid || t.token === userObj.token);
    if (!exists) {
        tokenPool.push({
            id: "tok_" + Math.random().toString(36).substring(2, 8),
            label: userObj.label || `Account #${userObj.uid}`,
            uid: userObj.uid,
            token: userObj.token
        });
        saveTokenPool();
    }
}

function addNewToken() {
    const label = (document.getElementById("newTokLabel")?.value || "").trim();
    const uid   = (document.getElementById("newTokUid")?.value || "").trim() || "4756316";
    const token = (document.getElementById("newTokValue")?.value || "").trim();

    if (!token) {
        alert("⚠️ Please paste a valid JWT Authorization token!");
        return;
    }

    tokenPool.push({
        id: "tok_" + Math.random().toString(36).substring(2, 8),
        label: label || `Account #${uid}`,
        uid: uid,
        token: token
    });

    saveTokenPool();
    document.getElementById("newTokLabel").value = "";
    document.getElementById("newTokUid").value = "";
    document.getElementById("newTokValue").value = "";
    alert("✅ Token added successfully! Paid batches from all tokens will now be merged.");
}

function deleteToken(id) {
    if (tokenPool.length <= 1) {
        alert("⚠️ You must keep at least 1 token in the pool!");
        return;
    }
    tokenPool = tokenPool.filter(t => t.id !== id);
    saveTokenPool();
}

function renderTokenListUI() {
    const container = document.getElementById("tokenListContainer");
    if (!container) return;
    container.innerHTML = "";

    tokenPool.forEach(t => {
        const div = document.createElement("div");
        div.className = "bg-white border border-sky-200 rounded-2xl p-3.5 flex flex-wrap justify-between items-center gap-3";
        div.innerHTML = `
            <div>
                <div class="font-black text-sm text-slate-900">${t.label}</div>
                <div class="text-[11px] text-slate-500 font-mono mt-0.5">UID: #${t.uid} • Token: ${t.token.substring(0, 20)}...</div>
            </div>
            <button onclick="deleteToken('${t.id}')" class="btn-nav bg-rose-600 text-white border-0 text-xs">🗑️ Remove</button>
        `;
        container.appendChild(div);
    });
}

function openTokenSlide() {
    showOnlySlide("slideTokens");
    renderTokenListUI();
}

/* =========================================================
   3. BATCHES & TEST SERIES EXPLORER
   ========================================================= */
function openExplorerSlide(mode) {
    currentExplorerMode = mode;
    showOnlySlide("slideExplorer");

    const crumb = document.getElementById("crumbText");
    const heading = document.getElementById("headingText");
    const subTabs = document.getElementById("subTabs");

    if (subTabs) subTabs.classList.add("hidden");

    if (mode === "paid") {
        if (crumb) crumb.textContent = "Multi-Token Merged";
        if (heading) heading.textContent = "🎓 Purchased Paid Batches";
        loadPaidBatches();
    } else if (mode === "free") {
        if (crumb) crumb.textContent = "RWA Free Zone";
        if (heading) heading.textContent = "🆓 Free Batches & Marathon Courses";
        loadFreeBatches();
    }
}

function openTestSeriesExplorer(mode) {
    currentExplorerMode = mode;
    showOnlySlide("slideExplorer");

    const crumb = document.getElementById("crumbText");
    const heading = document.getElementById("headingText");
    const subTabs = document.getElementById("subTabs");

    if (subTabs) subTabs.classList.add("hidden");

    if (mode === "paid_ts") {
        if (crumb) crumb.textContent = "Official Series";
        if (heading) heading.textContent = "🏆 Paid Exam Test Series";
        loadTestSeriesList("paid");
    } else if (mode === "free_ts") {
        if (crumb) crumb.textContent = "Weekly Mock Tests";
        if (heading) heading.textContent = "📝 Free Weekly Mock Test Series";
        loadTestSeriesList("free");
    }
}

async function loadPaidBatches() {
    const grid = document.getElementById("mainGrid");
    if (!grid) return;
    grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-600 font-extrabold animate-pulse">⏳ Fetching Paid Batches across all active tokens...</div>`;

    let allBatches = [];

    // Fetch from all tokens in pool
    for (const t of tokenPool) {
        try {
            const res = await fetch(`https://rozgarapinew.teachx.in/get/get_my_course?userid=${t.uid}`, {
                method: "GET",
                headers: {
                    "Client-Service": "Appx",
                    "Auth-Key": "appxapi",
                    "User-ID": t.uid,
                    "Authorization": t.token
                }
            });
            const json = await res.json();
            if (json && json.data && Array.isArray(json.data)) {
                allBatches.push(...json.data);
            }
        } catch (e) {}
    }

    // Fallback Mock Paid Batches if API returns empty
    if (allBatches.length === 0) {
        allBatches = [
            { courseid: "b_101", title: "RWA SSC CGL / CHSL 2026 Foundation Batch", thumbnail: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500", price: "Paid", teacher: "Ankit Bhati & Team" },
            { courseid: "b_102", title: "UP Police Constable Re-Exam Target Batch", thumbnail: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500", price: "Paid", teacher: "RWA Expert Faculty" },
            { courseid: "b_103", title: "Railway NTPC & Group D 2026 Rankers Batch", thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500", price: "Paid", teacher: "Maths & GS Team" }
        ];
    }

    renderBatchCards(allBatches, "paid");
}

async function loadFreeBatches() {
    const grid = document.getElementById("mainGrid");
    if (!grid) return;
    grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-600 font-extrabold animate-pulse">⏳ Loading Free Courses...</div>`;

    const freeBatches = [
        { courseid: "f_201", title: "RWA Free Practice Marathon Series 2026", thumbnail: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=500", price: "Free", teacher: "RWA Top Educators" },
        { courseid: "f_202", title: "Current Affairs Brahmastra Daily Classes", thumbnail: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=500", price: "Free", teacher: "Sonu Kumar Sir" },
        { courseid: "f_203", title: "English & Vocabulary Booster Sessions", thumbnail: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=500", price: "Free", teacher: "English Team" }
    ];

    renderBatchCards(freeBatches, "free");
}

function renderBatchCards(batches, type) {
    const grid = document.getElementById("mainGrid");
    if (!grid) return;
    grid.innerHTML = "";

    batches.forEach(b => {
        const card = document.createElement("div");
        card.className = "sky-card overflow-hidden flex flex-col justify-between cursor-pointer";
        card.onclick = () => openBatchSubjects(b);
        card.innerHTML = `
            <div>
                <div class="relative h-40 bg-sky-200 overflow-hidden">
                    <img src="${b.thumbnail || b.image || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500'}" alt="Course" class="w-full h-full object-cover">
                    <span class="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 text-white font-extrabold text-[10px] uppercase">${b.price || (type === 'paid' ? 'Purchased' : 'Free')}</span>
                </div>
                <div class="p-4">
                    <h3 class="font-black text-base text-slate-900 line-clamp-2">${b.title || b.coursename}</h3>
                    <p class="text-xs text-slate-600 font-semibold mt-1">👨‍🏫 ${b.teacher || b.instructor || 'RWA Expert Faculty'}</p>
                </div>
            </div>
            <div class="p-4 pt-0">
                <button class="w-full btn-watch py-2.5">📖 Open Course Subjects ➔</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

/* =========================================================
   4. COURSE SUBJECTS, TOPICS & LECTURES EXPLORER
   ========================================================= */
async function openBatchSubjects(batchObj) {
    activeBatchData = batchObj;
    const crumb = document.getElementById("crumbText");
    const heading = document.getElementById("headingText");
    const subTabs = document.getElementById("subTabs");

    if (crumb) crumb.textContent = batchObj.title || "Course";
    if (heading) heading.textContent = batchObj.title || "Course Subjects";
    if (subTabs) subTabs.classList.remove("hidden");

    loadCourseTab("subjects");
}

async function loadCourseTab(tabName) {
    document.querySelectorAll(".tab-pill").forEach(el => el.classList.remove("active-pill"));
    const activeTabBtn = document.getElementById(`sub_${tabName}`);
    if (activeTabBtn) activeTabBtn.classList.add("active-pill");

    const grid = document.getElementById("mainGrid");
    if (!grid) return;
    grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-600 font-extrabold animate-pulse">⏳ Loading ${tabName}...</div>`;

    if (tabName === "subjects") {
        // Mock / API Subjects
        const subjects = [
            { subjectid: "sub_1", title: "Mathematics (गणित)", count: "45 Lectures", icon: "📐" },
            { subjectid: "sub_2", title: "Reasoning (तर्कशक्ति)", count: "40 Lectures", icon: "🧠" },
            { subjectid: "sub_3", title: "General Hindi (सामान्य हिंदी)", count: "35 Lectures", icon: "📖" },
            { subjectid: "sub_4", title: "General Knowledge & GS", count: "60 Lectures", icon: "🌍" },
            { subjectid: "sub_5", title: "Current Affairs & UP GK", count: "30 Lectures", icon: "⚡" }
        ];

        grid.innerHTML = "";
        subjects.forEach(s => {
            const card = document.createElement("div");
            card.className = "sky-card p-5 flex items-center justify-between cursor-pointer";
            card.onclick = () => openSubjectTopics(s);
            card.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white text-2xl flex items-center justify-center shadow-md">${s.icon}</div>
                    <div>
                        <h4 class="font-black text-base text-slate-900">${s.title}</h4>
                        <span class="text-xs font-bold text-sky-700">${s.count}</span>
                    </div>
                </div>
                <div class="text-blue-600 font-black text-lg">➔</div>
            `;
            grid.appendChild(card);
        });
    } else if (tabName === "live") {
        grid.innerHTML = `
            <div class="col-span-full sky-card p-6 text-center">
                <div class="text-3xl mb-2">🔴</div>
                <h3 class="font-black text-lg text-slate-900">No Live Classes Right Now</h3>
                <p class="text-xs text-slate-600 mt-1">Upcoming live classes and marathon sessions will appear here as per schedule.</p>
            </div>
        `;
    } else if (tabName === "tests") {
        grid.innerHTML = `
            <div class="col-span-full sky-card p-6 text-center">
                <div class="text-3xl mb-2">📝</div>
                <h3 class="font-black text-lg text-slate-900">Batch Practice Tests</h3>
                <p class="text-xs text-slate-600 mt-1">Chapter-wise tests and quizzes are available in the Official Test Series section.</p>
                <button onclick="openTestSeriesExplorer('paid_ts')" class="mt-3 btn-nav bg-indigo-600 text-white border-0">🏆 Open Paid Test Series</button>
            </div>
        `;
    } else if (tabName === "telegram") {
        grid.innerHTML = `
            <div class="col-span-full sky-card p-6 text-center">
                <div class="text-3xl mb-2">✈️</div>
                <h3 class="font-black text-lg text-slate-900">RWA Official Doubt & Study Group</h3>
                <p class="text-xs text-slate-600 mt-1">Connect with mentors and fellow aspirants for doubt clearing.</p>
                <a href="https://t.me/" target="_blank" class="inline-block mt-3 btn-nav bg-sky-600 text-white border-0 no-underline">Join Telegram Channel ➔</a>
            </div>
        `;
    }
}

async function openSubjectTopics(subjObj) {
    activeSubjectData = subjObj;
    const crumb = document.getElementById("crumbText");
    if (crumb) crumb.textContent = `${activeBatchData?.title || 'Course'} › ${subjObj.title}`;

    const grid = document.getElementById("mainGrid");
    grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-600 font-extrabold animate-pulse">⏳ Loading Lectures & PDFs...</div>`;

    // Mock Lectures list with Video stream URL and PDFs
    const lectures = [
        { 
            id: "lec_1", 
            title: "Lecture 01: Number System & Basic Fundamentals (संख्या पद्धति)", 
            duration: "1h 15m", 
            videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
            pdf1Url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            pdf2Url: ""
        },
        { 
            id: "lec_2", 
            title: "Lecture 02: Simplification & Shortcut Tricks (सरलीकरण)", 
            duration: "1h 05m", 
            videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
            pdf1Url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            pdf2Url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
        },
        { 
            id: "lec_3", 
            title: "Lecture 03: Percentage & Profit Loss (प्रतिशत एवं लाभ-हानि)", 
            duration: "1h 30m", 
            videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
            pdf1Url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            pdf2Url: ""
        }
    ];

    grid.innerHTML = "";
    lectures.forEach((lec, idx) => {
        const card = document.createElement("div");
        card.className = "sky-card p-5 flex flex-col justify-between gap-4";
        card.innerHTML = `
            <div>
                <span class="text-[10px] font-black text-sky-700 uppercase">Lecture ${idx + 1} • ⏱️ ${lec.duration}</span>
                <h4 class="font-black text-base text-slate-900 mt-1">${lec.title}</h4>
            </div>
            <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-sky-200">
                <button onclick="launchLecturePlayer('${lec.videoUrl}', '${lec.title.replace(/'/g, "\\'")}', '${lec.pdf1Url || ''}', '${lec.pdf2Url || ''}')" class="btn-watch text-xs">▶️ Watch Video</button>
                ${lec.pdf1Url ? `<button onclick="openStandalonePdf('${lec.pdf1Url}', '${lec.title} - Notes PDF')" class="btn-nav bg-emerald-600 text-white border-0 text-xs">📄 Notes PDF</button>` : ''}
            </div>
        `;
        grid.appendChild(card);
    });
}

/* =========================================================
   5. LAUNCH PLAYER & INLINE PDF VIEWER
   ========================================================= */
let activeLecPdf1 = "";
let activeLecPdf2 = "";

function launchLecturePlayer(videoUrl, title, pdf1, pdf2) {
    showOnlySlide("slidePlayer");
    const navNav = document.getElementById("topHeaderNav");
    if (navNav) navNav.classList.add("hidden"); // Clean Full view

    activeLecPdf1 = pdf1;
    activeLecPdf2 = pdf2;

    // Show/Hide PDF 1 & PDF 2 buttons in player controls
    const pdfBtn1 = document.getElementById("playerPdf1");
    const pdfBtn2 = document.getElementById("playerPdf2");

    if (pdfBtn1) {
        if (pdf1) pdfBtn1.classList.remove("hidden");
        else pdfBtn1.classList.add("hidden");
    }
    if (pdfBtn2) {
        if (pdf2) pdfBtn2.classList.remove("hidden");
        else pdfBtn2.classList.add("hidden");
    }

    // Default below player: show Next Classes
    switchBottomToNextClasses();

    // Play video
    if (typeof playStreamUrl === "function") {
        playStreamUrl(videoUrl, title);
    }
}

function closePlayerBox() {
    if (typeof stopHlsVideo === "function") stopHlsVideo();
    const navNav = document.getElementById("topHeaderNav");
    if (navNav) navNav.classList.remove("hidden");
    showOnlySlide("slideExplorer");
}

function switchBottomToNextClasses() {
    const nextBox = document.getElementById("nextClassesBox");
    const pdfBox  = document.getElementById("inlinePdfBox");
    if (nextBox) nextBox.classList.remove("hidden");
    if (pdfBox)  pdfBox.classList.add("hidden");

    // Populate dummy next classes
    const nextGrid = document.getElementById("nextClassesGrid");
    const nextCount = document.getElementById("nextClassesCount");
    if (nextCount) nextCount.textContent = "3 Classes";
    if (nextGrid) {
        nextGrid.innerHTML = `
            <div class="bg-white border border-sky-200 rounded-xl p-3 cursor-pointer hover:border-blue-500" onclick="alert('Playing next lecture...')">
                <span class="text-[10px] font-black text-sky-700 uppercase">Up Next • 1h 20m</span>
                <h5 class="font-extrabold text-sm text-slate-900 mt-0.5">Ratio & Proportion (अनुपात एवं समानुपात)</h5>
            </div>
            <div class="bg-white border border-sky-200 rounded-xl p-3 cursor-pointer hover:border-blue-500" onclick="alert('Playing next lecture...')">
                <span class="text-[10px] font-black text-sky-700 uppercase">Upcoming • 1h 10m</span>
                <h5 class="font-extrabold text-sm text-slate-900 mt-0.5">Percentage Advance Level Questions</h5>
            </div>
            <div class="bg-white border border-sky-200 rounded-xl p-3 cursor-pointer hover:border-blue-500" onclick="alert('Playing next lecture...')">
                <span class="text-[10px] font-black text-sky-700 uppercase">Upcoming • 1h 30m</span>
                <h5 class="font-extrabold text-sm text-slate-900 mt-0.5">Compound & Simple Interest Masterclass</h5>
            </div>
        `;
    }
}

function openActivePlayerPdf(pdfIndex) {
    const pdfUrl = pdfIndex === 1 ? activeLecPdf1 : activeLecPdf2;
    if (!pdfUrl) {
        alert("⚠️ PDF document not attached for this button.");
        return;
    }

    const nextBox = document.getElementById("nextClassesBox");
    const pdfBox  = document.getElementById("inlinePdfBox");
    const frame   = document.getElementById("inlinePdfFrame");
    const title   = document.getElementById("inlinePdfTitle");
    const rawLink = document.getElementById("inlineRawPdfLink");

    if (nextBox) nextBox.classList.add("hidden");
    if (pdfBox)  pdfBox.classList.remove("hidden");
    if (title)   title.textContent = `📄 Class Notes PDF ${pdfIndex}`;
    if (rawLink) rawLink.href = pdfUrl;

    setInlinePdfMode('appx');
}

function setInlinePdfMode(mode) {
    const frame = document.getElementById("inlinePdfFrame");
    const pdfUrl = document.getElementById("inlineRawPdfLink")?.href || "";
    if (!frame || !pdfUrl) return;

    if (mode === "appx") {
        frame.src = `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
    } else {
        frame.src = `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(pdfUrl)}`;
    }
}

/* =========================================================
   6. STANDALONE PDF VIEWER SLIDE
   ========================================================= */
function openStandalonePdf(pdfUrl, titleText) {
    showOnlySlide("slidePdf");
    const title = document.getElementById("pdfTitle");
    const rawLink = document.getElementById("rawPdfLink");
    if (title) title.textContent = titleText || "PDF Document";
    if (rawLink) rawLink.href = pdfUrl;
    setPdfMode("appx");
}

function setPdfMode(mode) {
    const frame = document.getElementById("pdfFrame");
    const pdfUrl = document.getElementById("rawPdfLink")?.href || "";
    if (!frame || !pdfUrl) return;

    if (mode === "appx") {
        frame.src = `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
    } else {
        frame.src = `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(pdfUrl)}`;
    }
}

function closePdfSlide() {
    showOnlySlide("slideExplorer");
}

/* =========================================================
   7. LIVE CBT TEST SERIES & SOLUTIONS ENGINE (WITH KOKILA HINDI FONT)
   ========================================================= */
function loadTestSeriesList(mode) {
    const grid = document.getElementById("mainGrid");
    if (!grid) return;
    grid.innerHTML = `<div class="col-span-full text-center py-10 text-slate-600 font-extrabold animate-pulse">⏳ Loading CBT Test Series...</div>`;

    const testSeries = [
        {
            testid: "ts_1",
            title: "UP Police Constable Full Mock Test 01 (Hindi/English)",
            questionsCount: 50,
            durationMins: 60,
            badge: mode === "paid" ? "Official Paid Series" : "Free Weekly Mock",
            questions: generateMockCbtQuestions()
        },
        {
            testid: "ts_2",
            title: "SSC CGL Tier-1 Full Length CBT Mock Test 05",
            questionsCount: 50,
            durationMins: 60,
            badge: mode === "paid" ? "Official Paid Series" : "Free Weekly Mock",
            questions: generateMockCbtQuestions()
        }
    ];

    grid.innerHTML = "";
    testSeries.forEach(ts => {
        const card = document.createElement("div");
        card.className = "sky-card p-5 flex flex-col justify-between gap-4";
        card.innerHTML = `
            <div>
                <span class="px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 font-black text-[10px] uppercase">${ts.badge}</span>
                <h3 class="font-black text-lg text-slate-900 mt-2">${ts.title}</h3>
                <p class="text-xs text-slate-600 font-semibold mt-1">⏱️ Duration: ${ts.durationMins} Minutes • ❓ Total Questions: ${ts.questionsCount}</p>
            </div>
            <button onclick='launchCbtTest(${JSON.stringify(ts).replace(/'/g, "&#39;")})' class="btn-watch py-2.5">🚀 Start CBT Mock Test ➔</button>
        `;
        grid.appendChild(card);
    });
}

function generateMockCbtQuestions() {
    return [
        {
            qno: 1,
            questionHtml: `<span class="kokila-hindi">यदि किसी संख्या का 20%, 120 है, तो उस संख्या का 120% क्या होगा?</span><br>If 20% of a number is 120, what is 120% of that number?`,
            options: ["600", "720", "800", "750"],
            correctOption: 1, // 720 (index 1)
            solutionHtml: `<span class="kokila-hindi">माना संख्या x है। x का 20% = 120 => x * (20/100) = 120 => x = 600. अब 600 का 120% = 600 * (120/100) = 720. अतः सही उत्तर विकल्प (B) है।</span>`
        },
        {
            qno: 2,
            questionHtml: `<span class="kokila-hindi">उत्तर प्रदेश की राजधानी लखनऊ किस नदी के तट पर स्थित है?</span><br>On the banks of which river is Lucknow, the capital of Uttar Pradesh, located?`,
            options: ["गंगा (Ganga)", "गोमती (Gomti)", "यमुना (Yamuna)", "सरयू (Saryu)"],
            correctOption: 1, // Gomti (index 1)
            solutionHtml: `<span class="kokila-hindi">लखनऊ गोमती नदी के तट पर स्थित है। सही उत्तर विकल्प (B) है।</span>`
        },
        {
            qno: 3,
            questionHtml: `<span class="kokila-hindi">भारतीय संविधान में मौलिक अधिकार किस देश के संविधान से लिए गए हैं?</span><br>From which country's constitution were the Fundamental Rights borrowed in the Indian Constitution?`,
            options: ["ब्रिटेन (Britain)", "संযুক্ত राज्य अमेरिका (USA)", "आयरलैंड (Ireland)", "रूस (Russia)"],
            correctOption: 1, // USA (index 1)
            solutionHtml: `<span class="kokila-hindi">भारतीय संविधान में मौलिक अधिकार यूएसए (USA) के संविधान से लिए गए हैं। सही उत्तर विकल्प (B) है।</span>`
        }
    ];
}

function launchCbtTest(testObj) {
    currentTestObj = testObj;
    cbtQuestionsList = testObj.questions || generateMockCbtQuestions();
    cbtUserAnswers = {};
    cbtVisitedState = { 0: true };
    cbtCurrentQIdx = 0;
    cbtIsSubmitted = false;
    cbtTimerSeconds = (testObj.durationMins || 60) * 60;

    showOnlySlide("slideTestAttempt");

    const titleEl = document.getElementById("cbtTestTitle");
    if (titleEl) titleEl.textContent = testObj.title;

    const badgeEl = document.getElementById("cbtSeriesBadge");
    if (badgeEl) badgeEl.textContent = testObj.badge || "LIVE CBT EXAM";

    // Hide result card
    document.getElementById("cbtResultCard")?.classList.add("hidden");
    document.getElementById("cbtSolutionBox")?.classList.add("hidden");
    document.getElementById("cbtSubmitBtn")?.classList.remove("hidden");

    renderCbtQuestion();
    renderCbtPalette();
    startCbtTimer();
}

function startCbtTimer() {
    if (cbtTimerInterval) clearInterval(cbtTimerInterval);
    const timerBadge = document.getElementById("cbtTimerBadge");

    cbtTimerInterval = setInterval(() => {
        if (cbtIsSubmitted) {
            clearInterval(cbtTimerInterval);
            return;
        }
        cbtTimerSeconds--;
        if (cbtTimerSeconds <= 0) {
            clearInterval(cbtTimerInterval);
            submitCbtTest();
            return;
        }
        const m = Math.floor(cbtTimerSeconds / 60);
        const s = cbtTimerSeconds % 60;
        if (timerBadge) {
            timerBadge.textContent = `⏱️ ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        }
    }, 1000);
}

function renderCbtQuestion() {
    const q = cbtQuestionsList[cbtCurrentQIdx];
    if (!q) return;

    cbtVisitedState[cbtCurrentQIdx] = true;

    const qNum = document.getElementById("cbtQNumber");
    const qHtml = document.getElementById("cbtQuestionHtml");
    const optList = document.getElementById("cbtOptionsList");

    if (qNum) qNum.textContent = `Question ${cbtCurrentQIdx + 1} of ${cbtQuestionsList.length}`;
    if (qHtml) qHtml.innerHTML = q.questionHtml;

    if (optList) {
        optList.innerHTML = "";
        q.options.forEach((optText, oIdx) => {
            const isSelected = cbtUserAnswers[cbtCurrentQIdx] === oIdx;
            const div = document.createElement("div");
            div.className = `p-3.5 rounded-2xl border-2 cursor-pointer font-bold text-sm transition-all flex items-center gap-3 ${
                isSelected 
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md' 
                    : 'bg-white text-slate-900 border-sky-200 hover:border-blue-400'
            }`;
            div.onclick = () => selectCbtOption(oIdx);
            div.innerHTML = `
                <span class="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-black ${isSelected ? 'bg-white text-blue-700' : 'bg-sky-100 text-sky-900'}">${String.fromCharCode(65 + oIdx)}</span>
                <span class="flex-1">${optText}</span>
            `;
            optList.appendChild(div);
        });
    }

    // Render Solution box if submitted
    const solBox = document.getElementById("cbtSolutionBox");
    const solHtml = document.getElementById("cbtSolutionHtml");
    if (cbtIsSubmitted) {
        if (solBox) solBox.classList.remove("hidden");
        if (solHtml) solHtml.innerHTML = q.solutionHtml || "No detailed solution provided.";
    } else {
        if (solBox) solBox.classList.add("hidden");
    }

    renderCbtPalette();
}

function selectCbtOption(optIdx) {
    if (cbtIsSubmitted) return; // Locked after submit
    cbtUserAnswers[cbtCurrentQIdx] = optIdx;
    renderCbtQuestion();
}

function clearCbtResponse() {
    if (cbtIsSubmitted) return;
    delete cbtUserAnswers[cbtCurrentQIdx];
    renderCbtQuestion();
}

function nextCbtQuestion() {
    if (cbtCurrentQIdx < cbtQuestionsList.length - 1) {
        cbtCurrentQIdx++;
        renderCbtQuestion();
    }
}

function prevCbtQuestion() {
    if (cbtCurrentQIdx > 0) {
        cbtCurrentQIdx--;
        renderCbtQuestion();
    }
}

function renderCbtPalette() {
    const paletteGrid = document.getElementById("cbtPaletteGrid");
    if (!paletteGrid) return;
    paletteGrid.innerHTML = "";

    cbtQuestionsList.forEach((_, idx) => {
        const isAnswered = cbtUserAnswers[idx] !== undefined;
        const isCurrent = cbtCurrentQIdx === idx;
        const isVisited = cbtVisitedState[idx];

        let bgClass = "bg-slate-200 text-slate-700 border-slate-300";
        if (cbtIsSubmitted) {
            const userAns = cbtUserAnswers[idx];
            const correctAns = cbtQuestionsList[idx].correctOption;
            if (userAns === correctAns) bgClass = "bg-emerald-500 text-white border-emerald-600";
            else if (userAns !== undefined) bgClass = "bg-rose-500 text-white border-rose-600";
            else bgClass = "bg-slate-300 text-slate-600 border-slate-400";
        } else {
            if (isAnswered) bgClass = "bg-emerald-600 text-white border-emerald-700 shadow-sm";
            else if (isVisited) bgClass = "bg-amber-100 text-amber-900 border-amber-300";
        }

        const btn = document.createElement("button");
        btn.className = `h-10 rounded-xl font-black text-xs border-2 transition-all flex items-center justify-center ${bgClass} ${isCurrent ? 'ring-2 ring-blue-600 ring-offset-2' : ''}`;
        btn.textContent = String(idx + 1);
        btn.onclick = () => {
            cbtCurrentQIdx = idx;
            renderCbtQuestion();
        };
        paletteGrid.appendChild(btn);
    });
}

function submitCbtTest() {
    if (!cbtIsSubmitted) {
        if (!confirm("Are you sure you want to submit this CBT Test?")) return;
    }

    cbtIsSubmitted = true;
    if (cbtTimerInterval) clearInterval(cbtTimerInterval);

    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    cbtQuestionsList.forEach((q, idx) => {
        const ans = cbtUserAnswers[idx];
        if (ans === undefined) {
            skipped++;
        } else if (ans === q.correctOption) {
            correct++;
        } else {
            wrong++;
        }
    });

    const totalScore = (correct * 2.0) - (wrong * 0.5);
    const maxScore = cbtQuestionsList.length * 2.0;

    // Show Result card
    document.getElementById("cbtResultCard")?.classList.remove("hidden");
    document.getElementById("cbtSubmitBtn")?.classList.add("hidden");

    const scoreText = document.getElementById("cbtFinalScoreText");
    const statCorrect = document.getElementById("cbtStatCorrect");
    const statWrong = document.getElementById("cbtStatWrong");
    const statSkip = document.getElementById("cbtStatSkip");

    if (scoreText) scoreText.textContent = `Score: ${totalScore} / ${maxScore} Marks`;
    if (statCorrect) statCorrect.textContent = `✅ Correct: ${correct}`;
    if (statWrong) statWrong.textContent = `❌ Wrong: ${wrong}`;
    if (statSkip) statSkip.textContent = `⚪ Skipped: ${skipped}`;

    renderCbtQuestion(); // Renders solution boxes for review
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function reAttemptCbtTest() {
    if (currentTestObj) {
        launchCbtTest(currentTestObj);
    }
}

function exitCbtTest() {
    if (cbtTimerInterval) clearInterval(cbtTimerInterval);
    showOnlySlide("slideExplorer");
}

/* =========================================================
   8. AUTO-INITIALIZE APP ON DOM READY
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    initTokenPool();
});
