#include "DisplayController.h"
#include <cstring> // For memset
// Fonts
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>
#include <Fonts/FreeSansBold24pt7b.h>

// Pins
#define EPD_CS      5
#define EPD_DC      17
#define EPD_RST     16
#define EPD_BUSY    4

// Display Object
// Use 120 lines page height to save RAM as per previous fix
GxEPD2_3C<GxEPD2_583c_Z83, 120> display(GxEPD2_583c_Z83(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

uint8_t *imageBuffer = nullptr;
bool hasValidImage = false;  // Track if we have a valid uploaded image 

void DisplayController::begin() {
    display.init(115200, true, 2, false);
    display.setRotation(0);
}

bool DisplayController::allocateBuffer() {
    if (imageBuffer) return true;
    size_t bufferSize = (size_t)IMG_WIDTH * IMG_HEIGHT / 8 * 2; // Black + Red
    imageBuffer = (uint8_t*)malloc(bufferSize);
    if (imageBuffer) {
        memset(imageBuffer, 0, bufferSize);  // Initialize to 0 (all white)
    }
    return imageBuffer != nullptr;
}

uint8_t* DisplayController::getBuffer() {
    return imageBuffer;
}

void DisplayController::setLayout(const JsonArray& widgetsArr) {
    widgetCount = 0;
    for(JsonObject w : widgetsArr) {
        if (widgetCount >= MAX_WIDGETS) break;
        widgets[widgetCount].type = w["type"].as<String>();
        widgets[widgetCount].x = w["x"];
        widgets[widgetCount].y = w["y"];
        widgets[widgetCount].w = w["w"];
        widgets[widgetCount].h = w["h"];
        widgets[widgetCount].fmt = w["fmt"].as<String>();
        widgetCount++;
    }
}

int DisplayController::getWidgetCount() const {
    return widgetCount;
}

void DisplayController::setImageValid(bool valid) {
    hasValidImage = valid;
}

void DisplayController::drawBackground() {
    // Debug: Check image buffer state
    Serial.printf("[DEBUG] drawBackground: imageBuffer=%p, hasValidImage=%d\n", imageBuffer, hasValidImage);
    
    // Only draw background if we have a valid uploaded image
    if (imageBuffer && hasValidImage) {
        uint32_t planeSize = (uint32_t)IMG_WIDTH * IMG_HEIGHT / 8;
        uint8_t* blackBitmap = imageBuffer;
        uint8_t* redBitmap = imageBuffer + planeSize;
        
        // Debug: Check first few bytes of bitmap
        Serial.printf("[DEBUG] Black bitmap first 4 bytes: %02X %02X %02X %02X\n", 
            blackBitmap[0], blackBitmap[1], blackBitmap[2], blackBitmap[3]);
        
        Serial.println("Drawing background image...");
        
        // Our bitmap format from web: bit=1 means colored (black/red)
        // drawBitmap draws color WHERE bit=1, which matches our format
        display.drawBitmap(0, 0, blackBitmap, IMG_WIDTH, IMG_HEIGHT, GxEPD_BLACK);
        display.drawBitmap(0, 0, redBitmap, IMG_WIDTH, IMG_HEIGHT, GxEPD_RED);
    } else {
        Serial.println("[DEBUG] No valid image to draw");
        // No valid image, just keep white background
        // (fillScreen already called before this)
    }
}

void DisplayController::renderOverlay(bool partial, String timeStr, String dateStr, float temp, int weatherCode, float windSpeed, int humidity, int precipProb) {
    if (widgetCount == 0 && partial) return; 

    // Use setPartialWindow for faster refresh with less flicker
    // Note: 3-color e-paper may show ghosting - can revert to setFullWindow() if needed
    display.setPartialWindow(0, 0, IMG_WIDTH, IMG_HEIGHT);
    
    display.firstPage();
    do {
        display.fillScreen(GxEPD_WHITE);
        drawBackground();

        display.setTextColor(GxEPD_BLACK);
        
        for(int i=0; i<widgetCount; i++) {
            Widget w = widgets[i];
            int16_t tbx, tby; uint16_t tbw, tbh;
            
            // Note: Web sends top-left corner (w.x, w.y)
            // Adafruit GFX setCursor uses baseline position
            // getTextBounds returns: tby = top of text relative to baseline position
            // So: baseline_y = top_y - (tby - baseline_y) = top_y + (baseline_y - tby)
            // Using origin (0,0): tby gives us the offset from baseline to top
            // To position text with top at w.y: cursor_y = w.y - tby_offset
            
            if (w.type == "time") {
                display.setFont(&FreeSansBold24pt7b);
                // Get bounds with reference point at origin to find baseline offset
                display.getTextBounds(timeStr, 0, 0, &tbx, &tby, &tbw, &tbh);
                // tby is negative (text extends above baseline), so cursor_y = w.y - tby
                int16_t cursor_y = w.y - tby;
                
                // Now get bounds at actual position for fillRect
                display.getTextBounds(timeStr, w.x, cursor_y, &tbx, &tby, &tbw, &tbh);
                display.fillRect(tbx-2, tby-2, tbw+4, tbh+4, GxEPD_WHITE);
                display.setTextColor(GxEPD_RED);
                display.setCursor(w.x, cursor_y);
                display.print(timeStr);
                display.setTextColor(GxEPD_BLACK);
            }
            else if (w.type == "date") {
                display.setFont(&FreeSansBold12pt7b);
                display.getTextBounds(dateStr, 0, 0, &tbx, &tby, &tbw, &tbh);
                int16_t cursor_y = w.y - tby;
                
                display.getTextBounds(dateStr, w.x, cursor_y, &tbx, &tby, &tbw, &tbh);
                display.fillRect(tbx-2, tby-2, tbw+4, tbh+4, GxEPD_WHITE);
                display.setCursor(w.x, cursor_y);
                display.print(dateStr);
            }
            else if (w.type == "weather") {
                if (weatherCode != -1) {
                    // Weather icon based on code (simplified mapping)
                    String icon = "?";
                    if (weatherCode == 0) icon = "O";  // Clear sky - using 'O' for sun
                    else if (weatherCode <= 3) icon = "~";  // Partly cloudy
                    else if (weatherCode <= 67) icon = "=";  // Rain
                    else if (weatherCode <= 77) icon = "*";  // Snow
                    else icon = "!";  // Thunderstorm
                    
                    // Temperature
                    String tempS = String(temp, 1) + "C";
                    
                    // Details line
                    String details = "W:" + String(windSpeed, 0) + " H:" + String(humidity) + "% R:" + String(precipProb) + "%";
                    
                    // Draw icon (large)
                    display.setFont(&FreeSansBold24pt7b);
                    display.getTextBounds(icon, 0, 0, &tbx, &tby, &tbw, &tbh);
                    int16_t icon_y = w.y + 10 - tby;
                    display.setCursor(w.x + 5, icon_y);
                    display.print(icon);
                    
                    // Draw temperature (medium, next to icon)
                    display.setFont(&FreeSansBold18pt7b);
                    display.getTextBounds(tempS, 0, 0, &tbx, &tby, &tbw, &tbh);
                    int16_t temp_y = w.y + 15 - tby;
                    display.setCursor(w.x + 60, temp_y);
                    display.print(tempS);
                    
                    // Draw details (small, below)
                    display.setFont(&FreeSansBold12pt7b);
                    display.getTextBounds(details, 0, 0, &tbx, &tby, &tbw, &tbh);
                    int16_t details_y = w.y + 60 - tby;
                    display.setCursor(w.x + 5, details_y);
                    display.print(details);
                }
            }
            // Weather Sub-Components (Independent)
            else if (w.type == "weather-temp") {
                String tempS = String(temp, 1) + "C";
                display.setFont(&FreeSansBold24pt7b);
                display.getTextBounds(tempS, 0, 0, &tbx, &tby, &tbw, &tbh);
                int16_t cursor_y = w.y - tby;
                display.getTextBounds(tempS, w.x, cursor_y, &tbx, &tby, &tbw, &tbh);
                display.fillRect(tbx-2, tby-2, tbw+4, tbh+4, GxEPD_WHITE);
                display.setCursor(w.x, cursor_y);
                display.print(tempS);
            }
            else if (w.type == "weather-humidity") {
                String humS = String(humidity) + "%";
                display.setFont(&FreeSansBold12pt7b);
                display.getTextBounds(humS, 0, 0, &tbx, &tby, &tbw, &tbh);
                int16_t cursor_y = w.y - tby;
                display.getTextBounds(humS, w.x, cursor_y, &tbx, &tby, &tbw, &tbh);
                display.fillRect(tbx-2, tby-2, tbw+4, tbh+4, GxEPD_WHITE);
                display.setCursor(w.x, cursor_y);
                display.print(humS);
            }
            else if (w.type == "weather-wind") {
                String windS = String(windSpeed, 0) + "km/h";
                display.setFont(&FreeSansBold12pt7b);
                display.getTextBounds(windS, 0, 0, &tbx, &tby, &tbw, &tbh);
                int16_t cursor_y = w.y - tby;
                display.getTextBounds(windS, w.x, cursor_y, &tbx, &tby, &tbw, &tbh);
                display.fillRect(tbx-2, tby-2, tbw+4, tbh+4, GxEPD_WHITE);
                display.setCursor(w.x, cursor_y);
                display.print(windS);
            }
            else if (w.type == "weather-precip") {
                String precipS = String(precipProb) + "%";
                display.setFont(&FreeSansBold12pt7b);
                display.getTextBounds(precipS, 0, 0, &tbx, &tby, &tbw, &tbh);
                int16_t cursor_y = w.y - tby;
                display.getTextBounds(precipS, w.x, cursor_y, &tbx, &tby, &tbw, &tbh);
                display.fillRect(tbx-2, tby-2, tbw+4, tbh+4, GxEPD_WHITE);
                display.setCursor(w.x, cursor_y);
                display.print(precipS);
            }
            else if (w.type == "weather-icon") {
                String icon = "?";
                if (weatherCode == 0) icon = "O";  // Clear sky
                else if (weatherCode <= 3) icon = "~";  // Partly cloudy
                else if (weatherCode <= 67) icon = "=";  // Rain
                else if (weatherCode <= 77) icon = "*";  // Snow
                else icon = "!";  // Thunderstorm
                
                display.setFont(&FreeSansBold24pt7b);
                display.getTextBounds(icon, 0, 0, &tbx, &tby, &tbw, &tbh);
                int16_t cursor_y = w.y - tby;
                display.getTextBounds(icon, w.x, cursor_y, &tbx, &tby, &tbw, &tbh);
                display.fillRect(tbx-2, tby-2, tbw+4, tbh+4, GxEPD_WHITE);
                display.setCursor(w.x, cursor_y);
                display.print(icon);
            }
        }
    } while (display.nextPage());
}
