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
} as const

export function codexChapterDirectory(book: Book | null) {
  if (!book) return []

  return book.chapters
    .map((chapter, index) => ({ index, title: chapter.title }))
}
