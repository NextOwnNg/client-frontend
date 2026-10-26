/**
 * Uploaded photos for the mock API. In the browser they're kept in IndexedDB so drafts keep their photos
 * across reloads; tests keep them in memory. FICTIONAL storage standing in for the real signed-upload store.
 */

const memory = new Map<string, Blob>()
const persistent = import.meta.env.MODE !== 'test' && typeof indexedDB !== 'undefined'
const STORE = 'media'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('nextown-mock-media', 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'))
  })
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

export const mediaDb = {
  async put(id: string, blob: Blob) {
    memory.set(id, blob)
    if (!persistent) return
    try {
      await run('readwrite', (store) => store.put(blob, id))
    } catch {
      // Storage unavailable: the photo lasts until reload
    }
  },

  async get(id: string): Promise<Blob | undefined> {
    const cached = memory.get(id)
    if (cached || !persistent) return cached
    try {
      const blob = await run<Blob | undefined>('readonly', (store) => store.get(id) as IDBRequest<Blob | undefined>)
      if (blob) memory.set(id, blob)
      return blob
    } catch {
      return undefined
    }
  },

  reset() {
    memory.clear()
  },
}
