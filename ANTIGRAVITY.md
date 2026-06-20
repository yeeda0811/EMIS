# EMIS - ANTIGRAVITY.md

## 專案入口

專案名稱：EMIS (請假系統)
專案用途：管理員工請假流程與假別統計
主要工作目錄：d:\AI\Antigravity\leave_system
GitHub repo：https://github.com/yeeda0811/EMIS.git
預設 branch：main

## 專案架構與技術棧

- 資料庫：Supabase (PostgreSQL)
- 前端託管：Netlify
- CI/CD & 版本控制：GitHub (連結 Supabase 與 Netlify)

## 工作規則

- 回應使用台灣繁體中文（Taiwan）。
- 涉及檔案操作時回報完整產出位置。
- 使用 PowerShell 語法。
- 開工時讀取本檔、讀取專案筆記重點、檢查 Git 狀態。
- 收工時檢查敏感資料，必要時更新本檔，檢查 diff 後僅提交相關檔案。
- 不將每日流水帳寫進本檔。

## 安全限制 (不要做)

- 嚴禁將個人 `SUPABASE_URL`、`SUPABASE_ANON_KEY`、Netlify Token 或 GitHub Token 寫入任何非環境變數檔案中。
- 嚴禁提交 `.env.local` 檔案。
- 不要自動納入無關的 Git 變更。
- 測試資料不得儲存員工之真實姓名，僅使用代號與座號（或員工編號）。
