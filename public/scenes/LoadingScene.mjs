import { CST } from "../CST.mjs";
import { AnimationControl } from "../share/AnimationControl.mjs";

export class LoadingScene extends Phaser.Scene {
    constructor() {
        super({ key: CST.SCENE.LOADINGSCENE });
    }

    preload() {
        this.loading = new AnimationControl(AnimationControl.LOADING)
        this.loading.create(this, './assets/loading.png', 800, 800);
    }

    create() {
        this.loading.createAnimation(this, 0, 11);

        this.scene.start(CST.SCENE.LOBBYSCENE);
    }
}
