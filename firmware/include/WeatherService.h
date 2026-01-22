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
    float getWindSpeed();
    int getHumidity();
    int getPrecipitationProb();
    unsigned long getLastUpdate();

private:
    float currentTemp;
    int currentWeatherCode;
    float currentWindSpeed;
    int currentHumidity;
    int currentPrecipitationProb;
    unsigned long lastUpdate;
};

#endif
