const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const wavesEl = document.getElementById("wave");
const bombsCountEl = document.getElementById("bombs-count");
const missileFillEl = document.getElementById("missile-fill");
const missileTextEl = document.getElementById("missile-text");
const debugBadgeEl = document.getElementById("debug-badge");

const hudTopEl = document.getElementById("hud-top");
const hudBottomEl = document.getElementById("hud-bottom");
const startScreenEl = document.getElementById("start-screen");
const pauseScreenEl = document.getElementById("pause-screen");
const gameoverScreenEl = document.getElementById("gameover-screen");
const waveBannerEl = document.getElementById("wave-banner");
const bannerTitleEl = document.getElementById("banner-title");
const bannerRewardEl = document.getElementById("banner-reward");
const bannerSubEl = document.getElementById("banner-sub");

const pilotInputEl = document.getElementById("pilot-name");
const btnStartEl = document.getElementById("btn-start");
const btnResumeEl = document.getElementById("btn-resume");
const btnQuitEl = document.getElementById("btn-quit");
const btnRestartEl = document.getElementById("btn-restart");
const btnMenuEl = document.getElementById("btn-menu");
const btnMuteEl = document.getElementById("btn-mute");

// Ajusta o canvas para caber perfeitamente no container de 80vw x 100vh
function resizeCanvas() {
    const container = document.getElementById("game-container");
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ==========================================
// 1. CONFIGURAÇÃO DE SPRITES E ÁUDIO
// ==========================================
const SPRITE_PATHS = {
    player: "ally_ship.png",
    basic: "enemy1.png",
    fighter: "enemy3.png",
    bomber: "enemy5.png",
    boss: "boss.png",
    bullet: "player_bullet.png",
    enemyBullet: "player_bullet.png",
    missile: "missile.png",
    bossMissile: "missile.png"
};

const SOUND_PATHS = {
    shoot: "shoot.mp3",       
    missile: "missile.mp3",     
    damage: "damage.mp3",      
    bomb: "bomb.mp3",        
    start: "",       
    bgm: "bgm.mp3",         
    bossBgm: "boss.mp3",     
    gameOver: "gameover.mp3",   
    enemyShoot: "",
    bossMissile: ""
};

const SPRITES = {};
for (const [key, src] of Object.entries(SPRITE_PATHS)) {
    if (src) {
        const img = new Image();
        img.src = src;
        SPRITES[key] = img;
    }
}

// ==========================================
// 2. NUVENS EM PIXEL ART E FUNDO TOP GUN
// ==========================================
class PixelCloud {
    constructor(randomY = false) {
        this.reset(randomY);
    }

    reset(randomY = false) {
        this.pixelSize = Math.floor(Math.random() * 4) + 6; 
        this.speed = 35 + Math.random() * 45;
        this.x = Math.random() * (canvas.width + 100) - 50;
        this.y = randomY ? Math.random() * canvas.height : -80;
        this.alpha = 0.45 + Math.random() * 0.4;

        this.blocks = [
            { dx: 2, dy: 0, w: 6, h: 1 },
            { dx: 1, dy: 1, w: 9, h: 1 },
            { dx: 0, dy: 2, w: 12, h: 2 },
            { dx: 1, dy: 4, w: 10, h: 1 }
        ];
    }

    update(dt) {
        this.y += this.speed * dt;
        if (this.y > canvas.height + 60) {
            this.reset(false);
        }
    }

    draw() {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        const p = this.pixelSize;

        for (const b of this.blocks) {
            ctx.fillRect(
                Math.floor(this.x + b.dx * p),
                Math.floor(this.y + b.dy * p),
                b.w * p,
                b.h * p
            );
        }
        ctx.restore();
    }
}

const clouds = Array.from({ length: 12 }, () => new PixelCloud(true));

function drawBackground() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, "#0369a1");   
    skyGrad.addColorStop(0.55, "#0284c7"); 
    skyGrad.addColorStop(1, "#7dd3fc");    

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const c of clouds) {
        c.draw();
    }
}

