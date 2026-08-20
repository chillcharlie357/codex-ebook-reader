import JSZip from 'jszip'
import type { Book, BookFormat, Chapter } from './types'

const CHAPTER_HEADING = /^\s*(?:(?:第[0-9零〇一二两三四五六七八九十百千万]+[章回节卷部篇集])|序章|楔子|引子|前言|后记|尾声|番外)(?:[\s:：·—-]+.*)?\s*$/u

function cleanText(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[\t ]+/g, ' ')
    .replace(/\r/g, '')
    .trim()
}

function countWords(value: string) {
  const cjk = value.match(/[\u3400-\u9fff]/g)?.length ?? 0
  const words = value.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length ?? 0
  return cjk + words
}

function makeChapter(title: string, paragraphs: string[], index: number): Chapter {
  const normalized = paragraphs.map(cleanText).filter(Boolean)
  return {
    id: `chapter-${index + 1}`,
    title: cleanText(title) || `章节 ${index + 1}`,
    paragraphs: normalized.length ? normalized : ['本章节没有可显示的正文。'],
    wordCount: countWords(normalized.join(' ')),
  }
}

function splitPlainText(text: string): Chapter[] {
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n')
  const chapters: Chapter[] = []
  let title = '作品信息'
  let paragraphs: string[] = []

  const pushChapter = () => {
    if (paragraphs.some((line) => cleanText(line))) {
      chapters.push(makeChapter(title, paragraphs, chapters.length))
    }
    paragraphs = []
  }

  for (const line of lines) {
    const normalized = cleanText(line)
    if (normalized && normalized.length < 80 && CHAPTER_HEADING.test(normalized)) {
      pushChapter()
      title = normalized
      continue
    }
    if (normalized) paragraphs.push(normalized)
  }
  pushChapter()

  if (chapters.length > 1) return chapters

  const source = chapters[0]?.paragraphs ?? lines.map(cleanText).filter(Boolean)
  const chunked: Chapter[] = []
  let chunk: string[] = []
  let size = 0
  for (const paragraph of source) {
    if (size > 7000 && chunk.length) {
      chunked.push(makeChapter(`章节 ${chunked.length + 1}`, chunk, chunked.length))
      chunk = []
      size = 0
    }
    chunk.push(paragraph)
    size += paragraph.length
  }
  if (chunk.length) chunked.push(makeChapter(`章节 ${chunked.length + 1}`, chunk, chunked.length))
  return chunked
}

function parseDocumentChapters(markup: string, fallbackTitle: string) {
  const document = new DOMParser().parseFromString(markup, 'text/html')
  document.querySelectorAll('script, style, noscript, svg').forEach((node) => node.remove())
  const blocks = Array.from(document.body.querySelectorAll('h1, h2, h3, p, li, blockquote, pre'))
  const chapters: Chapter[] = []
  let title = document.querySelector('h1, h2, h3')?.textContent || fallbackTitle
  let paragraphs: string[] = []

  for (const block of blocks) {
    const value = cleanText(block.textContent || '')
    if (!value) continue
    if (/^H[1-3]$/.test(block.tagName) && paragraphs.length) {
      chapters.push(makeChapter(title, paragraphs, chapters.length))
      title = value
      paragraphs = []
    } else if (!/^H[1-3]$/.test(block.tagName)) {
      paragraphs.push(value)
    }
  }
  if (paragraphs.length) chapters.push(makeChapter(title, paragraphs, chapters.length))
  return chapters.length ? chapters : splitPlainText(document.body.textContent || '')
}

function dirname(path: string) {
  const slash = path.lastIndexOf('/')
  return slash >= 0 ? path.slice(0, slash + 1) : ''
}

function resolvePath(base: string, relative: string) {
  const parts = `${base}${relative}`.split('/')
  const resolved: string[] = []
  for (const part of parts) {
    if (!part || part === '.') continue
    if (part === '..') resolved.pop()
    else resolved.push(part)
  }
  return resolved.join('/')
}

