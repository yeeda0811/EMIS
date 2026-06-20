# EMIS (Employee Leave Management System)

EMIS 是一個基於 Web 的員工請假管理系統。本系統採用前後端分離架構，結合 Supabase 作為後端資料庫，並部署於 Netlify 平台，提供高效、穩定的請假申請與統計服務。

## 系統架構

- **前端網頁**：採用響應式 HTML5、CSS3 與 JavaScript，部署於 Netlify。
- **後端資料庫**：採用 Supabase (PostgreSQL)，管理員工資料、假別配置及請假審核記錄。
- **版本控制 & CI/CD**：託管於 GitHub 儲存庫 `https://github.com/yeeda0811/EMIS`。

## 本地開發與設定

### 先備條件
1. 本地需安裝 `Node.js`、`npm`、`git`。
2. 全域安裝 Supabase CLI 用於本地開發：
   ```powershell
   npm install -g supabase
   ```

### 本地初始化步驟
1. 複製環境變數範本：
   ```powershell
   copy .env.example .env.local
   ```
   並於 `.env.local` 中填入您的 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`。

2. 初始化本地 Supabase 專案結構：
   ```powershell
   supabase init
   ```

## 部署與發佈

### 1. 前端部署 (Netlify)
本專案已連結至 GitHub 進行持續整合與部署。當您將變更推送至 GitHub 儲存庫的 `main` 分支時，Netlify 將自動觸發建置與發佈。
* 請確保在 Netlify 控制台的 **Site settings -> Environment variables** 中設定了相同的 Supabase 連線變數。

### 2. 資料庫遷移與持續交付 (Supabase)
* 透過本地 Supabase CLI 管理資料表結構：
  ```powershell
  supabase migration new <migration_name>
  ```
* 部署至線上環境：
  ```powershell
  supabase db push
  ```

## 安全守則
* 嚴禁提交 `.env.local` 等包含敏感密鑰的檔案至 GitHub。
* 任何 API 金鑰與敏感連線憑證必須以環境變數形式傳遞。
