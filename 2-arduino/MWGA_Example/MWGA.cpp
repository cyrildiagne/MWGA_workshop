#include "MWGA.h"
#include <FS.h>


using namespace std;

//holds the current upload
File fsUploadFile;

void MWGA::setup(){
  // setup filesystem
  SPIFFS.begin();
  
  // setup http server
#define _bind(X) bind(&MWGA::X, this)
  // setup endpoints routes
  server.on("/", _bind(getIndex));
  server.on("/monitor", _bind(getMonitor));
  server.on("/editor", HTTP_GET, _bind(getEditor));
  // setup api routes
  server.on("/api/fs", HTTP_GET, _bind(handleFileList));
  server.on("/api/fs", HTTP_PUT, _bind(handleFileCreate));
  server.on("/api/fs", HTTP_DELETE, _bind(handleFileDelete));
  //first callback is called after the request has ended with all parsed arguments
  //second callback handles file uploads at that location
  server.on("/api/fs", HTTP_POST, [this](){ this->server.send(200, "text/plain", ""); }, _bind(handleFileUpload));
  server.on("/api/status", HTTP_GET, _bind(handleStatus));
  // not found
  server.onNotFound(_bind(handleNoRoute));
  server.begin();
#undef _bind

  // setup websockets server
  using namespace std::placeholders;
  webSocket.begin();
  webSocket.onEvent(bind(&MWGA::webSocketEvent, this, _1, _2, _3, _4));
}

void MWGA::update(){
  server.handleClient();
  webSocket.loop();
}

void MWGA::onConnect(MWGAConnectCallback handler){
  connectHandler = handler;
}

void MWGA::on(const char* eventName, MWGACallback handler){
  handlers[eventName] = handler;
}

void MWGA::getIndex(){
  if(!handleFileRead("/index.html")) {
    server.send(404, "text/plain", "FileNotFound");
  }
}

void MWGA::getMonitor(){
  if(!handleFileRead("/_monitor/monitor.html")) {
    server.send(404, "text/plain", "FileNotFound");
  }
}

void MWGA::getEditor() {
  if(!handleFileRead("/_editor/editor.html")) {
    server.send(404, "text/plain", "FileNotFound");
  }
}

void MWGA::handleNoRoute(){
  if(!handleFileRead(server.uri())) {
      server.send(404, "text/plain", "FileNotFound");
  }
}

/* REST API */

bool MWGA::handleFileRead(String path){
  String contentType = getContentType(path);
  String pathWithGz = path + ".gz";
  if(SPIFFS.exists(pathWithGz) || SPIFFS.exists(path)){
    if(SPIFFS.exists(pathWithGz))
      path += ".gz";
    File file = SPIFFS.open(path, "r");
    size_t sent = server.streamFile(file, contentType);
    file.close();
    return true;
  }
  return false;
}


void MWGA::handleFileUpload(){
  HTTPUpload& upload = server.upload();
  if(upload.status == UPLOAD_FILE_START){
    String filename = upload.filename;
    if(!filename.startsWith("/")) {
      filename = "/"+filename;
    }
    Serial.print("handleFileUpload Name: ");
    Serial.println(filename);
    fsUploadFile = SPIFFS.open(filename, "w");
    filename = String();
  }
  else if(upload.status == UPLOAD_FILE_WRITE){
    Serial.print("handleFileUpload Data: ");
    Serial.println(upload.currentSize);
    if(fsUploadFile) {
      fsUploadFile.write(upload.buf, upload.currentSize);
    }
  }
  else if(upload.status == UPLOAD_FILE_END){
    if(fsUploadFile) {
      fsUploadFile.close();
    }
    Serial.print("handleFileUpload Size: ");
    Serial.println(upload.totalSize);
  }
}

