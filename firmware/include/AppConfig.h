#ifndef APP_CONFIG_H
#define APP_CONFIG_H

#include <Arduino.h>

struct AppConfig {
    String wifi_ssid;
    String wifi_pass;
    float lat;
    float lon;
    String timezone;
    long timezone_offset_sec;
};

#endif
