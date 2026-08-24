import { PREVIEW_MODE, KAIZEN_STATUS, normalizeApprovalPath, APPROVAL_PATH } from "./constants.js";

const LOCAL_KEY = "kaizen_preview_list";

export function calcTotalSavings(dailyHoursSaved, monthlyDays, hourlyCost) {
  const a = Number(dailyHoursSaved) || 0;
  const b = Number(monthlyDays) || 0;
  const c = Number(hourlyCost) || 0;
  return Number((a * b * c).toFixed(2));
}

function readLocalList() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocalList(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

function touchLocalRecord(record) {
  return {
    ...record,
    updatedAt: new Date().toISOString()
  };
}

export async function uploadKaizenImage(file, kaizenId, kind) {
  if (!file) return null;

  if (PREVIEW_MODE) {
    return URL.createObjectURL(file);
  }

  const {
    storage,
    ref,
    uploadBytes,
    getDownloadURL
  } = await import("./firebase-config.js");

  const safeId = String(kaizenId || "temp").replace(/[^\w-]+/g, "_");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `kaizen/${safeId}/${kind}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function saveKaizenRecord(payload, docId = null) {
  if (PREVIEW_MODE) {
    const list = readLocalList();
    if (docId) {
      const index = list.findIndex((item) => item.id === docId);
      if (index >= 0) {
        list[index] = touchLocalRecord({ ...list[index], ...payload, id: docId });
        writeLocalList(list);
        return docId;
      }
    }
    const id = `local_${Date.now()}`;
    list.unshift(touchLocalRecord({
      id,
      ...payload,
      createdAt: new Date().toISOString()
    }));
    writeLocalList(list);
    return id;
  }

  const {
    db,
    collection,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp
  } = await import("./firebase-config.js");

  if (docId) {
    await updateDoc(doc(db, "kaizenIdeas", docId), {
      ...payload,
      updatedAt: serverTimestamp()
    });
    return docId;
  }

  const docRef = await addDoc(collection(db, "kaizenIdeas"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

export async function fetchKaizenList() {
  if (PREVIEW_MODE) {
    return readLocalList();
  }

  const {
    db,
    collection,
    getDocs,
    query,
    orderBy
  } = await import("./firebase-config.js");

  const q = query(collection(db, "kaizenIdeas"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchKaizenById(docId) {
  if (!docId) return null;

  if (PREVIEW_MODE) {
    return readLocalList().find((item) => item.id === docId) || null;
  }

  const { db, doc, getDoc } = await import("./firebase-config.js");
  const snap = await getDoc(doc(db, "kaizenIdeas", docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function updateKaizenStatus(docId, patch) {
  return saveKaizenRecord(patch, docId);
}

export async function approveKaizenL1(docId, approver, record) {
  const path = normalizeApprovalPath(record?.approvalPath);
  const nextStatus = path === APPROVAL_PATH.MANAGER_ONLY
    ? KAIZEN_STATUS.APPROVED
    : KAIZEN_STATUS.L1_APPROVED;

  const patch = {
    status: nextStatus,
    l1ApprovedBy: approver.uid || "",
    l1ApprovedByName: approver.hoTen || approver.email || ""
  };

  if (PREVIEW_MODE) {
    patch.l1ApprovedAt = new Date().toISOString();
  } else {
    const { serverTimestamp } = await import("./firebase-config.js");
    patch.l1ApprovedAt = serverTimestamp();
  }

  return updateKaizenStatus(docId, patch);
}

export async function managerReviewKaizen(docId, decision, comment, approver, investment = null) {
  const patch = {
    l1ReviewDecision: decision,
    l1ReviewComment: String(comment || "").trim(),
    l1ReviewedBy: approver.uid || "",
    l1ReviewedByName: approver.hoTen || approver.email || ""
  };

  if (decision === "approve") {
    const needsInvestment = investment?.requiresInvestment === true;
    const path = needsInvestment ? APPROVAL_PATH.TOP_MANAGER : APPROVAL_PATH.MANAGER_ONLY;
    patch.approvalPath = path;
    patch.requiresInvestment = needsInvestment;
    patch.investmentAmount = needsInvestment ? Math.max(0, Number(investment?.amount) || 0) : 0;
    patch.status = path === APPROVAL_PATH.MANAGER_ONLY
      ? KAIZEN_STATUS.APPROVED
      : KAIZEN_STATUS.L1_APPROVED;
    patch.l1ApprovedBy = approver.uid || "";
    patch.l1ApprovedByName = approver.hoTen || approver.email || "";
  } else if (decision === "reject") {
    patch.status = KAIZEN_STATUS.REJECTED;
  } else if (decision === "revision") {
    patch.status = KAIZEN_STATUS.REVISION_REQUESTED;
  } else {
    throw new Error("kaizen.invalidReviewDecision");
  }

  if (PREVIEW_MODE) {
    patch.l1ReviewedAt = new Date().toISOString();
    if (decision === "approve") patch.l1ApprovedAt = patch.l1ReviewedAt;
  } else {
    const { serverTimestamp } = await import("./firebase-config.js");
    patch.l1ReviewedAt = serverTimestamp();
    if (decision === "approve") patch.l1ApprovedAt = serverTimestamp();
  }

  return updateKaizenStatus(docId, patch);
}

export async function approveKaizenL2(docId, approver) {
  const patch = {
    status: KAIZEN_STATUS.APPROVED,
    l2ApprovedBy: approver.uid || "",
    l2ApprovedByName: approver.hoTen || approver.email || ""
  };

  if (PREVIEW_MODE) {
    patch.l2ApprovedAt = new Date().toISOString();
  } else {
    const { serverTimestamp } = await import("./firebase-config.js");
    patch.l2ApprovedAt = serverTimestamp();
  }

  return updateKaizenStatus(docId, patch);
}

export async function startKaizenProgress(docId) {
  const patch = { status: KAIZEN_STATUS.IN_PROGRESS };
  if (PREVIEW_MODE) {
    patch.progressStartedAt = new Date().toISOString();
  } else {
    const { serverTimestamp } = await import("./firebase-config.js");
    patch.progressStartedAt = serverTimestamp();
  }
  return updateKaizenStatus(docId, patch);
}