// ==========================================
// 3. GERENCIADOR DE ÁUDIO BALANCEADO
// ==========================================
const SOUNDS = {};
let isMuted = false;
let currentMusic = null;

const SOUND_VOLUMES = {
    bgm: 0.75,         
    bossBgm: 0.75,     
    shoot: 0.20,       
    enemyShoot: 0.15,  
    missile: 0.28,     
    bossMissile: 0.25, 
    damage: 0.22,      
    bomb: 0.45,        
    start: 0.45,
    gameOver: 0.55
};

for (const [key, src] of Object.entries(SOUND_PATHS)) {
    if (src) {
        const audio = new Audio(src);
        if (key === "bgm" || key === "bossBgm") {
            audio.loop = true;
        }
        audio.volume = SOUND_VOLUMES[key] ?? 0.25;
        SOUNDS[key] = audio;
    }
}

function playSound(name, customVolume = null) {
    if (isMuted) return;

    let targetName = name;
    if (!SOUNDS[targetName]) {
        if (name === "enemyShoot" && SOUNDS.shoot) {
            targetName = "shoot";
            customVolume = SOUND_VOLUMES.enemyShoot;
        } else if (name === "bossMissile" && SOUNDS.missile) {
            targetName = "missile";
            customVolume = SOUND_VOLUMES.bossMissile;
        } else {
            return;
        }
    }

    const soundClone = SOUNDS[targetName].cloneNode();
    soundClone.volume = customVolume !== null ? customVolume : SOUNDS[targetName].volume;
    soundClone.play().catch(() => {});
}

function playMusic(trackName) {
    if (currentMusic === SOUNDS[trackName] && !currentMusic?.paused) return;
    stopMusic();
    if (isMuted || !SOUNDS[trackName]) return;
    
    currentMusic = SOUNDS[trackName];
    currentMusic.currentTime = 0;
    currentMusic.play().catch(() => {});
}

function stopMusic() {
    if (currentMusic) {
        currentMusic.pause();
        currentMusic.currentTime = 0;
        currentMusic = null;
    }
}

function toggleMute() {
    isMuted = !isMuted;
    btnMuteEl.textContent = isMuted ? "🔇 MUDO" : "🔊 SOM";
    if (isMuted) {
        if (currentMusic) currentMusic.pause();
    } else if (gameState === "PLAYING" && !pause) {
        playMusic(isBossWave ? "bossBgm" : "bgm");
    }
}

// ==========================================
// 4. SISTEMA DE RECORDES (LOCALSTORAGE)
// ==========================================
const STORAGE_KEY = "topgun_highscores_v1";

function getHighScores() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveHighScore(name, newScore, missionReached) {
    if (name.toUpperCase() === "DEBUG123") {
        return getHighScores();
    }

    const cleanName = (name.trim() || "MAVERICK").toUpperCase();
    const scores = getHighScores();
    
    const existingIndex = scores.findIndex(s => s.name === cleanName);
    if (existingIndex !== -1) {
        if (newScore > scores[existingIndex].score) {
            scores[existingIndex].score = newScore;
            scores[existingIndex].mission = missionReached;
        }
    } else {
        scores.push({ name: cleanName, score: newScore, mission: missionReached });
    }

    scores.sort((a, b) => b.score - a.score);
    const top5 = scores.slice(0, 5);
    
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(top5));
    } catch (e) {
        console.warn("Não foi possível salvar o recorde.", e);
    }
    return top5;
}

function renderHighScores(listElementId) {
    const listEl = document.getElementById(listElementId);
    if (!listEl) return;
    const scores = getHighScores();

    if (scores.length === 0) {
        listEl.innerHTML = "<li>Nenhum registro de voo ainda.</li>";
        return;
    }

    listEl.innerHTML = scores.map((entry, idx) => `
        <li class="${idx === 0 ? 'top-1' : ''}">
            ${idx + 1}. ${entry.name} — ${entry.score} pts (Missão ${entry.mission})
        </li>
    `).join("");
}

