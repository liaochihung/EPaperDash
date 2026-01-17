#include <Arduino.h>
#include <GxEPD2_3C.h>
#include <Preferences.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
// Fonts
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>
#include <Fonts/FreeSansBold24pt7b.h>

// --------------------------------------------------------
// CONFIGURATION
// --------------------------------------------------------
#define EPD_CS      5
#define EPD_DC      17
#define EPD_RST     16
#define EPD_BUSY    4

// Display: 5.83" 648x480 3-Color
// Display: 5.83" 648x480 3-Color. Use 120 lines page height to save RAM.
GxEPD2_3C<GxEPD2_583c_Z83, 120> display(GxEPD2_583c_Z83(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// Buffers
#define IMG_WIDTH 648
#define IMG_HEIGHT 480
#define BUFFER_SIZE (IMG_WIDTH * IMG_HEIGHT / 4) // 2 bits per pixel for valid allocation check, but we use dynamic logic

uint8_t *imageBuffer = nullptr; // Raw image buffer
Preferences preferences;

// Network & Time
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

// App State
struct Config {
    String wifi_ssid;
    String wifi_pass;
    float lat;
    float lon;
    String timezone;
    long timezone_offset_sec;
};
Config appConfig;

// Widgets & Logic
struct Widget {
    String type;
    int x;
    int y;
    int w;
    int h;
    String fmt;
};
#define MAX_WIDGETS 10
Widget widgets[MAX_WIDGETS];
int widgetCount = 0;

bool isWifiConnected = false;
unsigned long lastWeatherUpdate = 0;
unsigned long lastTimeUpdate = 0;
float currentTemp = 0.0;
int currentWeatherCode = -1;

// Function Prototypes
void loadConfig();
void saveConfig();
void processSerialCommands();
void cmdScanWifi();
void cmdSetConfig(JsonDocument& doc);
void cmdSetLayout(JsonDocument& doc);
void connectToWifi();
void fetchWeather();
void renderOverlay(bool partial);
void processBinaryProtocol();

void setup() {
    Serial.begin(115200);
    // Init Display
    display.init(115200, true, 2, false);
    display.setRotation(0);
    
    // Allocate Buffer
    imageBuffer = (uint8_t*)malloc(IMG_WIDTH * IMG_HEIGHT / 8 * 2); // Black + Red
    if (!imageBuffer) {
        Serial.println("{\"error\": \"Failed to allocate memory\"}");
    }

    // Load Config
    loadConfig();

    // Start WiFi if configured
    if (appConfig.wifi_ssid.length() > 0) {
        connectToWifi();
    }
}

// Image Protocol State
struct EPDHeader {
    uint16_t width;
    uint16_t height;
    uint8_t mode;
    uint16_t x;
    uint16_t y;
};
bool headerReceived = false;
EPDHeader currentHeader;
uint32_t expectedPayloadSize = 0;
uint32_t bytesReceived = 0;
unsigned long lastByteTime = 0;

// Display Modes
#define MODE_1BIT 0
#define MODE_3C 1
#define MODE_PARTIAL_1BIT 10
#define MODE_PARTIAL_3C 11

void processBinaryProtocol();

void loop() {
    if (Serial.available() > 0) {
        if (!headerReceived) {
            char c = Serial.peek();
            if (c == '{') {
                processSerialCommands();
            } else if (c == 'E') {
                processBinaryProtocol();
            } else {
                Serial.read(); 
            }
        } else {
            processBinaryProtocol();
        }
    }
    
    if (isWifiConnected) {
        timeClient.update();
        
        if (millis() - lastWeatherUpdate > 1000 * 60 * 30 || lastWeatherUpdate == 0) {
            fetchWeather();
        }
    }
    
    static int lastMinute = -1;
    int currentMinute = timeClient.getMinutes();
    if (isWifiConnected && currentMinute != lastMinute && widgetCount > 0) {
        lastMinute = currentMinute;
        Serial.println("Time changed, updating overlay...");
        renderOverlay(true);
    }
    
    if (headerReceived && (millis() - lastByteTime > 5000)) {
        Serial.printf("Timeout! Resetting state. Received %d/%d\n", bytesReceived, expectedPayloadSize);
        headerReceived = false;
        bytesReceived = 0;
    }
}

void processSerialCommands() {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) return;

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, line);

    if (!error) {
        const char* cmd = doc["cmd"];
        if (strcmp(cmd, "scan_wifi") == 0) {
            cmdScanWifi();
        } else if (strcmp(cmd, "set_config") == 0) {
            cmdSetConfig(doc);
        } else if (strcmp(cmd, "set_layout") == 0) {
            cmdSetLayout(doc);
        } else if (strcmp(cmd, "get_config") == 0) {
            JsonDocument resp;
            resp["ssid"] = appConfig.wifi_ssid;
            resp["lat"] = appConfig.lat;
            resp["lon"] = appConfig.lon;
            resp["tz"] = appConfig.timezone;
            serializeJson(resp, Serial);
            Serial.println();
        }
    }
}

