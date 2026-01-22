# EPaperDash - 電子紙儀表板配置系統

這是一個基於 ESP32 和 E-Paper 顯示器的個人化儀表板系統。它包含一個網頁端的視覺化設計工具（Web Configurator）以及運行在 ESP32 上的固件（Firmware）。

[English Version](./README.md)

## 項目預覽 (Samples)

以下是系統運行的範例畫面：

### 1. 視覺化編輯器介面
![編輯器介面](./docs/EPaperDash%20-%20sample%201.jpeg)

> **提示**：想要查看更多佈局範例、硬體實拍以及 WiFi/位置設定截圖？請 [點擊此處查看所有截圖說明](./docs/screenshots.md)。

---

## 項目結構

- `/web`: 基於 Vue 3 + Vite 的視覺化設計工具，支援 WebSerial 與硬體直接溝通。
- `/firmware`: 基於 PlatformIO 的 ESP32 固件，負責驅動電子紙、連接 WiFi 與更新資料。
- `/docs`: 項目文檔與範例圖片。

## 主要功能

### 網頁配置工具 (Web Configurator)
- **視覺化畫布編輯器**：透過拖放界面設計您的電子紙佈局。
- **元素類型**：
  - **文字**：支援自定義字體與縮放。
  - **圖片**：上傳圖片並自動進行抖動（Dithering）處理。
  - **小組件**：動態時間、日期與天氣佔位符。
- **圖像處理**：
  - **Floyd-Steinberg 抖動演算法**：將彩色圖片轉換為最佳的 1-bit 或 3 色格式。
  - **顏色模式**：支援黑白與三色（黑/白/紅）預覽與導出。
- **設備互動**：
  - **WebSerial API**：透過 USB 直接從瀏覽器連接 ESP32。
  - **一鍵上傳**：將設計好的佈局直接渲染並發送到螢幕。
  - **硬體配置**：透過 UI 設置 WiFi 憑據與地理位置。

### ESP32 固件 (Firmware)
- **WiFi 連接**：自動連接本地 WiFi 獲取即時數據。
- **NTP 時間同步**：與 NTP 服務器同步精確時間。
- **天氣整合**：獲取當前位置的氣象資訊（溫度、天氣代碼）。
- **智慧顯示控制**：
  - 支援透過 Serial 進行全點陣圖像上傳（二進制協議）。
  - 支援小組件局部更新。
  - 高效的雙緩衝渲染（黑紅雙平面）。
- **組件系統**：支援時間、日期、天氣等多種動態插件。

## 硬體需求

- **微控制器**：ESP32 (建議 esp32dev 開發板)
- **顯示器**：5.83" 電子紙顯示器 (例如 Good Display GDEW0583Z83, 相容 GxEPD2)
- **連線定義**：
  - BUSY -> GPIO 4
  - RST  -> GPIO 16
  - DC   -> GPIO 17
  - CS   -> GPIO 5
  - SCK  -> GPIO 18
  - MOSI -> GPIO 23

## 如何開始

### 1. 燒錄固件
進入 `/firmware` 目錄，使用 PlatformIO 進行燒錄：
```bash
pio run --target upload
```
詳見 [Firmware README](./firmware/README.md)

### 2. 啟動網頁設計工具
進入 `/web` 目錄，安裝依賴並啟動開發服務器：
```bash
pnpm install
pnpm dev
```
詳見 [Web README](./web/README.md)

---

## 技術棧

- **Frontend**: Vue 3, Konva.js, Web Serial API
- **Embedded**: C++, Arduino Framework, PlatformIO, GxEPD2
