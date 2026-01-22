#include "WeatherService.h"

WeatherService::WeatherService() : currentTemp(0.0), currentWeatherCode(-1), currentWindSpeed(0.0), currentHumidity(0), currentPrecipitationProb(0), lastUpdate(0) {}

void WeatherService::update(float lat, float lon) {
    if (lat == 0.0 && lon == 0.0) return;

    HTTPClient http;
    // Request current weather + hourly data for humidity and precipitation
    String url = "https://api.open-meteo.com/v1/forecast?latitude=" + String(lat) + "&longitude=" + String(lon) + "&current_weather=true&hourly=relativehumidity_2m,precipitation_probability&forecast_days=1";

    Serial.println("Fetching weather: " + url);
    http.begin(url);
    int httpCode = http.GET();

    if (httpCode > 0) {
        String payload = http.getString();
        JsonDocument doc;
        deserializeJson(doc, payload);

        // Current weather data
        currentTemp = doc["current_weather"]["temperature"];
        currentWeatherCode = doc["current_weather"]["weathercode"];
        currentWindSpeed = doc["current_weather"]["windspeed"];
        
        // Hourly data (take first hour for current conditions)
        if (doc["hourly"]["relativehumidity_2m"].size() > 0) {
            currentHumidity = doc["hourly"]["relativehumidity_2m"][0];
        }
        if (doc["hourly"]["precipitation_probability"].size() > 0) {
            currentPrecipitationProb = doc["hourly"]["precipitation_probability"][0];
        }
        
        lastUpdate = millis();

        Serial.printf("Weather: %.1f C, Code: %d, Wind: %.1f km/h, Humidity: %d%%, Precip: %d%%\n", 
                      currentTemp, currentWeatherCode, currentWindSpeed, currentHumidity, currentPrecipitationProb);
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

float WeatherService::getWindSpeed() {
    return currentWindSpeed;
}

int WeatherService::getHumidity() {
    return currentHumidity;
}

int WeatherService::getPrecipitationProb() {
    return currentPrecipitationProb;
}

unsigned long WeatherService::getLastUpdate() {
    return lastUpdate;
}
