#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include "MWGA.h"

MWGA mwga;

int numBallsFloating = 0;

void setup() {
	delay(1000);
	Serial.begin(115200);
  Serial.println();
  
  connectToWifi("kikko", "karen1409");
  mwga.setup();
  mwga.onConnect(onClientConnect);
  mwga.on("/balls/in", onBallIn);
  mwga.on("/balls/out", onBallOut);
}

void loop() {
  mwga.update();
}

void onClientConnect(int clientId){
  if (clientId == 0) {
    numBallsFloating = 0;
  }
  String json = "{\"balls\":" + String(numBallsFloating) + "}";
  mwga.send(clientId, json);
  Serial.printf("num balls floating %d\n", numBallsFloating);
}

void onBallIn(){
  numBallsFloating++;
  String json = "{\"balls\":" + String(numBallsFloating) + "}";
  mwga.broadcast(json);
  Serial.printf("num balls floating %d\n", numBallsFloating);
}

void onBallOut(){
  if (numBallsFloating == 0) {
    return;
  }
  numBallsFloating--;
  String json = "{\"balls\":" + String(numBallsFloating) + "}";
  mwga.broadcast(json);
  Serial.printf("num balls floating %d\n", numBallsFloating);
}

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
