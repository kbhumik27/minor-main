/*
  Final: ESP32 Fitness Tracker
  - MPU6050 (GY-521) with auto-calibration + smoothing
  - Circular analog pulse sensor (OUT -> ADC pin)
  - 0.96" OLED SSD1306 (I2C)
  - WiFi + WebSocket server (JSON broadcast)
  Notes:
    SDA -> GPIO 21, SCL -> GPIO 22
    Pulse OUT -> GPIO 34 (ADC)
    OLED address assumed 0x3C
    Replace WiFi SSID/PASSWORD below
*/

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>

// ======== CONFIG ========
const char* ssid = "Utkarsh's Galaxy A54 5G";
const char* password = "123456ab";

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_ADDR 0x3C

#define I2C_SDA 21
#define I2C_SCL 22

#define PULSE_PIN 34   // analog input for circular pulse sensor
#define LED_PIN 2      // blink on beat

// ======== OBJECTS ========
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
Adafruit_MPU6050 mpu;
WebSocketsServer webSocket(81);

// ======== GLOBALS ========
// MPU / orientation
float pitch_smooth = 0.0f;
float roll_smooth  = 0.0f;
float pitch_offset = 0.0f;
float roll_offset  = 0.0f;
float yaw = 0.0f;
const float alpha = 0.90f;   // smoothing factor (0..1) higher = smoother/slower

// Raw sensor values for backend analytics
float ax_raw = 0.0f;
float ay_raw = 0.0f;
float az_raw = 0.0f;
float gx_dps = 0.0f;
float gy_dps = 0.0f;
float gz_dps = 0.0f;

// Pulse sensor
int sensorSignal = 0;        // ADC reading
int threshold = 520;         // adjust to your sensor; tune between ~480-550
bool pulseDetected = false;
unsigned long lastPeakTime = 0;
float bpm = 0.0f;
const int avgWindow = 8;
float bpmBuffer[avgWindow] = {0};
int bpmIndex = 0;
float avgBPM = 0.0f;

// Timing
unsigned long lastSend = 0;
const unsigned long sendInterval = 200;   // ms - broadcast interval
unsigned long lastDisplayUpdate = 0;
const unsigned long displayInterval = 200; // ms

// ======== PROTOTYPES ========
void displayIntro(const char* line1, const char* line2);
void calibrateMPU();
void readSensorsAndCompute();
void readPulse();
void updateDisplay();
void sendSensorData();
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length);

// ======== SETUP ========
void setup() {
  Serial.begin(115200);
  Wire.begin(I2C_SDA, I2C_SCL);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // OLED init
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("OLED init failed (address 0x3C?)");
    // halt here because display is important for this project
    for (;;);
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  displayIntro("AI Fitness Tracker", "Initializing...");

  // MPU6050 init
  if (!mpu.begin()) {
    displayIntro("MPU6050", "Connection Failed!");
    Serial.println("MPU6050 not found - check wiring");
    for (;;);
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
  mpu.setGyroRange(MPU6050_RANGE_250_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  delay(200);

  displayIntro("Calibrating MPU", "Keep device still");
  calibrateMPU();

  // WiFi
  displayIntro("WiFi", "Connecting...");
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(250);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    displayIntro("WiFi Connected", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nWiFi connect failed");
    displayIntro("WiFi", "Failed!");
  }

  // WebSocket
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);

  // Ready
  displayIntro("System Ready", "Streaming...");
  delay(800);

  // Initialize bpm buffer
  for (int i = 0; i < avgWindow; ++i) bpmBuffer[i] = 0.0f;
}

// ======== LOOP ========
void loop() {
  webSocket.loop();

  // sensor updates
  readSensorsAndCompute();

  // pulse read
  readPulse();

  // send via websocket at interval
  if (millis() - lastSend >= sendInterval) {
    lastSend = millis();
    sendSensorData();
  }

  // update OLED periodically
  if (millis() - lastDisplayUpdate >= displayInterval) {
    lastDisplayUpdate = millis();
    updateDisplay();
  }
}

// ======== FUNCTIONS ========

void displayIntro(const char* line1, const char* line2) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 10);
  display.println(line1);
  display.setCursor(0, 30);
  display.println(line2);
  display.display();
  delay(800);
}

