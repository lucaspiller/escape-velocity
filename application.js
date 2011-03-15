var WIDTH;
var HEIGHT;
var HIGH_GRAVITY = 25;
var LOW_GRAVITY = 5;
var AMPLITUDE = 200;
var MIN_WIDTH = 200;
var MAX_WIDTH = 500;
var SMOOTHNESS_AMPLITUDE = 0.2;
var LENGTH = 30000;
var gravity = LOW_GRAVITY;
var WORLD_TAG = 53775
var COIN_PROBABILITY = 0.5;
var BOOSTER_PROBABILITY = 0.1;
var STARTED = false;
var score = 0;

var C_NONE = 0;
var C_COIN = 1;
var C_BOOSTER = 2;

var TinyWigs = {
  WorldGenerator: $.Class({
    generate: function(tag) {
      var world = new TinyWigs.World(tag);
      this.generateLandscape(world);
      return world;
    },

    generateLandscape: function(world) {
      world.points = new Array();
      world.section = new Array();
      world.coins = new Array();

      // generate key points
      var keypoints = new Array();
      for(x = 0; x < LENGTH; x++)
      {
        keypoints.push(x);
        var target = Math.round(world.rng.random() * MAX_WIDTH);
        if (target < MIN_WIDTH)
          target = MIN_WIDTH;
        x = x + target;
      }

      // generate landscape between keypoints
      var smoothness = world.rng.random();
      var last = 1;
      var t = 0;
      for(i = 0; i < keypoints.length; i++)
      {
        // decide what the target height is
        var target = last;
        while((Math.abs(target - last) < (smoothness - SMOOTHNESS_AMPLITUDE)) || (Math.abs(target - last) > (smoothness + SMOOTHNESS_AMPLITUDE))) {
          target = (world.rng.random() - 0.5) * 2;
        }

        // and how we get there
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

        // generate points between
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
          world.points[x] = (Math.cos(t) * a) + shift;
          world.section[x] = i;
        }
        last = target;
      }

      // extra padding at end so we don't get a steep dropoff
      world.endpoint = keypoints[keypoints.length - 1];
      for (x = world.endpoint; x < (world.endpoint + 10000); x++) {
        world.points[x] = world.points[world.endpoint - 1];
        world.section[x] = keypoints.length;
      }

      // generate coins
      for (i = 0; i < keypoints.length; i++) {
        if (world.points[keypoints[i]] < world.points[keypoints[i + 1]])
        {
          if (world.rng.random() < COIN_PROBABILITY)
          {
            for (x = keypoints[i] + 50; x < (keypoints[i + 2] - 50); x += 50)
            {
              world.coins[x] = C_COIN;
            }
          }
          else if (world.rng.random() < BOOSTER_PROBABILITY)
          {
            world.coins[keypoints[i + 1]] = C_BOOSTER;
          }
        }
        i++;
      }

      world.sectionBoundaries = keypoints;
    }
  }),

  World: $.Class({
    init: function(tag) {
      this.tag = tag;
      this.rng = new MersenneTwister(tag);
    },

    draw: function(ctx, camera) {
      var startX = camera.x - 1;
      var endX = camera.x + WIDTH + 2;

      ctx.beginPath();
      ctx.moveTo(-1, HEIGHT);
      for(x = startX; x < endX; x++) {
        var height = this.height(x);
        ctx.lineTo(x - camera.x, height - camera.y);
      }
      ctx.lineTo(WIDTH + 1, HEIGHT);
      ctx.closePath();
      ctx.stroke();

      for (x = startX; x < endX; x++) {
        if (this.coins[Math.round(x)] == C_COIN) {
          var height = this.height(x) - 10;
          ctx.beginPath();
          ctx.arc(x - camera.x, height - camera.y, 5, 0, Math.PI*2, true);
          ctx.closePath();
          ctx.fill();
        } else if(this.coins[Math.round(x)] == C_BOOSTER) {
          var height = this.height(x) - 10;
          ctx.beginPath();
          ctx.arc(x - camera.x, height - camera.y, 5, 0, Math.PI*2, true);
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
  }),

  Player: $.Class({
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
        var angleDiff = (this.angle - newAngle) * 0.9;
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

    draw: function(ctx, camera) {
      ctx.beginPath();
      ctx.arc(this.x - camera.x, this.y - camera.y, 10, 0, Math.PI*2, true);
      ctx.closePath();
      ctx.fill();
    }
  }),

  Camera: $.Class({
    init: function() {
      this.x = 0;
      this.y = 0;
    }
  }),

  Renderer: $.Class({
    init: function(ctx, focus) {
      this.children = new Array();
      this.camera = new TinyWigs.Camera();
      this.ctx = ctx
      this.focus = focus;
    },

    render: function() {
      this.clear();

      if (this.focus.x - this.camera.x > (WIDTH / 3))
      {
        this.camera.x += (this.focus.x - this.camera.x) - (WIDTH / 3);
      }

      if (this.focus.y - this.camera.y < (HEIGHT / 10))
      {
        this.camera.y -= ((HEIGHT / 10) - (this.focus.y - this.camera.y)) / 16;
      }
      else if (this.focus.y - this.camera.y > (HEIGHT / 10) && this.camera.y < 0)
      {
        this.camera.y += ((this.focus.y - this.camera.y) - (HEIGHT / 10)) / 8;
      }

      for(i = 0; i < this.children.length; i++) {
        this.children[i].draw(this.ctx, this.camera);
      }
    },

    clear: function() {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8);';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = 'rgba(0, 0, 0, 1);';
    }
  })
};

var renderer;
var player;
var world;
var timer;
var sounds;

function init() {
  ctx = $('#canvas')[0].getContext("2d");
  WIDTH = $('#canvas').width();
  HEIGHT = $('#canvas').height();
  $(document).keydown(function(evt) {
    if (evt.keyCode == 32) {
      goHeavy();
    }
  });
  $(document).keyup(function(evt) {
    if (evt.keyCode == 32) {
      if (!STARTED)
      {
        timer = setInterval(physics, 16);
        STARTED = true;
      }
      stopHeavy();
    }
    if (evt.keyCode == 82) {
      resetGame(Math.round(Math.random() * 99999));
    }
  });
  $(document).bind("touchstart",function(event){
    goHeavy();
  });
  $(document).bind("touchend",function(event){
    if (!STARTED)
    {
      timer = setInterval(physics, 16);
      STARTED = true;
    }
    stopHeavy();
  });
  $('#retry-button').bind("click", function() {
    resetGame(world.tag);
    return false;
  });
  sounds = new Array();
  for (i = 1; i <= 9; i++)
  {
    var sound = new Audio("sounds/chime0" + i + ".ogg");
    sounds.push(sound);
  }
  resetGame(WORLD_TAG);
  setInterval(render, 16);
}

var perfect = false;
var perfectSection = 0;

function goHeavy() {
  gravity = HIGH_GRAVITY;
  var curSection = world.section[Math.round(player.x)];
  if ((world.sectionBoundaries[curSection] - player.x < 200) || perfect) {
    if (Math.abs(player.y - world.height(player.x)) < 10) {
      // check a proper loop
      if (world.height(world.sectionBoundaries[curSection]) < world.height(world.sectionBoundaries[curSection + 1]) &&
          world.height(world.sectionBoundaries[curSection + 1]) > world.height(world.sectionBoundaries[curSection + 2]))
      {
        if (perfectSection != curSection)
        {
          perfect = true;
          perfectSection = curSection;
        }
      }
    } else {
      perfect = false;
    }
  }
}

function stopHeavy() {
  if (perfect) {
    if (perfectSection == world.section[Math.round(player.x)])
    {
      if ((player.x - world.sectionBoundaries[world.section[Math.round(player.x)] + 1]) < 200)
      {
        console.log('Perfect!');
      }
    }
  }
  perfect = false;
  gravity = LOW_GRAVITY;
}

function resetGame(tag) {
  clearTimeout(timer);
  STARTED = false;
  $('#tada').hide();

  world = new TinyWigs.WorldGenerator().generate(tag);
  player = new TinyWigs.Player(50, 50, 30, -30);
  renderer = new TinyWigs.Renderer(ctx, player);
  renderer.children.push(world);
  renderer.children.push(player);
  camera = 0;
  score = 0;
}

function finish() {
  clearInterval(timer);
  $('#tweet-cont').children().remove();
  var link = $( document.createElement('a') );
  link.attr("data-text", "I just scored " + score + " points on world " + world.tag + ".")
  link.attr("class", "twitter-share-button");
  link.attr("href", "http://twitter.com/share");
  link.attr("data-url", "http://bit.ly/fRgEdr");
  link.attr("data-count", "none");
  link.attr("data-via", "lucaspiller");
  link.append("Tweet This");
  $('#tweet-cont').append(link);
  var tweetButton = new twttr.TweetButton($(link).get(0));
  tweetButton.render();
  $('#score').text(score);
  $('#tada').show();
}

function render() {
  renderer.render();

  ctx.fillText(score, 25, HEIGHT - 25);
  ctx.fillText("World: " + world.tag, 75, HEIGHT - 25);

  if (!STARTED) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4);';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = 'rgba(0, 0, 0, 1);';
    ctx.font = "26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Spacebar / Touch to Start", WIDTH / 2, HEIGHT / 5);
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("R for new world" , WIDTH / 2, (HEIGHT / 5) + 25);
    ctx.restore();
  }
}

function physics() {
  player.updatePhysics();
  score += Math.round(player.v / 100);
  for (x = player.x - 10; x < player.x + 10; x++) {
    if (player.y > world.height(x) - 20)
    {
      if (world.coins[Math.round(x)] == C_COIN) {
        score += 100;
        world.coins[Math.round(x)] = C_NONE;
        playCoinSound();
      } else if (world.coins[Math.round(x)] == C_BOOSTER) {
        score += 100;
        world.coins[Math.round(x)] = C_NONE;
        player.v += 300;
        playCoinSound();
      }
    }
  }
  if (player.x > world.endpoint) {
    finish();
  }
}

function playCoinSound() {
  var i = Math.round((player.v / 1500) * 10);
  if (i < 0)
    i = 0;
  if (i > 8)
    i = 8;
  var sound = new Audio(sounds[i].src);
  sound.play();
}

$(document).ready(function() {
  init();
});
