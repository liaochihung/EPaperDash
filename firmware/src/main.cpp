#include <Arduino.h>
#include <GxEPD2_3C.h>

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
#define IMG_WIDTH 648
#define IMG_HEIGHT 480
#define BUFFER_SIZE (IMG_WIDTH * IMG_HEIGHT / 8)

uint8_t *imageBuffer = nullptr;

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println();
  Serial.println("EPaperDash Firmware Starting...");

  // Initialize Display
  display.init(115200, true, 2, false); // Serial output enabled
  display.setRotation(0);
  
  // Allocate buffer
  imageBuffer = (uint8_t*)malloc(BUFFER_SIZE);
  if (!imageBuffer) {
    Serial.println("ERROR: Failed to allocate memory for image buffer");
    while(1) delay(1000);
  }
  Serial.printf("Buffer allocated: %d bytes\n", BUFFER_SIZE);

  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    display.setCursor(10, 10);
    display.setTextColor(GxEPD_BLACK);
    display.setTextSize(2);
    display.println("EPaperDash Ready");
    display.println("Waiting for Serial Data...");
  } while (display.nextPage());

  Serial.println("Ready to receive.");
}

// Simple protocol:
// No header checks for raw simplicity in MVP (Frontend just sends raw bytes).
// But to be safer, we should simple timeout reset.

int bytesReceived = 0;
unsigned long lastByteTime = 0;

void loop() {
  while (Serial.available()) {
    if (bytesReceived >= BUFFER_SIZE) {
      // Buffer full, maybe we are done or overrun?
      // Reset if too much data?
      // For now, accept and redraw when full.
    }
    
    // Read byte
    uint8_t items = Serial.readBytes(imageBuffer + bytesReceived, min(Serial.available(), (int)(BUFFER_SIZE - bytesReceived)));
    bytesReceived += items;
    lastByteTime = millis();

    if (bytesReceived == BUFFER_SIZE) {
      Serial.println("Image received. Drawing...");
      
      // Draw to display
      display.setFullWindow();
      display.firstPage();
      do {
        display.fillScreen(GxEPD_WHITE);
        display.drawImage(imageBuffer, 0, 0, IMG_WIDTH, IMG_HEIGHT, false, false, true);
      } while (display.nextPage());
      
      Serial.println("Draw Complete.");
      bytesReceived = 0; // Reset for next
    }
  }

  // Timeout reset logic (if transmission interrupted)
  if (bytesReceived > 0 && (millis() - lastByteTime > 2000)) {
    Serial.printf("Timeout! Received %d/%d bytes. Resetting.\n", bytesReceived, BUFFER_SIZE);
    bytesReceived = 0;
  }
}
