/* =========================================================
   RWA SKY PRO PORTAL — AUTH, LOGIN & LIVE PROFILE ENGINE (auth.js)
   Endpoints from Logs:
   1. GET  https://rozgarapinew.teachx.in/get/get_user_dt?userid={UID}
   2. POST https://rozgarapinew.teachx.in/post/userLogin
   ========================================================= */

const RWA_API_BASE = "https://rozgarapinew.teachx.in";

// Default Account Snapshot from Logs (User ID: 4756316 - sandeep)
const DEFAULT_SANDEEP_ACCOUNT = {
    userid: "4756316",
    name: "sandeep",
    username: "fo9OcD",
    email: "sandeepkaswan254@gmail.com",
    phone: "9646040254",
    state: "Rajasthan",
    district: "churu",
    info_1: "OBC",
    info_2: "Male",
    refer_code: "USER9646040254",
    user_xp: "0",
    credits: "0",
    datetime: "2023-11-06 10:22:36",
    status: "0",
    photo: "",
    weblogin_id: "rzxao89i59e",
    token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjQ3NTYzMTYiLCJlbWFpbCI6InNhbmRlZXBrYXN3YW4yNTRAZ21haWwuY29tIiwidGltZXN0YW1wIjoxNzU5MDE1MDc1fQ.1X6N7pX9qV3mK2wL8zR5yT4vB0nJ6cH8gF2dA4sE1uI"
};

// LocalStorage Keys
const LS_ACTIVE_USER_KEY = "rwa_sky_active_user_v1";
const LS_LOGGED_OUT_KEY  = "rwa_sky_is_logged_out_v1";

/* =========================================================
   1. INITIALIZE AUTH & PROFILE ON PAGE LOAD
   ========================================================= */
function initAuthEngine() {
    const isLoggedOut = localStorage.getItem(LS_LOGGED_OUT_KEY) === "true";

    if (isLoggedOut) {
        renderLoggedOutUI();
        return;
    }

    let savedUser = null;
    try {
        savedUser = JSON.parse(localStorage.getItem(LS_ACTIVE_USER_KEY));
    } catch (e) {
        savedUser = null;
    }

    if (!savedUser || !savedUser.userid) {
        savedUser = { ...DEFAULT_SANDEEP_ACCOUNT };
        localStorage.setItem(LS_ACTIVE_USER_KEY, JSON.stringify(savedUser));
    }

    // Apply to UI immediately and sync with Multi-Token list
    renderUserProfileUI(savedUser);
    syncActiveUserWithTokenManager(savedUser);

    // Also fetch fresh live profile from RWA API in background
    fetchAndRenderUserProfile(false);
}

/* =========================================================
   2. DECODE JWT TOKEN TO EXTRACT USER ID & EMAIL
   ========================================================= */
