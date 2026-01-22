# E-Paper Dashboard Web Configurator

A Vue.js 3 + Vite web application for designing layouts and configuring the E-Paper Dashboard.

## Features

- **Visual Canvas Editor**: Drag and drop interface to design your e-paper screen.
- **Element Types**:
  - **Text**: Custom fonts, resizing.
  - **Images**: Upload images with automatic dithering.
  - **Widgets**: Dynamic Time, Date, and Weather placeholders.
- **Image Processing**:
  - **Floyd-Steinberg Dithering**: Converts color images to optimal 1-bit or 3-color formats.
  - **Color Modes**: Supports B/W and 3-Color (Black/White/Red) previews and exports.
- **Device Interaction**:
  - **WebSerial API**: Connect directly to the ESP32 via USB Serial.
  - **One-Click Upload**: Upload rendered layouts directly to the screen.
  - **Configuration**: Set WiFi credentials and location settings via the UI.

## Usage

1. **Connect**: Plug in your ESP32 device via USB.
2. **Open App**: Launch the web app (served via Localhost or HTTPS).
3. **Select Device**: Click "Connect" and choose your ESP32 Port.
4. **Design**:
   - Add Text or Images from the toolbar.
   - Add "Time", "Date", or "Weather" widgets.
   - Arrange elements on the canvas.
5. **Upload**:
   - Click "Upload to Screen" to send the full layout.
   - Use "Device Settings" to configure WiFi/Location if needed.

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

## Technologies

- **Vue 3**: Frontend framework.
- **Konva.js**: Canvas manipulation for the editor.
- **Web Serial API**: Browser-hardware communication.
