# Codex Reader

Codex Desktop 风格的本地电子书阅读器。书籍解析、阅读进度和笔记都保存在当前浏览器，不会上传到服务器。

## 支持格式

- TXT：识别中文章、回、卷、部、篇等章节标题；无标题长文本会自动分段
- EPUB：读取 OPF metadata、spine 与 XHTML 正文
- PDF：按页提取文本（扫描版 PDF 需要先进行 OCR）
- Markdown / HTML：根据标题层级生成章节

## 本地运行

```bash
npm install
npm run dev
```

打开 Vite 输出的本地地址，点击“导入电子书”或将文件拖入窗口。

## 验证

```bash
npm test
npm run lint
npm run build
```
