#include "WeatherService.h"

WeatherService::WeatherService() : currentTemp(0.0), currentWeatherCode(-1), lastUpdate(0) {}

void WeatherService::update(float lat, float lon) {
    if (lat == 0.0 && lon == 0.0) return;

    HTTPClient http;
    String url = "https://api.open-meteo.com/v1/forecast?latitude=" + String(lat) + "&longitude=" + String(lon) + "&current_weather=true";

    Serial.println("Fetching weather: " + url);
    http.begin(url);
    int httpCode = http.GET();

    if (httpCode > 0) {
        String payload = http.getString();
        JsonDocument doc;
        deserializeJson(doc, payload);

        currentTemp = doc["current_weather"]["temperature"];
        currentWeatherCode = doc["current_weather"]["weathercode"];
        lastUpdate = millis();

        Serial.printf("Weather: %.1f C, Code: %d\n", currentTemp, currentWeatherCode);
    } else {
        Serial.println("Weather Fetch Failed");
    }
    http.end();
}

float WeatherService::getTemp() {
    return currentTemp;
}

int WeatherService::getWeatherCode() {
    return currentWeatherCode;
}

unsigned long WeatherService::getLastUpdate() {
    return lastUpdate;
}
