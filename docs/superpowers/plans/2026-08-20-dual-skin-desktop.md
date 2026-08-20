# Dual-Skin Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Codex Reader as an independent Tauri desktop repository with a screenshot-aligned Codex skin, the original reading skin, and a usable GitHub Release.

**Architecture:** Keep the existing React parsing and IndexedDB boundaries intact. Add a small pure interface-mode module consumed by `App.tsx`, express both skins through a root class and scoped CSS tokens, then wrap the Vite build with Tauri 2.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Tauri 2, CSS custom properties

---

### Task 1: Establish the independent repository

**Files:**
- Modify: `README.md`
- Create: `docs/superpowers/specs/2026-08-20-dual-skin-desktop-design.md`

- [ ] Copy only `apps/codex-reader` from the closed My-Wiki PR into a new repository.
- [ ] Initialize `main` and verify `git status --short --branch` contains no My-Wiki files.
- [ ] Rewrite the README to describe the standalone product, formats, privacy model, desktop build and release usage.

### Task 2: Add tested interface-mode state

**Files:**
- Create: `src/interfaceMode.test.ts`
- Create: `src/interfaceMode.ts`
- Modify: `src/App.tsx`

- [ ] Write tests asserting `codex` and `reader` survive parsing while missing or invalid values return `codex`.
- [ ] Run `npm test -- src/interfaceMode.test.ts` and confirm it fails because `interfaceMode.ts` does not exist.
- [ ] Implement `parseInterfaceMode(value)` and the storage key, then rerun the focused test and full suite.
- [ ] Wire the mode into `App.tsx`, persist changes, and expose one accessible switch button whose label states the destination mode.

### Task 3: Implement the Codex screenshot skin

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] Add `skin-codex` / `skin-reader` root classes without changing parsing or IndexedDB behavior.
- [ ] Scope Codex layout to a 292px / flexible / 320px grid with the window controls confined to the left column.
- [ ] Match the supplied screenshot's system typography, pale sidebar, compact rows, white content and floating right-side cards.
- [ ] Keep the existing bookish typography, cover and title treatment under `skin-reader`.
- [ ] Verify keyboard focus, reduced motion and 720px / 1080px responsive breakpoints.

### Task 4: Package the desktop app

**Files:**
- Modify: `package.json`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/capabilities/default.json`
- Create: `.github/workflows/release.yml`

- [ ] Add Tauri CLI and scripts while retaining Vite web commands.
- [ ] Configure a 1200×800 resizable window, macOS minimum size and filesystem-free capability set.
- [ ] Generate application icons from the checked-in vector source.
- [ ] Add a tag-triggered matrix workflow that builds macOS, Windows and Linux release bundles.

### Task 5: Verify and release

**Files:**
- Modify: `README.md`

- [ ] Run `npm test`, `npm run lint`, and `npm run build`; require zero failures.
- [ ] Start the production preview in the foreground-managed local session, use Playwright snapshots before interactions, import the supplied TXT, and capture both 2048×1024 skins.
- [ ] Run the Tauri bundle command and verify the produced installer exists and is non-empty.
- [ ] Commit to `main`, create `chillcharlie357/codex-ebook-reader`, push, tag `v0.2.0`, and upload the installer to a GitHub Release.
- [ ] Fetch origin and leave the checkout fast-forwarded with local `main` equal to `origin/main`.