void calibrateMPU() {
  const int N = 300;
  double ax = 0, ay = 0, az = 0;
  sensors_event_t a, g, temp;
  delay(300); // let sensor settle

  for (int i = 0; i < N; ++i) {
    mpu.getEvent(&a, &g, &temp);
    ax += a.acceleration.x;
    ay += a.acceleration.y;
    az += a.acceleration.z;
    delay(5);
  }
  ax /= N; ay /= N; az /= N;

  // compute static angles from averaged accel vector
  pitch_offset = atan2(-ax, sqrt(ay*ay + az*az)) * 180.0 / PI;
  roll_offset  = atan2(ay, az) * 180.0 / PI;

  Serial.print("Calib pitch_offset: "); Serial.println(pitch_offset);
  Serial.print("Calib roll_offset:  "); Serial.println(roll_offset);

  // set smoothers to zero initially
  pitch_smooth = 0.0f;
  roll_smooth = 0.0f;
}

void readSensorsAndCompute() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  float ax = a.acceleration.x;
  float ay = a.acceleration.y;
  float az = a.acceleration.z;

  // Store raw accel in g (~ m/s^2 / 9.81)
  ax_raw = ax / 9.80665f;
  ay_raw = ay / 9.80665f;
  az_raw = az / 9.80665f;

  float pitch_raw = atan2(-ax, sqrt(ay * ay + az * az)) * 180.0f / PI;
  float roll_raw  = atan2(ay, az) * 180.0f / PI;

  // apply offsets
  float pitch_corr = pitch_raw - pitch_offset;
  float roll_corr  = roll_raw  - roll_offset;

  // normalize into [-180, 180]
  if (pitch_corr > 180.0f) pitch_corr -= 360.0f;
  if (pitch_corr <= -180.0f) pitch_corr += 360.0f;
  if (roll_corr > 180.0f) roll_corr -= 360.0f;
  if (roll_corr <= -180.0f) roll_corr += 360.0f;

  // smoothing
  pitch_smooth = alpha * pitch_smooth + (1 - alpha) * pitch_corr;
  roll_smooth  = alpha * roll_smooth  + (1 - alpha) * roll_corr;

  // integrate yaw from gyro z (sensors_event_t.gyro is in rad/s)
  float gx_rad_s = g.gyro.x;
  float gy_rad_s = g.gyro.y;
  float gz_rad_s = g.gyro.z;
  float gx_deg_s = gx_rad_s * 180.0f / PI;
  float gy_deg_s = gy_rad_s * 180.0f / PI;
  float gz_deg_s = gz_rad_s * 180.0f / PI;
  gx_dps = gx_deg_s;
  gy_dps = gy_deg_s;
  gz_dps = gz_deg_s;
  yaw += gz_deg_s * ( (float)sendInterval / 1000.0f ); // coarse integration using sendInterval
  if (yaw > 180.0f) yaw -= 360.0f;
  if (yaw < -180.0f) yaw += 360.0f;
}

void readPulse() {
  sensorSignal = analogRead(PULSE_PIN);
  unsigned long now = millis();

  // Basic peak detection:
  if (sensorSignal > threshold && !pulseDetected) {
    pulseDetected = true;
    unsigned long interval = now - lastPeakTime;
    if (lastPeakTime != 0 && interval > 300 && interval < 2000) {
      float instantBPM = 60000.0f / (float)interval;
      // store in circular buffer
      bpmBuffer[bpmIndex] = instantBPM;
      bpmIndex = (bpmIndex + 1) % avgWindow;
      // compute average
      float sum = 0.0f; int cnt = 0;
      for (int i = 0; i < avgWindow; ++i) {
        if (bpmBuffer[i] > 0.1f) { sum += bpmBuffer[i]; cnt++; }
      }
      if (cnt > 0) avgBPM = sum / cnt;
      bpm = instantBPM;
      // blink LED briefly
      digitalWrite(LED_PIN, HIGH);
      delay(20);
      digitalWrite(LED_PIN, LOW);
    }
    lastPeakTime = now;
  }

  if (sensorSignal < threshold - 30) {
    pulseDetected = false;
  }
}

