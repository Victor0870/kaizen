import { initI18n, t, onLanguageChange, applyI18n } from "./i18n.js";
import { bindPasswordExpiry } from "./password-expiry.js";
import {
  PREVIEW_MODE,
  CAP_BAC_OPTIONS,
  DEPARTMENT_OPTIONS,
  CLASSIFICATION_CODES,
  KAIZEN_STATUS,
  LIST_STATUS_FILTERS,
  normalizeKaizenStatus
} from "./constants.js";
import {
  calcTotalSavings,
  uploadKaizenImage,
  saveKaizenRecord,
  fetchKaizenList
} from "./kaizen-service.js";

let auth = null;
let db = null;
let authPersistenceReady = Promise.resolve();
let initAppCheck = async () => {};
let onAuthStateChanged = () => () => {};
let signInWithEmailAndPassword = async () => {};
let createUserWithEmailAndPassword = async () => {};
let signOut = async () => {};
let deleteUser = async () => {};
let doc = () => {};
let getDoc = async () => {};
let setDoc = async () => {};
let serverTimestamp = () => null;

let currentFirebaseUser = null;
let currentUserProfile = null;
let isHandlingRegistration = false;
let toastTimer = null;
let activeTab = "idea";
let listStatusFilter = "all";
let selectedClassification = [];
let kaizenListCache = [];
let isSaving = false;

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  initI18n();
  populateRegisterSelects();
  bindEvents();
  syncFormDefaults();
  renderClassificationButtons();
  updateMetricsUI();

  onLanguageChange(() => {
    document.querySelectorAll("[data-original-text]").forEach((el) => {
      delete el.dataset.originalText;
    });
    applyI18n();
    populateRegisterSelects();
    renderClassificationButtons();
    renderKaizenTable();
    if (currentUserProfile && currentFirebaseUser) {
      fillUserDisplay(currentUserProfile, currentFirebaseUser);
    }
    updateListHeading();
    renderDashboardStats();
  });

  if (PREVIEW_MODE) {
    await enterPreviewMode();
    return;
  }

  const firebase = await import("./firebase-config.js");
  auth = firebase.auth;
  db = firebase.db;
  authPersistenceReady = firebase.authPersistenceReady;
  initAppCheck = firebase.initAppCheck;
  onAuthStateChanged = firebase.onAuthStateChanged;
  signInWithEmailAndPassword = firebase.signInWithEmailAndPassword;
  createUserWithEmailAndPassword = firebase.createUserWithEmailAndPassword;
  signOut = firebase.signOut;
  deleteUser = firebase.deleteUser;
  doc = firebase.doc;
  getDoc = firebase.getDoc;
  setDoc = firebase.setDoc;
  serverTimestamp = firebase.serverTimestamp;

  await initAppCheck();
  await authPersistenceReady;
  observeAuthState();
}

async function enterPreviewMode() {
  const demoProfile = {
    uid: "preview-user",
    email: "preview@local.dev",
    taiKhoan: "DEMO001",
    hoTen: "Người dùng xem trước",
    department: "GAHR",
    capBac: "Staff",
    role: "user",
    status: "active",
    passwordChangedAt: new Date(),
    createdAt: new Date()
  };
  const demoUser = { email: demoProfile.email, metadata: { creationTime: new Date().toISOString() } };

  currentUserProfile = demoProfile;
  currentFirebaseUser = demoUser;

  document.body.classList.add("preview-mode");
  ensurePreviewBanner();
  await showAppScreen(demoProfile, demoUser);
  showPageLoader(false);
  showToast(t("preview.enabled"), "info");
}

function ensurePreviewBanner() {
  if (document.getElementById("previewBanner")) return;
  const banner = document.createElement("div");
  banner.id = "previewBanner";
  banner.className = "preview-banner";
  banner.innerHTML = `<strong data-i18n="preview.bannerTitle">${t("preview.bannerTitle")}</strong>
    <span data-i18n="preview.bannerHint">${t("preview.bannerHint")}</span>`;
  document.body.prepend(banner);
  applyI18n(banner);
}

