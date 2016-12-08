const DEFAULT_TOUCH_WIDTH = 300;

class Touches {
  constructor(domEl) {
    this.touches = [];
    this.startHandler = this.start.bind(this);
    this.endHandler = this.end.bind(this);
    this.moveHandler = this.move.bind(this);
    this.handlers = {};
    this.el = domEl;
    this.el.addEventListener('mousedown', this.startHandler, false);
    this.el.addEventListener('touchstart', this.startHandler, false);
    this.el.addEventListener('mouseup', this.endHandler, false);
    this.el.addEventListener('touchend', this.endHandler, false);
  }

  on(ev, handler) {
    this.handlers[ev] = handler;
  }

  start(ev) {
    ev.preventDefault();
    var width = DEFAULT_TOUCH_WIDTH;
    if (ev.touches) {
      ev.clientX = ev.touches[0].clientX;
      ev.clientY = ev.touches[0].clientY;
      if (ev.touches.length > 1) {
        width = Math.abs(ev.touches[0].clientX - ev.touches[1].clientX);
      }
    }
    this.touches = [];
    this.touches.push({
      start: {
        x: ev.clientX * devicePixelRatio,
        y: ev.clientY * devicePixelRatio,
        w: width * devicePixelRatio
      },
      current: {
        x: -1,
        y: -1,
        w: DEFAULT_TOUCH_WIDTH
      },
      ev: ev
    });

    window.addEventListener('touchmove', this.moveHandler);
    window.addEventListener('mousemove', this.moveHandler);

    if (this.handlers['start']) {
      this.handlers['start'](this.touches[0]);
    }
  }

  move(ev) {
    ev.preventDefault();

    var width = DEFAULT_TOUCH_WIDTH;
    if (ev.touches) {
      ev.clientX = ev.touches[0].clientX;
      ev.clientY = ev.touches[0].clientY;
      if (ev.touches.length > 1) {
        width = Math.abs(ev.touches[0].clientX - ev.touches[1].clientX);
      }
    }
    this.touches[0].current.x = ev.clientX * devicePixelRatio;
    this.touches[0].current.y = ev.clientY * devicePixelRatio;
    this.touches[0].current.w = width * devicePixelRatio;

    if (this.handlers['move']) {
      this.handlers['move'](this.touches[0]);
    }
  }

  end(ev) {
    window.removeEventListener('touchmove', this.moveHandler);
    window.removeEventListener('mousemove', this.moveHandler);

    if (this.handlers['end']) {
      this.handlers['end'](this.touches[0]);
    }
  }
}
