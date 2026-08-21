// @vitest-environment jsdom

import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { parseBook, parserInternals } from './parsers'

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

describe('EPUB parser', () => {
  it('loads every document declared by the package spine', async () => {
    const archive = new JSZip()
    archive.file('META-INF/container.xml', `<?xml version="1.0"?>
      <container xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" /></rootfiles>
      </container>`)
    archive.file('OEBPS/content.opf', `<?xml version="1.0"?>
      <package xmlns="http://www.idpf.org/2007/opf" version="3.0">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>两章测试书</dc:title></metadata>
        <manifest>
          <item id="chapter-1" href="chapter-1.xhtml" media-type="application/xhtml+xml" />
          <item id="chapter-2" href="chapter-2.xhtml" media-type="application/xhtml+xml" />
        </manifest>
        <spine><itemref idref="chapter-1" /><itemref idref="chapter-2" /></spine>
      </package>`)
    archive.file('OEBPS/chapter-1.xhtml', '<html><body><h1>第一章</h1><p>第一章正文。</p></body></html>')
    archive.file('OEBPS/chapter-2.xhtml', '<html><body><h1>第二章</h1><p>第二章正文。</p></body></html>')
    const file = new File([await archive.generateAsync({ type: 'uint8array' })], 'two-chapters.epub', {
      type: 'application/epub+zip',
    })

    const book = await parseBook(file)

    expect(book.title).toBe('两章测试书')
    expect(book.chapters.map((chapter) => chapter.title)).toEqual(['第一章', '第二章'])
    expect(book.chapters.map((chapter) => chapter.paragraphs)).toEqual([['第一章正文。'], ['第二章正文。']])
  })
})
