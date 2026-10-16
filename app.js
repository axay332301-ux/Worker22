/* =========================================================
   RWA SKY PRO PORTAL - MAIN APPLICATION SCRIPT (app.js)
   ========================================================= */

// Global State Management
let appState = {
    currentSlide: 'slideHome',
    navigationStack: ['slideHome'],
    activeMode: 'paid', // 'paid', 'free', 'paid_ts', 'free_ts'
    tokens: [
        { label: "Default Token", token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...", uid: "" }
    ],
    selectedTokenIndex: 0,
    currentUser: null,
    coursesList: [],
    currentCourse: null,
    currentBatchId: null,
    currentSubjectId: null,
    currentTopicId: null,
    currentSubTab: 'subjects',
    subjectsList: [],
    liveList: [],
    testsList: [],
    telegramLink: '',
    topicsList: [],
    lessonsList: [],
    currentLesson: null,
    // CBT Test Series State
    cbtTestId: null,
    cbtQuestions: [],
    cbtCurrentQIndex: 0,
    cbtAnswers: {},
    cbtTimerSeconds: 3600,
    cbtTimerInterval: null,
    cbtSubmitted: false
};

// Initialize App on DOM Content Loaded
document.addEventListener("DOMContentLoaded", () => {
    loadTokensFromStorage();
    updateTokenBadge();
    renderTokenList();
    fetchUserProfile();
    
    // Global Event Bubbling Stoppers for Interactive Elements
    document.querySelectorAll('button, input, select, textarea').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });
});

/* =========================================================
   NAVIGATION & SLIDE ROUTER
   ========================================================= */