async function parseEpub(file: File) {
  const archive = await JSZip.loadAsync(await file.arrayBuffer())
  const containerXml = await archive.file('META-INF/container.xml')?.async('string')
  if (!containerXml) throw new Error('EPUB 缺少 META-INF/container.xml')
  const container = new DOMParser().parseFromString(containerXml, 'application/xml')
  const rootfile = container.getElementsByTagNameNS('*', 'rootfile')[0]?.getAttribute('full-path')
  if (!rootfile) throw new Error('EPUB 未声明内容目录')
  const packageXml = await archive.file(rootfile)?.async('string')
  if (!packageXml) throw new Error('EPUB 内容目录无法读取')
  const packageDocument = new DOMParser().parseFromString(packageXml, 'application/xml')
  const metadata = packageDocument.getElementsByTagNameNS('*', 'metadata')[0]
  const metaText = (name: string) => cleanText(metadata?.getElementsByTagNameNS('*', name)[0]?.textContent || '')
  const manifest = new Map<string, string>()
  Array.from(packageDocument.getElementsByTagNameNS('*', 'item')).forEach((item) => {
    const id = item.getAttribute('id')
    const href = item.getAttribute('href')
    if (id && href) manifest.set(id, resolvePath(dirname(rootfile), href))
  })

  const chapters: Chapter[] = []
  const spineItems = Array.from(packageDocument.getElementsByTagNameNS('*', 'itemref'))
  for (const itemref of spineItems) {
    const path = manifest.get(itemref.getAttribute('idref') || '')
    if (!path) continue
    const markup = await archive.file(path)?.async('string')
    if (!markup) continue
    const parsed = parseDocumentChapters(markup, `章节 ${chapters.length + 1}`)
    for (const chapter of parsed) {
      chapters.push({ ...chapter, id: `chapter-${chapters.length + 1}` })
    }
  }
  if (!chapters.length) throw new Error('EPUB 中没有可读取的正文')
  return {
    title: metaText('title'),
    author: metaText('creator'),
    description: metaText('description'),
    language: metaText('language'),
    chapters,
  }
}

async function parsePdf(file: File) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const chapters: Chapter[] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    chapters.push(makeChapter(`第 ${pageNumber} 页`, [text], chapters.length))
  }
  const metadata = await pdf.getMetadata().catch(() => null)
  const info = metadata?.info as { Title?: string; Author?: string; Subject?: string } | undefined
  return {
    title: info?.Title || '',
    author: info?.Author || '',
    description: info?.Subject || '',
    language: '',
    chapters,
  }
}

function markdownToHtml(markdown: string) {
  return markdown
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .split(/\n{2,}/)
    .map((block) => (/^<h|^<blockquote/.test(block) ? block : `<p>${block.replace(/\n/g, ' ')}</p>`))
    .join('')
}

function formatFromFile(file: File): BookFormat {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'epub') return 'EPUB'
  if (extension === 'pdf') return 'PDF'
  if (extension === 'md' || extension === 'markdown') return 'MD'
  if (extension === 'html' || extension === 'htm') return 'HTML'
  if (extension === 'txt') return 'TXT'
  throw new Error('暂不支持该文件。请选择 TXT、EPUB、PDF、Markdown 或 HTML。')
}

export async function parseBook(file: File): Promise<Book> {
  const format = formatFromFile(file)
  const filenameTitle = file.name.replace(/\.[^.]+$/, '')
  let parsed: { title: string; author: string; description: string; language: string; chapters: Chapter[] }
  if (format === 'EPUB') {
    parsed = await parseEpub(file)
  } else if (format === 'PDF') {
    parsed = await parsePdf(file)
  } else {
    const text = await file.text()
    const chapters = format === 'HTML'
      ? parseDocumentChapters(text, filenameTitle)
      : format === 'MD'
        ? parseDocumentChapters(markdownToHtml(text), filenameTitle)
        : splitPlainText(text)
    const firstLines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map(cleanText).filter(Boolean).slice(0, 8)
    parsed = {
      title: format === 'TXT' && firstLines[0] && !CHAPTER_HEADING.test(firstLines[0]) ? firstLines[0] : filenameTitle,
      author: firstLines.find((line) => /^(作者|author)[：:]/i.test(line))?.replace(/^(作者|author)[：:]\s*/i, '') || '',
      description: '',
      language: /[\u3400-\u9fff]/u.test(text.slice(0, 1000)) ? 'zh-CN' : '',
      chapters,
    }
  }
  return {
    id: crypto.randomUUID(),
    filename: file.name,
    title: parsed.title || filenameTitle,
    author: parsed.author || '未知作者',
    description: parsed.description || '本书保存在当前浏览器中。',
    language: parsed.language || '未知',
    format,
    fileSize: file.size,
    addedAt: Date.now(),
    totalWords: parsed.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0),
    chapters: parsed.chapters,
  }
}

export const parserInternals = { splitPlainText, countWords, markdownToHtml }
