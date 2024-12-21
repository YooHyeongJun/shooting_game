// 이미지 설정
const IMAGES = {
    player: 'player.png',    // 플레이어 이미지 경로
    enemy: 'enemy.png',      // 적 이미지 경로
    bullet: 'bullet.png',    // 총알 이미지 경로
    background: 'bg.png'     // 배경 이미지 경로
};

// 이미지 로드 함수
function loadImages(callback) {
    let loadedImages = 0;
    const imageObjects = {};
    const totalImages = Object.keys(IMAGES).length;

    Object.keys(IMAGES).forEach(key => {
        imageObjects[key] = new Image();
        imageObjects[key].onload = () => {
            loadedImages++;
            if (loadedImages === totalImages) {
                callback(imageObjects);
            }
        };
        imageObjects[key].src = IMAGES[key];
    });
}

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.images = null;
        this.isRunning = false;
        this.isPaused = false;

        // 플레이어 설정
        this.player = {
            x: canvas.width / 2,
            y: canvas.height - 50,
            size: 60,
            speed: 3,
            bullets: [],
            score: 0,
            isDead: false
        };

        // 게임 상태
        this.gameState = {
            startTime: 0,
            lastBulletTime: 0,
            bulletInterval: 500,
            initialBulletInterval: 500,
            keys: {},
            lastSpawnRateUpdate: 0,
            currentTime: 0
        };

        // 적 설정
        this.enemies = [];
        this.enemySpawnInterval = 1000;
        this.initialEnemySpawnInterval = 1000;
        this.lastEnemySpawn = 0;

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.isRunning && !this.isPaused) {
                if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                    e.preventDefault();
                }
                this.gameState.keys[e.key] = true;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (this.isRunning) {
                this.gameState.keys[e.key] = false;
            }
        });

        document.getElementById('start-button').addEventListener('click', () => {
            this.start();
        });

        document.getElementById('pause-button').addEventListener('click', () => {
            if (!this.isRunning && this.player.isDead) {
                this.restart();
            } else {
                this.togglePause();
            }
        });

        document.getElementById('save-button').addEventListener('click', () => {
            this.saveCanvas();
        });
    }

    start() {
        document.getElementById('start-screen').style.display = 'none';
        this.isRunning = true;
        this.gameState.startTime = Date.now();
        this.gameState.lastSpawnRateUpdate = Date.now();
        this.gameLoop();
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pause-button').textContent =
            this.isPaused ? '게임 재개' : '일시정지';
        if (!this.isPaused) {
            this.gameLoop();
        }
    }

    updateDifficulty(timestamp) {
        const currentSecond = Math.floor((timestamp - this.gameState.startTime) / 1000);
        if (currentSecond > Math.floor((this.gameState.lastSpawnRateUpdate - this.gameState.startTime) / 1000)) {
            this.enemySpawnInterval = Math.max(
                100,
                this.initialEnemySpawnInterval * Math.pow(0.8, currentSecond)
            );
            this.gameState.lastSpawnRateUpdate = timestamp;
        }
    }

    updateBulletInterval() {
        this.gameState.bulletInterval = Math.max(
            100,
            this.gameState.initialBulletInterval * Math.pow(0.97, this.player.score)
        );
    }

    movePlayer() {
        if (this.gameState.keys['ArrowLeft'] && this.player.x > this.player.size / 2) {
            this.player.x -= this.player.speed;
        }
        if (this.gameState.keys['ArrowRight'] && this.player.x < this.canvas.width - this.player.size / 2) {
            this.player.x += this.player.speed;
        }
        if (this.gameState.keys['ArrowUp'] && this.player.y > this.player.size / 2) {
            this.player.y -= this.player.speed;
        }
        if (this.gameState.keys['ArrowDown'] && this.player.y < this.canvas.height - this.player.size / 2) {
            this.player.y += this.player.speed;
        }
    }

    automaticShoot(timestamp) {
        if (timestamp - this.gameState.lastBulletTime > this.gameState.bulletInterval) {
            this.player.bullets.push({
                x: this.player.x,
                y: this.player.y,
                size: 8
            });
            this.gameState.lastBulletTime = timestamp;
        }
    }

    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.size &&
            obj1.x + (obj1.size || 4) > obj2.x &&
            obj1.y < obj2.y + obj2.size &&
            obj1.y + (obj1.size || 4) > obj2.y;
    }

    gameOver() {
        this.isRunning = false;
        document.getElementById('game-over').style.display = 'block';
        document.getElementById('final-score').textContent = this.player.score;
        document.getElementById('final-time').textContent = this.gameState.currentTime;
        document.getElementById('pause-button').textContent = '다시 시작';
        document.getElementById('save-button').style.display = 'block';
    }

    saveCanvas() {
        try {
            // 게임 캔버스의 스크린샷을 생성
            const dataUrl = this.canvas.toDataURL('image/png');

            // 게임 결과를 표시할 새로운 캔버스 생성
            const resultCanvas = document.createElement('canvas');
            resultCanvas.width = this.canvas.width;
            resultCanvas.height = this.canvas.height;
            const resultCtx = resultCanvas.getContext('2d');

            // 배경을 검은색으로 설정
            resultCtx.fillStyle = 'black';
            resultCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);

            // 게임 스크린샷 그리기
            const gameImage = new Image();
            gameImage.onload = () => {
                resultCtx.drawImage(gameImage, 0, 0);

                // 결과 텍스트 추가
                resultCtx.fillStyle = 'white';
                resultCtx.font = 'bold 30px Arial';
                resultCtx.textAlign = 'center';
                resultCtx.fillText(`최종 점수: ${this.player.score}점`, resultCanvas.width / 2, resultCanvas.height / 2 - 20);
                resultCtx.fillText(`플레이 시간: ${this.gameState.currentTime}초`, resultCanvas.width / 2, resultCanvas.height / 2 + 20);

                // 이미지 다운로드
                const downloadLink = document.createElement('a');
                downloadLink.href = resultCanvas.toDataURL('image/png');
                downloadLink.download = `shooting-game-result-${Date.now()}.png`;

                // 다운로드 링크를 body에 추가했다가 클릭 후 제거
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            };
            gameImage.src = dataUrl;

        } catch (error) {
            console.error('이미지 저장 중 오류 발생:', error);
            alert('이미지 저장에 실패했습니다. 로컬 환경에서 실행하는 경우 웹 서버를 통해 실행해주세요.');
        }
    }

    restart() {
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 50,
            size: 60,
            speed: 3,
            bullets: [],
            score: 0,
            isDead: false
        };
        this.enemies = [];
        this.isRunning = true;
        this.isPaused = false;
        this.gameState.startTime = Date.now();
        this.gameState.lastSpawnRateUpdate = Date.now();
        this.enemySpawnInterval = this.initialEnemySpawnInterval;
        document.getElementById('game-over').style.display = 'none';
        document.getElementById('pause-button').textContent = '일시정지';
        document.getElementById('save-button').style.display = 'none';
        this.gameLoop();
    }

    gameLoop(timestamp = 0) {
        if (!this.isRunning || this.isPaused) return;

        // 현재 시간 업데이트 수정
        const currentTime = Date.now();
        this.gameState.currentTime = Math.floor((currentTime - this.gameState.startTime) / 1000);
        document.getElementById('time').textContent = `시간: ${this.gameState.currentTime}초`;

        // 난이도 업데이트
        this.updateDifficulty(timestamp);

        // 플레이어 이동
        this.movePlayer();

        // 자동 발사
        this.automaticShoot(timestamp);

        // 총알 이동
        this.player.bullets.forEach(bullet => {
            bullet.y -= 5;
        });
        this.player.bullets = this.player.bullets.filter(bullet => bullet.y > 0);

        // 적 생성
        if (timestamp - this.lastEnemySpawn > this.enemySpawnInterval) {
            this.enemies.push({
                x: Math.random() * (this.canvas.width - 30),
                y: -30,
                size: 30
            });
            this.lastEnemySpawn = timestamp;
        }

        // 적 이동
        this.enemies.forEach(enemy => {
            enemy.y += 2;
        });
        this.enemies = this.enemies.filter(enemy => enemy.y < this.canvas.height);

        // 충돌 검사
        this.enemies.forEach((enemy, enemyIndex) => {
            // 플레이어와 적 충돌
            if (this.checkCollision(this.player, enemy)) {
                this.player.isDead = true;
                this.gameOver();
                return;
            }

            // 총알과 적 충돌
            this.player.bullets.forEach((bullet, bulletIndex) => {
                if (this.checkCollision(bullet, enemy)) {
                    this.enemies.splice(enemyIndex, 1);
                    this.player.bullets.splice(bulletIndex, 1);
                    this.player.score++;
                    document.getElementById('score').textContent = `점수: ${this.player.score}`;
                    this.updateBulletInterval();
                }
            });
        });

        // 화면 그리기
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 배경 이미지 그리기 추가
        if (this.images && this.images.background) {
            this.ctx.drawImage(
                this.images.background,
                0,
                0,
                this.canvas.width,
                this.canvas.height
            );
        } else {
            this.ctx.fillStyle = 'black';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // 플레이어 그리기
        if (this.images && this.images.player) {
            this.ctx.drawImage(
                this.images.player,
                this.player.x - this.player.size / 2,
                this.player.y - this.player.size / 2,
                this.player.size,
                this.player.size
            );
        } else {
            this.ctx.fillStyle = 'blue';
            this.ctx.fillRect(
                this.player.x - this.player.size / 2,
                this.player.y - this.player.size / 2,
                this.player.size,
                this.player.size
            );
        }

        // 총알 그리기
        this.ctx.fillStyle = 'yellow';
        this.player.bullets.forEach(bullet => {
            if (this.images && this.images.bullet) {
                this.ctx.drawImage(
                    this.images.bullet,
                    bullet.x - bullet.size / 2,
                    bullet.y - bullet.size / 2,
                    bullet.size,
                    bullet.size
                );
            } else {
                this.ctx.fillRect(bullet.x, bullet.y, 4, 4);
            }
        });

        // 적 그리기
        this.enemies.forEach(enemy => {
            if (this.images && this.images.enemy) {
                this.ctx.drawImage(
                    this.images.enemy,
                    enemy.x,
                    enemy.y,
                    enemy.size,
                    enemy.size
                );
            } else {
                this.ctx.fillStyle = 'red';
                this.ctx.fillRect(enemy.x, enemy.y, enemy.size, enemy.size);
            }
        });

        if (this.isRunning) {
            requestAnimationFrame(timestamp => this.gameLoop(timestamp));
        }
    }
}

// 게임 시작
window.onload = () => {
    const canvas = document.getElementById('gameCanvas');
    canvas.width = 800;
    canvas.height = 600;

    loadImages(images => {
        const game = new Game(canvas);
        game.images = images;
    });
};