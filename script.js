import { initI18n, t, onLanguageChange, applyI18n } from "./i18n.js";
import { bindPasswordExpiry } from "./password-expiry.js";
import {
  PREVIEW_MODE,
  CAP_BAC_OPTIONS,
  DEPARTMENT_OPTIONS,
  CLASSIFICATION_CODES,
  KAIZEN_STATUS,
  LIST_STATUS_FILTERS,
  APPROVAL_PATH,
  normalizeKaizenStatus,
  getWorkflowStepIndex,
  getWorkflowStepsForRecord,
  filterKaizenForListView,
  filterKaizenForDashboard,
  normalizeRole,
  normalizeApprovalPath,
  canSubmitKaizen,
  canApproveL1,
  canApproveL2,
  canUseApprovalLists
} from "./constants.js";
import { fetchCatalog } from "./catalog-service.js";
import {
  calcTotalSavings,
  uploadKaizenImage,
  saveKaizenRecord,
  fetchKaizenList,
  fetchKaizenById,
  approveKaizenL1,
  approveKaizenL2,
  startKaizenProgress
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
let listViewMode = "mine";
let selectedClassification = [];
let kaizenListCache = [];
let isSaving = false;
let editingKaizenDocId = null;
let selectedProgressKaizenId = null;
let registerCatalog = {
  departments: [...DEPARTMENT_OPTIONS],
  ranks: [...CAP_BAC_OPTIONS]
};

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  initI18n();
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
    if (activeTab === "progress" && selectedProgressKaizenId) {
      renderProgressView(selectedProgressKaizenId);
    }
  });

  if (PREVIEW_MODE) {
    populateRegisterSelects();
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
  await loadRegisterCatalog();
  populateRegisterSelects();
  observeAuthState();
}

