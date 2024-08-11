import { CST } from "../CST.mjs";
import { createExitMenu } from "../share/UICreator.mjs";
import { createRestartMenu } from "../share/UICreator.mjs";

export class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: CST.SCENE.LOBBYSCENE });
    }

    preload() {

        // Создание спрайта и запуск анимации
        this.loadingSprite = this.add.sprite(1280 / 2, 720 / 2, 'loading'); // Центрирование спрайта
        this.loadingSprite.setScale(0.3, 0.3);
        this.loadingSprite.play('loadingAnimation');

        this.load.image('stage1', 'assets/button/stage1.png');
        this.load.image('stage2', 'assets/button/stage2.png');
        this.load.image('stage3', 'assets/button/stage3.png');
        this.load.image('backgroundMenu', './assets/background/background-menu.png');

        //mags
        this.load.image('mag1', './assets/character/mag 1.png');
        this.load.image('mag2', './assets/character/mag 2.png');
        this.load.image('mag3', './assets/character/mag 3.png');

        //monster
        this.load.image('monster11', './assets/monster/Monster 1.png');
        this.load.image('monster21', './assets/monster/Monster 2.png');
        this.load.image('monster31', './assets/monster/Monster 3.png');
        this.load.image('monster12', './assets/monster/Monster 4.png');
        this.load.image('monster22', './assets/monster/Monster 5.png');
        this.load.image('monster32', './assets/monster/Monster 6.png');
        this.load.image('monster13', './assets/monster/Monster 7.png');
        this.load.image('monster23', './assets/monster/Monster 8.png');
        this.load.image('monster33', './assets/monster/Monster 9.png');

        this.load.image('heart', './assets/character/heart.png')
        this.load.image('explosion', './assets/character/explosion.png');

        //spell
        this.load.image('bullet', './assets/character/spell.png');
    }

    create() {
        this.loadingSprite.stop();
        this.loadingSprite.destroy();

        createExitMenu(this);
        createRestartMenu(this);

        // Добавляем фон
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'backgroundMenu').setDisplaySize(this.scale.width, this.scale.height);

        let stage1 = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2 - 100, 'stage1');
        stage1.setInteractive();

        let stage2 = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'stage2');
        stage2.setInteractive();

        let stage3 = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2 + 100, 'stage3');
        stage3.setInteractive();

        // Обработчик нажатия на кнопку
        stage1.on('pointerdown', () => {
            this.scene.start(CST.SCENE.GAMESCENE, { stage: '1' });
        });

        stage2.on('pointerdown', () => {
            this.scene.start(CST.SCENE.GAMESCENE, { stage: '2' });
        });

        stage3.on('pointerdown', () => {
            this.scene.start(CST.SCENE.GAMESCENE, { stage: '3' });
        });
    }

}