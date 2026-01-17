#include "WifiController.h"

void WifiController::connect(const String& ssid, const String& pass) {
    if (ssid.length() == 0) return;
    
    Serial.printf("Connecting to %s...\n", ssid.c_str());
    WiFi.begin(ssid.c_str(), pass.c_str());
    
    // Non-blocking attempt usually, but we might want a small wait or just let loop handle it?
    // main.cpp logic had a small block:
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("{\"event\": \"wifi_connected\", \"ip\": \"%s\"}\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("{\"error\": \"wifi_connect_failed\"}");
    }
}

bool WifiController::isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

String WifiController::getIP() {
    return WiFi.localIP().toString();
}

String WifiController::scanNetworks() {
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
    
    String output;
    serializeJson(doc, output);
    return output;
}