// ==========================================
// 5. CONTROLES E EVENTOS DOS MENUS HTML
// ==========================================
const KEYS = {};
let gameState = "START"; 
let playerName = "";
let scoreSaved = false;
let isDebugMode = false;

btnStartEl.addEventListener("click", () => {
    playerName = pilotInputEl.value;
    startGame();
});

pilotInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        playerName = pilotInputEl.value;
        startGame();
    }
});

btnResumeEl.addEventListener("click", () => {
    togglePause();
});

btnQuitEl.addEventListener("click", () => {
    pause = false;
    stopMusic();
    showScreen("START");
});

btnRestartEl.addEventListener("click", () => {
    startGame();
});

btnMenuEl.addEventListener("click", () => {
    stopMusic();
    showScreen("START");
});

btnMuteEl.addEventListener("click", () => {
    toggleMute();
});

function showScreen(screen) {
    gameState = screen;
    startScreenEl.classList.add("hidden");
    pauseScreenEl.classList.add("hidden");
    gameoverScreenEl.classList.add("hidden");
    hudTopEl.classList.add("hidden");
    hudBottomEl.classList.add("hidden");
    waveBannerEl.classList.add("hidden");

    if (screen === "START") {
        renderHighScores("start-highscores");
        startScreenEl.classList.remove("hidden");
        pilotInputEl.focus();
    } else if (screen === "PLAYING") {
        hudTopEl.classList.remove("hidden");
        hudBottomEl.classList.remove("hidden");
    } else if (screen === "GAMEOVER") {
        renderHighScores("gameover-highscores");
        gameoverScreenEl.classList.remove("hidden");
    }
}

function togglePause() {
    if (gameState !== "PLAYING" || waitingForNextMission) return;
    pause = !pause;
    if (pause) {
        pauseScreenEl.classList.remove("hidden");
        if (currentMusic) currentMusic.pause();
    } else {
        pauseScreenEl.classList.add("hidden");
        if (currentMusic && !isMuted) currentMusic.play().catch(() => {});
    }
}

window.addEventListener("keydown", (e) => {
    if (gameState === "START") return;

    const key = e.key.toLowerCase();

    if (["w", "a", "s", "d", " ", "shift", "b", "p", "m", "r"].includes(key)) {
        KEYS[key] = true;
    }

    if ([" ", "w", "a", "s", "d", "shift"].includes(key)) {
        e.preventDefault();
    }

    if (gameState === "PLAYING") {
        if (key === "p") {
            togglePause();
        }
        if (key === "m") {
            toggleMute();
        }
        if (key === "b" && !pause && !waitingForNextMission && player && player.bombs > 0) {
            useBomb();
        }
    } else if (gameState === "GAMEOVER") {
        if (key === "r") startGame();
        if (key === "m") {
            stopMusic();
            showScreen("START");
        }
    }
});

window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    KEYS[key] = false;
});

function aabb(a, b) {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + b.h > b.y;
}

// ==========================================
// 6. ENTIDADES DO JOGO
// ==========================================
class Player {
    constructor() {
        this.w = 42;
        this.h = 42;
        this.x = canvas.width / 2 - this.w / 2;
        this.y = canvas.height - 110;
        this.speed = 320;
        this.cooldown = 0;
        this.missileCooldown = 0;

        this.baseShootCooldown = 0.22;
        this.baseMissileCooldown = 2.0;

        this.extraCannons = false;
        this.doubleMissiles = false;
        this.bombs = 0;
    }

