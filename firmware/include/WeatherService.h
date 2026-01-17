#ifndef WEATHER_SERVICE_H
#define WEATHER_SERVICE_H

#include <Arduino.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

class WeatherService {
public:
    WeatherService();
    void update(float lat, float lon);
    float getTemp();
    int getWeatherCode();
    unsigned long getLastUpdate();

private:
    float currentTemp;
    int currentWeatherCode;
    unsigned long lastUpdate;
};

#endif
