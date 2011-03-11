$(document).ready(function() {
    init();
});

var ctx;
var WIDTH;
var HEIGHT;
var HIGH_GRAVITY = 15;
var LOW_GRAVITY = 4;
var gravity = LOW_GRAVITY;
var camera = 0;

var worldClass = $.Class({
  init: function() {
  },

  draw: function(ctx) {
    var startX = camera - 1;
    var endX = camera + WIDTH + 2;

    // world lines
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT);
    for(x = startX; x < endX + 1; x++) {
      var height = this.height(x);
      ctx.lineTo(x - camera, height);
    }
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.closePath();
    ctx.stroke();
  },

  height: function(point) {
    return (Math.sin(Math.PI * (point / 180)) * (HEIGHT / 8)) + (HEIGHT / 16) * 12;
  },

  angle: function(point) {
    return Math.atan(this.height(point + 1) - this.height(point));
  }
});

var ballClass = $.Class({
  init: function(x, y, dx, dy) {
    this.x = x;
    this.y = y;
    this.dx = dx;
    this.dy = dy;
    this.angle = 0;
    this.v = 0;
  },

  updatePhysics: function() {
    // gravity
    var ax = 0;
    var ay = gravity;

    // world collision
    if ((this.y + 10) > world.height(this.x)) {
      var newAngle = world.angle(this.x);
      var angleDiff = (this.angle - newAngle) * 0.75;
      this.v = this.v * Math.cos(angleDiff);
      this.angle = newAngle;

      this.dx = this.v * Math.cos(this.angle);
      this.dy = this.v * Math.sin(this.angle);

      this.y = world.height(this.x) - 10;
    }

    this.dx += ax;
    this.dy += ay;

    this.angle = Math.atan(this.dy / this.dx);
    this.v = Math.sqrt(Math.pow(this.dx, 2) + Math.pow(this.dy, 2));

    // minimum speed
    if (this.v < 75) {
      this.v = 75;
      this.dx = this.v * Math.cos(this.angle);
      this.dy = this.v * Math.sin(this.angle);
    }

    // update position
    this.x += (this.dx / 100);
    this.y += (this.dy / 100);
  },

  draw: function(ctx) {
    ctx.beginPath();
    ctx.arc(this.x - camera, this.y, 10, 0, Math.PI*2, true);
    ctx.closePath();
    ctx.fill();

    /*
    var angle = world.angle(Math.round(this.x));
    ctx.fillText(angle * (180/Math.PI), 10, 10);
    ctx.fillText(this.dx, 160, 10);
    ctx.fillText(this.dy, 310, 10);
    ctx.fillText(Math.round(this.v), 460, 10);
    ctx.fillText(gravity, 610, 10);
    ctx.fillText(this.angle, 760, 10);
    */
  }
});

var ball = new ballClass(250, 200, 30, -30);
var world = new worldClass();

function init() {
  ctx = $('#canvas')[0].getContext("2d");
  WIDTH = $('#canvas').width();
  HEIGHT = $('#canvas').height();
  $(document).keydown(function(evt) {
    if (evt.keyCode == 32) {
      gravity = HIGH_GRAVITY;
    }
  });
  $(document).keyup(function(evt) {
    if (evt.keyCode == 32) {
      gravity = LOW_GRAVITY;
    }
  });
  $(document).bind("touchstart",function(event){
    gravity = HIGH_GRAVITY;
  });
  $(document).bind("touchend",function(event){
    gravity = LOW_GRAVITY;
  });
  setInterval(physics, 16);
  setInterval(render, 16);
}

function render() {
  if (ball.x - camera > (WIDTH / 3))
  {
    camera += (ball.x - camera) - (WIDTH / 3);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8);';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'rgba(0, 0, 0, 1);';
  ball.draw(ctx);
  world.draw(ctx);
}

function physics() {
  ball.updatePhysics();
}