    update(dt) {
        const left = KEYS["a"];
        const right = KEYS["d"];
        const up = KEYS["w"];
        const down = KEYS["s"];

        if (left) this.x -= this.speed * dt;
        if (right) this.x += this.speed * dt;
        if (up) this.y -= this.speed * dt;
        if (down) this.y += this.speed * dt;

        this.x = Math.max(12, Math.min(canvas.width - this.w - 12, this.x));
        this.y = Math.max(60, Math.min(canvas.height - this.h - 60, this.y));

        this.cooldown = Math.max(0, this.cooldown - dt);
        this.missileCooldown = Math.max(0, this.missileCooldown - dt);

        const shoot = KEYS[" "];
        if (shoot && this.cooldown === 0) {
            if (this.extraCannons) {
                bullets.push(new Bullet(this.x + 4, this.y - 4, -480, 0, false, false, false, 6, 14));
                bullets.push(new Bullet(this.x + this.w - 10, this.y - 4, -480, 0, false, false, false, 6, 14));
            } else {
                bullets.push(new Bullet(this.x + this.w / 2 - 3, this.y - 8, -480, 0, false, false, false, 6, 14));
            }
            playSound("shoot");
            this.cooldown = this.baseShootCooldown;
        }

        const fireMissile = KEYS["shift"];
        if (fireMissile && this.missileCooldown === 0) {
            if (this.doubleMissiles) {
                bullets.push(new Bullet(this.x - 2, this.y - 8, -600, 0, false, true));
                bullets.push(new Bullet(this.x + this.w - 8, this.y - 8, -600, 0, false, true));
            } else {
                bullets.push(new Bullet(this.x + this.w / 2 - 5, this.y - 12, -600, 0, false, true));
            }
            playSound("missile");
            this.missileCooldown = this.baseMissileCooldown;
        }
    }

    draw() {
        const sprite = SPRITES.player;
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
        } else {
            ctx.fillStyle = "#334155";
            ctx.beginPath();
            ctx.moveTo(this.x + this.w / 2, this.y);
            ctx.lineTo(this.x + this.w, this.y + this.h);
            ctx.lineTo(this.x, this.y + this.h);
            ctx.closePath();
            ctx.fill();
        }
    }
}

class Bullet {
    constructor(x, y, speedY, speedX = 0, isEnemy = false, isMissile = false, isBossMissile = false, customW = null, customH = null) {
        this.x = x;
        this.y = y;
        this.isEnemy = isEnemy;
        this.isMissile = isMissile;
        this.isBossMissile = isBossMissile;
        this.speedY = speedY;
        this.speedX = speedX; 
        this.dead = false;

        if (isMissile || isBossMissile) {
            this.w = 10;
            this.h = 22;
            this.damage = isBossMissile ? 1 : 5;
        } else {
            this.w = customW !== null ? customW : 6;
            this.h = customH !== null ? customH : 14;
            this.damage = 1;
        }
    }

    update(dt) {
        this.y += this.speedY * dt;
        if (this.speedX) {
            this.x += this.speedX * dt;
        }

        if (this.y + this.h < 0 || this.y > canvas.height || this.x < -50 || this.x > canvas.width + 50) {
            this.dead = true;
        }
    }

    draw() {
        ctx.save();
        const angle = Math.atan2(this.speedY, this.speedX) + Math.PI / 2;
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.rotate(angle);

        if (this.isBossMissile) {
            const sprite = SPRITES.bossMissile;
            if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                ctx.drawImage(sprite, -this.w / 2, -this.h / 2, this.w, this.h);
            } else {
                ctx.fillStyle = "#dc2626";
                ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
            }
        } else if (this.isMissile) {
            const sprite = SPRITES.missile;
            if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                ctx.drawImage(sprite, -this.w / 2, -this.h / 2, this.w, this.h);
            } else {
                ctx.fillStyle = "#f97316";
                ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
            }
        } else if (this.isEnemy) {
            const sprite = SPRITES.enemyBullet;
            if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                ctx.drawImage(sprite, -this.w / 2, -this.h / 2, this.w, this.h);
            } else {
                ctx.fillStyle = "#ef4444";
                ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
            }
        } else {
            const sprite = SPRITES.bullet;
            if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                ctx.drawImage(sprite, -this.w / 2, -this.h / 2, this.w, this.h);
            } else {
                ctx.fillStyle = "#fde047";
                ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
            }
        }
        ctx.restore();
    }
}

