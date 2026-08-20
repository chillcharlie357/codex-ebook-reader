import { describe, expect, it } from 'vitest'
import { parserInternals } from './parsers'

describe('plain text parser', () => {
  it('recognizes Chinese volume and chapter headings', () => {
    const chapters = parserInternals.splitPlainText([
      '测试书',
      '作者：某人',
      '第一部 起点',
      '这是卷首。',
      '第一章 相遇',
      '第一段。',
      '第二段。',
      '第二章 出发',
      '新的旅途。',
    ].join('\n'))

    expect(chapters.map((chapter) => chapter.title)).toEqual(['作品信息', '第一部 起点', '第一章 相遇', '第二章 出发'])
    expect(chapters[2].paragraphs).toEqual(['第一段。', '第二段。'])
  })

  it('chunks heading-free long text', () => {
    const chapters = parserInternals.splitPlainText(`${'内容'.repeat(4000)}\n${'继续'.repeat(4000)}`)
    expect(chapters.length).toBe(2)
  })

  it('counts CJK characters and latin words', () => {
    expect(parserInternals.countWords('你好 Codex Reader 2026')).toBe(5)
  })
})
