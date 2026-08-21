import { PREVIEW_MODE } from "./constants.js";

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

export async function saveKaizenRecord(payload) {
  if (PREVIEW_MODE) {
    const list = readLocalList();
    const id = `local_${Date.now()}`;
    list.unshift({
      id,
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    writeLocalList(list);
    return id;
  }

  const {
    db,
    collection,
    addDoc,
    serverTimestamp
  } = await import("./firebase-config.js");

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
