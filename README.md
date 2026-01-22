# EPaperDash - E-Paper Dashboard Configuration System

A personalized dashboard system(vibe code test) based on ESP32 and E-Paper displays. It includes a web-based visual design tool (Web Configurator) and firmware running on ESP32.

[繁體中文 (Traditional Chinese)](./README.zh-TW.md)

## Preview

Here is a glimpse of the system in action:

### Visual Editor Interface
![Editor Interface](./docs/EPaperDash%20-%20sample%201.jpeg)

> **Note**: For more layout samples, hardware photos, and configuration screenshots, please [click here to view all screenshots](./docs/screenshots.md).

---

## Project Structure

- `/web`: Vue 3 + Vite visual design tool, supports WebSerial for direct hardware communication.
- `/firmware`: PlatformIO-based ESP32 firmware for driving the E-Paper, connecting to WiFi, and data updates.
- `/docs`: Project documentation and sample images (including WIFI/Location configuration samples).

## Key Features

### Web Configurator
- **Visual Canvas Editor**: Drag-and-drop interface to design your e-paper layout.
- **Element Types**:
  - **Text**: Custom fonts and scaling.
  - **Images**: Upload images with automatic dithering.
  - **Widgets**: Dynamic Time, Date, and Weather placeholders.
- **Image Processing**:
  - **Floyd-Steinberg Dithering**: Converts color images to optimal 1-bit or 3-color formats.
  - **Color Modes**: Supports B/W and 3-Color (Black/White/Red) previews and exports.
- **Device Interaction**:
  - **WebSerial API**: Connect to ESP32 via USB directly from the browser.
  - **One-Click Upload**: Render and send layouts directly to the screen.
  - **Hardware Config**: Set [WiFi credentials](./docs/ESP32-Wifi%20Config.jpeg) and [Location settings](./docs/ESP32-Location.jpeg) via the UI.

### ESP32 Firmware
- **WiFi Connectivity**: Automatically connects to local WiFi for real-time updates.
- **NTP Time Sync**: Synchronizes accurate time with NTP servers.
- **Weather Integration**: Fetches weather information (Temperature, Weather Code) based on location.
- **Smart Display Control**:
  - Supports full bitmap uploads via Serial (Binary Protocol).
  - Supports partial updates for widgets.
  - Efficient double-buffered rendering (Black & Red planes).
- **Widget System**: Supports Time, Date, Weather, and more dynamic plugins.

## Hardware Requirements

- **MCU**: ESP32 (esp32dev recommended)
- **Display**: 5.83" E-Paper Display (e.g., Good Display GDEW0583Z83, GxEPD2 compatible)
- **Pin Mapping**:
  - BUSY -> GPIO 4
  - RST  -> GPIO 16
  - DC   -> GPIO 17
  - CS   -> GPIO 5
  - SCK  -> GPIO 18
  - MOSI -> GPIO 23

## Getting Started

### 1. Flash Firmware
Navigate to `/firmware` and use PlatformIO to upload:
```bash
pio run --target upload
```
See [Firmware README](./firmware/README.md) for details.

### 2. Start Web Configurator
Navigate to `/web`, install dependencies, and start the dev server:
```bash
pnpm install
pnpm dev
```
See [Web README](./web/README.md) for details.

---

## Tech Stack

- **Frontend**: Vue 3, Konva.js, Web Serial API
- **Embedded**: C++, Arduino Framework, PlatformIO, GxEPD2
