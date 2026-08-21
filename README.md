# Codex Reader

独立、私密的多格式桌面电子书阅读器。界面可在像素对齐 Codex Desktop 的效率模式与专注排版的阅读器模式之间切换；书籍解析、阅读进度和笔记都保存在本机，不会上传。

## 功能

- Codex / 阅读器双皮肤，选择会自动记忆
- 左侧书籍与章节树、中央正文、右侧元信息与私人笔记
- 阅读进度、章节位置、字号、行距和版心本地持久化
- 阅读器设置可检查 GitHub 最新 Release，并在发现新版本时前往下载
- macOS、Windows、Linux 共用一套 Tauri 2 桌面代码

## 支持格式

- TXT：识别中文章、回、卷、部、篇等章节标题；无标题长文本会自动分段
- EPUB：读取 OPF metadata、spine 与 XHTML 正文
- PDF：按页提取文本（扫描版 PDF 需要先进行 OCR）
- Markdown / HTML：根据标题层级生成章节

## 下载

从 [GitHub Releases](https://github.com/chillcharlie357/codex-ebook-reader/releases) 下载当前平台安装包。Release 提供 Apple Silicon macOS `.app.zip`；解压后可将应用拖入“应用程序”。合并 PR 到 `main` 后，Release 工作流会自动递增补丁版本并构建 macOS、Windows 和 Linux 产物；也可从 Actions 手动重试。

### macOS 未签名版本

当前 macOS 安装包未使用 Apple Developer 证书签名或公证，Gatekeeper 可能阻止首次运行。请先在 Finder 中右键 `Codex Reader.app` 并选择“打开”。如果仍然无法启动，请先在 Finder 中移除“应用程序”内已有的同名旧版本，再在终端中进入解压后的应用所在目录并执行：

```bash
mv "Codex Reader.app" "/Applications/Codex Reader.app"
xattr -cr "/Applications/Codex Reader.app"
codesign --force --deep --sign - "/Applications/Codex Reader.app"
codesign --verify --deep --strict --verbose=2 "/Applications/Codex Reader.app"
```

以上命令会移除应用的扩展属性并进行本机 ad-hoc 签名。请仅对从本仓库 GitHub Releases 下载且确认可信的安装包执行；最后一条命令用于验证签名结果。

## Web 开发

```bash
npm install
npm run dev
```

打开 Vite 输出的本地地址，点击“导入电子书”或将文件拖入窗口。

## 桌面开发

需要 Node.js、Rust 和对应平台的系统编译工具：

```bash
npm install
npm run tauri dev
```

构建当前平台安装包：

```bash
npm run tauri build
```

## 验证

```bash
npm test
npm run lint
npm run build
```

详细设计与实现计划位于 `docs/superpowers/`。