async function loadRegisterCatalog() {
  try {
    registerCatalog = await fetchCatalog(db, doc, getDoc);
  } catch (error) {
    console.warn("Không thể tải danh mục bộ phận/chức danh, dùng mặc định:", error);
    registerCatalog = {
      departments: [...DEPARTMENT_OPTIONS],
      ranks: [...CAP_BAC_OPTIONS]
    };
  }
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
    registerCatalog.departments.map((d) => `<option value="${escapeHtmlAttr(d)}">${escapeHtml(d)}</option>`).join("");
  capSelect.innerHTML = `<option value="">${t("auth.placeholder.selectCapBac")}</option>` +
    registerCatalog.ranks.map((c) => `<option value="${escapeHtmlAttr(c)}">${escapeHtml(c)}</option>`).join("");

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
    el.addEventListener("click", () => {
      const tab = el.dataset.tab;
      const listMode = el.dataset.listMode;
      if (tab === "list") {
        setActiveTab("list", el.dataset.status || "all", listMode || "mine");
        return;
      }
      setActiveTab(tab);
    });
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
  document.getElementById("progressBackBtn")?.addEventListener("click", () => {
    setActiveTab("list", listStatusFilter, listViewMode);
  });

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
  if (!registerCatalog.departments.includes(department)) return t("auth.fillRegisterInfo");
  if (!registerCatalog.ranks.includes(capBac)) return t("auth.fillRegisterInfo");
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
  applyRoleBasedUI();
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
  const roleEl = document.getElementById("displayRole");
  if (roleEl) roleEl.textContent = t(`role.${normalizeRole(profile.role)}`);
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

function setActiveTab(tab, statusFilter, viewMode) {
  activeTab = tab;
  if (tab === "list") {
    listViewMode = viewMode || "mine";
    listStatusFilter = listViewMode === "mine" ? (statusFilter || "all") : "all";
  }

  document.querySelectorAll("[data-tab]").forEach((el) => {
    const elTab = el.dataset.tab;
    const elListMode = el.dataset.listMode || "mine";
    const elStatus = el.dataset.status;

    if (elTab !== "list") {
      el.classList.toggle("active", elTab === tab);
      return;
    }

    if (tab !== "list") {
      el.classList.remove("active");
      return;
    }

    if (listViewMode === "pending_approval") {
      el.classList.toggle("active", elListMode === "pending_approval");
      return;
    }
    if (listViewMode === "approved_by_me") {
      el.classList.toggle("active", elListMode === "approved_by_me");
      return;
    }

    if (elListMode !== "mine") {
      el.classList.remove("active");
      return;
    }

    if (elStatus) {
      el.classList.toggle("active", listStatusFilter === elStatus);
    } else {
      el.classList.toggle("active", listStatusFilter === "all");
    }
  });

  document.getElementById("navGroupList")?.classList.toggle("is-open", tab === "list" && listViewMode === "mine");
  document.getElementById("navGroupApproval")?.classList.toggle("is-open", tab === "list" && listViewMode !== "mine");

  document.getElementById("tabIdea")?.classList.toggle("hidden", tab !== "idea");
  document.getElementById("tabReport")?.classList.toggle("hidden", tab !== "report");
  document.getElementById("tabDashboard")?.classList.toggle("hidden", tab !== "dashboard");
  document.getElementById("tabList")?.classList.toggle("hidden", tab !== "list");
  document.getElementById("tabProgress")?.classList.toggle("hidden", tab !== "progress");
  document.getElementById("tabAccount")?.classList.toggle("hidden", tab !== "account");

  if (tab === "list") {
    updateListHeading();
    loadKaizenListSafe();
  }
  if (tab === "dashboard") {
    loadKaizenListSafe();
  }
  if (tab === "progress" && selectedProgressKaizenId) {
    renderProgressView(selectedProgressKaizenId);
  }
  applyRoleBasedUI();
}

function updateListHeading() {
  const title = document.getElementById("listTitle");
  const subtitle = document.getElementById("listSubtitle");
  if (!title || !subtitle) return;

  if (listViewMode === "pending_approval") {
    title.textContent = t("nav.pendingApproval");
    subtitle.textContent = t("kaizen.list.pendingApprovalHint");
    return;
  }
  if (listViewMode === "approved_by_me") {
    title.textContent = t("nav.approvedByMe");
    subtitle.textContent = t("kaizen.list.approvedByMeHint");
    return;
  }
  if (listStatusFilter && listStatusFilter !== "all") {
    title.textContent = t(`kaizen.status.${listStatusFilter}`);
    subtitle.textContent = t("kaizen.list.mineHint");
  } else {
    title.textContent = t("kaizen.list.title");
    subtitle.textContent = t("kaizen.list.mineHint");
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
    approvalPath: document.querySelector('input[name="approvalPath"]:checked')?.value || APPROVAL_PATH.MANAGER_ONLY,
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

  if (mode === "idea" && !canSubmitKaizen(currentUserProfile.role)) {
    showToast(t("role.noSubmitPermission"), "error");
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

  if (mode === "report" && editingKaizenDocId) {
    const existing = kaizenListCache.find((item) => item.id === editingKaizenDocId);
    const existingStatus = normalizeKaizenStatus(existing?.status);
    if (existingStatus !== KAIZEN_STATUS.IN_PROGRESS) {
      showToast(t("progress.reportNotAllowed"), "error");
      return;
    }
    payload.status = KAIZEN_STATUS.COMPLETED;
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

    const savedId = await saveKaizenRecord(payload, editingKaizenDocId);
    editingKaizenDocId = savedId;
    showToast(t("kaizen.saved", { id: payload.kaizenId }), "success");
    await loadKaizenListSafe();
    if (mode === "report") {
      if (selectedProgressKaizenId) {
        renderProgressView(selectedProgressKaizenId);
        setActiveTab("progress");
      } else {
        setActiveTab("list");
      }
    } else {
      setActiveTab("list");
    }
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
  if (!currentUserProfile) return [];
  return filterKaizenForListView(
    kaizenListCache,
    currentUserProfile,
    listViewMode,
    listStatusFilter
  );
}

function getDashboardRecords() {
  if (!currentUserProfile) return [];
  return filterKaizenForDashboard(kaizenListCache, currentUserProfile);
}

function renderDashboardStats() {
  const wrap = document.getElementById("dashboardStats");
  if (!wrap) return;

  const dashboardRecords = getDashboardRecords();
  const counts = Object.fromEntries(LIST_STATUS_FILTERS.map((s) => [s, 0]));
  let totalSavings = 0;
  dashboardRecords.forEach((item) => {
    const status = normalizeKaizenStatus(item.status);
    if (status === KAIZEN_STATUS.L1_APPROVED) {
      counts.submitted += 1;
    } else if (counts[status] != null) {
      counts[status] += 1;
    }
    totalSavings += Number(item.totalSavings) || calcTotalSavings(item.dailyHoursSaved, item.monthlyDays, item.hourlyCost);
  });

  const cards = [
    { key: "all", label: t("dashboard.total"), value: dashboardRecords.length, tab: "list", status: "all", listMode: "mine" },
    ...LIST_STATUS_FILTERS.map((s) => ({
      key: s,
      label: t(`kaizen.status.${s}`),
      value: counts[s],
      tab: "list",
      status: s,
      listMode: "mine"
    })),
    { key: "savings", label: t("dashboard.savings"), value: `$${totalSavings.toFixed(2)}` }
  ];

  wrap.innerHTML = cards.map((card) => {
    const clickable = card.tab
      ? `data-tab="${card.tab}" data-status="${card.status}" data-list-mode="${card.listMode}"`
      : "";
    return `<button type="button" class="kz-dash-stat"${clickable}>
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(String(card.value))}</strong>
    </button>`;
  }).join("");

  wrap.querySelectorAll("[data-tab]").forEach((el) => {
    el.addEventListener("click", () => setActiveTab(el.dataset.tab, el.dataset.status, el.dataset.listMode || "mine"));
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
    const statusKey = status === KAIZEN_STATUS.L1_APPROVED
      ? "kaizen.status.l1_approved"
      : `kaizen.status.${status}`;
    return `
      <tr class="kz-row-clickable" data-kaizen-id="${escapeHtmlAttr(item.id)}" tabindex="0" role="button">
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

  tbody.querySelectorAll(".kz-row-clickable").forEach((row) => {
    const open = () => openProgressView(row.dataset.kaizenId);
    row.addEventListener("click", open);
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
  });
}

function resetFormForNew() {
  editingKaizenDocId = null;
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
  const managerPath = document.getElementById("approvalPathManager");
  if (managerPath) managerPath.checked = true;
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

function escapeHtmlAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function applyRoleBasedUI() {
  const role = normalizeRole(currentUserProfile?.role);
  const saveIdeaBtn = document.getElementById("saveIdeaBtn");
  const createNewBtn = document.getElementById("createNewBtn");
  const approvalNav = document.getElementById("navGroupApproval");
  if (saveIdeaBtn) saveIdeaBtn.disabled = !canSubmitKaizen(role);
  if (createNewBtn) createNewBtn.classList.toggle("hidden", !canSubmitKaizen(role));
  if (approvalNav) approvalNav.classList.toggle("hidden", !canUseApprovalLists(role));
}

function openProgressView(docId) {
  selectedProgressKaizenId = docId;
  setActiveTab("progress");
}

async function renderProgressView(docId) {
  const timeline = document.getElementById("progressTimeline");
  const meta = document.getElementById("progressKaizenMeta");
  if (!timeline) return;

  let record = kaizenListCache.find((item) => item.id === docId);
  if (!record) {
    try {
      record = await fetchKaizenById(docId);
      if (record) {
        kaizenListCache = [record, ...kaizenListCache.filter((item) => item.id !== docId)];
      }
    } catch (error) {
      console.warn(error);
    }
  }

  if (!record) {
    timeline.innerHTML = `<p class="empty-table">${escapeHtml(t("progress.notFound"))}</p>`;
    return;
  }

  if (meta) {
    const pathLabel = t(`kaizen.approvalPath.${normalizeApprovalPath(record.approvalPath) === APPROVAL_PATH.MANAGER_ONLY ? "managerOnly" : "topManager"}`);
    meta.textContent = `${record.kaizenId || record.id} · ${record.improvedContent || "-"} · ${pathLabel}`;
  }

  const steps = getWorkflowStepsForRecord(record);
  const currentStep = getWorkflowStepIndex(record.status, record.approvalPath);
  const role = normalizeRole(currentUserProfile?.role);
  const isOwner = record.uid === currentUserProfile?.uid;
  const status = normalizeKaizenStatus(record.status);

  timeline.innerHTML = steps.map((step, index) => {
    const stepNo = index + 1;
    const state = stepNo < currentStep ? "done" : stepNo === currentStep ? "current" : "pending";
    const actionHtml = renderProgressStepAction(step.key, record, { role, isOwner, status, state });
    const detailHtml = renderProgressStepDetail(step.key, record);
    return `
      <article class="kz-progress-step ${state}">
        <div class="kz-progress-marker">${stepNo}</div>
        <div class="kz-progress-body">
          <div class="kz-progress-step-head">
            <h3 data-i18n="progress.step.${step.key}">${t(`progress.step.${step.key}`)}</h3>
            ${actionHtml}
          </div>
          ${detailHtml}
        </div>
      </article>
    `;
  }).join("");

  applyI18n(timeline);
  bindProgressActions(record);
}

function renderProgressStepDetail(stepKey, record) {
  if (stepKey === "l1_approval" && record.l1ApprovedByName) {
    return `<p class="kz-progress-detail">${escapeHtml(t("progress.approvedBy", { name: record.l1ApprovedByName }))}</p>`;
  }
  if (stepKey === "l2_approval" && record.l2ApprovedByName) {
    return `<p class="kz-progress-detail">${escapeHtml(t("progress.approvedBy", { name: record.l2ApprovedByName }))}</p>`;
  }
  if (stepKey === "completed" && normalizeKaizenStatus(record.status) === KAIZEN_STATUS.COMPLETED) {
    return `<p class="kz-progress-detail">${escapeHtml(t("progress.completedAt", { savings: Number(record.totalSavings || 0).toFixed(2) }))}</p>`;
  }
  return "";
}

function renderProgressStepAction(stepKey, record, ctx) {
  const { role, isOwner, status, state } = ctx;

  if (stepKey === "proposal") {
    return `<button type="button" class="kz-btn-purple kz-progress-action" data-action="view-idea">${t("progress.viewIdea")}</button>`;
  }

  if (stepKey === "l1_approval" &&
      status === KAIZEN_STATUS.SUBMITTED &&
      canApproveL1(role, currentUserProfile, record)) {
    return `<button type="button" class="primary-btn kz-progress-action" data-action="approve-l1">${t("progress.approveL1")}</button>`;
  }

  if (stepKey === "l2_approval" &&
      status === KAIZEN_STATUS.L1_APPROVED &&
      normalizeApprovalPath(record.approvalPath) === APPROVAL_PATH.TOP_MANAGER &&
      canApproveL2(role)) {
    return `<button type="button" class="primary-btn kz-progress-action" data-action="approve-l2">${t("progress.approveL2")}</button>`;
  }

  if (stepKey === "in_progress") {
    if ((status === KAIZEN_STATUS.APPROVED || status === KAIZEN_STATUS.IN_PROGRESS) && isOwner) {
      const label = status === KAIZEN_STATUS.APPROVED ? t("progress.startAndReport") : t("progress.progressReport");
      return `<button type="button" class="kz-btn-purple kz-progress-action" data-action="open-report">${label}</button>`;
    }
  }

  if (stepKey === "completed" && status === KAIZEN_STATUS.COMPLETED) {
    return `<button type="button" class="kz-btn-purple kz-progress-action" data-action="view-report">${t("progress.viewReport")}</button>`;
  }

  if (state === "done") {
    return `<span class="kz-progress-done-badge">${t("progress.stepDone")}</span>`;
  }

  return `<span class="kz-progress-waiting">${t("progress.stepWaiting")}</span>`;
}

function bindProgressActions(record) {
  document.querySelectorAll(".kz-progress-action").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.action;
      try {
        if (action === "view-idea") {
          loadKaizenIntoForms(record, "idea");
          setActiveTab("idea");
          return;
        }
        if (action === "view-report") {
          loadKaizenIntoForms(record, "report");
          setActiveTab("report");
          return;
        }
        if (action === "open-report") {
          await handleOpenProgressReport(record);
          return;
        }
        if (action === "approve-l1") {
          await handleApproveL1(record);
          return;
        }
        if (action === "approve-l2") {
          await handleApproveL2(record);
        }
      } catch (error) {
        console.error(error);
        showToast(error.message || t("progress.actionFailed"), "error");
      }
    });
  });
}

async function handleApproveL1(record) {
  if (!canApproveL1(currentUserProfile?.role, currentUserProfile, record)) {
    showToast(t("progress.approveDeptDenied"), "error");
    return;
  }
  if (!confirm(t("progress.confirmApproveL1", { id: record.kaizenId || record.id }))) return;
  showPageLoader(true, t("common.loading"));
  try {
    await approveKaizenL1(record.id, currentUserProfile, record);
    showToast(t("progress.approvedL1Success"), "success");
    await loadKaizenListSafe();
    renderProgressView(record.id);
  } finally {
    showPageLoader(false);
  }
}

async function handleApproveL2(record) {
  if (!confirm(t("progress.confirmApproveL2", { id: record.kaizenId || record.id }))) return;
  showPageLoader(true, t("common.loading"));
  try {
    await approveKaizenL2(record.id, currentUserProfile);
    showToast(t("progress.approvedL2Success"), "success");
    await loadKaizenListSafe();
    renderProgressView(record.id);
  } finally {
    showPageLoader(false);
  }
}

async function handleOpenProgressReport(record) {
  const status = normalizeKaizenStatus(record.status);
  if (status === KAIZEN_STATUS.APPROVED) {
    showPageLoader(true, t("common.loading"));
    try {
      await startKaizenProgress(record.id);
      await loadKaizenListSafe();
      const updated = kaizenListCache.find((item) => item.id === record.id) || record;
      loadKaizenIntoForms({ ...updated, status: KAIZEN_STATUS.IN_PROGRESS }, "report");
      setActiveTab("report");
    } finally {
      showPageLoader(false);
    }
    return;
  }

  loadKaizenIntoForms(record, "report");
  setActiveTab("report");
}

function loadKaizenIntoForms(record, mode = "idea") {
  editingKaizenDocId = record.id;
  selectedClassification = Array.isArray(record.classification) ? [...record.classification] : [];
  renderClassificationButtons();

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
  };

  setValue("ideaKaizenId", record.kaizenId);
  setValue("ideaDate", record.date);
  setValue("ideaDept", record.dept || record.department);
  setValue("ideaProposer", record.proposer);
  setValue("ideaProposer2", record.proposer);
  setValue("ideaApproved", record.approved);
  setValue("ideaChecked", record.checked);
  setValue("ideaImprovedContent", record.improvedContent);
  setValue("ideaProblemDesc", record.problemDesc);
  setValue("ideaImprovementPlan", record.improvementPlan);
  setValue("ideaImprovementActions", record.improvementActions);
  setValue("ideaRiskIdentification", record.riskIdentification);
  setValue("ideaAfterDescription", record.afterDescriptionIdea || record.afterDescription);

  setValue("reportKaizenId", record.kaizenId);
  setValue("reportDate", record.date);
  setValue("reportDept", record.dept || record.department);
  setValue("reportSopNo", record.sopNo);
  setValue("reportProductName", record.productName);
  setValue("reportProcess", record.process);
  setValue("reportTarget", record.target);
  setValue("reportTargetDetail", record.targetDetail);
  setValue("reportBeforeDescription", record.beforeDescription);
  setValue("reportAfterDescription", record.afterDescription);
  setValue("reportMaterialsAndCost", record.materialsAndCost);
  setValue("beforeWorkHour", record.beforeWorkHour ?? 0);
  setValue("afterWorkHour", record.afterWorkHour ?? 0);
  setValue("beforeNearMiss", record.beforeNearMiss ?? 0);
  setValue("afterNearMiss", record.afterNearMiss ?? 0);
  setValue("dailyHoursSaved", record.dailyHoursSaved ?? 0);
  setValue("monthlyDays", record.monthlyDays ?? 22);
  setValue("hourlyCost", record.hourlyCost ?? 5);
  setValue("qualitativeEffect", record.qualitativeEffect);

  const path = normalizeApprovalPath(record.approvalPath);
  const managerRadio = document.getElementById("approvalPathManager");
  const topRadio = document.getElementById("approvalPathTopManager");
  if (managerRadio) managerRadio.checked = path === APPROVAL_PATH.MANAGER_ONLY;
  if (topRadio) topRadio.checked = path === APPROVAL_PATH.TOP_MANAGER;

  updateMetricsUI();

  if (mode === "report") {
    syncIdeaToReportFields();
  }
}
