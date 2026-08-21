import { describe, expect, it } from 'vitest'
import {
  CODEX_COPY,
  codexChapterDirectory,
  createCodexPromptSubmission,
  createCodexPromptThreadKey,
  shouldShowCodexScrollControl,
} from './codexPresentation'
import type { Book } from './types'

const book: Book = {
  id: 'book-1',
  filename: '诡秘之主.txt',
  title: '诡秘之主',
  author: '爱潜水的乌贼',
  description: '',
  format: 'TXT',
  language: 'zh-CN',
  fileSize: 1024,
  totalWords: 24,
  addedAt: 1,
  chapters: [
    { id: 'chapter-1', title: '第一章 绯红', paragraphs: ['第一段'], wordCount: 3 },
    { id: 'chapter-2', title: '第二章 情况', paragraphs: ['第二段'], wordCount: 3 },
    { id: 'chapter-3', title: '第三章 克莱恩', paragraphs: ['第三段'], wordCount: 3 },
  ],
}

describe('Codex presentation model', () => {
  it('keeps the native Codex shell wording without reader implementation terms', () => {
    expect(CODEX_COPY).toMatchObject({
      brand: 'Codex',
      newThread: '新对话',
      pullRequests: '拉取请求',
      scheduled: '已安排',
      plugins: '插件',
      projects: '项目',
      recent: '最近',
      output: '产出',
      sources: '来源',
      composerPlaceholder: '随心输入',
    })

    expect(JSON.stringify(CODEX_COPY)).not.toMatch(/导入|电子书|mock|modelhub/i)
  })

  it('builds the chapter directory in reading order', () => {
    expect(codexChapterDirectory(book)).toEqual([
      { index: 0, title: '第一章 绯红' },
      { index: 1, title: '第二章 情况' },
      { index: 2, title: '第三章 克莱恩' },
    ])
  })

  it('keeps every chapter navigable when a book opens on its first chapter', () => {
    const chapters = Array.from({ length: 20 }, (_, index) => ({
      id: `chapter-${index + 1}`,
      title: `第 ${index + 1} 章`,
      paragraphs: [`正文 ${index + 1}`],
      wordCount: 3,
    }))

    expect(codexChapterDirectory({ ...book, chapters })).toEqual(
      chapters.map((chapter, index) => ({ index, title: chapter.title })),
    )
  })

  it('normalizes a submitted prompt and starts the thinking state', () => {
    expect(createCodexPromptSubmission('  test  ', 4)).toEqual({ message: 'test', requestId: 5, status: 'thinking' })
    expect(createCodexPromptSubmission('   ')).toBeNull()
  })

  it('derives a stable prompt thread key from the active reading context', () => {
    expect(createCodexPromptThreadKey('book-1', 'chapter-1')).toBe('book-1:chapter-1')
    expect(createCodexPromptThreadKey('book-1', 'chapter-2')).not.toBe('book-1:chapter-1')
    expect(createCodexPromptThreadKey(null, undefined)).toBe('empty')
  })

  it('shows the latest-message control only when content remains below the viewport', () => {
    expect(shouldShowCodexScrollControl({ scrollHeight: 1200, clientHeight: 600, scrollTop: 300 })).toBe(true)
    expect(shouldShowCodexScrollControl({ scrollHeight: 1200, clientHeight: 600, scrollTop: 590 })).toBe(false)
    expect(shouldShowCodexScrollControl({ scrollHeight: 600, clientHeight: 600, scrollTop: 0 })).toBe(false)
  })
})