void MWGA::handleFileDelete(){
  // error 500 if path argument is missing
  if(server.args() == 0) {
    return server.send(500, "text/plain", "missing path argument");
  }
  String path = server.arg(0);
  Serial.println("handleFileDelete: " + path);
  // error 500 if path argument is root
  if(path == "/") {
    return server.send(500, "text/plain", "path can't be root");
  }
  // 404 if file doesn't exists
  if(!SPIFFS.exists(path)) {
    return server.send(404, "text/plain", "FileNotFound");
  }
  SPIFFS.remove(path);
  server.send(200, "text/plain", "");
  path = String();
}

void MWGA::handleFileCreate(){
  // error 500 if path argument is missing
  if(server.args() == 0) {
    return server.send(500, "text/plain", "missing path argument");
  }
  String path = server.arg(0);
  Serial.println("handleFileCreate: " + path);
  // error 500 if path argument is root
  if(path == "/") {
    return server.send(500, "text/plain", "path can't be root");
  }
  // error 500 if path exists
  if(SPIFFS.exists(path)) {
    return server.send(500, "text/plain", "file already exists");
  }
  // create the new file
  File file = SPIFFS.open(path, "w");
  if(file) {
    file.close();
  }
  else {
    // something went wrong during the creation
    return server.send(500, "text/plain", "CREATE FAILED");
  }
  // all good!
  server.send(200, "text/plain", "success");
}

void MWGA::handleFileList() {
  String path = "/";
  if(server.hasArg("dir")) {
    path = server.arg("dir");
  }
  Dir dir = SPIFFS.openDir(path);
  String output = "[";
  while(dir.next()){
    File entry = dir.openFile("r");
    if (output != "[") output += ',';
    bool isDir = false;
    output += "{\"type\":\"";
    output += (isDir)?"dir":"file";
    output += "\",\"name\":\"";
    output += String(entry.name()).substring(1);
    output += "\"}";
    entry.close();
  }
  output += "]";
  server.send(200, "text/json", output);
}

void MWGA::handleStatus() {
  String json = "{";
  json += "\"heap\":"+String(ESP.getFreeHeap());
  json += ", \"analog\":"+String(analogRead(A0));
  json += ", \"gpio\":"+String((uint32_t)(((GPI | GPO) & 0xFFFF) | ((GP16I & 0x01) << 16)));
  json += "}";
  this->server.send(200, "text/json", json);
}

/* WEBSOCKETS */

void MWGA::webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length){
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected!\n", num);
    break;
    case WStype_CONNECTED:
    {
      IPAddress ip = webSocket.remoteIP(num);
      Serial.printf("[%u] Connected from %d.%d.%d.%d url: %s\n", num, ip[0], ip[1], ip[2], ip[3], payload);
      // send id to client
      webSocket.sendTXT(num, "{\"id\":" + String(num) + "}");
      // call handler if defined
      if (connectHandler){
        connectHandler(num);
      }
    }
    break;
    case WStype_TEXT:
      Serial.printf("[%u] get Text: %s\n", num, payload);
      const char * event = (const char *)payload;
      if (handlers.find(event) != handlers.end()) {
        handlers[event]();
      } else {
        Serial.printf("received unknown event: %s\n", event);
      }
      webSocket.sendTXT(num, "{\"status\": \"OK\" }");
    break;
  }
}

/* UTILS */

String MWGA::getContentType(String filename){
  if(server.hasArg("download")) {
    return "application/octet-stream";
  }
  const String pairs[12][2]{
    {".htm",  "text/html"},
    {".html", "text/html"},
    {".css", "text/css"},
    {".js", "application/javascript"},
    {".png", "image/png"},
    {".gif", "image/gif"},
    {".jpg", "image/jpeg"},
    {".ico", "image/x-icon"},
    {".xml", "text/xml"},
    {".pdf", "application/x-pdf"},
    {".zip", "application/x-zip"},
    {".gz", "application/x-gzip"}
  };
  for (const auto& pair: pairs) {
    if(filename.endsWith(pair[0])) {
      return pair[1];
    }
  }
  return "text/plain";
}

