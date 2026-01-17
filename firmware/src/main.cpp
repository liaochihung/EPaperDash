#include <Arduino.h>
#include <GxEPD2_3C.h>
#include <Preferences.h>

// --------------------------------------------------------
// CONFIGURATION
// --------------------------------------------------------
// Display Selection: 5.83" 648x480 3-Color (GxEPD2_583c_Z83)
#define EPD_CS      5
#define EPD_DC      17
#define EPD_RST     16
#define EPD_BUSY    4

// Initialize proper display class
// GxEPD2_583c_Z83: 648x480
GxEPD2_3C<GxEPD2_583c_Z83, GxEPD2_583c_Z83::HEIGHT> display(GxEPD2_583c_Z83(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// Buffer for incoming data
// 648x480 bits
// We can allocate this statically or dynamically. 
// Standard ESP32 has plenty of RAM.
// For 3-color displays, we need two planes: Black and Red.
#define IMG_WIDTH 648
#define IMG_HEIGHT 480
#define PLANE_SIZE (IMG_WIDTH * IMG_HEIGHT / 8)
#define BUFFER_SIZE (PLANE_SIZE * 2)

// Display Modes
#define MODE_1BIT 0
#define MODE_3C 1
#define MODE_PARTIAL_1BIT 10
#define MODE_PARTIAL_3C 11

uint8_t *imageBuffer = nullptr;
Preferences preferences;

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println();
  Serial.println("EPaperDash Firmware Starting...");

  // Initialize Display
  display.init(115200, true, 2, false); // Serial output enabled
  display.setRotation(0);
  
  // Allocate buffer for 2 planes
  imageBuffer = (uint8_t*)malloc(BUFFER_SIZE);
  if (!imageBuffer) {
    Serial.println("ERROR: Failed to allocate memory for image buffer");
    while(1) delay(1000);
  }
  Serial.printf("Buffer allocated: %d bytes (2 planes)\n", BUFFER_SIZE);

  // Check NVS for state
  preferences.begin("epaper-app", false);
  bool hasImage = preferences.getBool("has_image", false);

  if (!hasImage) {
    display.firstPage();
    do {
      display.fillScreen(GxEPD_WHITE);
      display.setCursor(20, 240);
      display.setTextColor(GxEPD_BLACK);
      display.setTextSize(3);
      display.println("Waiting for Content...");
    } while (display.nextPage());
  }

  Serial.println("Ready to receive.");
}

// Simple protocol:
// No header checks for raw simplicity in MVP (Frontend just sends raw bytes).
// But to be safer, we should simple timeout reset.

struct EPDHeader {
    uint16_t width;
    uint16_t height;
    uint8_t mode;
    uint16_t x; // For partial updates
    uint16_t y; // For partial updates
};

int bytesReceived = 0;
unsigned long lastByteTime = 0;
bool headerReceived = false;
EPDHeader currentHeader;
uint32_t expectedPayloadSize = 0;

void loop() {
  while (Serial.available()) {
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
                        return; // Wait for coordinate bytes
                    }
                }
                
                headerReceived = true;
                bytesReceived = 0;

                // Calculate expected payload
                if (currentHeader.mode == MODE_1BIT || currentHeader.mode == MODE_PARTIAL_1BIT) {
                    expectedPayloadSize = (uint32_t(currentHeader.width) * currentHeader.height) / 8;
                } else if (currentHeader.mode == MODE_3C || currentHeader.mode == MODE_PARTIAL_3C) {
                    expectedPayloadSize = (uint32_t(currentHeader.width) * currentHeader.height) / 4;
                } else {
                    expectedPayloadSize = 0;
                }

                Serial.printf("Header OK: %dx%d, Mode %d, X=%d, Y=%d, Payload %d bytes\n", 
                    currentHeader.width, currentHeader.height, currentHeader.mode, 
                    currentHeader.x, currentHeader.y, expectedPayloadSize);

                if (expectedPayloadSize > BUFFER_SIZE) {
                    Serial.println("ERROR: Payload too large for buffer!");
                    headerReceived = false; 
                }
            } else {
                Serial.println("Invalid Header Magic");
            }
        }
        return; 
    }

    // 2. Receive Body
    uint32_t remaining = expectedPayloadSize - bytesReceived;
    if (remaining > 0) {
        uint8_t items = Serial.readBytes(imageBuffer + bytesReceived, min((uint32_t)Serial.available(), remaining));
        bytesReceived += items;
    }

    // 3. Process Completed Packet
    if (headerReceived && bytesReceived == expectedPayloadSize) {
      Serial.println("Payload received. Drawing...");
      
      bool isPartial = (currentHeader.mode == MODE_PARTIAL_1BIT || currentHeader.mode == MODE_PARTIAL_3C);
      
      if (isPartial) {
        // Partial Update
        display.setPartialWindow(currentHeader.x, currentHeader.y, currentHeader.width, currentHeader.height);
      } else {
        // Full Update
        display.setFullWindow();
      }
      
      display.firstPage();
      do {
        if (!isPartial) {
          display.fillScreen(GxEPD_WHITE);
        }
        
        if (currentHeader.mode == MODE_3C || currentHeader.mode == MODE_PARTIAL_3C) {
            uint32_t planeSize = expectedPayloadSize / 2;
            display.drawBitmap(currentHeader.x, currentHeader.y, imageBuffer, currentHeader.width, currentHeader.height, GxEPD_BLACK);
            display.drawBitmap(currentHeader.x, currentHeader.y, imageBuffer + planeSize, currentHeader.width, currentHeader.height, GxEPD_RED);
        } else if (currentHeader.mode == MODE_1BIT || currentHeader.mode == MODE_PARTIAL_1BIT) {
            display.drawBitmap(currentHeader.x, currentHeader.y, imageBuffer, currentHeader.width, currentHeader.height, GxEPD_BLACK);
        } else {
            Serial.printf("Mode %d not supported by this firmware.\n", currentHeader.mode);
        }
      } while (display.nextPage());
      
      Serial.println("Drawing Complete.");
      preferences.putBool("has_image", true);
      
      headerReceived = false;
      bytesReceived = 0;
    }
  }

  // Timeout reset logic
  if (headerReceived && (millis() - lastByteTime > 5000)) {
    Serial.printf("Timeout! Resetting state. Received %d/%d\n", bytesReceived, expectedPayloadSize);
    headerReceived = false;
    bytesReceived = 0;
  }
}
