import {
  auth,
  db,
  authPersistenceReady,
  initAppCheck,
  onAuthStateChanged,
  signOut,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  collection,
  getDocs,
  setDoc
} from "./firebase-config.js";
import { initI18n, t, onLanguageChange, applyI18n, getLang } from "./i18n.js";
import { bindPasswordExpiry } from "./password-expiry.js";
import {
  ensureCatalogDefaults,
  saveCatalog
} from "./catalog-service.js";
import { USER_ROLES, normalizeRole } from "./constants.js";

let users = [];
let userFilter = "all";
let searchQuery = "";
let toastTimer = null;
let authReady = false;
let isLoadingAdminData = false;
let catalogDepartments = [];
let catalogRanks = [];
let activeAdminSection = "usersSection";

document.addEventListener("DOMContentLoaded", initAdminPage);

async function initAdminPage() {
  initI18n();
  await initAppCheck();
  setCurrentDate();
  bindEvents();

  onLanguageChange(() => {
    document.querySelectorAll("[data-original-text]").forEach((el) => {
      delete el.dataset.originalText;
    });
    applyI18n();
    setCurrentDate();
    renderUserTable();
    renderCatalogLists();
  });

  await authPersistenceReady;
  observeAuth();
}

function setCurrentDate() {
  const el = document.getElementById("currentDate");
  if (!el) return;
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const locale = getLang() === "en" ? "en-US" : "vi-VN";
  el.textContent = new Date().toLocaleDateString(locale, options);
}

function bindEvents() {
  document.getElementById("adminLogoutBtn")?.addEventListener("click", logout);
  document.getElementById("filterAllBtn")?.addEventListener("click", () => setUserFilter("all"));
  document.getElementById("filterPendingBtn")?.addEventListener("click", () => setUserFilter("pending"));
  document.getElementById("userSearchInput")?.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderUserTable();
  });

  document.querySelectorAll("[data-admin-section]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showAdminSection(link.dataset.adminSection);
    });
  });

  document.getElementById("addDepartmentBtn")?.addEventListener("click", () => addCatalogItem("departments"));
  document.getElementById("addRankBtn")?.addEventListener("click", () => addCatalogItem("ranks"));
  document.getElementById("newDepartmentInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCatalogItem("departments");
    }
  });
  document.getElementById("newRankInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCatalogItem("ranks");
    }
  });
}

function showAdminSection(sectionId) {
  activeAdminSection = sectionId;
  document.querySelectorAll(".admin-panel-section").forEach((section) => {
    section.classList.toggle("hidden", section.id !== sectionId);
  });
  document.querySelectorAll("[data-admin-section]").forEach((link) => {
    link.classList.toggle("active", link.dataset.adminSection === sectionId);
  });
  if (sectionId === "catalogSection") {
    renderCatalogLists();
  }
}

function observeAuth() {
  showPageLoader(true, t("common.checkingAccess"));

  onAuthStateChanged(auth, async (user) => {
    if (isLoadingAdminData) return;

    try {
      if (!user) {
        if (authReady) location.href = "./index.html";
        return;
      }

      authReady = true;
      isLoadingAdminData = true;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        showTableError(t("admin.profileNotFound"));
        showToast(t("admin.profileNotFound"), "error");
        setTimeout(() => { location.href = "./index.html"; }, 2000);
        return;
      }

      const profile = userDoc.data();
      const role = String(profile.role || "").trim().toLowerCase();
      const status = String(profile.status || "").trim().toLowerCase();

      // Tạm giữ role=admin để vào trang quản trị tài khoản; phân quyền phê duyệt phiếu sẽ làm sau theo capBac.
      if (role !== "admin") {
        showTableError(t("admin.noAdminRole"));
        showToast(t("admin.noAdminAccess"), "error");
        setTimeout(() => { location.href = "./index.html"; }, 2000);
        return;
      }

      if (status !== "active") {
        showTableError(t("admin.adminNotActive"));
        showToast(t("admin.adminNotActive"), "error");
        setTimeout(() => { location.href = "./index.html"; }, 2000);
        return;
      }

      updateAdminSidebar(user, profile);
      await Promise.all([loadUsers(false), loadCatalog(false)]);
      showAdminSection(location.hash === "#catalogSection" ? "catalogSection" : "usersSection");
    } catch (error) {
      console.error(error);
      const message = getFirestoreErrorMessage(error);
      showTableError(message);
      showToast(message, "error");
    } finally {
      isLoadingAdminData = false;
      showPageLoader(false);
    }
  });
}

