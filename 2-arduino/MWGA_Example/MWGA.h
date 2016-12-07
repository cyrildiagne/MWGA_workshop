/* 
 *  MWGA - Library for Make Wire Great Again workshop at ECAL with Alain Bellet (Dec 2016)
 *  Created by Cyril Diagne, November 2016
 *  derived from the excellent FSBrowser example (Hristo Gochkov)
 *  Released into the public domain.
 */
#ifndef MWGA_h
#define MWGA_h

#include <map>
#include <cstring>

#include <ESP8266WebServer.h>
#include <WebSocketsServer.h>

typedef std::function<void()> MWGACallback;
typedef std::function<void(int)> MWGAConnectCallback;
typedef std::function<void(const char * data)> MWGAMessageCallback;

struct cmp_str{
  bool operator()(const char *a, const char *b){
    return std::strcmp(a, b) < 0;
  }
};

class MWGA {
public:
  MWGA():server(80), webSocket(81) {};
  void setup();
  void update();

  void onConnect(MWGAConnectCallback handler);
  void on(const char* eventName, MWGACallback handler);
  void onMessage(MWGAMessageCallback handler);

  void send(int num, String json) { webSocket.sendTXT(num, json); }
  void broadcast(String json) { webSocket.broadcastTXT(json); }

private:
  ESP8266WebServer server;
  WebSocketsServer webSocket;

  MWGAConnectCallback connectHandler;
  MWGAMessageCallback messageHandler;

  /* custom socket events */
  std::map<const char*, MWGACallback, cmp_str> handlers;

  /* websockets */
  void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length);
  
  /* endpoints */
  void getIndex();
  void getMonitor();
  void getEditor();
  void handleNoRoute();

  /* api */
  bool handleFileRead(String path);
  void handleFileUpload();
  void handleFileCreate();
  void handleFileDelete();
  void handleFileList();
  void handleStatus();

  /* utils */
  String getContentType(String filename);
};

#endif MWGA_h