class Enemy {
    constructor(x, y, speed) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.w = 32;
        this.h = 32;
        this.hp = 1;
        this.maxHp = 1;
        this.points = 15;
        this.type = "basic";
        this.dead = false;
    }

    update(dt) {
        this.y += this.speed * dt;
        if (this.y > canvas.height) {
            this.dead = true;
            triggerGameOver();
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        playSound("damage");
        if (this.hp <= 0) {
            this.dead = true;
            score += this.points;
        }
    }

    draw() {
        const sprite = SPRITES[this.type];
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
        } else {
            ctx.fillStyle = "#475569";
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }

        // Renderiza barra de vida e o número de HP acima do inimigo
        const barWidth = Math.max(this.w, 30);
        const barHeight = 4;
        const barX = this.x + (this.w - barWidth) / 2;
        
        ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
        ctx.fillRect(barX, this.y - 12, barWidth, barHeight);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(barX, this.y - 12, barWidth * Math.max(0, (this.hp / this.maxHp)), barHeight);

        ctx.fillStyle = "#ffffff";
        ctx.font = "9px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${this.hp}/${this.maxHp}`, this.x + this.w / 2, this.y - 15);
    }
}

class FighterEnemy extends Enemy {
    constructor(x, y, speed) {
        super(x, y, speed * 1.25);
        this.w = 36;
        this.h = 36;
        this.hp = 2;
        this.maxHp = 2;
        this.points = 30;
        this.type = "fighter";
        this.shootTimer = 1 + Math.random() * 1.5;
    }

    update(dt) {
        super.update(dt);
        if (gameState !== "PLAYING") return;
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.y > 0 && this.y < canvas.height - 120) {
            bullets.push(new Bullet(this.x + this.w / 2 - 3, this.y + this.h, 300, 0, true, false, false, 6, 14));
            playSound("enemyShoot");
            
            const reductionFactor = Math.max(0.4, 2.2 - (waves * 0.08));
            this.shootTimer = reductionFactor;
        }
    }
}

class BomberEnemy extends Enemy {
    constructor(x, y, speed) {
        super(x, y, speed * 0.6);
        this.w = 50;
        this.h = 46;
        this.hp = 5;
        this.maxHp = 5;
        this.points = 75;
        this.type = "bomber";
        this.missileTimer = 2.0 + Math.random() * 1.5;
    }

    update(dt) {
        super.update(dt);
        if (gameState !== "PLAYING") return;
        this.missileTimer -= dt;
        if (this.missileTimer <= 0 && this.y > 0 && this.y < canvas.height - 120) {
            bullets.push(new Bullet(this.x + this.w / 2 - 5, this.y + this.h, 240, 0, true, false, true));
            playSound("bossMissile");
            
            const missileReduction = Math.max(1.0, 3.5 - (waves * 0.1));
            this.missileTimer = missileReduction;
        }
    }
}

class BossEnemy {
    constructor(appearanceCount = 1) {
        this.w = 100;
        this.h = 78;
        this.x = canvas.width / 2 - this.w / 2;
        this.y = 65;
        this.vx = 130;
        this.appearanceCount = appearanceCount;
        
        const calculatedHp = 250 + (appearanceCount - 1) * 50;
        this.hp = calculatedHp;
        this.maxHp = calculatedHp;
        
        this.points = 1000;
        this.type = "boss";
        this.dead = false;
        
        this.spiralAngle = 0; 
        this.shootTimer = 1.0;
        this.missileTimer = 3.5;
        this.minionSpawnTimer = 4.5;
    }

    update(dt) {
        if (gameState !== "PLAYING") return;

        this.x += this.vx * dt;
        if (this.x <= 20) {
            this.x = 20;
            this.vx = Math.abs(this.vx);
        } else if (this.x + this.w >= canvas.width - 20) {
            this.x = canvas.width - this.w - 20;
            this.vx = -Math.abs(this.vx);
        }

        this.shootTimer -= dt;
        if (this.shootTimer <= 0) {
            this.fireSpiralPattern();
            playSound("enemyShoot");
            
            const bossFireRate = Math.max(0.4, 1.5 - (this.appearanceCount * 0.1));
            this.shootTimer = bossFireRate;
        }

        this.missileTimer -= dt;
        if (this.missileTimer <= 0) {
            bullets.push(new Bullet(this.x + this.w / 2 - 5, this.y + this.h, 240, 0, true, false, true));
            playSound("bossMissile");
            this.missileTimer = Math.max(2.0, 4.0 - (this.appearanceCount * 0.3));
        }

        if (this.appearanceCount >= 2) {
            this.minionSpawnTimer -= dt;
            if (this.minionSpawnTimer <= 0) {
                this.spawnMinion();
                this.minionSpawnTimer = 4.5;
            }
        }
    }

