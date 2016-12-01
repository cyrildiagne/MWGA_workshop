var wsUri = "ws://" + location.host + ":81";

var canvas;
var canvasWidth;
var ctx;

var particles = [];
var repel = true;
var mouse = null;
var numBallsFloating = 0;

var msgQueue = [];
var isSendingLocked = false;

const CIRCLE_RADIUS = 5 * devicePixelRatio;

function setup() {
  setupWebSockets();

  canvas = document.getElementById('canvas');
  ctx = canvas.getContext("2d");
  window.addEventListener('resize', onResize, false);
  window.addEventListener('orientationchange', onResize, false);
  window.addEventListener('mousedown', start, false);
  window.addEventListener('touchstart', start, false);
  window.addEventListener('mouseup', end, false);
  window.addEventListener('touchend', end, false);
  onResize();

  update();
}

function addParticle() {
  var x = canvas.width * Math.random(),
    y = canvas.height * Math.random();
  if (mouse) {
    x = mouse.x + (Math.random() - 0.5) * 2 * 30;
    y = mouse.y + (Math.random() - 0.5) * 2 * 30;
  }
  particles.push({
    x: x,
    y: y,
    xv: 0,
    yv: 0
  });
}

function setupWebSockets() {
  websocket = new WebSocket(wsUri, ['arduino']);
  websocket.onopen = onWSOpen;
  websocket.onclose = onWSClose;
  websocket.onmessage = onWSMessage;
  websocket.onerror = onWSError;
}
function onWSOpen(evt) {
  console.log('websocket opened');
}
function onWSClose(evt) {
  console.log('websocket closed');
}
function onWSError(evt) {
  console.log('websocket error');
  console.error(evt);
}
function onWSMessage(evt) {
  json = JSON.parse(evt.data);
  if (json.hasOwnProperty('id') && json.id === 0) {
    // initialize first client with some particles
    for (var i = 0; i < 100; i++) {
      addParticle();
    }
  } else if (json.hasOwnProperty('button')) {
    repel = json.button;
  } else if (json.hasOwnProperty('balls')) {
    numBallsFloating = json.balls;
  } else if (json.hasOwnProperty('status')) {
    isSendingLocked = false;
  }
}
function sendNextMessage() {
  if (isSendingLocked || !msgQueue.length) return;
  var val = msgQueue.shift();
  websocket.send(val);
  isSendingLocked = true;
}


function update() {
  requestAnimationFrame(update);

  if (numBallsFloating > 1 && !isSendingLocked && repel && mouse) {
    addParticle();
    msgQueue.push('/balls/out');
  }

  var x;
  var y;
  var d2;
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    if (mouse) {
      x = mouse.x - p.x;
      y = mouse.y - p.y;
      d2 = Math.pow((x * x + y * y) / 500, 1.2);
      d2 = d2 > 500 ? d2 : 500;
    } else {
      x = y = 0;
      d2 = 1;
    }
    if (repel) {
      p.xv = (p.xv - 5 * x / d2) * 0.95;
      p.yv = (p.yv - 5 * y / d2) * 0.95;
    } else {
      p.xv = (p.xv + 5 * x / d2) * 0.95;
      p.yv = (p.yv + 5 * y / d2) * 0.95;
    }
    // bounce or screen sides
    p.xv = p.x > 0 ? p.x < canvas.width ? p.xv : -Math.abs(p.xv) : Math.abs(p.xv);
    p.yv = p.y > 0 ? p.y < canvas.height ? p.yv : -Math.abs(p.yv) : Math.abs(p.yv);
    // integrate velocity
    p.x += p.xv;
    p.y += p.yv;
    // test if the ball should enter floating mode
    if (mouse && !repel) {
      d2 = x * x + y * y;
      if (d2 < 1000) {
        msgQueue.push('/balls/in');
        particles.splice(i, 1);
        i--;
      }
    }
  }

  sendNextMessage();

  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, CIRCLE_RADIUS, 0, 2 * Math.PI, false);
    ctx.fill();
  }
}

function start(ev) {
  if (ev.touches) {
    ev.clientX = ev.touches[0].clientX;
    ev.clientY = ev.touches[0].clientY;
  }
  mouse = {
    x: ev.clientX * devicePixelRatio,
    y: ev.clientY * devicePixelRatio
  };
  window.addEventListener('touchmove', move, false);
  window.addEventListener('mousemove', move, false);
}

function move(ev) {
  ev.preventDefault();
  if (ev.touches) {
    ev.clientX = ev.touches[0].clientX;
    ev.clientY = ev.touches[0].clientY;
  }
  mouse = {
    x: ev.clientX * devicePixelRatio,
    y: ev.clientY * devicePixelRatio
  };
}

function end(ev) {
  mouse = null;
  window.removeEventListener('touchmove', move, false);
  window.removeEventListener('mousemove', move, false);
}

function onResize() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
}

setup();
