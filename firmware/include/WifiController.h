#ifndef WIFI_CONTROLLER_H
#define WIFI_CONTROLLER_H

#include <WiFi.h>
#include <ArduinoJson.h>

class WifiController {
public:
    void connect(const String& ssid, const String& pass);
    bool isConnected();
    String scanNetworks(); // Returns JSON string
    String getIP();
};

#endif
