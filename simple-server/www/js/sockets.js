class Sockets {

  constructor(url) {
    this.websocket = new WebSocket(url);
    this.websocket.onopen = this.onWSOpen.bind(this);
    this.websocket.onclose = this.onWSClose.bind(this);
    this.websocket.onmessage = this.onWSMessage.bind(this);
    this.websocket.onerror = this.onWSError.bind(this);

    this.msgQueue = [];
    this.isSendingLocked = false;
    this.onMessage = null;
  }

  send(data) {
    this.msgQueue.push(data);
  }

  update() {
    if (this.isSendingLocked || !this.msgQueue.length) return;
    var val = this.msgQueue.shift();
    this.websocket.send(val);
    this.isSendingLocked = true;
  }

  onWSOpen(evt) {
    console.log('websocket opened');
  }

  onWSClose(evt) {
    console.log('websocket closed');
  }

  onWSError(evt) {
    console.log('websocket error');
    console.error(evt);
  }

  onWSMessage(evt) {
    if (evt.data.indexOf('status') != -1) {
      this.isSendingLocked = false;
      return;
    }
    var json = JSON.parse(evt.data);
    if (this.onMessage) {
      this.onMessage(json);
    }
  }
}