void processBinaryProtocol() {
    lastByteTime = millis();

    // 1. Receive Header
    if (!headerReceived) {
        if (Serial.available() >= 8) {
            uint8_t h[8];
            Serial.readBytes(h, 8);
            
            if (h[0] == 'E' && h[1] == 'P' && h[2] == 'D') {
                currentHeader.width = (h[3] << 8) | h[4];
                currentHeader.height = (h[5] << 8) | h[6];
                currentHeader.mode = h[7];
                currentHeader.x = 0;
                currentHeader.y = 0;
                
                // For partial modes, read x, y coordinates
                if (currentHeader.mode == MODE_PARTIAL_1BIT || currentHeader.mode == MODE_PARTIAL_3C) {
                    if (Serial.available() >= 4) {
                        uint8_t coords[4];
                        Serial.readBytes(coords, 4);
                        currentHeader.x = (coords[0] << 8) | coords[1];
                        currentHeader.y = (coords[2] << 8) | coords[3];
                    } else {
                        // This technically shouldn't happen with peek logic above unless split packet
                        return; // Wait for bytes
                    }
                }
                
                headerReceived = true;
                bytesReceived = 0;

                // Calculate expected payload
                if (currentHeader.mode == MODE_1BIT || currentHeader.mode == MODE_PARTIAL_1BIT) {
                    expectedPayloadSize = (uint32_t(currentHeader.width) * currentHeader.height) / 8;
                } else if (currentHeader.mode == MODE_3C || currentHeader.mode == MODE_PARTIAL_3C) {
                    expectedPayloadSize = (uint32_t(currentHeader.width) * currentHeader.height) / 4;
                }

                Serial.printf("Header OK: %dx%d, Mode %d, Payload %d\n", 
                    currentHeader.width, currentHeader.height, currentHeader.mode, expectedPayloadSize);

                if (expectedPayloadSize > BUFFER_SIZE) {
                    Serial.println("ERROR: Payload too large!");
                    headerReceived = false; 
                }
            } else {
               // Should have been caught by peek, but just in case
            }
        }
        return; 
    }

    // 2. Receive Body
    uint32_t remaining = expectedPayloadSize - bytesReceived;
    if (remaining > 0) {
        // Read directly into buffer
        if (Serial.available()) {
            uint8_t items = Serial.readBytes(imageBuffer + bytesReceived, min((uint32_t)Serial.available(), remaining));
            bytesReceived += items;
        }
    }

    // 3. Process Completed Packet
    if (headerReceived && bytesReceived == expectedPayloadSize) {
      Serial.println("Payload received. Rendering with Overlay...");
      
      // Update successful, verify mode
      // Save state to NVS if needed or keep in RAM?
      // RAM for imageBuffer is already updated.
      
      // Force Full Update to clean up and draw new layout
      renderOverlay(false);

      Serial.println("Drawing Complete.");
      preferences.putBool("has_image", true);
      
      headerReceived = false;
      bytesReceived = 0;
    }
}


