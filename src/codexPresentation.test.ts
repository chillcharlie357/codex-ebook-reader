import { describe, expect, it } from 'vitest'
import { CODEX_COPY, codexRecentChapters } from './codexPresentation'
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

    expect(JSON.stringify(CODEX_COPY)).not.toMatch(/导入|电子书|mock/i)
  })

  it('builds recent conversations from the active chapter backwards', () => {
    expect(codexRecentChapters(book, 2, 2)).toEqual([
      { index: 2, title: '第三章 克莱恩' },
      { index: 1, title: '第二章 情况' },
    ])
  })
})
