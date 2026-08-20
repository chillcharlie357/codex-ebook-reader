import type { Book, BookNote, ReadingProgress } from './types'

const DATABASE = 'codex-reader'
const VERSION = 1

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains('books')) {
        database.createObjectStore('books', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('progress')) {
        database.createObjectStore('progress', { keyPath: 'bookId' })
      }
      if (!database.objectStoreNames.contains('notes')) {
        database.createObjectStore('notes', { keyPath: 'bookId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transact<T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase()
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode)
    const request = operation(transaction.objectStore(storeName))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
  })
}

export const libraryDb = {
  getBooks: () => transact<Book[]>('books', 'readonly', (store) => store.getAll()),
  saveBook: (book: Book) => transact<IDBValidKey>('books', 'readwrite', (store) => store.put(book)),
  deleteBook: (id: string) => transact<undefined>('books', 'readwrite', (store) => store.delete(id)),
  getProgress: (bookId: string) => transact<ReadingProgress | undefined>('progress', 'readonly', (store) => store.get(bookId)),
  saveProgress: (progress: ReadingProgress) => transact<IDBValidKey>('progress', 'readwrite', (store) => store.put(progress)),
  getNote: (bookId: string) => transact<BookNote | undefined>('notes', 'readonly', (store) => store.get(bookId)),
  saveNote: (note: BookNote) => transact<IDBValidKey>('notes', 'readwrite', (store) => store.put(note)),
}