    fireSpiralPattern() {
        const arms = 4 + Math.min(6, this.appearanceCount * 2);
        const bulletSpeed = 220;
        const centerX = this.x + this.w / 2;
        const centerY = this.y + this.h / 2;

        for (let i = 0; i < arms; i++) {
            const angle = this.spiralAngle + (i * Math.PI * 2) / arms;
            const speedY = Math.sin(angle) * bulletSpeed;
            const speedX = Math.cos(angle) * bulletSpeed;
            bullets.push(new Bullet(centerX, centerY, speedY, speedX, true, false, false, 6, 14));
        }

        this.spiralAngle += 0.35;
    }

    spawnMinion() {
        const spawnX = this.x + this.w / 2 - 15;
        const spawnY = this.y + this.h;
        const baseSpeed = (80 + waves * 4);

        if (this.appearanceCount < 4) {
            enemies.push(new Enemy(spawnX, spawnY, baseSpeed));
        } else if (this.appearanceCount < 6) {
            if (Math.random() < 0.5) {
                enemies.push(new FighterEnemy(spawnX, spawnY, baseSpeed));
            } else {
                enemies.push(new Enemy(spawnX, spawnY, baseSpeed));
            }
        } else {
            const roll = Math.random();
            if (roll < 0.35) {
                enemies.push(new BomberEnemy(spawnX, spawnY, baseSpeed));
            } else if (roll < 0.70) {
                enemies.push(new FighterEnemy(spawnX, spawnY, baseSpeed));
            } else {
                enemies.push(new Enemy(spawnX, spawnY, baseSpeed));
            }
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        playSound("damage");
        if (this.hp <= 0) {
            this.dead = true;
            score += this.points;
            enemies.forEach(e => {
                if (!(e instanceof BossEnemy)) e.dead = true;
            });
        }
    }

    draw() {
        const sprite = SPRITES.boss;
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
        } else {
            ctx.fillStyle = "#991b1b";
            ctx.fillRect(this.x, this.y, this.w, this.h);
        }

        const barWidth = 220;
        const barHeight = 10;
        const barX = canvas.width / 2 - barWidth / 2;
        const barY = 58;

        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);

        ctx.fillStyle = "#334155";
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(barX, barY, barWidth * Math.max(0, this.hp / this.maxHp), barHeight);

        // Texto com número de HP do Chefe
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`CHEFE: ${this.hp} / ${this.maxHp} HP`, canvas.width / 2, barY - 5);
    }
}

let player = null;
let bullets = [];
let enemies = [];
let score = 0;
let lives = 3;
let waves = 1;
let last = 0;
let pause = false;
let enemiesToSpawn = 0;
let spawnTimer = 0;
let waitingForNextMission = false;
let waveTransitionTimer = 0;
let isBossWave = false;
let lastRewardMessage = "";
let bombFlashTimer = 0;

function startGame() {
    stopMusic();
    
    player = new Player();
    bullets = [];
    enemies = [];
    score = 0;
    waves = 1; 
    pause = false;
    waitingForNextMission = false;
    waveTransitionTimer = 0;
    scoreSaved = false;
    lastRewardMessage = "";
    bombFlashTimer = 0;
    last = 0;

    const cleanInput = playerName.trim().toUpperCase();
    if (cleanInput === "DEBUG123") {
        isDebugMode = true;
        lives = 10;
        waves = 9;
        player.extraCannons = true;
        player.doubleMissiles = true;
        player.bombs = 5;
        player.speed = 480;
        player.baseShootCooldown = 0.08;
        player.baseMissileCooldown = 0.6;
        debugBadgeEl.classList.remove("hidden");
    } else {
        isDebugMode = false;
        lives = 3;
        debugBadgeEl.classList.add("hidden");
    }
    
    showScreen("PLAYING");
    playSound("start");
    setupWave(waves);
    syncHud();
}