void updateDisplay() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("AI Fitness Tracker");
  display.drawLine(0, 10, SCREEN_WIDTH-1, 10, SSD1306_WHITE);

  display.setCursor(0, 14);
  display.print("Pitch: "); display.println(pitch_smooth, 1);

  display.setCursor(0, 26);
  display.print("Roll : "); display.println(roll_smooth, 1);

  display.setCursor(0, 38);
  display.print("BPM  : ");
  if (avgBPM > 35 && avgBPM < 200) display.println((int)round(avgBPM));
  else display.println("--");

  display.setCursor(0, 50);
  display.print("PPG: ");
  int ppgScaled = sensorSignal / 8; // reduce scale for readability
  display.println(ppgScaled);

  display.setCursor(80, 50);
  if (WiFi.status() == WL_CONNECTED) {
    display.print("IP:");
    String ip = WiFi.localIP().toString();
    display.setCursor(80, 56);
    display.print(ip);
  } else {
    display.print("WiFi: No");
  }

  display.display();
}

void sendSensorData() {
  StaticJsonDocument<256> doc;
  doc["pitch"] = round(pitch_smooth * 10.0f) / 10.0f;
  doc["roll"]  = round(roll_smooth  * 10.0f) / 10.0f;
  doc["yaw"]   = round(yaw * 10.0f) / 10.0f;

  // Provide raw accel/gyro for backend step detection and activity model
  doc["ax"] = ax_raw;
  doc["ay"] = ay_raw;
  doc["az"] = az_raw;
  doc["gx"] = gx_dps;
  doc["gy"] = gy_dps;
  doc["gz"] = gz_dps;

  // Standardize heart rate field naming (single field only)
  int hr = (int)round(avgBPM);
  doc["heartRate"] = hr;

  // Optional fields
  doc["wifi"]  = (WiFi.status() == WL_CONNECTED) ? "ok" : "lost";
  doc["timestamp"] = millis() / 1000.0f; // seconds

  String out;
  serializeJson(doc, out);
  // Debug: print outbound payload to Serial Monitor for verification
  Serial.println(out);
  webSocket.broadcastTXT(out);
}

// WebSocket event handler
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected\n", num);
      break;
    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(num);
      Serial.printf("[%u] Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
      StaticJsonDocument<128> doc;
      doc["status"] = "connected";
      doc["device"] = "ESP32 Fitness Tracker";
      String resp; serializeJson(doc, resp);
      webSocket.sendTXT(num, resp);
      break;
    }
    case WStype_TEXT: {
      // Received text from client (e.g., commands)
      String msg = String((char*)payload);
      Serial.printf("[%u] Received: %s\n", num, msg.c_str());
      // Simple command parsing as JSON (safe)
      StaticJsonDocument<256> doc;
      DeserializationError err = deserializeJson(doc, msg);
      if (!err && doc.containsKey("command")) {
        String cmd = doc["command"].as<String>();
        if (cmd == "calibrate") {
          displayIntro("Calibration", "Running...");
          calibrateMPU();
          displayIntro("Calibration", "Done");
          webSocket.sendTXT(num, "{\"status\":\"calibrated\"}");
        } else if (cmd == "reset_yaw") {
          yaw = 0.0f;
          webSocket.sendTXT(num, "{\"status\":\"yaw_reset\"}");
        } else if (cmd == "set_threshold" && doc.containsKey("value")) {
          threshold = doc["value"].as<int>();
          webSocket.sendTXT(num, "{\"status\":\"threshold_set\"}");
        }
      }
      break;
    }
    default:
      break;
  }
}
