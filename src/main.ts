import "./style.css";

const leftKeys = ["ArrowLeft", "h"];
const downKeys = ["ArrowDown", "j"];
const upKeys = ["ArrowUp", "k"];
const rightKeys = ["ArrowRight", "l"];
const moveKeys = [...leftKeys, ...downKeys, ...upKeys, ...rightKeys];
const shootKeys = [" ", "Enter", "0"];
const sounds = new Map<string, any>()
const laserShoot2 = sfxr.toAudio('9BbhBjsLbFTwNjJD9ThUzKTqFCFUwaUMdwobSWj2HGfkqVjEJP6sVUr8TNvCnNWRtReebPpxZfMySaeL9wBr89Wuv9RP6K1zyUtUctif5HB1ZsHoghr7Ax9Bs')

function playSound(preset: string) {
  let sound = sounds.get(preset)
  if (!sound) {
    sound = sfxr.generate(preset)
    sounds.set(preset, sound)
  }
  sfxr.play(sound)
}

class InputHandler {
  game: Game;
  constructor(game: Game) {
    this.game = game;
    window.addEventListener("keydown", (e) => {
      if (moveKeys.includes(e.key) || shootKeys.includes(e.key)) this.game.keys.add(e.key as any);
      else if (e.key === "d") this.game.debug = !this.game.debug;
    });
    window.addEventListener("keyup", (e) => {
      if (this.game.keys.has(e.key as any)) {
        this.game.keys.delete(e.key as any);
      }
    });
  }
}

class Projectile {
  game: Game;
  x: number;
  y: number;
  image: HTMLImageElement;
  width = 10;
  height = 3;
  xMax: number;
  speed = 3;
  markedForDeletion = false;

  constructor(game: Game, { x, y }: { x: number; y: number }) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.image = getImage("projectile");
    this.xMax = Math.min(game.width * 0.95, game.width * 0.7 + x)
  }

  update(_deltaTime: number) {
    this.x += this.speed;
    if (this.x > this.xMax) this.markedForDeletion = true;
  }

  draw(context: CanvasRenderingContext2D) {
    if (this.game.debug)
      context.strokeRect(this.x, this.y, this.width, this.height);
    context.drawImage(this.image, this.x, this.y);
  }
}

class Particle {
  game: Game;
  x: number;
  y: number;
  image: HTMLImageElement;
  frameX: number;
  frameY: number;
  spriteSize = 50;
  sizeModifier: number;
  size: number;
  speedX: number;
  speedY: number;
  gravity = 0.5;
  markedForDeletion = false;
  angle = 0;
  va: number;
  bounced = 0;
  bottomBounceBoundary = Math.random() * 80 + 60;

  constructor(game: Game, x: number, y: number) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.image = getImage("gears");
    this.frameX = Math.floor(Math.random() * 3);
    this.frameY = Math.floor(Math.random() * 3);
    this.sizeModifier = Number((Math.random() * 0.5 + 0.5).toFixed(1));
    this.size = this.spriteSize * this.sizeModifier;
    this.speedX = Math.random() * 6 - 3;
    this.speedY = Math.random() * -15;
    this.va = Math.random() * 0.2 - 0.1;
  }

  update() {
    this.angle += this.va;
    this.speedY += this.gravity;
    this.x -= this.speedX + this.game.speed;
    this.y += this.speedY;
    if (this.y > this.game.height + this.size || this.x < 0 - this.size)
      this.markedForDeletion = true;
    if (
      this.y > this.game.height - this.bottomBounceBoundary &&
      this.bounced < 2
    ) {
      this.bounced++;
      this.speedY *= -0.7;
    }
  }

  draw(context: CanvasRenderingContext2D) {
    context.save();
    context.translate(this.x, this.y);
    context.rotate(this.angle);
    context.drawImage(
      this.image,
      this.frameX * this.spriteSize,
      this.frameY * this.spriteSize,
      this.spriteSize,
      this.spriteSize,
      0,
      0,
      this.size,
      this.size
    );
    context.restore();
  }
}

class Player {
  game: Game;
  image: HTMLImageElement;
  width = 120;
  height = 190;
  x = 20;
  y = 100;
  frameX = 0;
  frameY = 0;
  maxFrame = 37;
  speedX = 0;
  speedY = 0;
  maxSpeed = 2;
  projectiles = new Set<Projectile>();
  powerUp = false;
  powerUpTimer = 0;
  powerUpLimit = 10000;
  shootTimer = 0
  shootInterval = 100

