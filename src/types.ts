export type BookFormat = 'TXT' | 'EPUB' | 'PDF' | 'MD' | 'HTML'

export interface Chapter {
  id: string
  title: string
  paragraphs: string[]
  wordCount: number
}

export interface Book {
  id: string
  filename: string
  title: string
  author: string
  description: string
  language: string
  format: BookFormat
  fileSize: number
  addedAt: number
  totalWords: number
  chapters: Chapter[]
}

export interface ReadingProgress {
  bookId: string
  chapterId: string
  chapterIndex: number
  scrollRatio: number
  updatedAt: number
}

export interface BookNote {
  bookId: string
  content: string
  updatedAt: number
}

export interface ReaderSettings {
  fontSize: number
  lineHeight: number
  columnWidth: number
  theme: 'light' | 'sepia' | 'dark'
}
