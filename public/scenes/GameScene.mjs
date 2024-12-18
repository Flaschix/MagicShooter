import { CST } from "../CST.mjs";
import { AnimationControl } from "../share/AnimationControl.mjs";
import { createUIRight, decrypt } from "../share/UICreator.mjs";
import { createUITop } from "../share/UICreator.mjs";
import { createUIBottom } from "../share/UICreator.mjs";
import { createUI } from "../share/UICreator.mjs";
import { createExitMenu } from "../share/UICreator.mjs";
import { isMobile } from "../share/UICreator.mjs";
import { createRestartMenu } from "../share/UICreator.mjs";
import { createUILeftMobile } from "../share/UICreator.mjs";

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: CST.SCENE.GAMESCENE });
    }

    init(data) {
        this.stage = data.stage;
    }

    preload() {
        this.loding = new AnimationControl(AnimationControl.LOADING);
        this.loding.addLoadOnScreen(this, 1280 / 2, 720 / 2, 0.3, 0.3);
        this.load.image('map', './assets/map/Map2.png');
        this.load.image('overlayBackground', './assets/background/overlayBackground.png')
        this.load.image('winKey', `./assets/win/Win ${this.stage}.png`);

        if (isMobile()) {
            this.load.image('joystickBase', 'assets/joystick/joystick-back.png');
            this.load.image('joystickThumb', 'assets/joystick/thrumb-btn.png');
            this.load.image('touchButton', 'assets/joystick/touch-button.png');
            this.load.image('exitMobile', 'assets/button/exitMobile.png');
        }
    }

    create() {
        this.loding.deleteLoadFromScreen(this);

        this.mobileFlag = isMobile();

        // Настройка категорий коллизий
        this.bulletCollisionCategory = this.matter.world.nextCategory();
        this.monsterCollisionCategory = this.matter.world.nextCategory();
        this.playerCollisionCategory = this.matter.world.nextCategory();

        createUIRight(this);
        createUIBottom(this);
        createUITop(this);

        if (this.mobileFlag) {
            this.createJoystick('joystickBase', 'joystickThumb', this.isDragging, 160, this.cameras.main.height - 120);
            this.createMobileXButton('touchButton', 'joystickBase', this.cameras.main.width - 150, this.cameras.main.height - 120);
            createUILeftMobile(this, 'exitMobile', 90, 70, this.showExitMenu);
            this.leftWall = 0;
        } else {
            createUI(this, this.showExitMenu);
            this.leftWall = 80;
        }


        createExitMenu(this, this.leaveGame, this.closeExitMenu, this.mobileFlag);
        createRestartMenu(this, this.restartGame, this.closeRestartMenu, this.mobileFlag)

        this.createMap();
        this.createPlayer();

        this.score = 0;
        this.scoreText = this.add.text(640, 50, 'Score: 0', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.createInputHandlers();

        // Добавление здоровья игрока
        this.playerHealth = 3;
        this.healthText = this.add.text(1160, 50, '3', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        this.heartImage = this.add.image(1120, 50, 'heart').setScale(0.2);

        this.monsterSpawnDelay = 1000; // Начальная задержка спавна монстров
        this.monsterSpeedMin = 3; // Минимальная скорость монстров
        this.monsterSpeedMax = 5; // Максимальная скорость монстров

        this.spawnTimer = this.time.addEvent({
            delay: this.monsterSpawnDelay,
            callback: this.spawnMonster,
            callbackScope: this,
            loop: true
        });

        this.setupCollisions();

        this.createWinOverlay();

        this.createLoseOverlay();

        // Массивы для хранения пуль и монстров
        this.bullets = [];
        this.monsters = [];
    }

    createPlayer() {
        this.player = this.matter.add.sprite(640, 600, `mag${this.stage}`);

        let scale = 0.5;
        let scaleBody = 0.25;

        this.player.setScale(scale);

        const vertices = [
            { x: 74 * scaleBody, y: 193.5 * scaleBody },
            { x: 1.5 * scaleBody, y: 313.5 * scaleBody },
            { x: 74 * scaleBody, y: 391 * scaleBody },
            { x: 216 * scaleBody, y: 391 * scaleBody },
            { x: 282.5 * scaleBody, y: 313.5 * scaleBody },
            { x: 216 * scaleBody, y: 193.5 * scaleBody },
            { x: 261 * scaleBody, y: 144 * scaleBody },
            { x: 194.5 * scaleBody, y: 102 * scaleBody },
            { x: 197.5 * scaleBody, y: 59 * scaleBody },
            { x: 261 * scaleBody, y: 0.5 * scaleBody },
            { x: 159 * scaleBody, y: 33 * scaleBody },
            { x: 103.5 * scaleBody, y: 94.5 * scaleBody },
            { x: 21.5 * scaleBody, y: 144 * scaleBody }
        ];
        this.player.setBody({
            type: 'fromVertices',
            verts: vertices
        });

        this.player.setFixedRotation();
        this.player.setCollisionCategory(this.playerCollisionCategory);
        this.player.setCollidesWith([this.monsterCollisionCategory]);
    }

    createMap() {
        const screenWidth = this.sys.game.config.width;
        const screenHeight = this.sys.game.config.height;

        this.map = this.add.image(0, 0, "map").setOrigin(0, 0);
        this.map2 = this.add.image(0, -this.map.height, "map").setOrigin(0, 0);

        const mapWidth = this.map.width;
        const scale = screenWidth / mapWidth;

        this.map.setScale(scale);
        this.map2.setScale(scale);

        const mapHeight = this.map.height * scale;
        const offsetY = screenHeight - mapHeight;
        this.map.y = offsetY;
        this.map2.y = offsetY - mapHeight;

        this.matter.world.setBounds(0, 0, screenWidth, screenHeight);
    }

    createInputHandlers() {
        this.input.keyboard.on('keydown-X', () => {
            this.shootBullet();
        });
    }

    shootBullet() {
        const bullet = this.matter.add.image(this.player.x, this.player.y - 50, 'bullet');
        bullet.setFixedRotation();
        bullet.setVelocityY(-10);
        bullet.setScale(0.3);
        bullet.setCollisionCategory(this.bulletCollisionCategory);
        bullet.setCollidesWith([this.monsterCollisionCategory]);

        bullet.setFrictionAir(0);
        bullet.setFriction(0);
        bullet.setFrictionStatic(0);

        bullet.setData('type', 'bullet');

        this.bullets.push(bullet);
    }

    updateMonsterSpawnRate() {
        const maxSpawnDelay = 900;
        const minSpawnDelay = 200;
        const maxSpeed = 10;

        this.monsterSpawnDelay = Math.max(minSpawnDelay, maxSpawnDelay - Math.floor(this.score / 10) * 10);
        this.monsterSpeedMax = Math.min(maxSpeed, 5 + Math.floor(this.score / 10));

        this.spawnTimer.reset({
            delay: this.monsterSpawnDelay,
            callback: this.spawnMonster,
            callbackScope: this,
            loop: true
        });
    }

    spawnMonster() {
        const monsterType = Phaser.Math.Between(1, 3);
        const monster = this.matter.add.sprite(Phaser.Math.Between(100, 1180), 0, `monster${monsterType}${this.stage}`).setScale(0.25);

        let scaleMonsterBody = 0.25;

        let vertices;
        if (monsterType == 1) {
            if (this.stage == 1) vertices = [{ x: 1.5 * scaleMonsterBody, y: 166 * scaleMonsterBody }, { x: 174 * scaleMonsterBody, y: 216.5 * scaleMonsterBody }, { x: 275 * scaleMonsterBody, y: 216.5 * scaleMonsterBody }, { x: 455 * scaleMonsterBody, y: 166 * scaleMonsterBody }, { x: 412 * scaleMonsterBody, y: 58 * scaleMonsterBody }, { x: 327.5 * scaleMonsterBody, y: 0.5 * scaleMonsterBody }, { x: 134.5 * scaleMonsterBody, y: 0.5 * scaleMonsterBody }, { x: 34 * scaleMonsterBody, y: 58 * scaleMonsterBody }];
            if (this.stage == 2) vertices = [{ x: 37.5 * scaleMonsterBody, y: 262 * scaleMonsterBody }, { x: 156 * scaleMonsterBody, y: 194.5 * scaleMonsterBody }, { x: 291 * scaleMonsterBody, y: 262 * scaleMonsterBody }, { x: 319 * scaleMonsterBody, y: 127 * scaleMonsterBody }, { x: 240.5 * scaleMonsterBody, y: 0.5 * scaleMonsterBody }, { x: 88.5 * scaleMonsterBody, y: 0.5 * scaleMonsterBody }, { x: 1 * scaleMonsterBody, y: 127 * scaleMonsterBody }];
            if (this.stage == 3) vertices = [{ x: 98 * scaleMonsterBody, y: 291 * scaleMonsterBody }, { x: 163.5 * scaleMonsterBody, y: 353 * scaleMonsterBody }, { x: 223.5 * scaleMonsterBody, y: 353 * scaleMonsterBody }, { x: 291 * scaleMonsterBody, y: 291 * scaleMonsterBody }, { x: 385.5 * scaleMonsterBody, y: 194.5 * scaleMonsterBody }, { x: 277.5 * scaleMonsterBody, y: 153.5 * scaleMonsterBody }, { x: 223.5 * scaleMonsterBody, y: 103.5 * scaleMonsterBody }, { x: 213.5 * scaleMonsterBody, y: 1 * scaleMonsterBody }, { x: 144 * scaleMonsterBody, y: 24.5 * scaleMonsterBody }, { x: 144 * scaleMonsterBody, y: 134.5 * scaleMonsterBody }, { x: 40 * scaleMonsterBody, y: 175 * scaleMonsterBody }, { x: 1 * scaleMonsterBody, y: 229 * scaleMonsterBody }, { x: 98 * scaleMonsterBody, y: 248.5 * scaleMonsterBody }];
        } else if (monsterType == 2) {
            if (this.stage == 1) vertices = [{ x: 1.5 * scaleMonsterBody, y: 198.5 * scaleMonsterBody }, { x: 149 * scaleMonsterBody, y: 281 * scaleMonsterBody }, { x: 295 * scaleMonsterBody, y: 198.5 * scaleMonsterBody }, { x: 266 * scaleMonsterBody, y: 104.5 * scaleMonsterBody }, { x: 219 * scaleMonsterBody, y: 141 * scaleMonsterBody }, { x: 219 * scaleMonsterBody, y: 50.5 * scaleMonsterBody }, { x: 183 * scaleMonsterBody, y: 0.5 * scaleMonsterBody }, { x: 106 * scaleMonsterBody, y: 0.5 * scaleMonsterBody }, { x: 78.5 * scaleMonsterBody, y: 36.5 * scaleMonsterBody }, { x: 78.5 * scaleMonsterBody, y: 122.5 * scaleMonsterBody }, { x: 19.5 * scaleMonsterBody, y: 95.5 * scaleMonsterBody }];
            if (this.stage == 2) vertices = [{ x: 1 * scaleMonsterBody, y: 124 * scaleMonsterBody }, { x: 63 * scaleMonsterBody, y: 256.5 * scaleMonsterBody }, { x: 178.5 * scaleMonsterBody, y: 205.5 * scaleMonsterBody }, { x: 178.5 * scaleMonsterBody, y: 56.5 * scaleMonsterBody }, { x: 139 * scaleMonsterBody, y: 0.5 * scaleMonsterBody }, { x: 38 * scaleMonsterBody, y: 0.5 * scaleMonsterBody }];
            if (this.stage == 3) vertices = [{ x: 1.5 * scaleMonsterBody, y: 239.5 * scaleMonsterBody }, { x: 135 * scaleMonsterBody, y: 319 * scaleMonsterBody }, { x: 268 * scaleMonsterBody, y: 303.5 * scaleMonsterBody }, { x: 363 * scaleMonsterBody, y: 216.5 * scaleMonsterBody }, { x: 268 * scaleMonsterBody, y: 180.5 * scaleMonsterBody }, { x: 247.5 * scaleMonsterBody, y: 1 * scaleMonsterBody }, { x: 119.5 * scaleMonsterBody, y: 1 * scaleMonsterBody }, { x: 119.5 * scaleMonsterBody, y: 162.5 * scaleMonsterBody }];

        } else {
            if (this.stage == 1) vertices = vertices = [{ x: 1.5 * scaleMonsterBody, y: 203 * scaleMonsterBody }, { x: 151 * scaleMonsterBody, y: 271 * scaleMonsterBody }, { x: 302.5 * scaleMonsterBody, y: 186.5 * scaleMonsterBody }, { x: 252 * scaleMonsterBody, y: 152.5 * scaleMonsterBody }, { x: 198 * scaleMonsterBody, y: 1 * scaleMonsterBody }, { x: 95.5 * scaleMonsterBody, y: 1 * scaleMonsterBody }, { x: 37.5 * scaleMonsterBody, y: 152.5 * scaleMonsterBody }];
            if (this.stage == 2) vertices = [{ x: 18.5 * scaleMonsterBody, y: 204 * scaleMonsterBody }, { x: 105.5 * scaleMonsterBody, y: 271.5 * scaleMonsterBody }, { x: 179 * scaleMonsterBody, y: 271.5 * scaleMonsterBody }, { x: 263.5 * scaleMonsterBody, y: 220.5 * scaleMonsterBody }, { x: 297 * scaleMonsterBody, y: 102.5 * scaleMonsterBody }, { x: 224 * scaleMonsterBody, y: 15 * scaleMonsterBody }, { x: 77.5 * scaleMonsterBody, y: 1 * scaleMonsterBody }, { x: 1.5 * scaleMonsterBody, y: 85.5 * scaleMonsterBody }];
            if (this.stage == 3) vertices = [{ x: 1 * scaleMonsterBody, y: 195.5 * scaleMonsterBody }, { x: 88 * scaleMonsterBody, y: 293 * scaleMonsterBody }, { x: 203.5 * scaleMonsterBody, y: 293 * scaleMonsterBody }, { x: 282.5 * scaleMonsterBody, y: 195.5 * scaleMonsterBody }, { x: 282.5 * scaleMonsterBody, y: 106 * scaleMonsterBody }, { x: 203.5 * scaleMonsterBody, y: 1 * scaleMonsterBody }, { x: 88 * scaleMonsterBody, y: 1 * scaleMonsterBody }, { x: 1 * scaleMonsterBody, y: 85.5 * scaleMonsterBody }];
        }

        monster.setBody({
            type: 'fromVertices',
            verts: vertices
        });


        monster.setFixedRotation();

        const speed = Phaser.Math.Between(this.monsterSpeedMin, this.monsterSpeedMax);
        monster.setVelocityY(speed);

        monster.setCollisionCategory(this.monsterCollisionCategory);
        monster.setCollidesWith([this.playerCollisionCategory, this.bulletCollisionCategory]);

        monster.setMass(0.1);

        monster.setFrictionAir(0);
        monster.setFriction(0);
        monster.setFrictionStatic(0);

        monster.score = monsterType * 10;
        monster.setData('type', 'monster');

        this.monsters.push(monster);
    }

    setupCollisions() {
        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;

                const gameObjectA = bodyA.gameObject;
                const gameObjectB = bodyB.gameObject;

                if (gameObjectA && gameObjectB) {
                    if (gameObjectA.getData('type') === 'monster' && gameObjectB === this.player) {
                        this.handlePlayerMonsterCollision(gameObjectA);
                    } else if (gameObjectB.getData('type') === 'monster' && gameObjectA === this.player) {
                        this.handlePlayerMonsterCollision(gameObjectB);
                    }
                }
            });
        });

        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach(pair => {
                const { bodyA, bodyB } = pair;

                const gameObjectA = bodyA.gameObject;
                const gameObjectB = bodyB.gameObject;

                if (gameObjectA && gameObjectB) {
                    if (gameObjectA.getData('type') === 'monster' && gameObjectB.getData('type') === 'bullet') {
                        this.handleCollisionBulletMonster(gameObjectA, gameObjectB);
                    } else if (gameObjectB.getData('type') === 'monster' && gameObjectA.getData('type') === 'bullet') {
                        this.handleCollisionBulletMonster(gameObjectB, gameObjectA);
                    }
                }
            });
        });
    }

    handleCollisionBulletMonster(monster, bullet) {
        if (bullet && monster) {
            this.score += monster.score;
            this.scoreText.setText('Score: ' + this.score);

            if (this.score >= 2000) {
                this.overlayBackground.setVisible(true);
                this.winKey.setVisible(true);
                this.textA.setVisible(true);
                this.textA2.setVisible(true);
                this.winText.setVisible(true);
                this.tweens.add({
                    targets: [this.overlayBackground, this.winKey, this.winText, this.textA, this.textA2],
                    alpha: 1,
                    duration: 300,
                    onComplete: () => {
                        try {
                            this.scoreText.setVisible(false);
                            this.scene.pause();
                        } catch (e) { }

                    }
                });
            }

            bullet.destroy();

            // Отображение спрайта взрыва
            const explosion = this.add.sprite(monster.x, monster.y, 'explosion').setScale(0.3);

            // Удаление спрайта взрыва через некоторое время
            this.time.delayedCall(500, () => {
                explosion.destroy();
            });

            monster.destroy();

            this.bullets = this.bullets.filter(b => b !== bullet);
            this.monsters = this.monsters.filter(m => m !== monster);

            this.updateMonsterSpawnRate();
        }
    }

    handlePlayerMonsterCollision(monster) {
        this.playerHealth -= 1;

        this.healthText.setText(this.playerHealth);

        monster.destroy();

        this.monsters = this.monsters.filter(m => m !== monster);

        this.tweens.add({
            targets: this.player,
            tint: { from: 0xFFFFFF, to: 0xFF0000 },
            ease: 'Linear',
            duration: 100,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                this.player.clearTint();
            }
        });

        if (this.playerHealth <= 0) {
            this.loseTitle.setVisible(true);
            this.restartText.setVisible(true);
            this.tweens.add({
                targets: [this.loseTitle, this.restartText],
                alpha: 1,
                duration: 300,
                onComplete: () => {
                    try {
                        this.scoreText.setVisible(false);
                        this.restartContainer.setVisible(true);
                        this.scene.pause();
                    } catch (e) { }

                }
            });
        }
    }

    createWinOverlay() {
        this.overlayBackground = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'overlayBackground');
        this.overlayBackground.setDisplaySize(this.cameras.main.width * 0.7, this.cameras.main.height * 0.73);
        this.overlayBackground.setVisible(false);
        this.overlayBackground.setDepth(2);
        this.overlayBackground.setAlpha(0);

        this.winKey = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'winKey');
        this.winKey.setDisplaySize(this.cameras.main.width * 0.68, this.cameras.main.height * 0.63);
        this.winKey.setVisible(false);
        this.winKey.setDepth(2);
        this.winKey.setAlpha(0);

        this.textA = this.add.text(this.cameras.main.width / 2 - 220, this.cameras.main.height / 2 - 120, '', { font: "normal 60px MyCustomFont2", fill: '#000000', align: 'center' }).setScrollFactor(0).setDepth(2);
        this.textA2 = this.add.text(this.cameras.main.width / 2 - 60, this.cameras.main.height / 2 + 20, '', { font: "normal 60px MyCustomFont", fill: '#000000', align: 'center' }).setScrollFactor(0).setDepth(2);

        if (this.stage == 1) {
            this.textA.setText(decrypt('Тскзугеовип!\nТиуегв ъгфхя нсзг'));
            this.textA2.setText(decrypt('“ULP”'));
        }
        else if (this.stage == 2) {
            this.textA.setText(decrypt('Тскзугеовип!\nЕхсугв ъгфхя нсзг'));
            this.textA2.setText(decrypt('“ERO”'));
        }
        else if (this.stage == 3) {
            this.textA.setText(decrypt('Тскзугеовип!\nХуихяв ъгфхя нсзг'));
            this.textA2.setText(decrypt('“GRQ”'));
        }

        this.textA.setVisible(false);
        this.textA.setAlpha(0);

        this.textA2.setVisible(false);
        this.textA2.setAlpha(0);

        this.winText = this.add.text(640, 50, 'Congrats!', {
            font: 'bold 62px Manrope',
            fill: '#1CBA81'
        }).setOrigin(0.5);
        this.winText.setVisible(false);
        this.winText.setDepth(2);
        this.winText.setAlpha(0);
    }

    createLoseOverlay() {
        this.loseTitle = this.add.text(640, 50, 'The End!', {
            font: 'bold 62px Manrope',
            fill: '#FF4445'
        }).setOrigin(0.5);
        this.loseTitle.setVisible(false);
        this.loseTitle.setDepth(2);
        this.loseTitle.setAlpha(0);

        this.restartText = this.add.text(640, 150, 'You can restart the game.', {
            font: '42px',
            fill: '#F6AF23'
        }).setOrigin(0.5);
        this.restartText.setVisible(false);
        this.restartText.setDepth(2);
        this.restartText.setAlpha(0);
    }

    update() {
        this.player.setVelocity(0);
        if (!this.mobileFlag) {
            if (this.cursors.left.isDown) {
                this.player.setVelocityX(-5);
            } else if (this.cursors.right.isDown) {
                this.player.setVelocityX(5);
            } else if (this.cursors.up.isDown) {
                this.player.setVelocityY(-7);
            } else if (this.cursors.down.isDown) {
                this.player.setVelocityY(7);
            }
        } else {
            if (this.joystickThumb.x < this.joystickBase.x - 10) {
                this.player.setVelocityX(-5);
            } else if (this.joystickThumb.x > this.joystickBase.x + 10) {
                this.player.setVelocityX(5);
            } else if (this.joystickThumb.y < this.joystickBase.y - 10) {
                this.player.setVelocityY(-7);
            } else if (this.joystickThumb.y > this.joystickBase.y + 10) {
                this.player.setVelocityY(7);
            }
        }


        const screenWidth = this.sys.game.config.width;
        const screenHeight = this.sys.game.config.height;
        const playerWidth = this.player.displayWidth;
        const playerHeight = this.player.displayHeight;

        if (this.player.x < playerWidth / 2 + this.leftWall) {
            this.player.x = playerWidth / 2 + this.leftWall;
        } else if (this.player.x > screenWidth - playerWidth / 2) {
            this.player.x = screenWidth - playerWidth / 2;
        }

        if (this.player.y < playerHeight / 2) {
            this.player.y = playerHeight / 2;
        } else if (this.player.y > screenHeight - playerHeight / 2) {
            this.player.y = screenHeight - playerHeight / 2;
        }

        this.map.y += 2;
        this.map2.y += 2;

        if (this.map.y >= this.sys.game.config.height) {
            this.map.y = this.map2.y - this.map.height * this.map.scaleY;
        }
        if (this.map2.y >= this.sys.game.config.height) {
            this.map2.y = this.map.y - this.map.height * this.map.scaleY;
        }

        this.bullets = this.bullets.filter(bullet => {
            if (bullet.y < 0) {
                bullet.destroy();
                return false;
            }
            return true;
        });

        this.monsters = this.monsters.filter(monster => {
            if (monster.y > this.sys.game.config.height) {
                monster.destroy();
                return false;
            }
            return true;
        });
    }

    showExitMenu(self) {
        self.exitContainer.setPosition(self.cameras.main.scrollX + 640, self.cameras.main.scrollY + 360);
        self.exitContainer.setVisible(true);
    }

    leaveGame(self) {
        window.location.reload();
    }

    restartGame(self) {
        self.scene.start(CST.SCENE.GAMESCENE, { stage: self.stage });
    }

    closeExitMenu(self) {
        self.exitContainer.setVisible(false);
    }

    closeRestartMenu(self) {
        self.restartContainer.setVisible(false);
    }

    createJoystick(joystickBase, joystickThumb, flag, x, y) {

        this.joystickBase = this.add.image(x, y, joystickBase).setInteractive();
        this.joystickThumb = this.add.image(x, y, joystickThumb).setInteractive();

        this.joystickBase.setDisplaySize(150, 150);
        this.joystickThumb.setDisplaySize(100, 100);

        this.joystickBase.setDepth(2);
        this.joystickThumb.setDepth(2);

        // Привязываем джойстик к экрану
        this.joystickBase.setScrollFactor(0);
        this.joystickThumb.setScrollFactor(0);


        this.joystickThumb.on('pointerdown', (pointer) => {
            flag = true;
            this.dragStartX = pointer.x;
            this.dragStartY = pointer.y;
        });

        this.input.on('pointermove', (pointer) => {
            if (flag) {
                let deltaX = pointer.x - this.dragStartX;
                let deltaY = pointer.y - this.dragStartY;
                let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                let maxDistance = 50;

                if (distance > maxDistance) {
                    let angle = Math.atan2(deltaY, deltaX);
                    deltaX = Math.cos(angle) * maxDistance;
                    deltaY = Math.sin(angle) * maxDistance;
                }

                this.joystickThumb.setPosition(this.joystickBase.x + deltaX, this.joystickBase.y + deltaY);
            }
        });

        this.input.on('pointerup', () => {
            flag = false;
            this.joystickThumb.setPosition(this.joystickBase.x, this.joystickBase.y);
        });
    }

    createMobileXButton(nameButton, nameBackgorund, x, y) {
        this.buttonBackground = this.add.image(x, y, nameBackgorund);
        this.mobileXButton = this.add.image(x, y, nameButton).setInteractive();

        this.buttonBackground.setDisplaySize(150, 150);
        this.mobileXButton.setDisplaySize(100, 100);

        this.buttonBackground.setDepth(2);
        this.mobileXButton.setDepth(2);

        this.mobileXButton.setScrollFactor(0);
        this.buttonBackground.setScrollFactor(0);

        this.mobileXButton.on('pointerdown', () => {
            this.shootBullet();
        });
    }
}
