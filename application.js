$(document).ready(function() {
    init();
});

var ctx;
var WIDTH;
var HEIGHT;
var HIGH_GRAVITY = 15;
var LOW_GRAVITY = 6;
var AMPLITUDE = 200;
var MIN_WIDTH = 200;
var MAX_WIDTH = 500;
var SMOOTHNESS_AMPLITUDE = 0.2;
var LENGTH = 30000;
var gravity = LOW_GRAVITY;
var WORLD_TAG = 1234;
var COIN_PROBABILITY = 0.5;
var BOOSTER_PROBABILITY = 0.1;
var camera = 0;
var score = 0;

var C_NONE = 0;
var C_COIN = 1;
var C_BOOSTER = 2;

var worldClass = $.Class({
  init: function(seed) {
    this.rng = new MersenneTwister(seed);
    this.points = new Array();
  },

  generate: function() {
    var keypoints = new Array();
    for(x = 0; x < LENGTH; x++)
    {
      keypoints.push(x);
      var target = Math.round(this.rng.random() * MAX_WIDTH); if (target < MIN_WIDTH)
      {
        target = MIN_WIDTH;
      }
      x = x + target;
    }

    var smoothness = this.rng.random();
    var last = 1;
    var t = 0;
    for(i = 0; i < keypoints.length; i++)
    {
      var target = last;
      while((Math.abs(target - last) < (smoothness - SMOOTHNESS_AMPLITUDE)) || (Math.abs(target - last) > (smoothness + SMOOTHNESS_AMPLITUDE))) {
        target = (this.rng.random() - 0.5) * 2;
      }

      var a;
      var shift;
      a = (Math.abs(last) / 2) + (Math.abs(target) / 2);
      if (target > last)
      {
        if (last < 0 && target < 0) {
          a = Math.abs(last) - a;
          shift = Math.abs(last) - a;
        } else {
          if (last > 0 && target > 0) {
            a = (target - last) / 2;
          }
          shift = (a - Math.abs(target));
        }
      } else {
        shift = -(a - Math.abs(target));
        if (last < 0 && target < 0) {
          a = -(Math.abs(last) - a);
          shift = (Math.abs(last) + a);
        } else if (last > 0 && target > 0) {
          a = (last - target) / 2;
          shift = -(Math.abs(target) + a);
        }
      }

      for(x = keypoints[i]; x < keypoints[i + 1]; x++) {
        var parts = keypoints[i + 1] - keypoints[i];
        var part = x - keypoints[i];
        var t;
        if (target > last)
        {
          t = (Math.PI / parts) * part;
        } else {
          t = ((Math.PI / parts) * part) + Math.PI;
        }
        this.points[x] = (Math.cos(t) * a) + shift;
      }
      last = target;
    }

    this.coins = new Array();
    for (i = 0; i < keypoints.length; i++) {
      if (this.points[keypoints[i]] < this.points[keypoints[i + 1]])
      {
        if (this.rng.random() < COIN_PROBABILITY)
        {
          for (x = keypoints[i] + 50; x < (keypoints[i + 2] - 50); x += 50)
          {
            this.coins[x] = C_COIN;
          }
        }
        else if (this.rng.random() < BOOSTER_PROBABILITY)
        {
          this.coins[keypoints[i + 1]] = C_BOOSTER;
        }
      }
      i++;
    }
  },

  draw: function(ctx) {
    var startX = camera - 1;
    var endX = camera + WIDTH + 2;

    ctx.beginPath();
    ctx.moveTo(-1, HEIGHT);
    for(x = startX; x < endX; x++) {
      var height = this.height(x);
      ctx.lineTo(x - camera, height);
    }
    ctx.lineTo(WIDTH + 1, HEIGHT);
    ctx.closePath();
    ctx.stroke();

    for (x = startX; x < endX; x++) {
      if (this.coins[Math.round(x)] == C_COIN) {
        var height = this.height(x) - 10;
        ctx.beginPath();
        ctx.arc(x - camera, height, 5, 0, Math.PI*2, true);
        ctx.closePath();
        ctx.fill();
      } else if(this.coins[Math.round(x)] == C_BOOSTER) {
        var height = this.height(x) - 10;
        ctx.beginPath();
        ctx.arc(x - camera, height, 5, 0, Math.PI*2, true);
        ctx.closePath();
        ctx.stroke();
      }
    }
  },

  height: function(point) {
    rpoint = Math.round(point);
    if (this.points[rpoint] == undefined)
      return HEIGHT;
    else
      return (HEIGHT - 50 - (AMPLITUDE / 2)) + (this.points[rpoint] * (AMPLITUDE / 2));
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
  }
});

var ball = new ballClass(50, 50, 30, -30);
var world = new worldClass(WORLD_TAG);

function init() {
  ctx = $('#canvas')[0].getContext("2d");
  WIDTH = $('#canvas').width();
  HEIGHT = $('#canvas').height();
  world.generate();
  $(document).keydown(function(evt) {
    if (evt.keyCode == 32) {
      gravity = HIGH_GRAVITY;
    }
  });
  $(document).keyup(function(evt) {
    if (evt.keyCode == 32) {
      gravity = LOW_GRAVITY;
    }
    if (evt.keyCode == 39) {
      camera += 300;
      console.log(camera);
    }
    if (evt.keyCode == 37) {
      camera -= 300;
      console.log(camera);
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

  ctx.fillText(score, 25, HEIGHT - 25);
}

function physics() {
  ball.updatePhysics();
  score += Math.round(ball.v / 100);
  for (x = ball.x - 10; x < ball.x + 10; x++) {
    if (ball.y > world.height(x) - 20)
    {
      if (world.coins[Math.round(x)] == C_COIN) {
        score += 100;
        world.coins[Math.round(x)] = C_NONE;
      } else if (world.coins[Math.round(x)] == C_BOOSTER) {
        score += 100;
        world.coins[Math.round(x)] = C_NONE;
        ball.v += 300;
      }
    }
  }
}
