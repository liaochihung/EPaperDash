# E-Paper Dashboard Firmware

This is the ESP32 firmware for the E-Paper Dashboard project, designed to drive a 5.83" 3-Color (Black/White/Red) E-Ink display (GxEPD2 compatible).

## Features

- **WiFi Connectivity**: Connects to local WiFi for data updates.
- **NTP Time Sync**: Synchronizes time with NTP servers.
- **Weather Integration**: Fetches weather data (Temperature, Weather Code) for current location.
- **Smart Display Controller**:
  - Supports full bitmap uploads via Serial (Binary Protocol).
  - Supports partial updates for widgets.
  - Efficient double-buffered rendering (Black & Red planes).
- **Widgets System**:
  - **Time**: Displays current time (Updates every minute). Rendered in **RED**.
  - **Date**: Displays current date.
  - **Weather**: Displays current temperature.
- **Serial JSON API**: Configure settings and layout via serial commands.

## Hardware

- **Microcontroller**: ESP32 (esp32dev)
- **Display**: 5.83" E-Paper (e.g., Good Display GDEW0583Z83)
- **Connections**:
  - BUSY -> GPIO 4
  - RST  -> GPIO 16
  - DC   -> GPIO 17
  - CS   -> GPIO 5
  - SCK  -> GPIO 18
  - MOSI -> GPIO 23

## Configuration

The firmware accepts JSON commands over Serial (115200 baud) for configuration:

### 1. Set Configuration
```json
{
  "cmd": "set_config",
  "ssid": "YourWiFi",
  "pass": "YourPassword",
  "lat": 37.7749,
  "lon": -122.4194,
  "tz": "PST",
  "tz_off": -28800
}
```

### 2. Set Widget Layout
```json
{
  "cmd": "set_layout",
  "widgets": [
    {"type": "time", "x": 10, "y": 50, "w": 200, "h": 60, "fmt": ""},
    {"type": "weather", "x": 10, "y": 120, "w": 100, "h": 50, "fmt": ""}
  ]
}
```

## Build & Upload

Project is built using **PlatformIO**.

```bash
# Build
pio run

# Upload
pio run --target upload

# Monitor Serial
pio device monitor
```
