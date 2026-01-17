#include "DisplayController.h"
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

void DisplayController::begin() {
    display.init(115200, true, 2, false);
    display.setRotation(0);
}

bool DisplayController::allocateBuffer() {
    if (imageBuffer) return true;
    imageBuffer = (uint8_t*)malloc(IMG_WIDTH * IMG_HEIGHT / 8 * 2); // Black + Red
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

void DisplayController::drawBackground() {
    if (imageBuffer) {
         uint32_t planeSize = IMG_WIDTH * IMG_HEIGHT / 8;
         display.drawBitmap(0, 0, imageBuffer, IMG_WIDTH, IMG_HEIGHT, GxEPD_BLACK);
         display.drawBitmap(0, 0, imageBuffer + planeSize, IMG_WIDTH, IMG_HEIGHT, GxEPD_RED);
    } else {
        display.fillScreen(GxEPD_WHITE);
    }
}

void DisplayController::renderOverlay(bool partial, String timeStr, String dateStr, float temp, int weatherCode) {
    if (widgetCount == 0 && partial) return; 

    // display.powerOn(); 
    display.setFullWindow(); 
    
    display.firstPage();
    do {
        display.fillScreen(GxEPD_WHITE);
        drawBackground();

        display.setTextColor(GxEPD_BLACK);
        
        for(int i=0; i<widgetCount; i++) {
            Widget w = widgets[i];
            int16_t tbx, tby; uint16_t tbw, tbh;
            
            if (w.type == "time") {
                display.setFont(&FreeSansBold24pt7b);
                display.getTextBounds(timeStr, w.x, w.y, &tbx, &tby, &tbw, &tbh);
                display.fillRect(tbx-2, tby-2, tbw+4, tbh+4, GxEPD_WHITE);
                display.setTextColor(GxEPD_RED);
                display.setCursor(w.x, w.y);
                display.print(timeStr);
                display.setTextColor(GxEPD_BLACK);
            }
            else if (w.type == "date") {
                display.setFont(&FreeSansBold12pt7b);
                display.getTextBounds(dateStr, w.x, w.y, &tbx, &tby, &tbw, &tbh);
                display.fillRect(tbx-2, tby-2, tbw+4, tbh+4, GxEPD_WHITE);
                display.setCursor(w.x, w.y);
                display.print(dateStr);
            }
            else if (w.type == "weather") {
                if (weatherCode != -1) {
                    String tempS = String(temp, 1) + " C";
                    display.setFont(&FreeSansBold18pt7b);
                    display.getTextBounds(tempS, w.x, w.y, &tbx, &tby, &tbw, &tbh);
                    display.fillRect(tbx-2, tby-2, tbw+4, tbh+4, GxEPD_WHITE);
                    display.setCursor(w.x, w.y);
                    display.print(tempS);
                }
            }
        }
    } while (display.nextPage());
}
