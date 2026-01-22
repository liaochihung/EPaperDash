#ifndef DISPLAY_CONTROLLER_H
#define DISPLAY_CONTROLLER_H

#include <Arduino.h>
#include <GxEPD2_3C.h>
#include <ArduinoJson.h>

// Structs
struct Widget {
    String type;
    int x;
    int y;
    int w;
    int h;
    String fmt;
};

struct EPDHeader {
    uint16_t width;
    uint16_t height;
    uint8_t mode;
    uint16_t x;
    uint16_t y;
};

class DisplayController {
public:
    void begin();
    void setLayout(const JsonArray& widgets);
    void renderOverlay(bool partial, String timeStr, String dateStr, float temp, int weatherCode, float windSpeed, int humidity, int precipProb);
    int getWidgetCount() const;
    
    // Buffer Access
    uint8_t* getBuffer();
    bool allocateBuffer();
    void setImageValid(bool valid);  // Mark image as valid after successful upload
    
    // Drawing
    void drawBackground();
    
    // Helpers
    static const int IMG_WIDTH = 648;
    static const int IMG_HEIGHT = 480;
    
private:
    static const int MAX_WIDGETS = 10;
    Widget widgets[MAX_WIDGETS];
    int widgetCount = 0;
};

#endif
