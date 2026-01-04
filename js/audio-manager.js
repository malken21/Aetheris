import { AudioEngine, RainLayer, WindLayer, FireLayer, BrownNoiseLayer } from './audio-engine.js';

export class AudioManager {
    constructor() {
        this.engine = new AudioEngine();
        this.layers = {};
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;

        this.engine.init();
        this.layers = {
            rain: new RainLayer(this.engine),
            wind: new WindLayer(this.engine),
            fire: new FireLayer(this.engine),
            brown: new BrownNoiseLayer(this.engine)
        };
        this.isInitialized = true;
    }

    startAll() {
        if (!this.isInitialized) this.init();
        Object.values(this.layers).forEach(l => l.start());
    }

    resume() {
        this.engine.resume();
    }

    suspend() {
        if (this.engine.ctx) {
            this.engine.ctx.suspend();
        }
    }

    get state() {
        return this.engine.ctx ? this.engine.ctx.state : 'suspended';
    }

    toggleLayer(name, shouldPlay) {
        if (this.layers[name]) {
            this.layers[name].toggle(shouldPlay);
        }
    }

    setLayerVolume(name, value) {
        if (this.layers[name]) {
            this.layers[name].setVolume(value);
        }
    }

    getLayer(name) {
        return this.layers[name];
    }
}
