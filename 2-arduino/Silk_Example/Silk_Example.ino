#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include "MWGA.h"

MWGA mwga;

// WIFI setup

void connectToWifi(const char* ssid, const char* password){
  WiFi.mode(WIFI_STA);
  delay(200);
  WiFi.begin(ssid, password);
  Serial.println("Connecting to wifi " + String(ssid));
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Connected!");
  Serial.println("Local IP:" + WiFi.localIP().toString());
  MDNS.begin("esp8266");
}


void createWifi(const char* ssid, const char* password){
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);
  Serial.println("Creating Wifi access point:" + String(ssid));
  Serial.println("Access Point IP:" + WiFi.softAPIP().toString());
}

void onMessage(const char* data) {
  // handle custom messages here
  mwga.broadcast(data);
}

void setup() {
  delay(1000);
  Serial.begin(115200);
  Serial.println();

  //createWifi("esp8266-cyril", "makewiresgreatagain");
  connectToWifi("TempForWorkshop", "ecal2016");
  mwga.setup();
  mwga.onMessage(onMessage);
}

void loop() {
  mwga.update();
  delay(1);
}

