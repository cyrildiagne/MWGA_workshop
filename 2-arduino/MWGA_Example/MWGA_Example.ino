#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include "MWGA.h"

MWGA mwga;

int numBallsFloating = 0;
int buttonPin = 12;
int buttonValue = -1;

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

void onMessage(const char* data) {
  // handle custom messages here
}

void setup() {
  delay(1000);
  Serial.begin(115200);
  Serial.println();

  //createWifi("esp8266-cyril", "makewiresgreatagain");
  connectToWifi("TempForWorkshop", "ecal2016");
  mwga.setup();
  mwga.onConnect(onClientConnect);
  mwga.onMessage(onMessage);
  mwga.on("/balls/in", onBallIn);
  mwga.on("/balls/out", onBallOut);
  
  // set pin 12 as input
  pinMode(D6, INPUT_PULLUP);
}

void loop() {
  int val = digitalRead(buttonPin);
  if (val != buttonValue) {
    String json = "{\"button\":" + String(val) + "}";
    mwga.broadcast(json);
    buttonValue = val;
    Serial.println("button value is now " + String(val));
  }
  mwga.update();
}

