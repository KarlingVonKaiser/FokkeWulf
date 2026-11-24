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
    player: "img/ally_ship.png",
    basic: "img/enemy1.png",
    fighter: "img/enemy3.png",
    bomber: "img/enemy5.png",
    boss: "img/boss.png",
    bullet: "img/player_bullet.png",
    enemyBullet: "img/player_bullet.png",
    missile: "img/missile.png",
    bossMissile: "img/missile.png"
};

const SOUND_PATHS = {
    shoot: "snd/shoot.mp3",       
    missile: "snd/missile.mp3",     
    damage: "snd/damage.mp3",      
    bomb: "snd/bomb.mp3",               
    bgm: "snd/bgm.mp3",         
    bossBgm: "snd/boss.mp3",     
    gameOver: "snd/gameover.mp3",   
    enemyShoot: "snd/shoot.mp3",
    bossMissile: "snd/missile.mp3"
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
// 3. GERENCIADOR DE ÁUDIO BLINDADO
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

// Efeitos sonoros em andamento (clones criados em playSound).
// Sem rastrear esses clones, sons como o de game over continuavam
// tocando depois de reiniciar a partida.
const activeClones = new Set();

// Para só as trilhas de música (bgm / boss), sem cortar efeitos sonoros
function stopMusicTracks() {
    for (const key of ["bgm", "bossBgm"]) {
        if (SOUNDS[key]) {
            SOUNDS[key].pause();
            SOUNDS[key].currentTime = 0;
        }
    }
    currentMusic = null;
}

// Para absolutamente TODOS os áudios: músicas e efeitos em andamento
function stopAllAudio() {
    for (const key in SOUNDS) {
        if (SOUNDS[key]) {
            SOUNDS[key].pause();
            SOUNDS[key].currentTime = 0;
        }
    }
    for (const clone of activeClones) {
        clone.pause();
        clone.currentTime = 0;
    }
    activeClones.clear();
    currentMusic = null;
}

function playSound(name, customVolume = null) {
    if (isMuted) return;

    if (!SOUNDS[name]) {
        if (name === "enemyShoot" && SOUNDS.shoot) {
            name = "shoot";
            customVolume = SOUND_VOLUMES.enemyShoot;
        } else if (name === "bossMissile" && SOUNDS.missile) {
            name = "missile";
            customVolume = SOUND_VOLUMES.bossMissile;
        } else {
            return;
        }
    }

    const soundClone = SOUNDS[name].cloneNode();
    soundClone.volume = customVolume !== null ? customVolume : SOUNDS[name].volume;

    const release = () => activeClones.delete(soundClone);
    activeClones.add(soundClone);
    soundClone.addEventListener("ended", release, { once: true });
    soundClone.play().catch(release);
}

function playMusic(trackName) {
    stopMusicTracks(); // Troca de trilha sem cortar os efeitos sonoros
    if (isMuted || !SOUNDS[trackName]) return;
    
    currentMusic = SOUNDS[trackName];
    currentMusic.currentTime = 0;
    currentMusic.play().catch(() => {});
}

function stopMusic() {
    stopAllAudio();
}

function toggleMute() {
    isMuted = !isMuted;
    btnMuteEl.textContent = isMuted ? "🔇 MUDO" : "🔊 SOM";
    if (isMuted) {
        stopAllAudio();
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
    stopAllAudio();
    showScreen("START");
});

btnRestartEl.addEventListener("click", () => {
    startGame();
});

btnMenuEl.addEventListener("click", () => {
    stopAllAudio();
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
            stopAllAudio();
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
           a.y + a.h > b.y;
}

// ==========================================
// 6. ENTIDADES DO JOGO
// ==========================================
// Tempo (em segundos) de imunidade depois de perder uma vida
const PLAYER_INVULN_TIME = 2.5;

// Quanto a caixa de colisão do caça é menor que o sprite, em pixels de cada lado.
// Com 7, a hitbox fica 28x28 dentro do sprite de 42x42 (aumente para facilitar, diminua para dificultar).
const PLAYER_HITBOX_INSET = 7;

class Player {
    constructor() {
        this.w = 42;
        this.h = 42;
        this.x = canvas.width / 2 - this.w / 2;
        this.y = canvas.height - 110;
        this.speed = 380;
        this.cooldown = 0;
        this.missileCooldown = 0;

        this.baseShootCooldown = 0.17;
        this.baseMissileCooldown = 2.0;

        this.extraCannons = false;
        this.doubleMissiles = false;
        this.bombs = 0;

        this.invulnTimer = 0; // > 0 = imune (sprite piscando)
    }

    isInvulnerable() {
        return this.invulnTimer > 0;
    }

    // Caixa de colisão (menor que o sprite, centralizada nele)
    getHitbox() {
        const i = PLAYER_HITBOX_INSET;
        return {
            x: this.x + i,
            y: this.y + i,
            w: this.w - i * 2,
            h: this.h - i * 2
        };
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
        ctx.save();

        // Enquanto está imune, alterna entre visível e quase transparente (~5 piscadas por segundo)
        if (this.isInvulnerable() && Math.floor(this.invulnTimer * 10) % 2 === 0) {
            ctx.globalAlpha = 0.25;
        }

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

        ctx.restore();
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

    // Caixa de colisão alinhada aos eixos que acompanha a rotação do sprite.
    // Sem isso, tiros em ângulo (como a espiral do chefe) usavam sempre a caixa "em pé".
    getHitbox() {
        const angle = Math.atan2(this.speedY, this.speedX) + Math.PI / 2;
        const c = Math.abs(Math.cos(angle));
        const s = Math.abs(Math.sin(angle));
        const w = this.w * c + this.h * s;
        const h = this.w * s + this.h * c;
        const cx = this.x + this.w / 2;
        const cy = this.y + this.h / 2;
        return { x: cx - w / 2, y: cy - h / 2, w, h };
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
        this.hp = 2;
        this.maxHp = 2;
        this.points = 15;
        this.type = "basic";
        this.dead = false;
    }

    update(dt) {
        this.y += this.speed * dt;
        if (this.y > canvas.height) {
            this.dead = true;
            loseLife(); // inimigo escapou: custa 1 vida (game over só quando as vidas acabam)
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        playSound("damage");
        if (this.hp <= 0) {
            this.dead = true;
            score += this.points;
            spawnExplosion(this.x + this.w / 2, this.y + this.h / 2, this.w);
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
        this.hp = 1;
        this.maxHp = 1;
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
        this.shootTimer = 0.8;
        this.missileTimer = 2.0;
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
            
            const bossFireRate = Math.max(0.3, 0.9 - (this.appearanceCount * 0.06));
            this.shootTimer = bossFireRate;
        }

        this.missileTimer -= dt;
        if (this.missileTimer <= 0) {
            bullets.push(new Bullet(this.x + this.w / 2 - 5, this.y + this.h, 240, 0, true, false, true));
            playSound("bossMissile");
            this.missileTimer = Math.max(1.2, 2.2 - (this.appearanceCount * 0.15));
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
            spawnBossExplosion(this);
            enemies.forEach(e => {
                if (!(e instanceof BossEnemy) && !e.dead) {
                    e.dead = true;
                    spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.w);
                }
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

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`CHEFE: ${this.hp} / ${this.maxHp} HP`, canvas.width / 2, barY - 5);
    }
}

// ==========================================
// EFEITO DE EXPLOSÃO (desenhado no canvas, sem sprites)
// ==========================================
class Explosion {
    constructor(x, y, size = 32, delay = 0) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.delay = delay; // atraso antes de começar (usado nas explosões do chefe)
        this.age = 0;
        this.duration = 0.6;
        this.dead = false;

        const colors = ["#fef08a", "#facc15", "#f97316", "#ef4444", "#7f1d1d"];
        const count = Math.round(10 + size / 3);
        this.particles = [];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (40 + Math.random() * 130) * (size / 32);
            this.particles.push({
                x: 0,
                y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                s: 3 + Math.floor(Math.random() * 4),
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    }

    update(dt) {
        if (this.delay > 0) {
            this.delay -= dt;
            return;
        }

        this.age += dt;
        const drag = Math.pow(0.02, dt);
        for (const p of this.particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= drag;
            p.vy *= drag;
        }

        if (this.age >= this.duration) this.dead = true;
    }

    draw() {
        if (this.delay > 0) return;

        const t = Math.min(1, this.age / this.duration);
        const fade = 1 - t;

        ctx.save();

        // Clarão central que cresce e some
        const radius = this.size * (0.5 + t * 0.8);
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius);
        grad.addColorStop(0, `rgba(255, 255, 230, ${fade})`);
        grad.addColorStop(0.45, `rgba(250, 204, 21, ${0.85 * fade})`);
        grad.addColorStop(1, "rgba(239, 68, 68, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Fagulhas quadradas (combinam com o estilo pixel art das nuvens)
        ctx.globalAlpha = fade;
        for (const p of this.particles) {
            const s = Math.max(1, Math.round(p.s * (1 - t * 0.5)));
            ctx.fillStyle = p.color;
            ctx.fillRect(Math.round(this.x + p.x - s / 2), Math.round(this.y + p.y - s / 2), s, s);
        }

        ctx.restore();
    }
}

function spawnExplosion(x, y, size = 32, delay = 0) {
    explosions.push(new Explosion(x, y, size, delay));
}

// Explosão grande no centro + várias menores espalhadas, em sequência
function spawnBossExplosion(boss) {
    const cx = boss.x + boss.w / 2;
    const cy = boss.y + boss.h / 2;

    spawnExplosion(cx, cy, boss.w * 1.4);
    for (let i = 1; i <= 6; i++) {
        spawnExplosion(
            cx + (Math.random() - 0.5) * boss.w,
            cy + (Math.random() - 0.5) * boss.h,
            36 + Math.random() * 24,
            i * 0.08
        );
    }
}

let player = null;
let bullets = [];
let enemies = [];
let explosions = [];
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
    stopAllAudio(); // Corta tudo antes de começar a partida
    
    player = new Player();
    bullets = [];
    enemies = [];
    explosions = [];
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
    
    // Mata qualquer som ou música imediatamente
    stopAllAudio();

    gameState = "GAMEOVER";
    
    // Dispara a música/som de Game Over de forma limpa
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
            spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.w);
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

    // Explosões e imunidade continuam rodando mesmo no intervalo entre as ondas
    explosions.forEach((ex) => ex.update(dt));
    explosions = explosions.filter((ex) => !ex.dead);
    if (player && player.invulnTimer > 0) {
        player.invulnTimer = Math.max(0, player.invulnTimer - dt);
    }

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
                if (!b.dead && !e.dead && aabb(b.getHitbox(), e)) {
                    b.dead = true;
                    e.takeDamage(b.damage);
                }
            });
        } else {
            if (player && !player.isInvulnerable() && aabb(b.getHitbox(), player.getHitbox())) {
                b.dead = true;
                damagePlayer();
            }
        }
    });

    enemies.forEach((e) => {
        if (!e.dead && !(e instanceof BossEnemy) && player && !player.isInvulnerable() && aabb(e, player.getHitbox())) {
            e.dead = true;
            spawnExplosion(e.x + e.w / 2, e.y + e.h / 2, e.w);
            damagePlayer();
        }
    });

    enemies = enemies.filter((e) => !e.dead);
    bullets = bullets.filter((b) => !b.dead);

    syncHud();
}

// Tira 1 vida e liga a imunidade temporária (sprite piscando).
// Usada por qualquer perda de vida, inclusive inimigo que escapou pela parte de baixo.
function loseLife() {
    if (gameState !== "PLAYING") return;
    lives -= 1;
    playSound("damage");
    if (lives <= 0) {
        lives = 0;
        triggerGameOver();
        return;
    }
    if (player) player.invulnTimer = PLAYER_INVULN_TIME;
}

// Dano por contato (tiro ou colisão): ignorado enquanto o jogador está imune
function damagePlayer() {
    if (player && player.isInvulnerable()) return;
    loseLife();
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
    if (explosions) explosions.forEach((ex) => ex.draw());
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