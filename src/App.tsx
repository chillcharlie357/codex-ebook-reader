import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  Library,
  Menu,
  MoreHorizontal,
  PanelRight,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react'
import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { libraryDb } from './db'
import { readInterfaceMode, writeInterfaceMode } from './interfaceMode'
import { parseBook } from './parsers'
import type { Book, ReaderSettings } from './types'

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 19,
  lineHeight: 1.95,
  columnWidth: 720,
  theme: 'light',
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN', { notation: value > 9999 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value)
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** exponent).toFixed(exponent ? 1 : 0)} ${units[exponent]}`
}

function readSettings(): ReaderSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('codex-reader-settings') || '{}') }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function runWindowAction(action: 'close' | 'minimize' | 'toggleMaximize') {
  if (!('__TAURI_INTERNALS__' in window)) return
  void import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow()[action]())
}

function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [activeBookId, setActiveBookId] = useState<string | null>(null)
  const [activeChapterIndex, setActiveChapterIndex] = useState(0)
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [settings, setSettings] = useState<ReaderSettings>(readSettings)
  const [interfaceMode, setInterfaceMode] = useState(() => readInterfaceMode(localStorage))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(() => window.innerWidth > 1080)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 720)
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [scrollRatio, setScrollRatio] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const readerRef = useRef<HTMLElement>(null)
  const noteTimer = useRef<number | null>(null)

  const activeBook = useMemo(() => books.find((book) => book.id === activeBookId) ?? null, [activeBookId, books])
  const activeChapter = activeBook?.chapters[activeChapterIndex]
  const filteredChapters = useMemo(() => {
    if (!activeBook) return []
    const normalized = query.trim().toLocaleLowerCase()
    return activeBook.chapters
      .map((chapter, index) => ({ chapter, index }))
      .filter(({ chapter }) => !normalized || chapter.title.toLocaleLowerCase().includes(normalized))
  }, [activeBook, query])

  const loadBook = useCallback(async (book: Book) => {
    setActiveBookId(book.id)
    const [progress, savedNote] = await Promise.all([libraryDb.getProgress(book.id), libraryDb.getNote(book.id)])
    setActiveChapterIndex(Math.min(progress?.chapterIndex ?? 0, book.chapters.length - 1))
    setNote(savedNote?.content ?? '')
    requestAnimationFrame(() => {
      const reader = readerRef.current
      if (reader && progress?.scrollRatio) {
        reader.scrollTop = (reader.scrollHeight - reader.clientHeight) * progress.scrollRatio
      }
    })
  }, [])

  useEffect(() => {
    libraryDb.getBooks().then((stored) => {
      const sorted = stored.sort((a, b) => b.addedAt - a.addedAt)
      setBooks(sorted)
      if (sorted[0]) void loadBook(sorted[0])
    }).catch(() => setError('无法打开本地书库，请检查浏览器是否允许本地存储。'))
  }, [loadBook])

  useEffect(() => {
    localStorage.setItem('codex-reader-settings', JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    writeInterfaceMode(localStorage, interfaceMode)
  }, [interfaceMode])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        fileInputRef.current?.click()
      }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === 'ArrowLeft') goToChapter(activeChapterIndex - 1)
      if (event.key === 'ArrowRight') goToChapter(activeChapterIndex + 1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useEffect(() => {
    return () => {
      if (noteTimer.current) window.clearTimeout(noteTimer.current)
    }
  }, [])

  const importFiles = async (files: File[]) => {
    if (!files.length) return
    setImporting(true)
    setError('')
    try {
      const imported: Book[] = []
      for (const file of files) {
        const book = await parseBook(file)
        await libraryDb.saveBook(book)
        imported.push(book)
      }
      const nextBooks = [...imported, ...books]
      setBooks(nextBooks)
      await loadBook(imported[0])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '无法导入这本书。')
    } finally {
      setImporting(false)
      setDragging(false)
    }
  }

  const onFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    void importFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    void importFiles(Array.from(event.dataTransfer.files))
  }

  const goToChapter = (index: number) => {
    if (!activeBook || index < 0 || index >= activeBook.chapters.length) return
    setActiveChapterIndex(index)
    setScrollRatio(0)
    readerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    void libraryDb.saveProgress({
      bookId: activeBook.id,
      chapterId: activeBook.chapters[index].id,
      chapterIndex: index,
      scrollRatio: 0,
      updatedAt: Date.now(),
    })
  }

  const onReaderScroll = () => {
    if (!activeBook || !activeChapter || !readerRef.current) return
    const reader = readerRef.current
    const ratio = reader.scrollHeight > reader.clientHeight
      ? reader.scrollTop / (reader.scrollHeight - reader.clientHeight)
      : 0
    setScrollRatio(ratio)
    void libraryDb.saveProgress({
      bookId: activeBook.id,
      chapterId: activeChapter.id,
      chapterIndex: activeChapterIndex,
      scrollRatio: ratio,
      updatedAt: Date.now(),
    })
  }

  const updateNote = (value: string) => {
    setNote(value)
    if (!activeBook) return
    if (noteTimer.current) window.clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => {
      void libraryDb.saveNote({ bookId: activeBook.id, content: value, updatedAt: Date.now() })
    }, 400)
  }

  const deleteActiveBook = async () => {
    if (!activeBook || !window.confirm(`从本地书库移除《${activeBook.title}》？`)) return
    await libraryDb.deleteBook(activeBook.id)
    const remaining = books.filter((book) => book.id !== activeBook.id)
    setBooks(remaining)
    if (remaining[0]) await loadBook(remaining[0])
    else setActiveBookId(null)
  }

  const progress = activeBook
    ? ((activeChapterIndex + scrollRatio) / Math.max(activeBook.chapters.length, 1)) * 100
    : 0

  return (
    <div
      className={`app skin-${interfaceMode} theme-${settings.theme} ${dragging ? 'is-dragging' : ''}`}
      data-interface-mode={interfaceMode}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        multiple
        accept=".txt,.epub,.pdf,.md,.markdown,.html,.htm,text/plain,application/epub+zip,application/pdf,text/markdown,text/html"
        onChange={onFilesSelected}
      />

      <div className="window-bar" data-tauri-drag-region>
        <div className="traffic-lights">
          <button type="button" aria-label="关闭窗口" onClick={() => runWindowAction('close')} />
          <button type="button" aria-label="最小化窗口" onClick={() => runWindowAction('minimize')} />
          <button type="button" aria-label="切换窗口大小" onClick={() => runWindowAction('toggleMaximize')} />
        </div>
        <button className="icon-button mobile-only" aria-label="切换书库侧栏" onClick={() => setSidebarOpen((value) => !value)}><Menu size={17} /></button>
        <span className="window-title">{interfaceMode === 'codex' ? 'Codex' : 'Codex Reader'}</span>
        <div className="window-actions">
          <button className="icon-button" aria-label="阅读设置" onClick={() => setSettingsOpen((value) => !value)}><Settings2 size={16} /></button>
          <button className="icon-button" aria-label="切换信息侧栏" onClick={() => setInspectorOpen((value) => !value)}><PanelRight size={16} /></button>
        </div>
      </div>

      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="brand-row">
          <button
            className="mode-button"
            type="button"
            aria-label={`切换到${interfaceMode === 'codex' ? '阅读器' : 'Codex'}界面`}
            aria-pressed={interfaceMode === 'reader'}
            onClick={() => setInterfaceMode(interfaceMode === 'codex' ? 'reader' : 'codex')}
          >
            <span className="brand-mark"><BookOpen size={17} strokeWidth={1.8} /></span>
            <strong>{interfaceMode === 'codex' ? 'Codex' : '阅读器'}</strong>
            <ChevronDown size={13} strokeWidth={1.7} />
          </button>
          <button className="icon-button sidebar-close mobile-only" aria-label="关闭书库侧栏" onClick={() => setSidebarOpen(false)}><X size={16} /></button>
        </div>

        <button className="import-button" onClick={() => fileInputRef.current?.click()} disabled={importing}>
          <FilePlus2 size={16} />
          {importing ? '正在解析…' : '导入电子书'}
          <kbd>⌘O</kbd>
        </button>

        <div className="section-label"><span>书籍</span><span>{books.length}</span></div>
        <nav className="book-list" aria-label="书籍列表">
          {books.map((book) => (
            <div key={book.id} className="book-group">
              <button className={`book-row ${book.id === activeBookId ? 'active' : ''}`} onClick={() => void loadBook(book)}>
                <Library size={15} />
                <span>{book.title}</span>
                <ChevronDown size={13} />
              </button>
              {book.id === activeBookId && (
                <div className="chapter-tree">
                  <div className="chapter-search">
                    <Search size={13} />
                    <input aria-label="搜索章节" placeholder="搜索章节" value={query} onChange={(event) => setQuery(event.target.value)} />
                  </div>
                  <div className="chapter-rail" aria-hidden="true"><span style={{ height: `${progress}%` }} /></div>
                  <div className="chapter-list">
                    {filteredChapters.map(({ chapter, index }) => (
                      <button key={chapter.id} className={`chapter-row ${index === activeChapterIndex ? 'active' : ''}`} onClick={() => goToChapter(index)}>
                        <span>{chapter.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>仅保存在这台设备</span>
          <span className="privacy-dot" />
        </div>
      </aside>

      <main className="workspace">
        {activeBook && activeChapter ? (
          <>
            <header className="reader-toolbar">
              <div>
                <span className="crumb">{activeBook.title}</span>
                <ChevronRight size={12} />
                <strong>{activeChapter.title}</strong>
              </div>
              <div className="reader-toolbar-actions">
                <span>{Math.round(progress)}%</span>
                <button className="icon-button" aria-label="更多操作"><MoreHorizontal size={17} /></button>
              </div>
            </header>
            <article
              ref={readerRef}
              className="reader"
              onScroll={onReaderScroll}
              style={{ '--reader-size': `${settings.fontSize}px`, '--reader-leading': settings.lineHeight, '--reader-width': `${settings.columnWidth}px` } as React.CSSProperties}
            >
              <div className="reader-page">
                <div className="chapter-kicker">第 {activeChapterIndex + 1} / {activeBook.chapters.length} 节</div>
                <h1>{activeChapter.title}</h1>
                <div className="chapter-rule"><span /></div>
                <div className="prose">
                  {activeChapter.paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>)}
                </div>
                <nav className="chapter-navigation" aria-label="章节导航">
                  <button disabled={activeChapterIndex === 0} onClick={() => goToChapter(activeChapterIndex - 1)}><ChevronLeft size={16} />上一章</button>
                  <button disabled={activeChapterIndex === activeBook.chapters.length - 1} onClick={() => goToChapter(activeChapterIndex + 1)}>下一章<ChevronRight size={16} /></button>
                </nav>
              </div>
            </article>
          </>
        ) : (
          <section className="empty-state">
            <div className="empty-glyph"><BookOpen size={30} strokeWidth={1.3} /></div>
            <p className="empty-eyebrow">本地阅读空间</p>
            <h1>把一本书放到这里</h1>
            <p>支持 TXT、EPUB、PDF、Markdown 与 HTML。文件只在你的浏览器中解析和保存。</p>
            <button onClick={() => fileInputRef.current?.click()}><FilePlus2 size={16} />选择电子书</button>
            <span>也可以直接拖放到窗口</span>
          </section>
        )}
      </main>

      {inspectorOpen && activeBook && (
        <aside className="inspector">
          <div className="inspector-head"><span>{interfaceMode === 'codex' ? '上下文' : '详情'}</span><button className="icon-button" aria-label="关闭详情" onClick={() => setInspectorOpen(false)}><X size={15} /></button></div>
          <section className="book-card">
            <div className="cover" aria-hidden="true"><span>{activeBook.title.slice(0, 4)}</span><i /></div>
            <div>
              <h2>{activeBook.title}</h2>
              <p>{activeBook.author}</p>
              <span className="format-pill">{activeBook.format}</span>
            </div>
          </section>
          <section className="meta-section">
            <h3>书籍信息</h3>
            <dl>
              <div><dt>章节</dt><dd>{activeBook.chapters.length}</dd></div>
              <div><dt>字数</dt><dd>{formatNumber(activeBook.totalWords)}</dd></div>
              <div><dt>文件</dt><dd>{formatBytes(activeBook.fileSize)}</dd></div>
              <div><dt>语言</dt><dd>{activeBook.language}</dd></div>
            </dl>
          </section>
          <section className="note-section">
            <div><h3>私人笔记</h3><span>自动保存</span></div>
            <textarea aria-label="私人笔记" value={note} onChange={(event) => updateNote(event.target.value)} placeholder="写下角色关系、线索或一段想法…" />
          </section>
          <button className="delete-button" onClick={() => void deleteActiveBook()}><Trash2 size={14} />从书库移除</button>
        </aside>
      )}

      {settingsOpen && (
        <div className="settings-popover">
          <div><strong>阅读外观</strong><button className="icon-button" aria-label="关闭阅读设置" onClick={() => setSettingsOpen(false)}><X size={14} /></button></div>
          <label>字号 <output>{settings.fontSize}px</output><input type="range" min="15" max="28" value={settings.fontSize} onChange={(event) => setSettings({ ...settings, fontSize: Number(event.target.value) })} /></label>
          <label>行距 <output>{settings.lineHeight.toFixed(1)}</output><input type="range" min="1.4" max="2.4" step="0.1" value={settings.lineHeight} onChange={(event) => setSettings({ ...settings, lineHeight: Number(event.target.value) })} /></label>
          <label>版心 <output>{settings.columnWidth}px</output><input type="range" min="560" max="900" step="20" value={settings.columnWidth} onChange={(event) => setSettings({ ...settings, columnWidth: Number(event.target.value) })} /></label>
          <div className="theme-switcher" role="group" aria-label="阅读主题">
            {(['light', 'sepia', 'dark'] as const).map((theme) => <button key={theme} className={settings.theme === theme ? 'active' : ''} onClick={() => setSettings({ ...settings, theme })}>{theme === 'light' ? '明亮' : theme === 'sepia' ? '纸张' : '夜间'}</button>)}
          </div>
        </div>
      )}

      {error && <div className="toast" role="alert">{error}<button aria-label="关闭错误提示" onClick={() => setError('')}><X size={14} /></button></div>}
      {dragging && <div className="drop-overlay"><FilePlus2 size={28} /><strong>放开以导入电子书</strong><span>TXT · EPUB · PDF · MD · HTML</span></div>}
    </div>
  )
}

export default App
