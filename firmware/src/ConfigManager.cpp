#include "ConfigManager.h"

void ConfigManager::begin() {
    // No specific init needed for Preferences until open, but maybe reserved for future
}

void ConfigManager::load(AppConfig &config) {
    preferences.begin("epaper-app", true); // ReadOnly
    config.wifi_ssid = preferences.getString("ssid", "");
    config.wifi_pass = preferences.getString("pass", "");
    config.lat = preferences.getFloat("lat", 0.0);
    config.lon = preferences.getFloat("lon", 0.0);
    config.timezone = preferences.getString("tz", "UTC");
    config.timezone_offset_sec = preferences.getLong("tz_off", 0);
    config.refresh_interval_sec = preferences.getInt("refresh", 300);
    preferences.end();
}

void ConfigManager::save(const AppConfig &config) {
    preferences.begin("epaper-app", false); // RW
    preferences.putString("ssid", config.wifi_ssid);
    preferences.putString("pass", config.wifi_pass);
    preferences.putFloat("lat", config.lat);
    preferences.putFloat("lon", config.lon);
    preferences.putString("tz", config.timezone);
    preferences.putLong("tz_off", config.timezone_offset_sec);
    preferences.putInt("refresh", config.refresh_interval_sec);
    preferences.end();
}