  constructor(game: Game) {
    this.game = game;
    this.image = getImage("player");
  }

  update(deltaTime: number) {
    if (leftKeys.some((k) => this.game.keys.has(k)))
      this.speedX = -this.maxSpeed;
    else if (rightKeys.some((k) => this.game.keys.has(k)))
      this.speedX = this.maxSpeed;
    else this.speedX = 0;

    if (this.shootTimer < this.shootInterval) this.shootTimer += deltaTime;
    else if (shootKeys.some((k) => this.game.keys.has(k))) {
      this.shootTop();
      this.shootTimer = 0
    }

    // horizontal movement within boundaries
    const xmin = 20;
    const xmax = this.game.width * 0.5 - this.width * 0.5;
    this.x = Math.max(xmin, Math.min(xmax, this.x + this.speedX));

    if (upKeys.some((k) => this.game.keys.has(k))) this.speedY = -this.maxSpeed;
    else if (downKeys.some((k) => this.game.keys.has(k)))
      this.speedY = this.maxSpeed;
    else this.speedY = 0;

    // vertical movement within boundaries
    const ymin = -this.height * 0.5;
    const ymax = this.game.height - this.height * 0.5;
    this.y = Math.max(ymin, Math.min(ymax, this.y + this.speedY));

    // handle projectiles
    for (const projectile of this.projectiles) {
      projectile.update(deltaTime);
    }

    // sprite animation
    if (this.frameX < this.maxFrame) this.frameX++;
    else this.frameX = 0;

    // power up
    if (this.powerUp)
      if (this.powerUpTimer > this.powerUpLimit) {
        this.powerUpTimer = 0;
        this.powerUp = false;
        this.frameY = 0;
      } else {
        this.powerUpTimer += deltaTime;
        this.frameY = 1;
        if (!this.game.gameOver) this.game.ammo += 0.1;
      }
  }

  draw(context: CanvasRenderingContext2D) {
    if (this.game.debug)
      context.strokeRect(this.x, this.y, this.width, this.height);
    context.drawImage(
      this.image,
      this.frameX * this.width,
      this.frameY * this.height,
      this.width,
      this.height,
      this.x,
      this.y,
      this.width,
      this.height
    );
    for (const projectile of this.projectiles) {
      projectile.draw(context);
    }
  }

  shootTop() {
    playSound('laserShoot')
    if (this.game.ammo > 0) {
      this.projectiles.add(
        new Projectile(this.game, { x: this.x + 80, y: this.y + 30 })
      );
      this.game.ammo--;
    }
    if (this.powerUp) this.shootBottom();
  }

  shootBottom() {
    if (this.game.ammo > 0) {
      this.projectiles.add(
        new Projectile(this.game, { x: this.x + 80, y: this.y + 175 })
      );
    }
  }

  enterPowerUp() {
    playSound('powerUp')
    this.powerUpTimer = 0;
    this.powerUp = true;
    if (this.game.ammo < this.game.maxAmmo) this.game.ammo = this.game.maxAmmo;
  }

  takeDamage() {
    playSound('explosion')
    this.game.score--;
  }
}

class Enemy {
  game: Game;
  x = 100;
  y = 100;
  speedX: number;
  width: number;
  height: number;
  markedForDeletion = false;
  lives = 5;
  score: number;
  image: HTMLImageElement;
  frameX = 0;
  frameY = 0;
  maxFrame = 37;
  type = "";

  constructor(game: Game, image: HTMLImageElement) {
    this.game = game;
    this.image = image;
    this.x = game.width;
    this.speedX = Math.random() * -1.5 - 0.5;
    this.width = 50;
    this.height = 50;
    this.score = this.lives;
  }

  update() {
    this.x += this.speedX;

    if (this.x + this.width < 0) this.markedForDeletion = true;
    // sprie animation
    if (this.frameX < this.maxFrame) this.frameX++;
    else this.frameX = 0;
  }

