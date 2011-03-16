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
      for(var x = 0; x < LENGTH; x++)
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
      for(var i = 0, l = keypoints.length; i < l; i++)
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
        for(var x = keypoints[i]; x < keypoints[i + 1]; x++) {
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
      for (var x = world.endpoint; x < (world.endpoint + 10000); x++) {
        world.points[x] = world.points[world.endpoint - 1];
        world.section[x] = keypoints.length;
      }

      // generate coins
      for (var i = 0, l = keypoints.length; i < l; i++) {
        if (world.points[keypoints[i]] < world.points[keypoints[i + 1]])
        {
          if (world.rng.random() < COIN_PROBABILITY)
          {
            for (var x = keypoints[i] + 50; x < (keypoints[i + 2] - 50); x += 50)
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
      for(var x = startX; x < endX; x++) {
        var height = this.height(x);
        ctx.lineTo(x - camera.x, height - camera.y);
      }
      ctx.lineTo(WIDTH + 1, HEIGHT);
      ctx.closePath();
      ctx.stroke();

      for (var x = startX; x < endX; x++) {
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
      if (rpoint in this.points)
        return (HEIGHT - 50 - (AMPLITUDE / 2)) + (this.points[rpoint] * (AMPLITUDE / 2));
      else
        return HEIGHT;
    },

    angle: function(point) {
      return Math.atan(this.height(point + 1) - this.height(point));
    }
  }),

  Player: $.Class({
    init: function(world, x, y, dx, dy) {
      this.world = world;
      this.x = x;
      this.y = y;
      this.dx = dx;
      this.dy = dy;
      this.angle = 0;
      this.v = 0;
    },

    updatePhysics: function() {
      // gravity
      var ax = -0.5;
      var ay = gravity;

      // world collision
      if ((this.y + 10) > this.world.height(this.x)) {
        var newAngle = this.world.angle(this.x);
        var angleDiff = (this.angle - newAngle) * 0.75;
        this.v = this.v * Math.cos(angleDiff);
        this.angle = newAngle;

        this.dx = this.v * Math.cos(this.angle);
        this.dy = this.v * Math.sin(this.angle);

        this.y = this.world.height(this.x) - 10;
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

      for(var i = 0, l = this.children.length; i < l; i++) {
        this.children[i].draw(this.ctx, this.camera);
      }
    },

    clear: function() {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8);';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = 'rgba(0, 0, 0, 1);';
    }
  }),

  Game: $.Class({
    init: function(tag) {
      this.score = 0;
      this.started = false;
      this.world = new TinyWigs.WorldGenerator().generate(tag);
      this.player = new TinyWigs.Player(this.world, 50, 50, 30, -30);
      this.renderer = new TinyWigs.Renderer(ctx, this.player);
      this.renderer.children.push(this.world);
      this.renderer.children.push(this.player);
    },

    start: function() {
      this.started = true;
    },

    end: function() {
      this.started = false;
    },

    loop: function() {
      var start = new Date().getTime();
      this.render();
      if (this.started)
        this.physics();
      var end = new Date().getTime();
      setTimeout(function(obj) { obj.loop(); }, 16 - (end - start), this);
    },

    render: function() {
      this.renderer.render();

      ctx.fillText(this.score, 25, HEIGHT - 25);
      ctx.fillText("World: " + this.world.tag, 75, HEIGHT - 25);

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6);';
      ctx.font = "18px sans-serif";
      for(var i = osds.length - 1; i >= 0; i--)
      {
        if ((osds[i].x - this.renderer.camera.x) < -100)
        {
          osds.splice(i, 1);
        } else {
          osds[i].y -= 1;
          ctx.fillText(osds[i].text, osds[i].x - this.renderer.camera.x, osds[i].y);
        }
      }
      ctx.restore();

      if (!this.started) {
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
    },

    physics: function() {
      this.player.updatePhysics();
      this.score += Math.round(this.player.v / 100);
      for (var x = this.player.x - 10; x < this.player.x + 10; x++) {
        if (this.player.y > this.world.height(x) - 20)
        {
          if (this.world.coins[Math.round(x)] == C_COIN) {
            this.score += 100;
            this.world.coins[Math.round(x)] = C_NONE;
            playCoinSound();
          } else if (this.world.coins[Math.round(x)] == C_BOOSTER) {
            this.score += 100;
            this.world.coins[Math.round(x)] = C_NONE;
            this.player.v += 300;
            playCoinSound();
          }
        }
      }

      if (this.player.x > this.world.endpoint) {
        finish();
      }
    }
  })
};

var sounds;
var osds;
var game;

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
      if (!game.started)
      {
        startGame();
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
    if (!game.started)
    {
      startGame();
    }
    stopHeavy();
  });
  $('#retry-button').bind("click", function() {
    resetGame(game.world.tag);
    return false;
  });
  sounds = new Array();
  for (var i = 1; i <= 9; i++)
  {
    var sound = new Audio("sounds/chime0" + i + ".ogg");
    sounds.push(sound);
  }
  resetGame(WORLD_TAG);
}

var perfect = false;
var perfectSection = 0;

function goHeavy() {
  gravity = HIGH_GRAVITY;
  var curSection = game.world.section[Math.round(game.player.x)];
  if ((game.world.sectionBoundaries[curSection] - game.player.x < 200) || perfect) {
    if (Math.abs(game.player.y - game.world.height(game.player.x)) < 10) {
      // check a proper loop
      if (game.world.height(game.world.sectionBoundaries[curSection]) < game.world.height(game.world.sectionBoundaries[curSection + 1]) &&
          game.world.height(game.world.sectionBoundaries[curSection + 1]) > game.world.height(game.world.sectionBoundaries[curSection + 2]))
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
    if (perfectSection == game.world.section[Math.round(game.player.x)])
    {
      if ((game.player.x - game.world.sectionBoundaries[game.world.section[Math.round(game.player.x)] + 1]) < 50)
      {
        osds.push({
          x: game.player.x,
          y: game.player.y - 20,
          text: 'Perfect!'
        });
        game.score += 1000;
      }
    }
  }
  perfect = false;
  gravity = LOW_GRAVITY;
}

function resetGame(tag) {
  osds = new Array();
  $('#tada').hide();
  game = new TinyWigs.Game(tag);
  game.loop();
}

function startGame() {
  osds.push({
    x: game.player.x,
    y: game.player.y - 20,
    text: "Let's go!"
  });
  game.start();
}

function finish() {
  game.end();
  $('#tweet-cont').children().remove();
  var link = $( document.createElement('a') );
  link.attr("data-text", "I just scored " + game.score + " points on world " + game.world.tag + ".");
  link.attr("class", "twitter-share-button");
  link.attr("href", "http://twitter.com/share");
  link.attr("data-url", "http://bit.ly/fRgEdr");
  link.attr("data-count", "none");
  link.attr("data-via", "lucaspiller");
  link.append("Tweet This");
  $('#tweet-cont').append(link);
  var tweetButton = new twttr.TweetButton($(link).get(0));
  tweetButton.render();
  $('#score').text(game.score);
  $('#tada').show();
}

function playCoinSound() {
  var i = Math.round((game.player.v / 1500) * 10);
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
