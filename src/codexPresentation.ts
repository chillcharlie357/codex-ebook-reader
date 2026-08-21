import type { Book } from './types'

export const CODEX_COPY = {
  brand: 'Codex',
  newThread: '新对话',
  pullRequests: '拉取请求',
  scheduled: '已安排',
  plugins: '插件',
  projects: '项目',
  showMore: '展开显示',
  recent: '最近',
  output: '产出',
  outputHint: '创建文件或站点',
  sources: '来源',
  sourcesHint: '附加文件或连接应用',
  composerPlaceholder: '随心输入',
  collaborate: '帮我批准',
  thinking: '正在思考',
} as const

export const CODEX_THINKING_DURATION_MS = 4000

type CodexScrollMetrics = {
  scrollHeight: number
  clientHeight: number
  scrollTop: number
}

export function createCodexPromptSubmission(value: string, lastRequestId = 0) {
  const message = value.trim()
  return message ? { message, requestId: lastRequestId + 1, status: 'thinking' as const } : null
}

export function createCodexPromptThreadKey(bookId: string | null, chapterId?: string) {
  return [bookId, chapterId].filter(Boolean).join(':') || 'empty'
}

export function shouldShowCodexScrollControl({ scrollHeight, clientHeight, scrollTop }: CodexScrollMetrics) {
  return scrollHeight > clientHeight && scrollHeight - clientHeight - scrollTop > 24
}

export function codexChapterDirectory(book: Book | null) {
  if (!book) return []

  return book.chapters
    .map((chapter, index) => ({ index, title: chapter.title }))
}