void cmdScanWifi() {
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    int n = WiFi.scanNetworks();
    
    JsonDocument doc;
    doc["result"] = "scan_complete";
    JsonArray networks = doc["networks"].to<JsonArray>();
    
    for (int i = 0; i < n; ++i) {
        JsonObject net = networks.add<JsonObject>();
        net["ssid"] = WiFi.SSID(i);
        net["rssi"] = WiFi.RSSI(i);
        net["auth"] = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "open" : "secure";
        if (i >= 19) break; 
    }
    
    serializeJson(doc, Serial);
    Serial.println();
    
    if (appConfig.wifi_ssid.length() > 0) {
        connectToWifi();
    }
}

void cmdSetConfig(JsonDocument& doc) {
    if (doc["ssid"].is<String>()) appConfig.wifi_ssid = doc["ssid"].as<String>();
    if (doc["pass"].is<String>()) appConfig.wifi_pass = doc["pass"].as<String>();
    if (doc["lat"].is<float>()) appConfig.lat = doc["lat"];
    if (doc["lon"].is<float>()) appConfig.lon = doc["lon"];
    if (doc["tz"].is<String>()) appConfig.timezone = doc["tz"].as<String>();
    if (doc["tz_off"].is<long>()) appConfig.timezone_offset_sec = doc["tz_off"];
    
    saveConfig();
    
    JsonDocument resp;
    resp["result"] = "config_saved";
    serializeJson(resp, Serial);
    Serial.println();
    
    connectToWifi();
}

void cmdSetLayout(JsonDocument& doc) {
    JsonArray arr = doc["widgets"];
    widgetCount = 0;
    for(JsonObject w : arr) {
        if (widgetCount >= MAX_WIDGETS) break;
        widgets[widgetCount].type = w["type"].as<String>();
        widgets[widgetCount].x = w["x"];
        widgets[widgetCount].y = w["y"];
        widgets[widgetCount].w = w["w"];
        widgets[widgetCount].h = w["h"];
        widgets[widgetCount].fmt = w["fmt"].as<String>();
        widgetCount++;
    }
    Serial.printf("{\"result\": \"layout_set\", \"count\": %d}\n", widgetCount);
}

void fetchWeather() {
    if (appConfig.lat == 0.0 && appConfig.lon == 0.0) return;
    
    HTTPClient http;
    String url = "https://api.open-meteo.com/v1/forecast?latitude=" + String(appConfig.lat) + "&longitude=" + String(appConfig.lon) + "&current_weather=true";
    
    Serial.println("Fetching weather: " + url);
    http.begin(url);
    int httpCode = http.GET();
    
    if (httpCode > 0) {
        String payload = http.getString();
        JsonDocument doc;
        deserializeJson(doc, payload);
        
        currentTemp = doc["current_weather"]["temperature"];
        currentWeatherCode = doc["current_weather"]["weathercode"];
        lastWeatherUpdate = millis();
        
        Serial.printf("Weather: %.1f C, Code: %d\n", currentTemp, currentWeatherCode);
    } else {
        Serial.println("Weather Fetch Failed");
    }
    http.end();
}