function triggerGameOver() {
    if (gameState === "GAMEOVER") return;
    stopMusic();
    playSound("gameOver");

    const finalMission = waitingForNextMission ? waves - 1 : waves;
    if (!scoreSaved) {
        saveHighScore(playerName, score, finalMission);
        scoreSaved = true;
    }

    document.getElementById("final-pilot").textContent = (playerName.trim() || "MAVERICK").toUpperCase();
    document.getElementById("final-score").textContent = score;
    showScreen("GAMEOVER");
}

function useBomb() {
    if (!player) return;
    player.bombs -= 1;
    bombFlashTimer = 0.25;
    playSound("bomb");

    bullets = bullets.filter(b => !b.isEnemy);

    enemies.forEach(e => {
        if (e instanceof BossEnemy) {
            e.takeDamage(100);
        } else {
            score += e.points;
            e.dead = true;
        }
    });
}

function grantMilestoneReward(completedMission) {
    if (completedMission % 5 === 0) {
        lives += 1;
        
        const options = ["CANNON", "MISSILE", "BOMB", "TURBINES", "RPM"];
        const chosen = options[Math.floor(Math.random() * options.length)];

        if (chosen === "CANNON") {
            player.extraCannons = true;
            lastRewardMessage = "+1 VIDA & CANHÃO DUPLO!";
        } else if (chosen === "MISSILE") {
            player.doubleMissiles = true;
            lastRewardMessage = "+1 VIDA & MÍSSEIS DUPLOS!";
        } else if (chosen === "BOMB") {
            player.bombs += 1;
            lastRewardMessage = "+1 VIDA & +1 BOMBA!";
        } else if (chosen === "TURBINES") {
            player.speed += 65;
            lastRewardMessage = "+1 VIDA & TURBINAS (+VELOCIDADE)!";
        } else if (chosen === "RPM") {
            player.baseShootCooldown = Math.max(0.08, player.baseShootCooldown * 0.72);
            player.baseMissileCooldown = Math.max(0.6, player.baseMissileCooldown * 0.72);
            lastRewardMessage = "+1 VIDA & MAIS RPM!";
        }
    } else {
        lastRewardMessage = "";
    }
}

function setupWave(waveNum) {
    isBossWave = (waveNum % 10 === 0);

    if (isBossWave) {
        enemiesToSpawn = 0;
        const bossAppearance = Math.floor(waveNum / 10);
        enemies.push(new BossEnemy(bossAppearance));
        playMusic("bossBgm");
    } else {
        enemiesToSpawn = 3 + waveNum * 3;
        spawnTimer = 0.5;
        playMusic("bgm");
    }
}

function handleWaveSystem(dt) {
    if (!enemies) enemies = [];

    if (waitingForNextMission) {
        waveTransitionTimer -= dt;
        
        waveBannerEl.classList.remove("hidden");
        bannerTitleEl.textContent = `MISSÃO ${waves - 1} CONCLUÍDA!`;
        bannerRewardEl.textContent = lastRewardMessage;
        bannerSubEl.textContent = `Próxima onda em ${Math.max(1, Math.ceil(waveTransitionTimer))}s...`;

        let alpha = 1.0;
        if (waveTransitionTimer > 2.5) {
            alpha = (3.0 - waveTransitionTimer) * 2.0;
        } else if (waveTransitionTimer < 0.8) {
            alpha = waveTransitionTimer / 0.8;
        }
        waveBannerEl.style.opacity = Math.max(0, Math.min(1, alpha));

        if (waveTransitionTimer <= 0) {
            waitingForNextMission = false;
            lastRewardMessage = "";
            waveBannerEl.classList.add("hidden");
            setupWave(waves);
        }
        return;
    }

    if (isBossWave) {
        const bossAlive = enemies.some(e => e instanceof BossEnemy && !e.dead);
        if (!bossAlive && !waitingForNextMission) {
            const completed = waves;
            waitingForNextMission = true;
            waveTransitionTimer = 3.0; 
            grantMilestoneReward(completed);
            waves += 1;
        }
    } else {
        if (enemiesToSpawn > 0) {
            spawnTimer -= dt;
            if (spawnTimer <= 0) {
                spawnSingleEnemy();
                enemiesToSpawn--;
                spawnTimer = Math.max(0.45, 1.25 - waves * 0.05);
            }
        } else if (enemies.length === 0 && !waitingForNextMission) {
            const completed = waves;
            waitingForNextMission = true;
            waveTransitionTimer = 3.0; 
            grantMilestoneReward(completed);
            waves += 1;
        }
    }
}