function populateRegisterSelects() {
  const deptSelect = document.getElementById("registerDepartmentInput");
  const capSelect = document.getElementById("registerCapBacInput");
  if (!deptSelect || !capSelect) return;

  const currentDept = deptSelect.value;
  const currentCap = capSelect.value;

  deptSelect.innerHTML = `<option value="">${t("auth.placeholder.selectDepartment")}</option>` +
    DEPARTMENT_OPTIONS.map((d) => `<option value="${d}">${d}</option>`).join("");
  capSelect.innerHTML = `<option value="">${t("auth.placeholder.selectCapBac")}</option>` +
    CAP_BAC_OPTIONS.map((c) => `<option value="${c}">${c}</option>`).join("");

  if (currentDept) deptSelect.value = currentDept;
  if (currentCap) capSelect.value = currentCap;
}

function bindEvents() {
  document.getElementById("showLoginTabBtn")?.addEventListener("click", () => showAuthTab("login"));
  document.getElementById("showRegisterTabBtn")?.addEventListener("click", () => showAuthTab("register"));
  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
  document.getElementById("registerForm")?.addEventListener("submit", handleRegister);
  document.getElementById("logoutBtn")?.addEventListener("click", handleLogout);
  document.getElementById("togglePasswordBtn")?.addEventListener("click", togglePasswordVisibility);

  document.querySelectorAll("[data-tab]").forEach((el) => {
    el.addEventListener("click", () => setActiveTab(el.dataset.tab, el.dataset.status));
  });

  document.getElementById("goReportBtn")?.addEventListener("click", () => {
    syncIdeaToReportFields();
    setActiveTab("report");
  });
  document.getElementById("createNewBtn")?.addEventListener("click", () => {
    resetFormForNew();
    setActiveTab("idea");
  });
  document.getElementById("saveIdeaBtn")?.addEventListener("click", () => saveKaizen("idea"));
  document.getElementById("saveReportBtn")?.addEventListener("click", () => saveKaizen("report"));

  ["beforeWorkHour", "afterWorkHour", "beforeNearMiss", "afterNearMiss", "dailyHoursSaved", "monthlyDays", "hourlyCost"]
    .forEach((id) => document.getElementById(id)?.addEventListener("input", updateMetricsUI));

  document.getElementById("ideaProposer")?.addEventListener("input", (e) => {
    const other = document.getElementById("ideaProposer2");
    if (other) other.value = e.target.value;
  });
  document.getElementById("ideaProposer2")?.addEventListener("input", (e) => {
    const other = document.getElementById("ideaProposer");
    if (other) other.value = e.target.value;
  });
}

function showAuthTab(tabName) {
  const isRegister = tabName === "register";
  document.getElementById("showLoginTabBtn")?.classList.toggle("active", !isRegister);
  document.getElementById("showRegisterTabBtn")?.classList.toggle("active", isRegister);
  document.getElementById("loginPanel")?.classList.toggle("active", !isRegister);
  document.getElementById("loginPanel")?.classList.toggle("hidden", isRegister);
  document.getElementById("registerPanel")?.classList.toggle("active", isRegister);
  document.getElementById("registerPanel")?.classList.toggle("hidden", !isRegister);
}

function observeAuthState() {
  showPageLoader(true, t("common.checkingSession"));

  onAuthStateChanged(auth, async (user) => {
    if (isHandlingRegistration) return;

    try {
      if (!user) {
        currentFirebaseUser = null;
        currentUserProfile = null;
        showLoginScreen();
        return;
      }

      currentFirebaseUser = user;
      const profile = await loadOrProvisionUserProfile(user);
      ensureAuthorizedAccess(profile);
      currentUserProfile = profile;
      await showAppScreen(profile, user);
      showToast(t("auth.loginSuccess"), "success");
    } catch (error) {
      console.error(error);
      const message = error.message || t("auth.loadProfileFailed");
      if (shouldSignOutOnAccessError(message)) {
        await safeSignOut();
        showLoginScreen();
      } else {
        showLoginScreen();
      }
      showToast(message, "error");
    } finally {
      showPageLoader(false);
    }
  });
}