function switchSlide(slideId) {
    document.querySelectorAll('.slide-page').forEach(page => {
        page.classList.remove('active-slide');
        page.classList.add('hidden-slide');
    });

    let target = document.getElementById(slideId);
    if (target) {
        target.classList.remove('hidden-slide');
        target.classList.add('active-slide');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    appState.currentSlide = slideId;
}

function goHomeHub(e) {
    if (e) e.stopPropagation();
    appState.navigationStack = ['slideHome'];
    switchSlide('slideHome');
}

function pushSlide(slideId) {
    appState.navigationStack.push(slideId);
    switchSlide(slideId);
}

function handleGlobalBack() {
    if (appState.navigationStack.length > 1) {
        appState.navigationStack.pop();
        let prevSlide = appState.navigationStack[appState.navigationStack.length - 1];
        switchSlide(prevSlide);
    } else {
        goHomeHub();
    }
}

/* =========================================================
   USER PROFILE, LOGIN & LOGOUT MANAGEMENT
   ========================================================= */
function openUserProfileModal(e) {
    if (e) e.stopPropagation();
    pushSlide('slideTokens');
    fetchUserProfile();
}

function handleUserLogout(e) {
    if (e) e.stopPropagation();
    if (confirm("Kya aap sach mein RWA Portal se logout karna chahte hain?")) {
        localStorage.removeItem('rwa_sky_tokens');
        appState.tokens = [];
        appState.currentUser = null;
        alert("🔒 Successfully Logged Out!");
        goHomeHub();
        updateTokenBadge();
        renderTokenList();
    }
}

async function fetchUserProfile() {
    let currentTokObj = appState.tokens[appState.selectedTokenIndex] || appState.tokens[0];
    if (!currentTokObj || !currentTokObj.token) return;

    try {
        // Fetching user details from RWA API endpoint as observed in logs
        let res = await fetch(`https://backend.rojgarwithankit.co.in/get/get_user_dt?userid=${currentTokObj.uid || ''}`, {
            headers: {
                "Authorization": `Bearer ${currentTokObj.token}`,
                "Content-Type": "application/json"
            }
        });
        let data = await res.json();
        if (data && data.data) {
            appState.currentUser = data.data;
            populateUserProfileUI(data.data);
        } else {
            // Fallback mock profile if token is offline/invalid
            populateUserProfileUI({
                name: "RWA Premium Student",
                email: "student@rojgarwithankit.com",
                phone: "+91 9876543210",
                userid: currentTokObj.uid || "4756316",
                state: "Uttar Pradesh",
                district: "Noida",
                category: "General",
                gender: "Male"
            });
        }
    } catch (err) {
        console.log("Profile fetch error, loading local profile cache:", err);
        populateUserProfileUI({
            name: currentTokObj.label || "RWA Student",
            email: "student@rwa.com",
            phone: "+91 9876543210",
            userid: currentTokObj.uid || "4756316",
            state: "Delhi",
            district: "New Delhi"
        });
    }
}

function populateUserProfileUI(user) {
    let nameEl = document.getElementById('navUserName');
    if (nameEl) nameEl.innerText = user.name || user.full_name || "Profile";

    document.getElementById('profileName').innerText = user.name || user.full_name || "-";
    document.getElementById('profileEmail').innerText = user.email || "-";
    document.getElementById('profilePhone').innerText = user.phone || user.mobile || "-";
    document.getElementById('profileUserId').innerText = user.userid || user.id || "-";
    document.getElementById('profileStateDistrict').innerText = `${user.state || 'Delhi'}, ${user.district || 'New Delhi'}`;
    document.getElementById('profileInfo').innerText = `${user.category || 'General'} | ${user.gender || 'Student'}`;
}

/* =========================================================
   MULTI-TOKEN MANAGER
   ========================================================= */
function loadTokensFromStorage() {
    let saved = localStorage.getItem('rwa_sky_tokens');
    if (saved) {
        try {
            appState.tokens = JSON.parse(saved);
        } catch (e) {}
    }
}

function saveTokensToStorage() {
    localStorage.setItem('rwa_sky_tokens', JSON.stringify(appState.tokens));
    updateTokenBadge();
    renderTokenList();
}

function updateTokenBadge() {
    let badge = document.getElementById('tokCountBadge');
    if (badge) badge.innerText = appState.tokens.length;
}

function openTokenSlide(e) {
    if (e) e.stopPropagation();
    pushSlide('slideTokens');
    renderTokenList();
}

function addNewToken(e) {
    if (e) e.stopPropagation();
    let label = document.getElementById('newTokLabel').value.trim();
    let uid = document.getElementById('newTokUid').value.trim();
    let token = document.getElementById('newTokValue').value.trim();

    if (!token) {
        alert("Kripya valid Bearer JWT Token enter karein!");
        return;
    }

    appState.tokens.push({
        label: label || `Account ${appState.tokens.length + 1}`,
        uid: uid,
        token: token
    });

    saveTokensToStorage();
    document.getElementById('newTokLabel').value = '';
    document.getElementById('newTokUid').value = '';
    document.getElementById('newTokValue').value = '';
    alert("✅ New token successfully added and synced!");
}

function deleteToken(index, e) {
    if (e) e.stopPropagation();
    if (appState.tokens.length <= 1) {
        alert("Kam se kam 1 active token hona zaroori hai!");
        return;
    }
    appState.tokens.splice(index, 1);
    if (appState.selectedTokenIndex >= appState.tokens.length) {
        appState.selectedTokenIndex = 0;
    }
    saveTokensToStorage();
}

function renderTokenList() {
    let container = document.getElementById('tokenListContainer');
    if (!container) return;
    if (appState.tokens.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-600 font-bold p-3 bg-white rounded-xl">No active tokens found. Add one above.</div>`;
        return;
    }

    let html = '';
    appState.tokens.forEach((t, i) => {
        let isSel = i === appState.selectedTokenIndex;
        html += `
            <div class="flex flex-wrap justify-between items-center gap-3 p-3.5 rounded-2xl bg-white border-2 ${isSel ? 'border-sky-500 shadow-md' : 'border-sky-200'}">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-black text-slate-900 text-sm">${t.label}</span>
                        ${isSel ? '<span class="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-black uppercase">Active</span>' : ''}
                    </div>
                    <div class="text-[11px] text-slate-500 font-mono mt-0.5">UID: ${t.uid || 'N/A'} | Token: ${t.token.substring(0, 20)}...</div>
                </div>
                <div class="flex gap-2">
                    ${!isSel ? `<button onclick="switchActiveToken(${i}, event); event.stopPropagation();" class="btn-nav bg-emerald-600 text-white border-0 text-xs">Switch</button>` : ''}
                    <button onclick="deleteToken(${i}, event); event.stopPropagation();" class="btn-nav bg-rose-600 text-white border-0 text-xs">Delete</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function switchActiveToken(index, e) {
    if (e) e.stopPropagation();
    appState.selectedTokenIndex = index;
    saveTokensToStorage();
    fetchUserProfile();
    alert(`🔄 Switched to active account: ${appState.tokens[index].label}`);
    renderTokenList();
}

/* =========================================================
   EXPLORER & COURSE FETCHING LOGIC
   ========================================================= */
function openExplorerSlide(mode, e) {
    if (e) e.stopPropagation();
    appState.activeMode = mode;
    pushSlide('slideExplorer');

    let heading = document.getElementById('headingText');
    let crumb = document.getElementById('crumbText');
    let subTabs = document.getElementById('subTabs');

    if (mode === 'paid') {
        heading.innerText = "🎓 Paid Batches (Multi-Token Merged)";
        crumb.innerText = "Paid Courses";
        if (subTabs) subTabs.classList.add('hidden');
        fetchPaidBatches();
    } else if (mode === 'free') {
        heading.innerText = "🆓 Free Batches & Revision Series";
        crumb.innerText = "Free Courses";
        if (subTabs) subTabs.classList.add('hidden');
        fetchFreeBatches();
    }
}

async function fetchPaidBatches() {
    let grid = document.getElementById('mainGrid');
    if (!grid) return;
    grid.innerHTML = `<div class="col-span-full text-center py-10 font-bold text-sky-800">Loading paid batches from all synced tokens...</div>`;

    let allCourses = [];
    for (let i = 0; i < appState.tokens.length; i++) {
        let tokObj = appState.tokens[i];
        try {
            let res = await fetch(`https://backend.rojgarwithankit.co.in/get/my-courses`, {
                headers: { "Authorization": `Bearer ${tokObj.token}` }
            });
            let data = await res.json();
            if (data && (data.data || data.courses)) {
                let list = data.data || data.courses;
                list.forEach(c => c._accountSource = tokObj.label);
                allCourses = allCourses.concat(list);
            }
        } catch (err) {
            console.log("Error fetching courses for token", tokObj.label, err);
        }
    }

    // Fallback sample mock courses if API network offline
    if (allCourses.length === 0) {
        allCourses = [
            { id: 101, title: "UP Police Constable 2026 - Khaki Batch", instructor: "Ankit Bhati Sir", image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500", _accountSource: "Account 1" },
            { id: 102, title: "SSC CGL / CHSL 2026 - Arjuna Batch", instructor: "RWA Expert Team", image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500", _accountSource: "Account 1" },
            { id: 103, title: "Delhi Police Driver & Head Constable Batch", instructor: "Dharmsingh Sir", image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500", _accountSource: "Account 2" }
        ];
    }

    appState.coursesList = allCourses;
    renderCoursesGrid(allCourses);
}

async function fetchFreeBatches() {
    let grid = document.getElementById('mainGrid');
    if (!grid) return;
    grid.innerHTML = `<div class="col-span-full text-center py-10 font-bold text-sky-800">Loading free batches...</div>`;

    // Free courses mock / API fetch
    let freeList = [
        { id: 201, title: "RWA Free Practice Set & Marathon 2026", instructor: "RWA Team", image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=500" },
        { id: 202, title: "Current Affairs & Static GK Daily Series", instructor: "Sonu Kumar", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500" }
    ];
    appState.coursesList = freeList;
    renderCoursesGrid(freeList);
}

function renderCoursesGrid(list) {
    let grid = document.getElementById('mainGrid');
    if (!grid) return;
    if (list.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-10 font-bold text-slate-700">No courses available.</div>`;
        return;
    }

    let html = '';
    list.forEach(c => {
        html += `
            <div onclick="openCourseDetail(${c.id}, '${c.title.replace(/'/g, "")}', event); event.stopPropagation();" class="sky-card p-4 cursor-pointer flex flex-col justify-between">
                <div>
                    <div class="relative rounded-xl overflow-hidden aspect-video bg-sky-200 mb-3">
                        <img src="${c.image || c.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500'}" class="w-full h-full object-cover">
                        ${c._accountSource ? `<span class="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-amber-300 font-extrabold text-[10px]">${c._accountSource}</span>` : ''}
                    </div>
                    <h3 class="font-black text-base text-slate-900 line-clamp-2">${c.title}</h3>
                    <p class="text-xs text-slate-600 font-medium mt-1">👨‍🏫 ${c.instructor || 'RWA Faculty'}</p>
                </div>
                <div class="mt-4 pt-3 border-t border-sky-200 flex justify-between items-center">
                    <span class="text-[11px] font-extrabold text-blue-700 uppercase">View Subjects ➔</span>
                    <span class="px-2.5 py-1 rounded-xl bg-sky-100 text-sky-900 font-extrabold text-xs">Active</span>
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;
}

function filterGrid() {
    let query = document.getElementById('searchBox').value.toLowerCase();
    let filtered = appState.coursesList.filter(item => 
        (item.title && item.title.toLowerCase().includes(query)) ||
        (item.instructor && item.instructor.toLowerCase().includes(query))
    );
    renderCoursesGrid(filtered);
}

/* =========================================================
   COURSE INTERNAL TABS (SUBJECTS, LIVE, TESTS, TELEGRAM)
   ========================================================= */
async function openCourseDetail(batchId, batchTitle, e) {
    if (e) e.stopPropagation();
    appState.currentBatchId = batchId;
    appState.currentCourse = batchTitle;
    pushSlide('slideExplorer');

    let heading = document.getElementById('headingText');
    let crumb = document.getElementById('crumbText');
    let subTabs = document.getElementById('subTabs');

    heading.innerText = batchTitle;
    crumb.innerText = "Batch Subjects";
    if (subTabs) subTabs.classList.remove('hidden');

    loadCourseTab('subjects');
}

function loadCourseTab(tabName) {
    appState.currentSubTab = tabName;
    document.querySelectorAll('.tab-pill').forEach(p => p.classList.remove('active-pill'));
    let activeBtn = document.getElementById(`sub_${tabName}`);
    if (activeBtn) activeBtn.classList.add('active-pill');

    if (tabName === 'subjects') fetchBatchSubjects();
    else if (tabName === 'live') fetchBatchLiveClasses();
    else if (tabName === 'tests') fetchBatchTests();
    else if (tabName === 'telegram') openBatchTelegram();
}

async function fetchBatchSubjects() {
    let grid = document.getElementById('mainGrid');
    if (!grid) return;
    grid.innerHTML = `<div class="col-span-full text-center py-10 font-bold text-sky-800">Loading subjects...</div>`;

    // Simulated / API fetch subjects
    let subjects = [
        { id: 1, title: "Mathematics (गणित)", count: "45 Classes", icon: "📐" },
        { id: 2, title: "Reasoning (तर्कशक्ति)", count: "40 Classes", icon: "🧠" },
        { id: 3, title: "Hindi (सामान्य हिंदी)", count: "38 Classes", icon: "📖" },
        { id: 4, title: "General Knowledge & GS", count: "60 Classes", icon: "🌍" },
        { id: 5, title: "Uttar Pradesh GK Special", count: "25 Classes", icon: "🏛️" }
    ];
    appState.subjectsList = subjects;

    let html = '';
    subjects.forEach(s => {
        html += `
            <div onclick="openSubjectTopics(${s.id}, '${s.title}', event); event.stopPropagation();" class="sky-card p-5 cursor-pointer flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-2xl shadow-md">${s.icon}</div>
                    <div>
                        <h4 class="font-black text-base text-slate-900">${s.title}</h4>
                        <p class="text-xs text-slate-600 font-bold mt-0.5">📚 ${s.count}</p>
                    </div>
                </div>
                <span class="text-xs font-extrabold text-blue-700">Open ➔</span>
            </div>
        `;
    });
    grid.innerHTML = html;
}

async function openSubjectTopics(subjectId, subjectTitle, e) {
    if (e) e.stopPropagation();
    appState.currentSubjectId = subjectId;

    let heading = document.getElementById('headingText');
    let crumb = document.getElementById('crumbText');
    heading.innerText = subjectTitle;
    crumb.innerText = "Topics / Chapters";

    let grid = document.getElementById('mainGrid');
    grid.innerHTML = `<div class="col-span-full text-center py-10 font-bold text-sky-800">Loading topics...</div>`;

    let topics = [
        { id: 1, title: "Chapter 1: Number System & Simplification", count: "8 Lessons | 2 PDFs" },
        { id: 2, title: "Chapter 2: Percentage & Profit Loss", count: "10 Lessons | 2 PDFs" },
        { id: 3, title: "Chapter 3: Ratio, Proportion & Partnership", count: "7 Lessons | 1 PDF" },
        { id: 4, title: "Chapter 4: Time, Speed & Distance", count: "9 Lessons | 2 PDFs" }
    ];
    appState.topicsList = topics;

    let html = '';
    topics.forEach(t => {
        html += `
            <div onclick="openTopicLessons(${t.id}, '${t.title}', event); event.stopPropagation();" class="sky-card p-5 cursor-pointer flex items-center justify-between">
                <div>
                    <span class="text-[10px] font-black text-sky-700 uppercase">Topic Module</span>
                    <h4 class="font-black text-base text-slate-900 mt-0.5">${t.title}</h4>
                    <p class="text-xs text-slate-600 font-bold mt-1">▶ ${t.count}</p>
                </div>
                <span class="text-xs font-extrabold text-blue-700">Watch ➔</span>
            </div>
        `;
    });
    grid.innerHTML = html;
}

async function openTopicLessons(topicId, topicTitle, e) {
    if (e) e.stopPropagation();
    appState.currentTopicId = topicId;

    let lessons = [
        { 
            id: 1, 
            title: `${topicTitle} - Class 01 (Concept + Shortcut Tricks)`, 
            videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
            pdf1: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            pdf2: ""
        },
        { 
            id: 2, 
            title: `${topicTitle} - Class 02 (Important Practice Questions)`, 
            videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
            pdf1: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            pdf2: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
        }
    ];
    appState.lessonsList = lessons;

    // Open player slide with first lesson
    openPlayerWithLesson(lessons[0]);
}

/* =========================================================
   PLAYER & NEXT CLASSES INTEGRATION
   ========================================================= */
function openPlayerWithLesson(lesson) {
    appState.currentLesson = lesson;
    pushSlide('slidePlayer');

    // Load video
    if (lesson.videoUrl.includes('youtube.com') || lesson.videoUrl.includes('youtu.be')) {
        loadYouTubeSource(lesson.videoUrl, lesson.title);
    } else {
        loadVideoSource(lesson.videoUrl, lesson.title);
    }

    // Configure PDF 1 & PDF 2 buttons
    let btnPdf1 = document.getElementById('playerPdf1');
    let btnPdf2 = document.getElementById('playerPdf2');

    if (lesson.pdf1) {
        btnPdf1.classList.remove('hidden');
    } else {
        btnPdf1.classList.add('hidden');
    }

    if (lesson.pdf2) {
        btnPdf2.classList.remove('hidden');
    } else {
        btnPdf2.classList.add('hidden');
    }

    // Ensure bottom section shows Next Classes by default
    switchBottomToNextClasses();
    renderNextClasses();
}

function closePlayerBox(e) {
    if (e) e.stopPropagation();
    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }
    if (video) video.pause();
    handleGlobalBack();
}

function renderNextClasses() {
    let grid = document.getElementById('nextClassesGrid');
    let countEl = document.getElementById('nextClassesCount');
    if (!grid) return;

    let list = appState.lessonsList || [];
    if (countEl) countEl.innerText = `${list.length} Classes`;

    let html = '';
    list.forEach(l => {
        let isCurrent = appState.currentLesson && appState.currentLesson.id === l.id;
        html += `
            <div onclick='openPlayerWithLesson(${JSON.stringify(l)}); event.stopPropagation();' class="p-3.5 rounded-2xl bg-white border-2 ${isCurrent ? 'border-sky-500 shadow-md' : 'border-sky-200'} cursor-pointer flex items-center justify-between">
                <div>
                    <span class="text-[10px] font-black text-sky-700 uppercase">${isCurrent ? '▶ Now Playing' : 'Up Next'}</span>
                    <h5 class="font-extrabold text-sm text-slate-900 mt-0.5 line-clamp-1">${l.title}</h5>
                </div>
                <span class="text-xs font-bold text-blue-600">▶ Play</span>
            </div>
        `;
    });
    grid.innerHTML = html;
}

/* =========================================================
   INLINE & STANDALONE PDF VIEWER
   ========================================================= */
function openActivePlayerPdf(pdfIndex, e) {
    if (e) e.stopPropagation();
    let lesson = appState.currentLesson;
    if (!lesson) return;

    let pdfUrl = pdfIndex === 1 ? lesson.pdf1 : lesson.pdf2;
    if (!pdfUrl) {
        alert("Ye PDF available nahi hai!");
        return;
    }

    let nextBox = document.getElementById('nextClassesBox');
    let pdfBox = document.getElementById('inlinePdfBox');
    let frame = document.getElementById('inlinePdfFrame');
    let rawLink = document.getElementById('inlineRawPdfLink');
    let titleEl = document.getElementById('inlinePdfTitle');

    if (nextBox) nextBox.classList.add('hidden');
    if (pdfBox) pdfBox.classList.remove('hidden');

    if (titleEl) titleEl.innerText = `📄 ${lesson.title} - Notes PDF ${pdfIndex}`;
    if (rawLink) rawLink.href = pdfUrl;
    if (frame) frame.src = `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
}

function switchBottomToNextClasses(e) {
    if (e) e.stopPropagation();
    let nextBox = document.getElementById('nextClassesBox');
    let pdfBox = document.getElementById('inlinePdfBox');

    if (nextBox) nextBox.classList.remove('hidden');
    if (pdfBox) pdfBox.classList.add('hidden');
}

function setInlinePdfMode(mode, e) {
    if (e) e.stopPropagation();
    let lesson = appState.currentLesson;
    if (!lesson) return;
    let pdfUrl = lesson.pdf1;
    let frame = document.getElementById('inlinePdfFrame');
    if (!frame) return;

    if (mode === 'appx') {
        frame.src = pdfUrl;
    } else {
        frame.src = `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
    }
}

function closePdfSlide(e) {
    if (e) e.stopPropagation();
    handleGlobalBack();
}

/* =========================================================
   TEST SERIES EXPLORER & LIVE CBT EXAM ENGINE
   ========================================================= */
function openTestSeriesExplorer(type, e) {
    if (e) e.stopPropagation();
    appState.activeMode = type;
    pushSlide('slideExplorer');

    let heading = document.getElementById('headingText');
    let crumb = document.getElementById('crumbText');
    let subTabs = document.getElementById('subTabs');

    if (subTabs) subTabs.classList.add('hidden');

    if (type === 'paid_ts') {
        heading.innerText = "🏆 Official Paid Test Series (SSC, Police, NDA)";
        crumb.innerText = "Paid Test Series";
    } else {
        heading.innerText = "📝 Free Weekly Mock Tests (All Exams)";
        crumb.innerText = "Free Test Series";
    }

    fetchTestSeriesList(type);
}

async function fetchTestSeriesList(type) {
    let grid = document.getElementById('mainGrid');
    if (!grid) return;
    grid.innerHTML = `<div class="col-span-full text-center py-10 font-bold text-sky-800">Loading test series...</div>`;

    let tests = [
        { id: 501, title: "UP Police Constable Full Length CBT Mock Test 01", questions: 150, time: "120 Mins", marks: "300 Marks" },
        { id: 502, title: "SSC CGL Tier-1 All India Mock Test 2026", questions: 100, time: "60 Mins", marks: "200 Marks" },
        { id: 503, title: "Delhi Police Head Constable Practice Test 02", questions: 100, time: "90 Mins", marks: "100 Marks" }
    ];

    let html = '';
    tests.forEach(t => {
        html += `
            <div onclick="startCbtTest(${t.id}, '${t.title}', event); event.stopPropagation();" class="sky-card p-5 cursor-pointer flex flex-col justify-between">
                <div>
                    <span class="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 font-black text-[10px] uppercase">CBT MOCK EXAM</span>
                    <h3 class="font-black text-base text-slate-900 mt-2">${t.title}</h3>
                    <div class="flex gap-3 text-xs text-slate-600 font-bold mt-2">
                        <span>❓ ${t.questions} Qs</span>
                        <span>⏱️ ${t.time}</span>
                        <span>⭐ ${t.marks}</span>
                    </div>
                </div>
                <div class="mt-5 pt-3 border-t border-sky-200 flex justify-between items-center">
                    <span class="text-xs font-black text-indigo-700 uppercase">Attempt Test ➔</span>
                    <span class="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 font-extrabold text-xs">Start Now</span>
                </div>
            </div>
        `;
    });
    grid.innerHTML = html;
}

function startCbtTest(testId, testTitle, e) {
    if (e) e.stopPropagation();
    appState.cbtTestId = testId;
    appState.cbtSubmitted = false;
    appState.cbtCurrentQIndex = 0;
    appState.cbtAnswers = {};
    appState.cbtTimerSeconds = 3600;

    document.getElementById('cbtTestTitle').innerText = testTitle;
    document.getElementById('cbtResultCard').classList.add('hidden');
    document.getElementById('cbtSubmitBtn').classList.remove('hidden');

    // Generate sample Kokila Hindi & English rich questions
    appState.cbtQuestions = [
        {
            id: 1,
            question: "यदि किसी संख्या का 40%, 80 के बराबर है, तो वह संख्या क्या होगी? <br><span class='text-sm text-slate-600'>If 40% of a number is equal to 80, what is the number?</span>",
            options: ["150", "200", "250", "300"],
            correct: 1,
            solution: "माना संख्या x है। <br> x * (40 / 100) = 80 <br> x = (80 * 100) / 40 = 200. <br> अतः सही उत्तर विकल्प 2 (200) है।"
        },
        {
            id: 2,
            question: "भारत की प्रथम महिला प्रधानमंत्री कौन थीं? <br><span class='text-sm text-slate-600'>Who was the first female Prime Minister of India?</span>",
            options: ["Sarojini Naidu", "Indira Gandhi", "Pratibha Patil", "Meira Kumar"],
            correct: 1,
            solution: "इंदिरा गांधी भारत की प्रथम महिला प्रधानमंत्री थीं।"
        },
        {
            id: 3,
            question: "UP Police Headquarter kahan sthit hai? <br><span class='text-sm text-slate-600'>Where is the UP Police Headquarter located?</span>",
            options: ["Lucknow", "Noida", "Prayagraj", "Kanpur"],
            correct: 0,
            solution: "उत्तर प्रदेश पुलिस मुख्यालय लखनऊ (Lucknow) में स्थित है।"
        }
    ];

    pushSlide('slideTestAttempt');
    renderCbtQuestion();
    startCbtTimer();
}

function startCbtTimer() {
    if (appState.cbtTimerInterval) clearInterval(appState.cbtTimerInterval);
    let timerEl = document.getElementById('cbtTimerBadge');

    appState.cbtTimerInterval = setInterval(() => {
        if (appState.cbtTimerSeconds <= 0 || appState.cbtSubmitted) {
            clearInterval(appState.cbtTimerInterval);
            if (!appState.cbtSubmitted) submitCbtTest();
            return;
        }
        appState.cbtTimerSeconds--;
        let m = Math.floor(appState.cbtTimerSeconds / 60);
        let s = appState.cbtTimerSeconds % 60;
        if (timerEl) timerEl.innerText = `⏱️ ${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    }, 1000);
}

function renderCbtQuestion() {
    let q = appState.cbtQuestions[appState.cbtCurrentQIndex];
    if (!q) return;

    document.getElementById('cbtQNumber').innerText = `Question ${appState.cbtCurrentQIndex + 1} of ${appState.cbtQuestions.length}`;
    document.getElementById('cbtQuestionHtml').innerHTML = q.question;

    let selectedOpt = appState.cbtAnswers[appState.cbtCurrentQIndex];
    let optHtml = '';
    q.options.forEach((opt, idx) => {
        let isSel = selectedOpt === idx;
        let isCorrectSol = appState.cbtSubmitted && q.correct === idx;
        let isWrongSol = appState.cbtSubmitted && isSel && q.correct !== idx;

        let btnClass = "bg-white border-2 border-sky-200 text-slate-900";
        if (isCorrectSol) btnClass = "bg-emerald-100 border-2 border-emerald-500 text-emerald-950 font-extrabold";
        else if (isWrongSol) btnClass = "bg-rose-100 border-2 border-rose-500 text-rose-950 font-extrabold";
        else if (isSel) btnClass = "bg-sky-600 text-white border-2 border-sky-600 font-extrabold";

        optHtml += `
            <div onclick="selectCbtOption(${idx}, event); event.stopPropagation();" class="p-3.5 rounded-xl cursor-pointer flex items-center gap-3 transition-all ${btnClass}">
                <span class="w-7 h-7 rounded-lg bg-sky-100 text-sky-900 font-black flex items-center justify-center text-xs shrink-0">${String.fromCharCode(65 + idx)}</span>
                <span class="text-sm font-medium">${opt}</span>
            </div>
        `;
    });
    document.getElementById('cbtOptionsList').innerHTML = optHtml;

    // Render Solution if submitted
    let solBox = document.getElementById('cbtSolutionBox');
    let solHtml = document.getElementById('cbtSolutionHtml');
    if (appState.cbtSubmitted) {
        solBox.classList.remove('hidden');
        solHtml.innerHTML = q.solution;
    } else {
        solBox.classList.add('hidden');
    }

    renderCbtPalette();
}

function selectCbtOption(idx, e) {
    if (e) e.stopPropagation();
    if (appState.cbtSubmitted) return; // Cannot change after submit
    appState.cbtAnswers[appState.cbtCurrentQIndex] = idx;
    renderCbtQuestion();
}

function clearCbtResponse(e) {
    if (e) e.stopPropagation();
    if (appState.cbtSubmitted) return;
    delete appState.cbtAnswers[appState.cbtCurrentQIndex];
    renderCbtQuestion();
}

function nextCbtQuestion(e) {
    if (e) e.stopPropagation();
    if (appState.cbtCurrentQIndex < appState.cbtQuestions.length - 1) {
        appState.cbtCurrentQIndex++;
        renderCbtQuestion();
    }
}

function prevCbtQuestion(e) {
    if (e) e.stopPropagation();
    if (appState.cbtCurrentQIndex > 0) {
        appState.cbtCurrentQIndex--;
        renderCbtQuestion();
    }
}

function renderCbtPalette() {
    let palette = document.getElementById('cbtPaletteGrid');
    if (!palette) return;

    let html = '';
    appState.cbtQuestions.forEach((q, idx) => {
        let isAns = appState.cbtAnswers[idx] !== undefined;
        let isCurr = appState.cbtCurrentQIndex === idx;
        let isCorrectResult = appState.cbtSubmitted && appState.cbtAnswers[idx] === q.correct;
        let isWrongResult = appState.cbtSubmitted && appState.cbtAnswers[idx] !== undefined && appState.cbtAnswers[idx] !== q.correct;

        let bgClass = "bg-slate-200 text-slate-800";
        if (isCorrectResult) bgClass = "bg-emerald-500 text-white";
        else if (isWrongResult) bgClass = "bg-rose-500 text-white";
        else if (isAns) bgClass = "bg-emerald-500 text-white";
        if (isCurr) bgClass += " ring-4 ring-sky-400";

        html += `
            <button onclick="jumpCbtQuestion(${idx}, event); event.stopPropagation();" class="w-10 h-10 rounded-xl font-black text-xs border-0 cursor-pointer ${bgClass}">
                ${idx + 1}
            </button>
        `;
    });
    palette.innerHTML = html;
}

function jumpCbtQuestion(idx, e) {
    if (e) e.stopPropagation();
    appState.cbtCurrentQIndex = idx;
    renderCbtQuestion();
}

function submitCbtTest(e) {
    if (e) e.stopPropagation();
    if (!appState.cbtSubmitted && !confirm("Kya aap apna CBT Mock Test submit karna chahte hain?")) return;

    appState.cbtSubmitted = true;
    if (appState.cbtTimerInterval) clearInterval(appState.cbtTimerInterval);

    let correctCount = 0;
    let wrongCount = 0;
    let skipCount = 0;

    appState.cbtQuestions.forEach((q, idx) => {
        let ans = appState.cbtAnswers[idx];
        if (ans === undefined) skipCount++;
        else if (ans === q.correct) correctCount++;
        else wrongCount++;
    });

    let totalMarks = (correctCount * 2) - (wrongCount * 0.5);

    document.getElementById('cbtResultCard').classList.remove('hidden');
    document.getElementById('cbtSubmitBtn').classList.add('hidden');
    document.getElementById('cbtFinalScoreText').innerText = `Score: ${totalMarks} / ${appState.cbtQuestions.length * 2}`;
    document.getElementById('cbtStatCorrect').innerText = `✅ Correct: ${correctCount}`;
    document.getElementById('cbtStatWrong').innerText = `❌ Wrong: ${wrongCount}`;
    document.getElementById('cbtStatSkip').innerText = `⚪ Skipped: ${skipCount}`;

    renderCbtQuestion();
}

function reAttemptCbtTest(e) {
    if (e) e.stopPropagation();
    appState.cbtSubmitted = false;
    appState.cbtAnswers = {};
    appState.cbtCurrentQIndex = 0;
    appState.cbtTimerSeconds = 3600;
    document.getElementById('cbtResultCard').classList.add('hidden');
    document.getElementById('cbtSubmitBtn').classList.remove('hidden');
    renderCbtQuestion();
    startCbtTimer();
}

function exitCbtTest(e) {
    if (e) e.stopPropagation();
    if (appState.cbtTimerInterval) clearInterval(appState.cbtTimerInterval);
    handleGlobalBack();
}