function spawnSingleEnemy() {
    if (!enemies) enemies = [];
    const x = 32 + Math.random() * (canvas.width - 84);
    const baseSpeed = (80 + Math.random() * 20) + (waves * 2);
    const roll = Math.random();

    if (waves >= 3 && roll < 0.25) {
        enemies.push(new BomberEnemy(x, -45, baseSpeed));
    } else if (waves >= 2 && roll < 0.55) {
        enemies.push(new FighterEnemy(x, -35, baseSpeed));
    } else {
        enemies.push(new Enemy(x, -30, baseSpeed));
    }
}

function update(dt) {
    for (const c of clouds) {
        c.update(dt);
    }

    if (gameState !== "PLAYING" || pause) return;

    handleWaveSystem(dt);

    if (waitingForNextMission) return; 

    if (bombFlashTimer > 0) {
        bombFlashTimer = Math.max(0, bombFlashTimer - dt);
    }

    if (player) player.update(dt);
    bullets.forEach((b) => b.update(dt));
    enemies.forEach((e) => e.update(dt));

    bullets.forEach((b) => {
        if (b.dead) return;

        if (!b.isEnemy) {
            enemies.forEach((e) => {
                if (!b.dead && !e.dead && aabb(b, e)) {
                    b.dead = true;
                    e.takeDamage(b.damage);
                }
            });
        } else {
            if (player && aabb(b, player)) {
                b.dead = true;
                damagePlayer();
            }
        }
    });

    enemies.forEach((e) => {
        if (!e.dead && !(e instanceof BossEnemy) && player && aabb(e, player)) {
            e.dead = true;
            damagePlayer();
        }
    });

    enemies = enemies.filter((e) => !e.dead);
    bullets = bullets.filter((b) => !b.dead);

    syncHud();
}

function damagePlayer() {
    lives -= 1;
    playSound("damage");
    if (lives <= 0) {
        lives = 0;
        triggerGameOver();
    }
}

function syncHud() {
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    wavesEl.textContent = waves - (waitingForNextMission ? 1 : 0);
    
    if (player) {
        bombsCountEl.textContent = player.bombs;
        
        if (player.missileCooldown > 0) {
            const pct = Math.max(0, Math.min(100, (1 - player.missileCooldown / player.baseMissileCooldown) * 100));
            missileFillEl.style.width = `${pct}%`;
            missileFillEl.style.background = "#f97316";
            missileTextEl.textContent = "RECARREGANDO";
            missileTextEl.style.color = "#f97316";
        } else {
            missileFillEl.style.width = "100%";
            missileFillEl.style.background = "#22c55e";
            missileTextEl.textContent = "PRONTO";
            missileTextEl.style.color = "#22c55e";
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    if (gameState !== "PLAYING") return;

    if (player) player.draw();
    if (enemies) enemies.forEach((e) => e.draw());
    if (bullets) bullets.forEach((b) => b.draw());

    if (bombFlashTimer > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${bombFlashTimer * 3})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function loop(ts) {
    if (!last) last = ts;
    const dt = Math.min(0.033, (ts - last) / 1000);
    last = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
}

showScreen("START");
requestAnimationFrame(loop);