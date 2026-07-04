/**
 * On-device file blob storage (web).
 *
 * The domain store keeps only lightweight `Attachment` metadata; the actual
 * bytes live here in IndexedDB, keyed by the attachment id. This keeps the
 * persisted Zustand state small and JSON-serializable while still letting the
 * app hold real PDFs/images offline with no server.
 *
 * Porting to React Native means swapping this one module for an
 * expo-file-system / AsyncStorage-blob adapter with the same signatures —
 * nothing in `src/core` touches IndexedDB.
 */

const DB_NAME = "vela-files";
const STORE = "files";

interface StoredFile {
  blob: Blob;
  name: string;
  mime: string;
}

function hasIDB(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      }),
  );
}

/** Persist a file's bytes under `id`. */
export async function putFile(id: string, file: File): Promise<void> {
  if (!hasIDB()) throw new Error("File storage is unavailable in this browser.");
  const record: StoredFile = { blob: file, name: file.name, mime: file.type };
  await tx("readwrite", (store) => store.put(record, id));
}

/** Fetch a stored file as a fresh object URL (caller revokes when done). */
export async function getFileURL(id: string): Promise<string | null> {
  if (!hasIDB()) return null;
  const rec = await tx<StoredFile | undefined>("readonly", (store) => store.get(id));
  if (!rec) return null;
  return URL.createObjectURL(rec.blob);
}

/** Remove a stored file's bytes. Safe to call even if it's already gone. */
export async function deleteFile(id: string): Promise<void> {
  if (!hasIDB()) return;
  await tx("readwrite", (store) => store.delete(id));
}