  draw(context: CanvasRenderingContext2D) {
    if (this.game.debug) {
      context.strokeRect(this.x, this.y, this.width, this.height);
    }
    context.drawImage(
      this.image,
      this.frameX * this.width,
      this.frameY * this.height,
      this.width,
      this.height,
      this.x,
      this.y,
      this.width,
      this.height
    );
    if (this.game.debug) {
      context.font = `20px Helvetica`;
      context.fillText(`${this.lives}`, this.x, this.y);
    }
  }
}

class Angler1 extends Enemy {
  frameY: number;
  lives = 5;
  width = 228;
  height = 169;

  constructor(game: Game) {
    super(game, getImage("angler1"));
    this.y = Math.random() * (this.game.height * 0.95 - this.height);
    this.frameY = Math.floor(Math.random() * 3);
    this.score = this.lives;
  }
}

class Angler2 extends Enemy {
  frameY: number;
  lives = 6;
  width = 213;
  height = 165;

  constructor(game: Game) {
    super(game, getImage("angler2"));
    this.y = Math.random() * (this.game.height * 0.95 - this.height);
    this.frameY = Math.floor(Math.random() * 2);
    this.score = this.lives;
  }
}

class LuckyFish extends Enemy {
  frameY: number;
  lives = 5;
  type = "lucky";
  width = 99;
  height = 95;
  score = 15;

  constructor(game: Game) {
    super(game, getImage("lucky"));
    this.y = Math.random() * (this.game.height * 0.95 - this.height);
    this.frameY = Math.floor(Math.random() * 2);
  }
}

class HiveWhale extends Enemy {
  frameY = 0;
  lives = 20;
  type = "hive";
  width = 400;
  height = 227;

  constructor(game: Game) {
    super(game, getImage("hivewhale"));
    this.y = Math.random() * (this.game.height * 0.95 - this.height);
    this.score = this.lives;
    this.speedX = Math.random() * -1.2 - 0.2;
  }
}

class Drone extends Enemy {
  frameY: number;
  lives = 3;
  type = "drone";
  width = 115;
  height = 95;

  constructor(game: Game, x: number, y: number) {
    super(game, getImage("drone"));
    this.x = x;
    this.y = y;
    this.frameY = Math.floor(Math.random() * 2);
    this.score = this.lives;
    this.speedX = Math.random() * -4.2 - 0.5;
  }
}

class Layer {
  game: Game;
  image: HTMLImageElement;
  speedModifier: number;
  width = 1768;
  height = 500;
  x = 0;
  y = 0;

  constructor(game: Game, image: HTMLImageElement, speedModifier: number) {
    this.game = game;
    this.image = image;
    this.speedModifier = speedModifier;
  }

  update(_deltaTime: number) {
    if (this.x <= -this.width) this.x = 0;
    this.x -= this.game.speed * this.speedModifier;
  }

  draw(context: CanvasRenderingContext2D) {
    context.drawImage(this.image, this.x, this.y);
    context.drawImage(this.image, this.x + this.width, this.y);
  }
}

class Background {
  game: Game;
  layer1: Layer;
  layer2: Layer;
  layer3: Layer;
  layer4: Layer;
  layers: Layer[] = [];

  constructor(game: Game) {
    this.game = game;
    this.layer1 = new Layer(this.game, getImage("layer1"), 0.5);
    this.layer2 = new Layer(this.game, getImage("layer2"), 0.8);
    this.layer3 = new Layer(this.game, getImage("layer3"), 1.2);
    this.layer4 = new Layer(this.game, getImage("layer4"), 1.5);
    this.layers.push(this.layer1, this.layer2, this.layer3, this.layer4);
  }

  update(deltaTime: number) {
    for (const layer of this.layers) {
      layer.update(deltaTime);
    }
  }

  draw(context: CanvasRenderingContext2D) {
    for (const layer of this.layers) {
      layer.draw(context);
    }
  }
}

abstract class Explosion {
  game: Game;
  x: number;
  y: number;
  image: HTMLImageElement;

  frameX = 0;
  width = 200;
  height = 200;
  fps = 30;
  timer = 0;
  interval: number;
  markedForDeletion = false;
  maxFrame = 8;

  constructor(game: Game, x: number, y: number, image: HTMLImageElement) {
    this.game = game;
    this.x = x - this.width * 0.5;
    this.y = y - this.height * 0.5;
    this.image = image;
    this.interval = 1000 / this.fps;
  }