function showTableError(message) {
  const tbody = document.getElementById("userTableBody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8" class="empty-table">${escapeHtml(message)}</td></tr>`;
}

function getFirestoreErrorMessage(error) {
  if (error?.code === "permission-denied") return t("admin.loadPermissionDenied");
  return error?.message || t("admin.loadFailed");
}

function updateAdminSidebar(firebaseUser, profile) {
  const name = profile.hoTen || "Administrator";
  const email = firebaseUser.email || profile.email || "";
  document.getElementById("adminUserName").textContent = name;
  document.getElementById("adminUserEmail").textContent = email;
  document.getElementById("adminUserInitials").textContent = getInitials(name);
  bindPasswordExpiry(profile, firebaseUser);
}

function getInitials(name) {
  const parts = String(name || "AD").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

async function loadUsers(showLoader = true) {
  if (showLoader) showPageLoader(true, t("admin.syncingUsers"));
  try {
    const snap = await getDocs(collection(db, "users"));
    users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    updateStats();
    renderUserTable();
  } catch (error) {
    console.error(error);
    const message = getFirestoreErrorMessage(error);
    showTableError(message);
    showToast(message, "error");
    throw error;
  } finally {
    if (showLoader) showPageLoader(false);
  }
}

function setUserFilter(filter) {
  userFilter = filter;
  document.getElementById("filterAllBtn")?.classList.toggle("active", filter === "all");
  document.getElementById("filterPendingBtn")?.classList.toggle("active", filter === "pending");
  renderUserTable();
}

function getPendingUsers() {
  return users.filter((u) => normalizeStatus(u.status) === "pending");
}

function getFilteredUsers() {
  let list = userFilter === "pending" ? getPendingUsers() : users;
  if (searchQuery) {
    list = list.filter((u) => {
      const haystack = [u.email, u.taiKhoan, u.hoTen, u.department, u.capBac]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      return haystack.includes(searchQuery);
    });
  }
  return list;
}

function updateStats() {
  const pendingCount = getPendingUsers().length;
  const activeCount = users.filter((u) => normalizeStatus(u.status) === "active").length;
  document.getElementById("statPending").textContent = String(pendingCount);
  document.getElementById("statActive").textContent = String(activeCount);
  const badge = document.getElementById("pendingCountBadge");
  if (badge) {
    badge.textContent = String(pendingCount);
    badge.classList.toggle("hidden", pendingCount === 0);
  }
}

function renderUserTable() {
  const tbody = document.getElementById("userTableBody");
  if (!tbody) return;
  const list = getFilteredUsers();

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-table">${
          userFilter === "pending"
            ? t("admin.noPendingUsers")
            : searchQuery
              ? t("admin.noFilterMatch")
              : t("admin.noUsers")
        }</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map((u) => renderUserRow(u)).join("");
  setupUserTableEvents();
}

function renderUserRow(u) {
  const status = normalizeStatus(u.status);
  return `
    <tr>
      <td class="user-email-cell">
        <strong>${escapeHtml(u.email || "-")}</strong>
        <span>@${escapeHtml(u.taiKhoan || "-")}</span>
      </td>
      <td>${escapeHtml(u.hoTen || "-")}</td>
      <td>${escapeHtml(u.department || "-")}</td>
      <td>${escapeHtml(u.capBac || "-")}</td>
      <td>${renderRoleSelect(u)}</td>
      <td><span class="status-badge status-${status}">${getStatusLabel(status)}</span></td>
      <td>${formatCreatedAt(u.createdAt)}</td>
      <td>${renderActionButtons(u.id, status)}</td>
    </tr>
  `;
}

function renderRoleSelect(u) {
  const currentRole = normalizeRole(u.role);
  const disabled = u.role === "admin" && u.id !== auth.currentUser?.uid;
  const options = USER_ROLES.map((role) =>
    `<option value="${role}"${role === currentRole ? " selected" : ""}>${t(`role.${role}`)}</option>`
  ).join("");
  return `
    <select class="admin-role-select" data-id="${u.id}"${disabled ? " disabled" : ""} aria-label="${escapeHtml(t("admin.users.changeRole"))}">
      ${options}
    </select>
  `;
}
  if (status === "pending") {
    return `
      <div class="action-buttons">
        <button type="button" class="btn-action approve btn-approve" data-id="${userId}">${t("common.approve")}</button>
        <button type="button" class="btn-action reject btn-reject" data-id="${userId}">${t("common.reject")}</button>
      </div>
    `;
  }
  if (status === "active") {
    return `
      <div class="action-buttons">
        <span class="admin-reviewed-note">${t("admin.statusActive")}</span>
        <button type="button" class="btn-action lock btn-lock" data-id="${userId}">${t("common.lock")}</button>
      </div>
    `;
  }
  return `
    <div class="action-buttons">
      <button type="button" class="btn-action unlock btn-unlock" data-id="${userId}">${t("common.unlock")}</button>
    </div>
  `;
}

function setupUserTableEvents() {
  document.querySelectorAll(".admin-role-select").forEach((select) => {
    select.addEventListener("change", () => handleRoleChange(select.dataset.id, select.value, select));
  });
  document.querySelectorAll(".btn-approve").forEach((button) => {
    button.addEventListener("click", () => handleStatusChange(button.dataset.id, "approve"));
  });
  document.querySelectorAll(".btn-reject").forEach((button) => {
    button.addEventListener("click", () => handleStatusChange(button.dataset.id, "reject"));
  });
  document.querySelectorAll(".btn-lock").forEach((button) => {
    button.addEventListener("click", () => handleStatusChange(button.dataset.id, "lock"));
  });
  document.querySelectorAll(".btn-unlock").forEach((button) => {
    button.addEventListener("click", () => handleStatusChange(button.dataset.id, "unlock"));
  });
}

async function handleRoleChange(userId, newRole, selectEl) {
  const user = users.find((u) => u.id === userId);
  const previousRole = normalizeRole(user?.role);
  const nextRole = normalizeRole(newRole);

  if (!user || previousRole === nextRole) return;

  if (user.role === "admin" && userId !== auth.currentUser?.uid) {
    showToast(t("security.cannotModifyOtherAdmin"), "error");
    if (selectEl) selectEl.value = previousRole;
    return;
  }

  if (!confirm(t("admin.users.confirmRoleChange", {
    name: user.hoTen || user.email || t("common.account"),
    role: t(`role.${nextRole}`)
  }))) {
    if (selectEl) selectEl.value = previousRole;
    return;
  }

  try {
    await updateDoc(doc(db, "users", userId), {
      role: nextRole,
      updatedAt: serverTimestamp()
    });
    showToast(t("admin.users.roleUpdated"), "success");
    await loadUsers();
  } catch (error) {
    console.error(error);
    if (selectEl) selectEl.value = previousRole;
    showToast(error.message || t("admin.users.roleUpdateFailed"), "error");
  }
}

function renderActionButtons(userId, status) {
  if (status === "pending") {
    return `
      <div class="action-buttons">
        <button type="button" class="btn-action approve btn-approve" data-id="${userId}">${t("common.approve")}</button>
        <button type="button" class="btn-action reject btn-reject" data-id="${userId}">${t("common.reject")}</button>
      </div>
    `;
  }
  if (status === "active") {
    return `
      <div class="action-buttons">
        <span class="admin-reviewed-note">${t("admin.statusActive")}</span>
        <button type="button" class="btn-action lock btn-lock" data-id="${userId}">${t("common.lock")}</button>
      </div>
    `;
  }
  return `
    <div class="action-buttons">
      <button type="button" class="btn-action unlock btn-unlock" data-id="${userId}">${t("common.unlock")}</button>
    </div>
  `;
}

async function handleStatusChange(userId, action) {
  const user = users.find((u) => u.id === userId);
  const displayName = user?.hoTen || user?.email || t("common.account");

  if (user?.role === "admin" && userId !== auth.currentUser?.uid) {
    showToast(t("security.cannotModifyOtherAdmin"), "error");
    return;
  }

  let newStatus;
  let message;
  let toastType = "success";
  let confirmKey = "security.confirmApprove";

  switch (action) {
    case "approve":
      newStatus = "active";
      message = `${t("common.approve")}: ${displayName}`;
      confirmKey = "security.confirmApprove";
      break;
    case "reject":
      newStatus = "locked";
      message = `${t("common.reject")}: ${displayName}`;
      toastType = "info";
      confirmKey = "security.confirmReject";
      break;
    case "lock":
      newStatus = "locked";
      message = `${t("common.lock")}: ${displayName}`;
      toastType = "info";
      confirmKey = "security.confirmLock";
      break;
    case "unlock":
      newStatus = "active";
      message = `${t("common.unlock")}: ${displayName}`;
      confirmKey = "security.confirmUnlock";
      break;
    default:
      return;
  }

  if (!confirm(t(confirmKey, { name: displayName }))) return;

  try {
    await adminChangeUserStatus(userId, newStatus, user, action);
    showToast(message, toastType);
    await loadUsers();
  } catch (error) {
    console.error(error);
    showToast(error.message || t("admin.statusUpdateFailed"), "error");
  }
}

async function adminChangeUserStatus(userId, newStatus, targetUser, triggerAction) {
  const currentAdmin = auth.currentUser;
  if (!currentAdmin) throw new Error(t("auth.error.permissionDenied"));

  const previousStatus = String(targetUser?.status || "pending").toLowerCase();
  await updateDoc(doc(db, "users", userId), {
    status: newStatus,
    updatedAt: serverTimestamp()
  });

  await writeAdminAuditLog({
    action: "changeStatus",
    targetUserId: userId,
    targetEmail: targetUser?.email || "",
    targetHoTen: targetUser?.hoTen || "",
    performedBy: currentAdmin.uid,
    performedByEmail: currentAdmin.email || "",
    previousStatus,
    newStatus,
    triggerAction
  });
}

async function writeAdminAuditLog(entry) {
  try {
    await addDoc(collection(db, "audit_logs"), {
      ...entry,
      reason: entry.reason || "",
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.warn("Không thể ghi audit_logs:", error);
  }
}

function normalizeStatus(status) {
  if (status === "inactive") return "pending";
  return status || "pending";
}

function getStatusLabel(status) {
  switch (status) {
    case "active": return t("admin.statusActive");
    case "locked": return t("admin.statusLocked");
    default: return t("admin.statusPending");
  }
}

function formatCreatedAt(createdAt) {
  if (!createdAt) return "-";
  try {
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt.seconds * 1000);
    const locale = getLang() === "en" ? "en-US" : "vi-VN";
    return date.toLocaleString(locale, {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  } catch {
    return "-";
  }
}

async function logout() {
  showToast(t("admin.loggingOut"), "info");
  await signOut(auth);
  location.href = "./index.html";
}

function showPageLoader(show, text = t("common.loading")) {
  const loader = document.getElementById("pageLoader");
  const loaderText = document.getElementById("pageLoaderText");
  if (!loader) return;
  if (loaderText) loaderText.textContent = text;
  loader.classList.toggle("hidden", !show);
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

async function loadCatalog(showLoader = true) {
  if (showLoader) showPageLoader(true, t("admin.catalog.loading"));
  try {
    const result = await ensureCatalogDefaults(db, doc, getDoc, setDoc, serverTimestamp);
    catalogDepartments = [...result.departments];
    catalogRanks = [...result.ranks];
    if (result.seeded) {
      showToast(t("admin.catalog.seededDefaults"), "info");
    }
    renderCatalogLists();
  } catch (error) {
    console.error(error);
    showToast(error.message || t("admin.catalog.loadFailed"), "error");
    throw error;
  } finally {
    if (showLoader) showPageLoader(false);
  }
}

function renderCatalogLists() {
  renderCatalogList("departmentList", catalogDepartments, "departments");
  renderCatalogList("rankList", catalogRanks, "ranks");
}

function renderCatalogList(listId, items, type) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  if (!items.length) {
    listEl.innerHTML = `<li class="admin-catalog-empty">${escapeHtml(t("admin.catalog.empty"))}</li>`;
    return;
  }

  listEl.innerHTML = items.map((item, index) => `
    <li class="admin-catalog-item">
      <span>${escapeHtml(item)}</span>
      <button type="button" class="btn-action reject admin-catalog-remove" data-type="${type}" data-index="${index}" aria-label="${escapeHtml(t("admin.catalog.remove"))}">×</button>
    </li>
  `).join("");

  listEl.querySelectorAll(".admin-catalog-remove").forEach((button) => {
    button.addEventListener("click", () => removeCatalogItem(button.dataset.type, Number(button.dataset.index)));
  });
}

async function addCatalogItem(type) {
  const inputId = type === "departments" ? "newDepartmentInput" : "newRankInput";
  const input = document.getElementById(inputId);
  if (!input) return;

  const value = input.value.trim();
  if (!value) {
    showToast(t("admin.catalog.enterName"), "error");
    return;
  }

  const targetList = type === "departments" ? catalogDepartments : catalogRanks;
  const exists = targetList.some((item) => item.toLowerCase() === value.toLowerCase());
  if (exists) {
    showToast(t("admin.catalog.duplicate"), "error");
    return;
  }

  const nextDepartments = type === "departments" ? [...targetList, value] : [...catalogDepartments];
  const nextRanks = type === "ranks" ? [...targetList, value] : [...catalogRanks];

  try {
    showPageLoader(true, t("admin.catalog.saving"));
    const saved = await saveCatalog(
      db,
      doc,
      setDoc,
      serverTimestamp,
      { departments: nextDepartments, ranks: nextRanks },
      auth.currentUser?.uid || ""
    );
    catalogDepartments = saved.departments;
    catalogRanks = saved.ranks;
    input.value = "";
    renderCatalogLists();
    showToast(t("admin.catalog.added"), "success");
  } catch (error) {
    console.error(error);
    showToast(error.message === "catalog.emptyNotAllowed" ? t("admin.catalog.cannotEmpty") : (error.message || t("admin.catalog.saveFailed")), "error");
  } finally {
    showPageLoader(false);
  }
}

async function removeCatalogItem(type, index) {
  const targetList = type === "departments" ? catalogDepartments : catalogRanks;
  const item = targetList[index];
  if (!item) return;

  const confirmKey = type === "departments" ? "admin.catalog.confirmRemoveDepartment" : "admin.catalog.confirmRemoveRank";
  if (!confirm(t(confirmKey, { name: item }))) return;

  const nextDepartments = type === "departments"
    ? targetList.filter((_, i) => i !== index)
    : [...catalogDepartments];
  const nextRanks = type === "ranks"
    ? targetList.filter((_, i) => i !== index)
    : [...catalogRanks];

  if (!nextDepartments.length || !nextRanks.length) {
    showToast(t("admin.catalog.cannotEmpty"), "error");
    return;
  }

  try {
    showPageLoader(true, t("admin.catalog.saving"));
    const saved = await saveCatalog(
      db,
      doc,
      setDoc,
      serverTimestamp,
      { departments: nextDepartments, ranks: nextRanks },
      auth.currentUser?.uid || ""
    );
    catalogDepartments = saved.departments;
    catalogRanks = saved.ranks;
    renderCatalogLists();
    showToast(t("admin.catalog.removed"), "success");
  } catch (error) {
    console.error(error);
    showToast(error.message || t("admin.catalog.saveFailed"), "error");
  } finally {
    showPageLoader(false);
  }
}
