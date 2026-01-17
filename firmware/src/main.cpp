#include <Arduino.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>

#include "AppConfig.h"
#include "ConfigManager.h"
#include "WifiController.h"
#include "WeatherService.h"
#include "DisplayController.h"

// --------------------------------------------------------
// INSTANCES
// --------------------------------------------------------
ConfigManager configManager;
WifiController wifiController;
WeatherService weatherService;
DisplayController displayController;

AppConfig appConfig;
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

// --------------------------------------------------------
// PROTOCOL STATE
// --------------------------------------------------------
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

// Function Prototypes
void processSerialCommands();
void processBinaryProtocol();
void connectAndStartServices();

void setup() {
    Serial.begin(115200);
    
    // Init Display
    displayController.begin();
    if (!displayController.allocateBuffer()) {
        Serial.println("{\"error\": \"Failed to allocate memory\"}");
    }
    
    // Load Config
    configManager.load(appConfig);
    
    // Connect
    if (appConfig.wifi_ssid.length() > 0) {
        connectAndStartServices();
    }
}

void loop() {
    // 1. Serial Processing
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
    
    // 2. Services Update
    if (wifiController.isConnected()) {
        timeClient.update();
        
        // Weather Update (Every 30 mins)
        if (millis() - weatherService.getLastUpdate() > 1000 * 60 * 30 || weatherService.getLastUpdate() == 0) {
             weatherService.update(appConfig.lat, appConfig.lon);
        }
    }
    
    // 3. Clock Update (Minute trigger)
    static int lastMinute = -1;
    int currentMinute = timeClient.getMinutes();
    
    if (wifiController.isConnected() && currentMinute != lastMinute && displayController.getWidgetCount() > 0) {
        lastMinute = currentMinute;
        Serial.println("Time changed, updating overlay...");
        
        String timeStr = timeClient.getFormattedTime().substring(0, 5);
        
        // Date Format
        time_t rawtime = timeClient.getEpochTime();
        struct tm * ti;
        ti = localtime(&rawtime);
        char buffer[80];
        strftime(buffer, 80, "%a, %b %d", ti);
        String dateStr = String(buffer);
        
        displayController.renderOverlay(true, timeStr, dateStr, weatherService.getTemp(), weatherService.getWeatherCode());
    }
    
    // 4. Timeout Reset
    if (headerReceived && (millis() - lastByteTime > 5000)) {
        Serial.printf("Timeout! Resetting state. Received %d/%d\n", bytesReceived, expectedPayloadSize);
        headerReceived = false;
        bytesReceived = 0;
    }
}

void connectAndStartServices() {
    wifiController.connect(appConfig.wifi_ssid, appConfig.wifi_pass);
    if (wifiController.isConnected()) {
        timeClient.begin();
        timeClient.setTimeOffset(appConfig.timezone_offset_sec);
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
            String res = wifiController.scanNetworks();
            Serial.println(res);
            // Reconnect if configured
             if (appConfig.wifi_ssid.length() > 0) {
                connectAndStartServices();
            }
        } else if (strcmp(cmd, "set_config") == 0) {
            if (doc["ssid"].is<String>()) appConfig.wifi_ssid = doc["ssid"].as<String>();
            if (doc["pass"].is<String>()) appConfig.wifi_pass = doc["pass"].as<String>();
            if (doc["lat"].is<float>()) appConfig.lat = doc["lat"];
            if (doc["lon"].is<float>()) appConfig.lon = doc["lon"];
            if (doc["tz"].is<String>()) appConfig.timezone = doc["tz"].as<String>();
            if (doc["tz_off"].is<long>()) appConfig.timezone_offset_sec = doc["tz_off"];
            
            configManager.save(appConfig);
            Serial.println("{\"result\": \"config_saved\"}");
            
            connectAndStartServices();
        } else if (strcmp(cmd, "set_layout") == 0) {
            displayController.setLayout(doc["widgets"]);
            Serial.printf("{\"result\": \"layout_set\", \"count\": %d}\n", displayController.getWidgetCount());
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

                if (expectedPayloadSize > DisplayController::IMG_WIDTH * DisplayController::IMG_HEIGHT / 4) { // Roughly check buffer size match
                    Serial.println("ERROR: Payload too large!");
                    headerReceived = false; 
                }
            }
        }
        return; 
    }

    // 2. Receive Body
    uint32_t remaining = expectedPayloadSize - bytesReceived;
    if (remaining > 0) {
        // Read directly into buffer
        if (Serial.available()) {
            uint8_t* buf = displayController.getBuffer();
            if (buf) {
                uint8_t items = Serial.readBytes(buf + bytesReceived, min((uint32_t)Serial.available(), remaining));
                bytesReceived += items;
            } else {
                 // No buffer, drain
                 Serial.read();
            }
        }
    }

    // 3. Process Completed Packet
    if (headerReceived && bytesReceived == expectedPayloadSize) {
      Serial.println("Payload received. Rendering with Overlay...");
      
      // Render
      // Get Time/Date/Weather for Overlay
      String timeStr = timeClient.getFormattedTime().substring(0, 5);
      time_t rawtime = timeClient.getEpochTime();
      struct tm * ti = localtime(&rawtime);
      char buffer[80];
      strftime(buffer, 80, "%a, %b %d", ti);
      String dateStr = String(buffer);
      
      displayController.renderOverlay(false, timeStr, dateStr, weatherService.getTemp(), weatherService.getWeatherCode());

      Serial.println("Drawing Complete.");
      
      headerReceived = false;
      bytesReceived = 0;
    }
}
