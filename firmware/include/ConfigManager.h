#ifndef CONFIG_MANAGER_H
#define CONFIG_MANAGER_H

#include <Preferences.h>
#include "AppConfig.h"

class ConfigManager {
public:
    void begin();
    void load(AppConfig &config);
    void save(const AppConfig &config);

private:
    Preferences preferences;
};

#endif