void renderOverlay(bool partial) {
    if (widgetCount == 0 && partial) return; 

    // display.powerOn(); // Not needed/available in this version
    display.setFullWindow(); // Always use full window for simplicity with GxEPD2 3C for now
    
    display.firstPage();
    do {
        // Redraw Background
        if (imageBuffer) {
             uint32_t planeSize = IMG_WIDTH * IMG_HEIGHT / 8;
             display.drawBitmap(0, 0, imageBuffer, IMG_WIDTH, IMG_HEIGHT, GxEPD_BLACK);
             display.drawBitmap(0, 0, imageBuffer + planeSize, IMG_WIDTH, IMG_HEIGHT, GxEPD_RED);
        } else {
            display.fillScreen(GxEPD_WHITE);
        }

        display.setTextColor(GxEPD_BLACK);
        
        for(int i=0; i<widgetCount; i++) {
            Widget w = widgets[i];
            int16_t tbx, tby; uint16_t tbw, tbh;
            
            if (w.type == "time") {
                String timeStr = timeClient.getFormattedTime().substring(0, 5); 
                display.setFont(&FreeSansBold24pt7b);
                display.getTextBounds(timeStr, w.x, w.y, &tbx, &tby, &tbw, &tbh);
                display.fillRect(tbx-2, tby-2, tbw+4, tbh+4, GxEPD_WHITE);
                display.setCursor(w.x, w.y);
                display.print(timeStr);
            }
            else if (w.type == "date") {
                time_t rawtime = timeClient.getEpochTime();
                struct tm * ti;
                ti = localtime(&rawtime);
                char buffer[80];
                strftime(buffer, 80, "%a, %b %d", ti);
                String dateStr = String(buffer);
                
                display.setFont(&FreeSansBold12pt7b);
                display.getTextBounds(dateStr, w.x, w.y, &tbx, &tby, &tbw, &tbh);
                display.fillRect(tbx-2, tby-2, tbw+4, tbh+4, GxEPD_WHITE);
                display.setCursor(w.x, w.y);
                display.print(dateStr);
            }
            else if (w.type == "weather") {
                if (currentWeatherCode != -1) {
                    String tempStr = String(currentTemp, 1) + " C";
                    display.setFont(&FreeSansBold18pt7b);
                    display.getTextBounds(tempStr, w.x, w.y, &tbx, &tby, &tbw, &tbh);
                    display.fillRect(tbx-2, tby-2, tbw+4, tbh+4, GxEPD_WHITE);
                    display.setCursor(w.x, w.y);
                    display.print(tempStr);
                }
            }
        }
    } while (display.nextPage());
}

// --------------------------------------------------------
// UTILS
// --------------------------------------------------------
void loadConfig() {
    preferences.begin("epaper-app", true); // ReadOnly
    appConfig.wifi_ssid = preferences.getString("ssid", "");
    appConfig.wifi_pass = preferences.getString("pass", "");
    appConfig.lat = preferences.getFloat("lat", 0.0);
    appConfig.lon = preferences.getFloat("lon", 0.0);
    appConfig.timezone = preferences.getString("tz", "UTC");
    appConfig.timezone_offset_sec = preferences.getLong("tz_off", 0);
    preferences.end();
}

void saveConfig() {
    preferences.begin("epaper-app", false); // RW
    preferences.putString("ssid", appConfig.wifi_ssid);
    preferences.putString("pass", appConfig.wifi_pass);
    preferences.putFloat("lat", appConfig.lat);
    preferences.putFloat("lon", appConfig.lon);
    preferences.putString("tz", appConfig.timezone);
    preferences.putLong("tz_off", appConfig.timezone_offset_sec);
    preferences.end();
}

void connectToWifi() {
    if (appConfig.wifi_ssid.length() == 0) return;
    
    Serial.printf("Connecting to %s...\n", appConfig.wifi_ssid.c_str());
    WiFi.begin(appConfig.wifi_ssid.c_str(), appConfig.wifi_pass.c_str());
    
    // We don't block loop here, we just start. 
    // Ideally we'd use events, but simple check in loop is fine for now.
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        isWifiConnected = true;
        Serial.printf("{\"event\": \"wifi_connected\", \"ip\": \"%s\"}\n", WiFi.localIP().toString().c_str());
        
        timeClient.begin();
        timeClient.setTimeOffset(appConfig.timezone_offset_sec);
    } else {
        isWifiConnected = false;
        Serial.println("{\"error\": \"wifi_connect_failed\"}");
    }
}

