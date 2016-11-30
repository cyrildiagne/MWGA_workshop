var wsUri = "ws://" + location.host + ":81";

var canvas;
var canvasWidth;
var ctx;

var particles = [];
var repel = true;
var mouse = null;

const CIRCLE_RADIUS = 5;

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
    x = mouse.x;
    y = mouse.y;
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
  console.log(evt);
  json = JSON.parse(evt.data);
  if (json.hasOwnProperty('id') && json.id === 0) {
    // initialize first client with 50 particles
    for (var i = 0; i < 50; i++) {
      addParticle();
    }
  }
}


function update() {
  requestAnimationFrame(update);
  var x;
  var y;
  var d2;
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    if (mouse) {
      x = mouse.x - p.x;
      y = mouse.y - p.y;
      d2 = Math.pow((x * x + y * y) / 500, 1.5);
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
  }

  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i]
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
    x: ev.clientX,
    y: ev.clientY
  };
  window.addEventListener('touchmove', move, false);
  window.addEventListener('mousemove', move, false);
}

function move(ev) {
  if (ev.touches) {
    ev.clientX = ev.touches[0].clientX;
    ev.clientY = ev.touches[0].clientY;
  }
  mouse = {
    x: ev.clientX,
    y: ev.clientY
  };
}

function end(ev) {
  mouse = null;
  window.removeEventListener('touchmove', move, false);
  window.removeEventListener('mousemove', move, false);
}

function onResize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

setup();