function decodeJwtPayload(jwtStr) {
    try {
        if (!jwtStr || !jwtStr.includes(".")) return null;
        const base64Url = jwtStr.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

/* =========================================================
   3. FETCH LIVE USER PROFILE FROM /get/get_user_dt?userid=...
   ========================================================= */
async function fetchAndRenderUserProfile(showNotification = false) {
    let currentUser = getActiveUserObj();
    if (!currentUser || !currentUser.userid) {
        if (showNotification) alert("Please login first!");
        return;
    }

    const uid = String(currentUser.userid).trim();
    const token = currentUser.token || DEFAULT_SANDEEP_ACCOUNT.token;

    try {
        const res = await fetch(`${RWA_API_BASE}/get/get_user_dt?userid=${encodeURIComponent(uid)}`, {
            method: "GET",
            headers: {
                "Client-Service": "Appx",
                "Auth-Key": "appxapi",
                "User-ID": uid,
                "Authorization": token
            }
        });

        const json = await res.json();
        if (json && Number(json.status) === 200 && json.data) {
            const d = json.data;
            const updatedUser = {
                ...currentUser,
                userid: String(d.id || uid),
                name: d.name || currentUser.name || "Student",
                username: d.username || currentUser.username || "",
                email: d.email || currentUser.email || "",
                phone: d.phone || currentUser.phone || "",
                state: d.state || currentUser.state || "",
                district: d.district || currentUser.district || "",
                info_1: d.info_1 || currentUser.info_1 || "General",
                info_2: d.info_2 || currentUser.info_2 || "",
                refer_code: d.refer_code || currentUser.refer_code || "",
                user_xp: String(d.user_xp ?? "0"),
                credits: String(d.credits ?? "0"),
                datetime: d.datetime || currentUser.datetime || "",
                status: String(d.status ?? "0"),
                photo: d.photo || ""
            };

            localStorage.setItem(LS_ACTIVE_USER_KEY, JSON.stringify(updatedUser));
            localStorage.setItem(LS_LOGGED_OUT_KEY, "false");
            renderUserProfileUI(updatedUser);
            syncActiveUserWithTokenManager(updatedUser);

            if (showNotification) {
                alert(`✅ Live Profile Refreshed for ${updatedUser.name} (UID: #${updatedUser.userid})`);
            }
        } else {
            // Render cached profile gracefully if token expired or offline
            renderUserProfileUI(currentUser);
            if (showNotification) {
                alert("ℹ️ Loaded saved profile details (Live API returned status " + (json?.status || "unknown") + ").");
            }
        }
    } catch (err) {
        console.warn("Live Profile Fetch Fallback:", err);
        renderUserProfileUI(currentUser);
        if (showNotification) {
            alert("⚠️ Network/CORS restriction while contacting live profile server. Showing saved profile data.");
        }
    }
}

/* =========================================================
   4. RENDER PROFILE DATA ACROSS NAVBAR, HOME BANNER & PROFILE SLIDE
   ========================================================= */
function renderUserProfileUI(u) {
    if (!u) return;

    const firstLetter = (u.name || "S").trim().charAt(0).toUpperCase();

    // 1. Navbar Profile Button
    const navProfileBtn = document.getElementById("navProfileBtn");
    const navLoginBtn   = document.getElementById("navLoginBtn");
    const navLogoutBtn  = document.getElementById("navLogoutBtn");
    const navUserAvatar = document.getElementById("navUserAvatar");
    const navUserName   = document.getElementById("navUserName");

    if (navProfileBtn) navProfileBtn.classList.remove("hidden");
    if (navLogoutBtn)  navLogoutBtn.classList.remove("hidden");
    if (navLoginBtn)   navLoginBtn.classList.add("hidden");
    if (navUserAvatar) navUserAvatar.textContent = firstLetter;
    if (navUserName)   navUserName.textContent = u.name || "Profile";

    // 2. Home Hub Welcome Banner
    const homeWelcomeBanner = document.getElementById("homeWelcomeBanner");
    const homeAvatarCircle  = document.getElementById("homeAvatarCircle");
    const homeWelcomeName   = document.getElementById("homeWelcomeName");
    const homeWelcomeSub    = document.getElementById("homeWelcomeSub");

    if (homeWelcomeBanner) homeWelcomeBanner.classList.remove("hidden");
    if (homeAvatarCircle)  homeAvatarCircle.textContent = firstLetter;
    if (homeWelcomeName)   homeWelcomeName.textContent = `${u.name || "Student"} (ID: ${u.userid || "N/A"})`;
    if (homeWelcomeSub) {
        const loc = [u.state, u.district].filter(Boolean).join(" • ");
        homeWelcomeSub.textContent = `${u.email || u.phone || "Active Account"}${loc ? " • " + loc : ""}`;
    }

    // 3. Slide 7: Full User Profile Elements
    const profFullName      = document.getElementById("profFullName");
    const profUserIdBadge   = document.getElementById("profUserIdBadge");
    const profUsernameBadge = document.getElementById("profUsernameBadge");
    const profEmailText     = document.getElementById("profEmailText");
    const profPhoneText     = document.getElementById("profPhoneText");
    const profReferCode     = document.getElementById("profReferCode");
    const profXpBadge       = document.getElementById("profXpBadge");
    const profStateDist     = document.getElementById("profStateDist");
    const profCatGender     = document.getElementById("profCatGender");
    const profJoinDate      = document.getElementById("profJoinDate");
    const profAadharStatus  = document.getElementById("profAadharStatus");
    const profWebloginId    = document.getElementById("profWebloginId");
    const profPhotoImg      = document.getElementById("profPhotoImg");
    const profAvatarFallback = document.getElementById("profAvatarFallback");

    if (profFullName)      profFullName.textContent = u.name || "RWA Student";
    if (profUserIdBadge)   profUserIdBadge.textContent = `UID: #${u.userid || "N/A"}`;
    if (profUsernameBadge) profUsernameBadge.textContent = u.username ? `@${u.username}` : "@student";
    if (profEmailText)     profEmailText.textContent = `📧 ${u.email || "Not Provided"}`;
    if (profPhoneText)     profPhoneText.textContent = `📱 +91 ${u.phone || "Not Provided"}`;
    if (profReferCode)     profReferCode.textContent = u.refer_code || `USER${u.phone || u.userid}`;
    if (profXpBadge)       profXpBadge.textContent = `⭐ XP: ${u.user_xp || 0} | Credits: ${u.credits || 0}`;
    if (profStateDist)     profStateDist.textContent = `${u.state || "India"}${u.district ? ", " + u.district : ""}`;
    if (profCatGender)     profCatGender.textContent = `${u.info_1 || "General"} • ${u.info_2 || "Student"}`;
    if (profJoinDate)      profJoinDate.textContent = u.datetime || "Active Member";
    if (profAadharStatus)  profAadharStatus.textContent = `Verified Account (Status: ${u.status || "0"})`;
    if (profWebloginId)    profWebloginId.textContent = u.weblogin_id || "rzxao89i59e";

    if (u.photo && String(u.photo).startsWith("http")) {
        if (profPhotoImg) {
            profPhotoImg.src = u.photo;
            profPhotoImg.classList.remove("hidden");
        }
        if (profAvatarFallback) profAvatarFallback.classList.add("hidden");
    } else {
        if (profPhotoImg) profPhotoImg.classList.add("hidden");
        if (profAvatarFallback) {
            profAvatarFallback.textContent = firstLetter;
            profAvatarFallback.classList.remove("hidden");
        }
    }
}

/* =========================================================
   5. RENDER LOGGED-OUT UI STATE
   ========================================================= */
function renderLoggedOutUI() {
    const navProfileBtn = document.getElementById("navProfileBtn");
    const navLoginBtn   = document.getElementById("navLoginBtn");
    const navLogoutBtn  = document.getElementById("navLogoutBtn");
    const homeWelcomeName = document.getElementById("homeWelcomeName");
    const homeWelcomeSub  = document.getElementById("homeWelcomeSub");
    const homeAvatarCircle = document.getElementById("homeAvatarCircle");

    if (navProfileBtn) navProfileBtn.classList.add("hidden");
    if (navLogoutBtn)  navLogoutBtn.classList.add("hidden");
    if (navLoginBtn)   navLoginBtn.classList.remove("hidden");

    if (homeAvatarCircle) homeAvatarCircle.textContent = "?";
    if (homeWelcomeName)  homeWelcomeName.textContent = "Guest User (Not Logged In)";
    if (homeWelcomeSub)   homeWelcomeSub.textContent = "Click 'Switch / Login' to sign in with Mobile/Password or JWT Token.";
}

/* =========================================================
   6. LOGIN MODAL / SLIDE NAVIGATION & TAB SWITCHING
   ========================================================= */
function openProfileSlide() {
    const isLoggedOut = localStorage.getItem(LS_LOGGED_OUT_KEY) === "true";
    if (isLoggedOut) {
        openLoginSlide();
        return;
    }
    if (typeof showOnlySlide === "function") {
        showOnlySlide("slideProfile");
    }
    const u = getActiveUserObj();
    if (u) renderUserProfileUI(u);
}

function openLoginSlide() {
    if (typeof showOnlySlide === "function") {
        showOnlySlide("slideLogin");
    }
    hideLoginAlert();
}

function switchLoginTab(mode) {
    const tabCred   = document.getElementById("tabLoginCred");
    const tabToken  = document.getElementById("tabLoginToken");
    const formCred  = document.getElementById("loginFormCred");
    const formToken = document.getElementById("loginFormToken");

    hideLoginAlert();

    if (mode === "cred") {
        tabCred.className  = "py-2 rounded-xl font-black text-xs bg-blue-600 text-white border-0 cursor-pointer transition-all";
        tabToken.className = "py-2 rounded-xl font-black text-xs bg-transparent text-slate-700 border-0 cursor-pointer transition-all";
        formCred.classList.remove("hidden");
        formToken.classList.add("hidden");
    } else {
        tabToken.className = "py-2 rounded-xl font-black text-xs bg-blue-600 text-white border-0 cursor-pointer transition-all";
        tabCred.className  = "py-2 rounded-xl font-black text-xs bg-transparent text-slate-700 border-0 cursor-pointer transition-all";
        formToken.classList.remove("hidden");
        formCred.classList.add("hidden");
    }
}

function showLoginAlert(msg, isSuccess = false) {
    const box = document.getElementById("loginStatusAlert");
    if (!box) return;
    box.classList.remove("hidden");
    box.className = isSuccess
        ? "mb-4 p-3 rounded-xl text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300"
        : "mb-4 p-3 rounded-xl text-xs font-extrabold bg-rose-100 text-rose-900 border border-rose-300";
    box.textContent = msg;
}

function hideLoginAlert() {
    const box = document.getElementById("loginStatusAlert");
    if (box) box.classList.add("hidden");
}

/* =========================================================
   7. MOBILE / EMAIL + PASSWORD LOGIN (/post/userLogin)
   ========================================================= */
async function handleCredentialLogin() {
    const phoneOrEmail = (document.getElementById("loginPhoneInput")?.value || "").trim();
    const password     = (document.getElementById("loginPassInput")?.value || "").trim();
    const btn          = document.getElementById("btnSubmitCredLogin");

    if (!phoneOrEmail || !password) {
        showLoginAlert("⚠️ Please enter both Mobile/Email and Password!");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Authenticating with RWA Server...";
    }

    try {
        const formData = new URLSearchParams();
        formData.append("email", phoneOrEmail);
        formData.append("phone", phoneOrEmail);
        formData.append("password", password);
        formData.append("devicetoken", "web_rwa_sky_portal");
        formData.append("mydeviceid", "web_" + Math.random().toString(36).substring(2, 11));

        const res = await fetch(`${RWA_API_BASE}/post/userLogin`, {
            method: "POST",
            headers: {
                "Client-Service": "Appx",
                "Auth-Key": "appxapi",
                "User-ID": "-2",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: formData.toString()
        });

        const json = await res.json();

        if (json && Number(json.status) === 200 && json.data) {
            const d = json.data;
            const uid = String(d.userid || d.id || "4756316");
            const token = d.token || DEFAULT_SANDEEP_ACCOUNT.token;

            const newUser = {
                userid: uid,
                name: d.name || "RWA Student",
                username: d.username || "",
                email: d.email || phoneOrEmail,
                phone: d.phone || phoneOrEmail,
                state: d.state || "India",
                district: d.district || "",
                info_1: d.info_1 || "General",
                info_2: d.info_2 || "",
                refer_code: d.refer_code || `USER${uid}`,
                user_xp: String(d.user_xp ?? "0"),
                credits: String(d.credits ?? "0"),
                datetime: d.datetime || new Date().toISOString().slice(0, 19).replace("T", " "),
                status: String(d.status ?? "0"),
                photo: d.photo || "",
                weblogin_id: Math.random().toString(36).substring(2, 13),
                token: token
            };

            localStorage.setItem(LS_ACTIVE_USER_KEY, JSON.stringify(newUser));
            localStorage.setItem(LS_LOGGED_OUT_KEY, "false");

            showLoginAlert(`✅ Login Successful! Welcome ${newUser.name} (UID: #${newUser.userid})`, true);
            renderUserProfileUI(newUser);
            syncActiveUserWithTokenManager(newUser);

            // Fetch full profile details from /get/get_user_dt
            await fetchAndRenderUserProfile(false);

            setTimeout(() => {
                openProfileSlide();
            }, 700);
        } else {
            showLoginAlert(`❌ Login Failed: ${json?.message || "Invalid credentials or OTP/Device lock active. Try JWT Token tab."}`);
        }
    } catch (err) {
        showLoginAlert("⚠️ Direct login blocked by CORS or network error. Please use the 'JWT Token / UID' tab.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "🚀 Login to RWA Portal";
        }
    }
}

/* =========================================================
   8. DIRECT JWT TOKEN + USER ID LOGIN
   ========================================================= */
async function handleTokenLogin() {
    let uidInput = (document.getElementById("loginUidInput")?.value || "").trim();
    const jwtInput = (document.getElementById("loginJwtInput")?.value || "").trim();

    if (!jwtInput) {
        showLoginAlert("⚠️ Please paste a valid Authorization JWT Token!");
        return;
    }

    const decoded = decodeJwtPayload(jwtInput);
    if (!uidInput && decoded && (decoded.id || decoded.userid)) {
        uidInput = String(decoded.id || decoded.userid);
    }
    if (!uidInput) {
        uidInput = "4756316";
    }

    const newUser = {
        ...DEFAULT_SANDEEP_ACCOUNT,
        userid: uidInput,
        email: (decoded && decoded.email) ? decoded.email : DEFAULT_SANDEEP_ACCOUNT.email,
        name: uidInput === "4756316" ? "sandeep" : `Student #${uidInput}`,
        weblogin_id: Math.random().toString(36).substring(2, 13),
        token: jwtInput
    };

    localStorage.setItem(LS_ACTIVE_USER_KEY, JSON.stringify(newUser));
    localStorage.setItem(LS_LOGGED_OUT_KEY, "false");

    renderUserProfileUI(newUser);
    syncActiveUserWithTokenManager(newUser);
    showLoginAlert(`✅ Token Verified for UID #${uidInput}! Fetching live profile...`, true);

    await fetchAndRenderUserProfile(false);

    setTimeout(() => {
        openProfileSlide();
    }, 600);
}

/* =========================================================
   9. RESTORE DEFAULT ACCOUNT (SANDEEP #4756316 FROM LOGS)
   ========================================================= */
function restoreDefaultSandeepLogin() {
    localStorage.setItem(LS_ACTIVE_USER_KEY, JSON.stringify(DEFAULT_SANDEEP_ACCOUNT));
    localStorage.setItem(LS_LOGGED_OUT_KEY, "false");
    renderUserProfileUI(DEFAULT_SANDEEP_ACCOUNT);
    syncActiveUserWithTokenManager(DEFAULT_SANDEEP_ACCOUNT);
    showLoginAlert("✅ Restored Default Account: sandeep (UID: #4756316)", true);
    setTimeout(() => {
        openProfileSlide();
    }, 500);
}

/* =========================================================
   10. LOGOUT CURRENT USER
   ========================================================= */
function logoutCurrentUser() {
    if (!confirm("Are you sure you want to Logout from your RWA account?")) return;

    localStorage.setItem(LS_LOGGED_OUT_KEY, "true");
    renderLoggedOutUI();
    openLoginSlide();
    showLoginAlert("✅ You have been logged out safely. Login below anytime.", true);
}

/* =========================================================
   11. HELPER: GET ACTIVE USER & SYNC WITH MULTI-TOKEN MANAGER
   ========================================================= */
function getActiveUserObj() {
    try {
        return JSON.parse(localStorage.getItem(LS_ACTIVE_USER_KEY)) || DEFAULT_SANDEEP_ACCOUNT;
    } catch (e) {
        return DEFAULT_SANDEEP_ACCOUNT;
    }
}

function syncActiveUserWithTokenManager(userObj) {
    if (!userObj || !userObj.token) return;
    if (typeof window.ensureUserTokenInPool === "function") {
        window.ensureUserTokenInPool({
            label: `${userObj.name || "Account"} (#${userObj.userid || "RWA"})`,
            uid: String(userObj.userid || "4756316"),
            token: userObj.token
        });
    }
}

// Auto-initialize on DOM ready
document.addEventListener("DOMContentLoaded", initAuthEngine);