async function handleLogin(event) {
  event.preventDefault();
  if (PREVIEW_MODE) return;

  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value;
  const loginBtn = document.getElementById("loginBtn");

  if (!email || !password) {
    showToast(t("auth.fillEmailPassword"), "error");
    return;
  }

  setButtonLoading(loginBtn, true, t("auth.loggingIn"));
  try {
    await signInWithEmailAndPassword(auth, email, password);
    document.getElementById("passwordInput").value = "";
    // Thành công thật sự khi observeAuthState tải được hồ sơ và vào app.
  } catch (error) {
    console.error(error);
    showToast(getFirebaseErrorMessage(error), "error");
  } finally {
    setButtonLoading(loginBtn, false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  if (PREVIEW_MODE) return;

  const registerBtn = document.getElementById("registerBtn");
  const email = document.getElementById("registerEmailInput").value.trim().toLowerCase();
  const password = document.getElementById("registerPasswordInput").value;
  const confirmPassword = document.getElementById("registerConfirmPasswordInput").value;
  const taiKhoan = document.getElementById("registerTaiKhoanInput").value.trim();
  const hoTen = document.getElementById("registerHoTenInput").value.trim();
  const department = document.getElementById("registerDepartmentInput").value.trim();
  const capBac = document.getElementById("registerCapBacInput").value.trim();

  const validationMessage = validateRegisterForm({
    email, password, confirmPassword, taiKhoan, hoTen, department, capBac
  });
  if (validationMessage) {
    showToast(validationMessage, "error");
    return;
  }

  let createdAuthUser = null;
  setButtonLoading(registerBtn, true, t("auth.registering"));
  showPageLoader(true, t("auth.creatingAccount"));
  isHandlingRegistration = true;

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    createdAuthUser = credential.user;

    await setDoc(doc(db, "users", createdAuthUser.uid), {
      uid: createdAuthUser.uid,
      email,
      taiKhoan,
      hoTen,
      department,
      capBac,
      role: "user",
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    document.getElementById("registerForm").reset();
    await signOut(auth);
    currentFirebaseUser = null;
    currentUserProfile = null;
    showLoginScreen(email);
    showToast(t("auth.registerSuccess"), "success");
  } catch (error) {
    console.error(error);
    if (createdAuthUser) {
      try { await deleteUser(createdAuthUser); } catch (e) { console.warn(e); }
    }
    showToast(getRegisterErrorMessage(error), "error");
  } finally {
    isHandlingRegistration = false;
    setButtonLoading(registerBtn, false);
    showPageLoader(false);
  }
}

function validateRegisterForm({ email, password, confirmPassword, taiKhoan, hoTen, department, capBac }) {
  if (!email || !password || !confirmPassword || !taiKhoan || !hoTen || !department || !capBac) {
    return t("auth.fillRegisterInfo");
  }
  if (password.length < 6) return t("auth.passwordMin6");
  if (password !== confirmPassword) return t("auth.passwordMismatch");
  if (!DEPARTMENT_OPTIONS.includes(department)) return t("auth.fillRegisterInfo");
  if (!CAP_BAC_OPTIONS.includes(capBac)) return t("auth.fillRegisterInfo");
  return "";
}

async function handleLogout() {
  if (PREVIEW_MODE) {
    showToast(t("preview.logoutDisabled"), "info");
    return;
  }
  try {
    await signOut(auth);
    showToast(t("auth.loggedOut"), "info");
  } catch (error) {
    console.error(error);
    showToast(t("common.logoutFailed"), "error");
  }
}

function togglePasswordVisibility() {
  const input = document.getElementById("passwordInput");
  const btn = document.getElementById("togglePasswordBtn");
  if (!input || !btn) return;
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = t("auth.hidePassword");
  } else {
    input.type = "password";
    btn.textContent = t("auth.showPassword");
  }
}

async function safeSignOut() {
  try { await signOut(auth); } catch (e) { console.warn(e); }
}

async function loadOrProvisionUserProfile(firebaseUser) {
  const uid = firebaseUser.uid;
  let docSnap;
  try {
    docSnap = await getDoc(doc(db, "users", uid));
  } catch (error) {
    console.error(error);
    if (error?.code === "permission-denied") {
      throw new Error(t("auth.firestorePermissionDenied"));
    }
    throw new Error(error?.message || t("auth.loadProfileFailed"));
  }

  if (docSnap.exists()) {
    return mapUserProfile(uid, docSnap.data());
  }

  // User tạo trên Firebase Auth Console chưa có document Firestore → tự tạo hồ sơ active.
  const email = String(firebaseUser.email || "").toLowerCase();
  const localPart = email.split("@")[0] || "user";
  const payload = {
    uid,
    email,
    taiKhoan: localPart.slice(0, 32),
    hoTen: localPart,
    department: "OTHER",
    capBac: "Staff",
    role: "user",
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    provisionedFromAuth: true
  };

  try {
    await setDoc(doc(db, "users", uid), payload);
  } catch (error) {
    console.error(error);
    if (error?.code === "permission-denied") {
      throw new Error(t("auth.provisionDenied"));
    }
    throw new Error(error?.message || t("auth.profileNotFound"));
  }

  return mapUserProfile(uid, {
    ...payload,
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

function mapUserProfile(uid, profile) {
  return {
    uid,
    email: profile.email || "",
    taiKhoan: profile.taiKhoan || "",
    hoTen: profile.hoTen || "",
    department: profile.department || "",
    capBac: profile.capBac || "",
    role: profile.role || "user",
    status: profile.status || "pending",
    passwordChangedAt: profile.passwordChangedAt || null,
    createdAt: profile.createdAt || null
  };
}

async function loadCurrentUserProfile(uid) {
  const docSnap = await getDoc(doc(db, "users", uid));
  if (!docSnap.exists()) throw new Error(t("auth.profileNotFound"));
  return mapUserProfile(uid, docSnap.data());
}

/** Chỉ kiểm tra trạng thái tài khoản — chưa phân quyền theo cấp bậc. */
function ensureAuthorizedAccess(profile) {
  if (!profile) throw new Error(t("auth.invalidProfile"));
  const status = profile.status === "inactive" ? "pending" : profile.status;
  if (status === "pending") throw new Error(t("auth.pendingApproval"));
  if (status === "locked") throw new Error(t("auth.accountLocked"));
  if (status !== "active") throw new Error(t("auth.notActivated"));
}

function shouldSignOutOnAccessError(message) {
  const normalized = String(message || "").toLowerCase();
  return [
    "chờ quản trị", "pending", "bị khóa", "locked",
    "chưa được kích hoạt", "not activated", "không tìm thấy hồ sơ", "profile not found"
  ].some((k) => normalized.includes(k));
}

function showLoginScreen(prefillEmail = "") {
  document.getElementById("appScreen")?.classList.add("hidden");
  document.getElementById("loginScreen")?.classList.remove("hidden");
  document.getElementById("authShell")?.classList.remove("hidden");
  if (prefillEmail) {
    const emailInput = document.getElementById("emailInput");
    if (emailInput) emailInput.value = prefillEmail;
  }
  showAuthTab("login");
}

async function showAppScreen(profile, firebaseUser) {
  document.getElementById("loginScreen")?.classList.add("hidden");
  document.getElementById("authShell")?.classList.add("hidden");
  document.getElementById("appScreen")?.classList.remove("hidden");
  fillUserDisplay(profile, firebaseUser);
  bindPasswordExpiry(profile, firebaseUser);
  syncFormDefaults();
  setActiveTab(activeTab || "idea");
  await loadKaizenListSafe();
}

function fillUserDisplay(profile, firebaseUser) {
  const name = profile.hoTen || "-";
  const email = firebaseUser.email || profile.email || "";
  const department = profile.department || "-";
  document.getElementById("displayHoTen").textContent = name;
  document.getElementById("displayTaiKhoan").textContent = profile.taiKhoan || "-";
  document.getElementById("displayDepartment").textContent = department;
  document.getElementById("displayCapBac").textContent = profile.capBac || "-";
  const emailEl = document.getElementById("accountEmail");
  if (emailEl) emailEl.textContent = email;
  const initials = getInitials(name);
  const accountAvatar = document.getElementById("accountUserInitials");
  if (accountAvatar) accountAvatar.textContent = initials;
  const sidebarInitials = document.getElementById("appUserInitials");
  if (sidebarInitials) sidebarInitials.textContent = initials;
  const sidebarName = document.getElementById("sidebarUserName");
  if (sidebarName) sidebarName.textContent = name;
  const sidebarDept = document.getElementById("sidebarUserDept");
  if (sidebarDept) sidebarDept.textContent = department;

  const proposer = document.getElementById("ideaProposer");
  const proposer2 = document.getElementById("ideaProposer2");
  const dept = document.getElementById("ideaDept");
  if (proposer && !proposer.value) proposer.value = name;
  if (proposer2 && !proposer2.value) proposer2.value = name;
  if (dept && !dept.value) dept.value = profile.department || "";
  const reportDept = document.getElementById("reportDept");
  if (reportDept && !reportDept.value) reportDept.value = profile.department || "";
}

function getInitials(name) {
  const parts = String(name || "U").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function syncFormDefaults() {
  const today = new Date().toISOString().split("T")[0];
  const ideaDate = document.getElementById("ideaDate");
  const reportDate = document.getElementById("reportDate");
  if (ideaDate && !ideaDate.value) ideaDate.value = today;
  if (reportDate && !reportDate.value) reportDate.value = today;
}

function setActiveTab(tab, statusFilter) {
  activeTab = tab;
  if (tab === "list") {
    listStatusFilter = statusFilter || "all";
  }

  document.querySelectorAll("[data-tab]").forEach((el) => {
    const isListFilter = el.dataset.status != null;
    if (isListFilter) {
      el.classList.toggle("active", tab === "list" && el.dataset.status === listStatusFilter);
    } else {
      el.classList.toggle("active", el.dataset.tab === tab);
    }
  });

  document.getElementById("navGroupList")?.classList.toggle("is-open", tab === "list");

  document.getElementById("tabIdea")?.classList.toggle("hidden", tab !== "idea");
  document.getElementById("tabReport")?.classList.toggle("hidden", tab !== "report");
  document.getElementById("tabDashboard")?.classList.toggle("hidden", tab !== "dashboard");
  document.getElementById("tabList")?.classList.toggle("hidden", tab !== "list");
  document.getElementById("tabAccount")?.classList.toggle("hidden", tab !== "account");

  if (tab === "list") {
    updateListHeading();
    loadKaizenListSafe();
  }
  if (tab === "dashboard") {
    loadKaizenListSafe();
  }
}

function updateListHeading() {
  const title = document.getElementById("listTitle");
  const subtitle = document.getElementById("listSubtitle");
  if (!title || !subtitle) return;
  if (listStatusFilter && listStatusFilter !== "all") {
    title.textContent = t(`kaizen.status.${listStatusFilter}`);
    subtitle.textContent = t("kaizen.list.filterHint");
  } else {
    title.textContent = t("kaizen.list.title");
    subtitle.textContent = t("kaizen.list.subtitle");
  }
}

function renderClassificationButtons() {
  const wrap = document.getElementById("ideaClassification");
  if (!wrap) return;
  wrap.innerHTML = CLASSIFICATION_CODES.map((item) => {
    const active = selectedClassification.includes(item.code);
    return `<button type="button" class="kz-class-btn${active ? " active" : ""}" data-code="${item.code}">${item.code}</button>`;
  }).join("");
  wrap.querySelectorAll(".kz-class-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.code;
      if (selectedClassification.includes(code)) {
        selectedClassification = selectedClassification.filter((c) => c !== code);
      } else {
        selectedClassification = [...selectedClassification, code];
      }
      renderClassificationButtons();
    });
  });
}

function updateMetricsUI() {
  const beforeWH = Number(document.getElementById("beforeWorkHour")?.value) || 0;
  const afterWH = Number(document.getElementById("afterWorkHour")?.value) || 0;
  const beforeNM = Number(document.getElementById("beforeNearMiss")?.value) || 0;
  const afterNM = Number(document.getElementById("afterNearMiss")?.value) || 0;
  const daily = Number(document.getElementById("dailyHoursSaved")?.value) || 0;
  const days = Number(document.getElementById("monthlyDays")?.value) || 0;
  const rate = Number(document.getElementById("hourlyCost")?.value) || 0;

  const diffWH = afterWH - beforeWH;
  const diffNM = afterNM - beforeNM;
  const total = calcTotalSavings(daily, days, rate);

  const diffWhEl = document.getElementById("diffWorkHour");
  const diffNmEl = document.getElementById("diffNearMiss");
  const totalEl = document.getElementById("totalCostSavings");
  if (diffWhEl) {
    diffWhEl.textContent = `${diffWH}h`;
    diffWhEl.className = diffWH <= 0 ? "text-ok" : "text-bad";
  }
  if (diffNmEl) diffNmEl.textContent = String(diffNM);
  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

function syncIdeaToReportFields() {
  const map = [
    ["ideaKaizenId", "reportKaizenId"],
    ["ideaDate", "reportDate"],
    ["ideaDept", "reportDept"],
    ["ideaAfterDescription", "reportAfterDescription"],
    ["ideaProblemDesc", "reportBeforeDescription"]
  ];
  map.forEach(([from, to]) => {
    const a = document.getElementById(from);
    const b = document.getElementById(to);
    if (a && b && a.value && !b.value) b.value = a.value;
  });
}

function collectFormPayload(mode) {
  const kaizenId = (document.getElementById(mode === "report" ? "reportKaizenId" : "ideaKaizenId")?.value || "").trim();
  const date = document.getElementById(mode === "report" ? "reportDate" : "ideaDate")?.value || "";
  const dept = document.getElementById(mode === "report" ? "reportDept" : "ideaDept")?.value || "";
  const proposer = document.getElementById("ideaProposer")?.value || currentUserProfile?.hoTen || "";
  const improvedContent = document.getElementById("ideaImprovedContent")?.value.trim() || "";

  const dailyHoursSaved = Number(document.getElementById("dailyHoursSaved")?.value) || 0;
  const monthlyDays = Number(document.getElementById("monthlyDays")?.value) || 0;
  const hourlyCost = Number(document.getElementById("hourlyCost")?.value) || 0;

  return {
    kaizenId,
    date,
    dept,
    proposer,
    checked: document.getElementById("ideaChecked")?.value || "",
    approved: document.getElementById("ideaApproved")?.value || "",
    improvedContent,
    classification: [...selectedClassification],
    problemDesc: document.getElementById("ideaProblemDesc")?.value || "",
    improvementPlan: document.getElementById("ideaImprovementPlan")?.value || "",
    improvementActions: document.getElementById("ideaImprovementActions")?.value || "",
    riskIdentification: document.getElementById("ideaRiskIdentification")?.value || "",
    afterDescriptionIdea: document.getElementById("ideaAfterDescription")?.value || "",
    sopNo: document.getElementById("reportSopNo")?.value || "",
    productName: document.getElementById("reportProductName")?.value || "",
    process: document.getElementById("reportProcess")?.value || "",
    target: document.getElementById("reportTarget")?.value || "",
    targetDetail: document.getElementById("reportTargetDetail")?.value || "",
    beforeDescription: document.getElementById("reportBeforeDescription")?.value || "",
    afterDescription: document.getElementById("reportAfterDescription")?.value || "",
    materialsAndCost: document.getElementById("reportMaterialsAndCost")?.value || "",
    beforeWorkHour: Number(document.getElementById("beforeWorkHour")?.value) || 0,
    afterWorkHour: Number(document.getElementById("afterWorkHour")?.value) || 0,
    beforeNearMiss: Number(document.getElementById("beforeNearMiss")?.value) || 0,
    afterNearMiss: Number(document.getElementById("afterNearMiss")?.value) || 0,
    dailyHoursSaved,
    monthlyDays,
    hourlyCost,
    totalSavings: calcTotalSavings(dailyHoursSaved, monthlyDays, hourlyCost),
    qualitativeEffect: document.getElementById("qualitativeEffect")?.value || "",
    status: mode === "report" ? KAIZEN_STATUS.COMPLETED : KAIZEN_STATUS.SUBMITTED,
    uid: currentFirebaseUser?.uid || currentUserProfile?.uid || "",
    email: currentFirebaseUser?.email || currentUserProfile?.email || "",
    taiKhoan: currentUserProfile?.taiKhoan || "",
    department: currentUserProfile?.department || "",
    capBac: currentUserProfile?.capBac || ""
  };
}

async function saveKaizen(mode) {
  if (isSaving) return;
  if (!currentUserProfile) {
    showToast(t("common.notLoggedIn"), "error");
    return;
  }

  const payload = collectFormPayload(mode);
  if (!payload.kaizenId) {
    showToast(t("kaizen.requireId"), "error");
    return;
  }
  if (!payload.improvedContent && mode === "idea") {
    showToast(t("kaizen.requireContent"), "error");
    return;
  }

  isSaving = true;
  showPageLoader(true, t("common.loading"));

  try {
    const beforeFile = document.getElementById(mode === "report" ? "reportBeforeImage" : "ideaBeforeImage")?.files?.[0];
    const afterFile = document.getElementById(mode === "report" ? "reportAfterImage" : "ideaAfterImage")?.files?.[0];

    if (beforeFile) {
      payload.beforeImageUrl = await uploadKaizenImage(beforeFile, payload.kaizenId, "before");
    }
    if (afterFile) {
      payload.afterImageUrl = await uploadKaizenImage(afterFile, payload.kaizenId, "after");
    }

    await saveKaizenRecord(payload);
    showToast(t("kaizen.saved", { id: payload.kaizenId }), "success");
    await loadKaizenListSafe();
    setActiveTab("list");
  } catch (error) {
    console.error(error);
    showToast(error.message || t("kaizen.saveFailed"), "error");
  } finally {
    isSaving = false;
    showPageLoader(false);
  }
}

async function loadKaizenListSafe() {
  try {
    kaizenListCache = await fetchKaizenList();
    renderKaizenTable();
    renderDashboardStats();
  } catch (error) {
    console.warn(error);
    kaizenListCache = [];
    renderKaizenTable();
    renderDashboardStats();
  }
}

function getFilteredKaizenList() {
  if (!listStatusFilter || listStatusFilter === "all") return kaizenListCache;
  return kaizenListCache.filter((item) => normalizeKaizenStatus(item.status) === listStatusFilter);
}

function renderDashboardStats() {
  const wrap = document.getElementById("dashboardStats");
  if (!wrap) return;

  const counts = Object.fromEntries(LIST_STATUS_FILTERS.map((s) => [s, 0]));
  let totalSavings = 0;
  kaizenListCache.forEach((item) => {
    const status = normalizeKaizenStatus(item.status);
    if (counts[status] != null) counts[status] += 1;
    totalSavings += Number(item.totalSavings) || calcTotalSavings(item.dailyHoursSaved, item.monthlyDays, item.hourlyCost);
  });

  const cards = [
    { key: "all", label: t("dashboard.total"), value: kaizenListCache.length, tab: "list", status: "all" },
    ...LIST_STATUS_FILTERS.map((s) => ({
      key: s,
      label: t(`kaizen.status.${s}`),
      value: counts[s],
      tab: "list",
      status: s
    })),
    { key: "savings", label: t("dashboard.savings"), value: `$${totalSavings.toFixed(2)}` }
  ];

  wrap.innerHTML = cards.map((card) => {
    const clickable = card.tab
      ? `data-tab="${card.tab}" data-status="${card.status}"`
      : "";
    return `<button type="button" class="kz-dash-stat"${clickable}>
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(String(card.value))}</strong>
    </button>`;
  }).join("");

  wrap.querySelectorAll("[data-tab]").forEach((el) => {
    el.addEventListener("click", () => setActiveTab(el.dataset.tab, el.dataset.status));
  });
}

function renderKaizenTable() {
  const tbody = document.getElementById("kaizenTableBody");
  if (!tbody) return;

  const list = getFilteredKaizenList();

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-table">${t("common.noData")}</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((item) => {
    const savings = item.totalSavings != null
      ? Number(item.totalSavings).toFixed(2)
      : calcTotalSavings(item.dailyHoursSaved, item.monthlyDays, item.hourlyCost).toFixed(2);
    const classes = (item.classification || []).map((c) => `<span class="kz-chip">${escapeHtml(c)}</span>`).join(" ");
    const status = normalizeKaizenStatus(item.status);
    const statusKey = `kaizen.status.${status}`;
    return `
      <tr>
        <td class="kz-mono">${escapeHtml(item.kaizenId || item.id)}</td>
        <td>${escapeHtml(item.date || "-")}</td>
        <td>${escapeHtml(item.dept || item.department || "-")}</td>
        <td>${escapeHtml(item.improvedContent || "-")}</td>
        <td>${classes || "-"}</td>
        <td>${escapeHtml(item.proposer || "-")}</td>
        <td class="kz-money">$${savings}</td>
        <td><span class="status-badge status-${status}">${t(statusKey)}</span></td>
      </tr>
    `;
  }).join("");
}

function resetFormForNew() {
  selectedClassification = [];
  renderClassificationButtons();
  const today = new Date().toISOString().split("T")[0];
  [
    "ideaKaizenId", "ideaImprovedContent", "ideaProblemDesc", "ideaImprovementPlan",
    "ideaImprovementActions", "ideaRiskIdentification", "ideaAfterDescription",
    "ideaChecked", "ideaApproved", "reportKaizenId", "reportSopNo", "reportProductName",
    "reportProcess", "reportTarget", "reportTargetDetail", "reportBeforeDescription",
    "reportAfterDescription", "reportMaterialsAndCost", "qualitativeEffect"
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("ideaDate").value = today;
  document.getElementById("reportDate").value = today;
  document.getElementById("beforeWorkHour").value = 0;
  document.getElementById("afterWorkHour").value = 0;
  document.getElementById("beforeNearMiss").value = 0;
  document.getElementById("afterNearMiss").value = 0;
  document.getElementById("dailyHoursSaved").value = 0;
  document.getElementById("monthlyDays").value = 22;
  document.getElementById("hourlyCost").value = 5;
  if (currentUserProfile) {
    document.getElementById("ideaProposer").value = currentUserProfile.hoTen || "";
    document.getElementById("ideaProposer2").value = currentUserProfile.hoTen || "";
    document.getElementById("ideaDept").value = currentUserProfile.department || "";
    document.getElementById("reportDept").value = currentUserProfile.department || "";
  }
  updateMetricsUI();
}

function getFirebaseErrorMessage(error) {
  switch (error?.code) {
    case "auth/invalid-email": return t("auth.error.invalidEmail");
    case "auth/user-disabled": return t("auth.error.userDisabled");
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/user-not-found": return t("auth.error.wrongPassword");
    case "auth/too-many-requests": return t("auth.error.tooManyRequests");
    case "auth/network-request-failed": return t("auth.error.network");
    default: return error?.message || t("auth.error.unknown");
  }
}

function getRegisterErrorMessage(error) {
  switch (error?.code) {
    case "auth/email-already-in-use": return t("auth.error.emailExists");
    case "auth/weak-password": return t("auth.error.weakPassword");
    case "permission-denied": return t("auth.error.permissionDenied");
    default: return getFirebaseErrorMessage(error) || t("auth.error.registerFailed");
  }
}

function showPageLoader(show, text = t("common.loading")) {
  const loader = document.getElementById("pageLoader");
  const loaderText = document.getElementById("pageLoaderText");
  if (!loader) return;
  if (loaderText && text) loaderText.textContent = text;
  loader.classList.toggle("hidden", !show);
}

function setButtonLoading(button, isLoading, loadingText = t("common.loading")) {
  if (!button) return;
  if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : button.dataset.originalText;
}

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3200);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}