  update(deltaTime: number) {
    this.x -= this.game.speed;
    if (this.timer > this.interval) {
      this.frameX++;
      this.timer = 0;
    } else this.timer += deltaTime;
    if (this.frameX > this.maxFrame) this.markedForDeletion = true;
  }

  draw(context: CanvasRenderingContext2D) {
    context.drawImage(
      this.image,
      this.frameX * this.width,
      0,
      this.width,
      this.height,
      this.x,
      this.y,
      this.width,
      this.height
    );
  }
}

class SmokeExplosion extends Explosion {
  constructor(game: Game, x: number, y: number) {
    super(game, x, y, getImage("smokeExplosion"));
  }
}

class FireExplosion extends Explosion {
  constructor(game: Game, x: number, y: number) {
    super(game, x, y, getImage("fireExplosion"));
  }
}

class UI {
  game: Game;
  fontSize = 25;
  fontFamily = "Bangers, cursive";
  color = "white";

  constructor(game: Game) {
    this.game = game;
  }

  draw(context: CanvasRenderingContext2D) {
    context.save();
    context.fillStyle = this.color;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 1;
    context.shadowColor = "black";
    context.font = `${this.fontSize}px ${this.fontFamily}`;

    // score
    context.fillText(`Score: ${this.game.score}`, 20, 40);

    // timer
    const formattedTime = (this.game.gameTime * 0.001).toFixed(1);
    context.fillText(`Timer: ${formattedTime}`, 20, 100);

    // game over messages
    let message1;
    let message2;
    if (this.game.gameOver) {
      if (this.game.score > this.game.winningScore) {
        context.textAlign = "center";
        message1 = "Most Wondrous!";
        message2 = "Well done explorer!";
      } else {
        message1 = "Blazes!";
        message2 = "Get my repair kit and try again!";
      }

      context.textAlign = "center";
      context.font = `70px ${this.fontFamily}`;
      context.fillText(
        message1,
        this.game.width * 0.5,
        this.game.height * 0.5 - 20
      );
      context.font = `25px ${this.fontFamily}`;
      context.fillText(
        message2,
        this.game.width * 0.5,
        this.game.height * 0.5 + 20
      );
    }

    // ammo
    if (this.game.player.powerUp) context.fillStyle = "#ffffbd";
    for (let i = 0; i < this.game.ammo; i++) {
      context.fillRect(20 + 5 * i, 50, 3, 20);
    }

    context.restore();
  }
}

class Game {
  debug = false;
  width: number;
  height: number;
  player: Player;
  background: Background;
  input: InputHandler;
  ui: UI;
  keys = new Set<string>();
  particles = new Set<Particle>();
  explosions = new Set<Explosion>();

  enemies = new Set<Enemy>();
  enemyTimer = 0;
  enemyInterval = 2000;

  ammo = 20;
  maxAmmo = 50;
  ammoTimer = 0;
  ammoInterval = 350;

