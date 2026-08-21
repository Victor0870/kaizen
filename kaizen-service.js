import {
  db,
  storage,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  ref,
  uploadBytes,
  getDownloadURL
} from "./firebase-config.js";

export function calcTotalSavings(dailyHoursSaved, monthlyDays, hourlyCost) {
  const a = Number(dailyHoursSaved) || 0;
  const b = Number(monthlyDays) || 0;
  const c = Number(hourlyCost) || 0;
  return Number((a * b * c).toFixed(2));
}

export async function uploadKaizenImage(file, kaizenId, kind) {
  if (!file) return null;
  const safeId = String(kaizenId || "temp").replace(/[^\w-]+/g, "_");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `kaizen/${safeId}/${kind}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function saveKaizenRecord(payload) {
  const docRef = await addDoc(collection(db, "kaizenIdeas"), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

export async function fetchKaizenList() {
  const q = query(collection(db, "kaizenIdeas"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
