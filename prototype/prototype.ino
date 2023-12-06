#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include "secrets.h"  

#include <Adafruit_Sensor.h>
#include <Adafruit_ADXL345_U.h>
#include <OneWire.h>
#include <DallasTemperature.h>


Adafruit_ADXL345_Unified accel = Adafruit_ADXL345_Unified(12345);

// DS18B20 Temperature Sensor
#define ONE_WIRE_BUS D4  // DS18B20 data pin
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// GSR Sensor
const int gsrPin = A0;  // Analog pin to read GSR data

int p_id = 0;

//add your topic here

WiFiClientSecure net;
BearSSL::X509List cert(cacert);
BearSSL::X509List client_crt(client_cert);
BearSSL::PrivateKey key(privkey);
PubSubClient client(net);
time_t now;
time_t nowish = 1510592825;

void NTPConnect(void) {
  configTime(TIME_ZONE * 3600, 0 * 3600, "pool.ntp.org", "time.nist.gov");
  now = time(nullptr);
  while (now < nowish) {
    delay(500);
    now = time(nullptr);
  }
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  Serial.print("Current time: ");
  Serial.print(asctime(&timeinfo));
}

void messageReceived(char *topic, byte *payload, unsigned int length) {
  if (strstr(topic, "esp8266/msg")) {
    StaticJsonDocument<200> doc;
    deserializeJson(doc, payload);
    String Relay_data = doc["message"];
    String slot_data = doc["slot"];
    const char* statusin = doc["status"];
  }
}

void connectAWS() {
  delay(3000);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Attempting WiFi: ");
  Serial.println(WIFI_SSID);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
  }
  NTPConnect();
  net.setTrustAnchors(&cert);
  net.setClientRSACert(&client_crt, &key);
  client.setServer(MQTT_HOST, 8883);
  client.setCallback(messageReceived);
  Serial.println("Connecting AWS");
  while (!client.connect(THINGNAME)) {
    delay(1000);
  }
  if (!client.connected()) {
    Serial.println("AWS IoT Timeout!");
    return;
  }
  client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC);
  Serial.println("AWS Connected!");
}

void setup() {    

  // Initialize the ADXL345 sensor
  if (!accel.begin()) {
    Serial.println("ADXL345 sensor not found. Check wiring!");
    while (1);
  }

  // Initialize the DS18B20 Temperature Sensor
  sensors.begin();

  // Start serial communication
  //Serial.begin(9600);
  Serial.begin(115200);
  connectAWS();
}

void loop() {
  if (!client.connected()) {
    Serial.println("MQTT disconnected");
    connectAWS();
  }
  client.loop(); 
  //
  StaticJsonDocument<500> doc;
  //device id
  doc["d_id"] = 15; 
  if(p_id == 60)
  {
    p_id = 0;
  }
  p_id++;
  doc["p_id"] = p_id; 


 JsonObject values = doc.createNestedObject("values");
  
  
  // Print the collected sensor data
  // Serial.print("Acceleration X: "); Serial.println(accelX);
  // Serial.print("Acceleration Y: "); Serial.println(accelY);
  // Serial.print("Acceleration Z: "); Serial.println(accelZ);
  // Serial.print("Temperature (Â°C): "); Serial.println(tempC);
  // Serial.print("GSR Value: "); Serial.println(GsrMicroSiemens);

  // Read ADXL345 sensor data (Acceleration)
  sensors_event_t event;
  accel.getEvent(&event);
  float accelX = event.acceleration.x;
  float accelY = event.acceleration.y;
  float accelZ = event.acceleration.z;
  
  // Read DS18B20 Temperature Sensor data
  sensors.requestTemperatures();  // Request temperature readings
  float tempC = sensors.getTempCByIndex(0);  // Assuming only one DS18B20 is connected
  
  // Read GSR Sensor data
  int gsrValue = analogRead(gsrPin);

  float GsrMicroSiemens = (float)gsrValue / 1024;
  GsrMicroSiemens = GsrMicroSiemens * 3.3;
  GsrMicroSiemens = GsrMicroSiemens / 0.132;    

  
  values["acc_x"] = accelX;
  values["acc_y"] = accelY;
  values["acc_z"] = accelZ;
  values["eda"] = GsrMicroSiemens;
  values["temp"] = tempC;
  
  
  // Publish the JSON-formatted message to the specified topic
  char messageBuffer[550];
  serializeJson(doc, messageBuffer);
  client.publish(AWS_IOT_PUBLISH_TOPIC, messageBuffer);

  // Print the JSON document to the Serial Monitor
  serializeJsonPretty(doc, Serial);
  Serial.println(); // Add a newline for readability
  delay(1000);
}