  speed = 1;
  gameOver = false;
  gameOverTime = 0
  gameTime = 0;
  timeLimit = 30000;
  score = 0;
  winningScore = 80;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.background = new Background(this);
    this.player = new Player(this);
    this.input = new InputHandler(this);
    this.ui = new UI(this);
  }

  update(deltaTime: number) {
    if (!this.gameOver) {
      this.gameTime += deltaTime;
      if (this.gameTime > this.timeLimit && this.score < this.winningScore) {
        this.gameOver = true;
        this.gameOverTime = Date.now()
      }
    }

    this.background.update(deltaTime);
    this.player.update(deltaTime);

    if (this.ammoTimer > this.ammoInterval) {
      if (this.ammo < this.maxAmmo) this.ammo++;
      this.ammoTimer = 0;
    } else {
      this.ammoTimer += deltaTime;
    }
    for (const particle of this.particles) {
      particle.update();
      if (particle.markedForDeletion) {
        this.particles.delete(particle);
      }
    }
    for (const explosion of this.explosions) {
      explosion.update(deltaTime);
      if (explosion.markedForDeletion) {
        this.explosions.delete(explosion);
      }
    }
    for (const enemy of this.enemies) {
      enemy.update();
      if (this.checkCollision(this.player, enemy)) {
        enemy.markedForDeletion = true;
        this.addExplosion(enemy);
        for (let i = 0; i < enemy.lives; i++) {
          this.particles.add(
            new Particle(
              this,
              enemy.x + enemy.width * 0.5,
              enemy.y + enemy.height * 0.5
            )
          );
        }
        if (enemy.type === "lucky") this.player.enterPowerUp();
        else if (!this.gameOver) this.player.takeDamage()
      }
      for (const projectile of this.player.projectiles) {
        if (this.checkCollision(projectile, enemy)) {
          enemy.lives--;
          projectile.markedForDeletion = true;
          this.particles.add(
            new Particle(
              this,
              enemy.x + enemy.width * 0.5,
              enemy.y + enemy.height * 0.5
            )
          );
          if (enemy.lives <= 0) {
            for (let i = 0; i < enemy.lives; i++) {
              this.particles.add(
                new Particle(
                  this,
                  enemy.x + enemy.width * 0.5,
                  enemy.y + enemy.height * 0.5
                )
              );
            }
            enemy.markedForDeletion = true;
            this.addExplosion(enemy);
            laserShoot2.play()
            if (enemy.type === "hive") {
              for (let i = 0; i < 5; i++) {
                this.enemies.add(
                  new Drone(
                    this,
                    enemy.x + Math.random() * enemy.width,
                    enemy.y + Math.random() * enemy.height * 0.5
                  )
                );
              }
            }
            if (!this.gameOver) this.score += enemy.score;
            // if (this.score > this.winningScore) this.gameOver = true;
          }
        }
        if (projectile.markedForDeletion) {
          this.player.projectiles.delete(projectile);
        }
      }
      if (enemy.markedForDeletion) {
        this.enemies.delete(enemy);
      }
    }
    const interval = this.enemyInterval / (Math.max(1, Math.min(200, this.score)) ** (1 / 3))
    if (this.enemyTimer > interval && !this.gameOver) {
      this.addEnemy();
      this.enemyTimer = 0;
    } else {
      this.enemyTimer += deltaTime;
    }
  }

  draw(context: CanvasRenderingContext2D) {
    this.background.draw(context);
    if (!this.gameOver) this.ui.draw(context);
    this.player.draw(context);
    for (const particle of this.particles) {
      particle.draw(context);
    }
    for (const enemy of this.enemies) {
      enemy.draw(context);
    }
    for (const explosion of this.explosions) {
      explosion.draw(context);
    }
    this.background.layer4.draw(context);
    if (this.gameOver) this.ui.draw(context);
  }

  addEnemy() {
    const rand = Math.random();
    if (rand < 0.3) this.enemies.add(new Angler1(this));
    else if (rand < 0.6) this.enemies.add(new Angler2(this));
    else if (rand < 0.7) this.enemies.add(new HiveWhale(this));
    else this.enemies.add(new LuckyFish(this));
  }

  addExplosion(enemy: Enemy) {
    const rand = Math.random();
    if (rand < 0.5)
      this.explosions.add(
        new SmokeExplosion(
          this,
          enemy.x + enemy.width * 0.5,
          enemy.y + enemy.height * 0.5
        )
      );
    else
      this.explosions.add(
        new FireExplosion(
          this,
          enemy.x + enemy.width * 0.5,
          enemy.y + enemy.height * 0.5
        )
      );
  }

  checkCollision(
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number }
  ) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.height + rect1.y > rect2.y
    );
  }
}

addEventListener("load", () => {
  let canvas = document.querySelector("#canvas1")! as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  canvas.width = 1000;
  canvas.height = 500;

  let game: Game;
  function initGame() {
    game = new Game(canvas.width, canvas.height);
  }
  initGame();

  window.addEventListener("keydown", () => {
    if (game.gameOver && game.gameOverTime + 5000 < Date.now()) {
      initGame()
    }
  });

  let lastTime = 0;
  function animate(timeStamp: number) {
    const deltaTime = timeStamp - lastTime;
    lastTime = timeStamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    game.draw(ctx);
    game.update(deltaTime);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
});

addEventListener("error", (event) => {
  const el = document.createElement("div");
  el.innerHTML = `
  ${event.error.name}
  <br>
  ${event.error.message}
  <br/>
  ${event.error.trace}
  `;
  document.querySelector("#error")!.appendChild(el);
});

function getImage(id: string) {
  return document.getElementById(id)! as HTMLImageElement;
}

declare global {
  const sfxr: {
    generate(preset: string): any;
    play(sound: any): void
    toAudio(sound: any): HTMLAudioElement
  }
}
