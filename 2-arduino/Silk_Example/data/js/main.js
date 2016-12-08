const IS_SCANNER = document.location.href.indexOf('scan') != -1;

var canvas;
var ctx;
var touches;
var image;
var pointers = [];
var interpolatedPointers = [];
var pointersDraw = [];
var interpolatedPointersDraw = [];
var socket;


function setup() {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext("2d");
  window.addEventListener('resize', onResize, false);
  window.addEventListener('orientationchange', onResize, false);
  onResize();

  image = new Image();
  image.src = 'http://ecal-mid.ch/students/2CV2016/screen_to_screen/test_silk.jpg';
  image.addEventListener('load', draw);

  touches = new Touches(window);
  touches.on('start', start);
  touches.on('move', move);
  touches.on('end', end);

  // socket = new Sockets("ws://" + location.host + ":81");
  socket = new Sockets("ws://10.0.1.6:81");
  if (!IS_SCANNER) {
    socket.onMessage = onWSMessage;
  }

  update();
}

function onWSMessage(data) {
  if (data.hasOwnProperty('id')) {

  } else {
    pointers = data;
    interpolatedPointers = getInterpolated(pointers);
  }
}

function update() {
  requestAnimationFrame(update);

  socket.update();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (IS_SCANNER) {
    ctx.drawImage(image, 0, 0);
    drawScan();
  } else {
    drawImage();
  }
}

function drawScan() {
  ctx.lineWidth = 2;
  ctx.fillStyle = 'black';
  ctx.beginPath();
  for (var p of interpolatedPointers) {
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.w, p.y);
  }
  ctx.stroke();
}

function drawImage() {
  var iMax = Math.min(interpolatedPointers.length, interpolatedPointersDraw.length);
  for (var i = 0; i < iMax; i++) {
    var p = interpolatedPointers[i];
    var pd = interpolatedPointersDraw[i];
    ctx.drawImage(image, p.x, p.y, p.w, 1, pd.x, pd.y, pd.w, 1);
  }
}

function getInterpolated(positions) {
  var prev;
  var result = [];
  for (var p of positions) {
    if (prev) {
      const deltaY = p.y - prev.y;
      const deltaX = p.x - prev.x;
      const deltaW = p.w - prev.w;
      for (var y = 0; y < deltaY; y++) {
        const pct = y / deltaY;
        result.push({
          x: prev.x + deltaX * pct,
          y: prev.y + y,
          w: prev.w + deltaW * pct
        });
      }
    }
    prev = p;
  }
  return result;
}

function start(touch) {
  if (IS_SCANNER) {
    pointers = [];
    interpolatedPointers = [];
    pointersDraw = [];
    interpolatedPointersDraw = [];
    pointers.push(touch.start);
  } else {
    pointersDraw = [];
    interpolatedPointersDraw = [];
    pointersDraw.push(touch.start);
  }
}

function move(touch) {
  if (IS_SCANNER) {
    if (pointers.length > 100) {
      return;
    }
    pointers.push({
      x: touch.current.x,
      y: touch.current.y,
      w: touch.current.w
    });
    interpolatedPointers = getInterpolated(pointers);
  } else {
    pointersDraw.push({
      x: touch.current.x,
      y: touch.current.y,
      w: touch.current.w
    });
    interpolatedPointersDraw = getInterpolated(pointersDraw);
  }
  draw();
}

function end() {
  if (IS_SCANNER) {
    socket.send(JSON.stringify(pointers));
  }
}

function onResize() {
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  draw();
}

setup();
