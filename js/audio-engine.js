/**
 * Aetheris オーディオエンジン
 * Web Audio APIコンテキスト、ノイズ生成、およびミキシングを処理します。
 */

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.isInitialized = false;
        this.masterGain = null;
    }

    init() {
        if (this.isInitialized) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.0;
        this.masterGain.connect(this.ctx.destination);

        console.log("Audio Engine Initialized");
        this.isInitialized = true;
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // --- ノイズ生成ヘルパー ---

    /**
     * ホワイトノイズ（-1から1のランダム値）のバッファを作成します
     */
    createWhiteNoiseBuffer() {
        const bufferSize = 2 * this.ctx.sampleRate; // 2秒
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    /**
     * ピンクノイズ（1/f）のバッファを作成します（Paul Kelletの改良手法を使用）
     */
    createPinkNoiseBuffer() {
        const bufferSize = 4 * this.ctx.sampleRate; // 4秒
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);

        let b0, b1, b2, b3, b4, b5, b6;
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;

            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;

            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.11; // (概算) ゲイン補正
            b6 = white * 0.115926;
        }
        return buffer;
    }

    /**
     * ブラウンノイズ（1/f^2）のバッファを作成します
     */
    createBrownNoiseBuffer() {
        const bufferSize = 4 * this.ctx.sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);

        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5; // ゲイン補正
        }
        return buffer;
    }
}

/**
 * すべてのサウンドレイヤーの基本クラス
 */
class SoundLayer {
    constructor(audioEngine) {
        this.engine = audioEngine;
        this.gainNode = null;
        this.sourceNode = null;
        this.isPlaying = false;
        this.volume = 0.5;
        this.isMuted = true; // UIの初期状態に合わせてミュートで開始
    }

    setVolume(val) {
        this.volume = val;
        if (this.gainNode && !this.isMuted) {
            // スムーズな遷移
            this.gainNode.gain.setTargetAtTime(val, this.engine.ctx.currentTime, 0.1);
        }
    }

    toggle(shouldPlay) {
        this.isMuted = !shouldPlay;
        if (this.gainNode) {
            const targetGain = shouldPlay ? this.volume : 0;
            this.gainNode.gain.setTargetAtTime(targetGain, this.engine.ctx.currentTime, 0.1);
        }
    }

    // サブクラスで実装
    start() { }
}

class RainLayer extends SoundLayer {
    start() {
        if (!this.engine.isInitialized) return;

        // 雨はピンクノイズ + ハイシェルフフィルタを使用して、きつい高音を抑えます
        const buffer = this.engine.createPinkNoiseBuffer();
        this.sourceNode = this.engine.ctx.createBufferSource();
        this.sourceNode.buffer = buffer;
        this.sourceNode.loop = true;

        this.gainNode = this.engine.ctx.createGain();
        this.gainNode.gain.value = this.isMuted ? 0 : this.volume;

        // 表面に当たる雨のような音にするための軽いフィルタ
        const filter = this.engine.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        // グラフの接続
        this.sourceNode.connect(filter);
        filter.connect(this.gainNode);
        this.gainNode.connect(this.engine.masterGain);

        this.sourceNode.start();
        this.isPlaying = true;
    }
}

class WindLayer extends SoundLayer {
    constructor(engine) {
        super(engine);
        this.filter = null;
    }

    start() {
        if (!this.engine.isInitialized) return;

        // 風は動的なパスで強くフィルタリングされたピンク/ホワイトノイズを使用します
        const buffer = this.engine.createPinkNoiseBuffer();
        this.sourceNode = this.engine.ctx.createBufferSource();
        this.sourceNode.buffer = buffer;
        this.sourceNode.loop = true;

        this.gainNode = this.engine.ctx.createGain();
        this.gainNode.gain.value = this.isMuted ? 0 : this.volume;

        // 風のうなり音効果のためのバンドパスフィルタ
        this.filter = this.engine.ctx.createBiquadFilter();
        this.filter.type = 'bandpass';
        this.filter.frequency.value = 400;
        this.filter.Q.value = 0.6; // 広い帯域幅

        // 「うなり」のための変調
        this.modulator = this.engine.ctx.createOscillator();
        this.modulator.type = 'sine';
        this.modulator.frequency.value = 0.15; // 遅い変調 (0.15 Hz)

        const modGain = this.engine.ctx.createGain();
        modGain.gain.value = 200; // 周波数を +/- 200Hz シフト

        this.modulator.connect(modGain);
        modGain.connect(this.filter.frequency);

        this.sourceNode.connect(this.filter);
        this.filter.connect(this.gainNode);
        this.gainNode.connect(this.engine.masterGain);

        this.sourceNode.start();
        this.modulator.start();
        this.isPlaying = true;
    }
}

class BrownNoiseLayer extends SoundLayer {
    start() {
        if (!this.engine.isInitialized) return;

        const buffer = this.engine.createBrownNoiseBuffer();
        this.sourceNode = this.engine.ctx.createBufferSource();
        this.sourceNode.buffer = buffer;
        this.sourceNode.loop = true;

        this.gainNode = this.engine.ctx.createGain();
        this.gainNode.gain.value = this.isMuted ? 0 : this.volume;

        // アーティファクトを除去するための単純なローパス
        const filter = this.engine.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;

        this.sourceNode.connect(filter);
        filter.connect(this.gainNode);
        this.gainNode.connect(this.engine.masterGain);

        this.sourceNode.start();
        this.isPlaying = true;
    }
}

class FireLayer extends SoundLayer {
    constructor(engine) {
        super(engine);
        this.crackleNode = null;
    }

    start() {
        if (!this.engine.isInitialized) return;

        // 1. 低音の響き (ブラウンノイズ)
        const rumbleBuffer = this.engine.createBrownNoiseBuffer();
        this.sourceNode = this.engine.ctx.createBufferSource();
        this.sourceNode.buffer = rumbleBuffer;
        this.sourceNode.loop = true;

        // 響きを非常に深くフィルタリング
        const rumbleFilter = this.engine.ctx.createBiquadFilter();
        rumbleFilter.type = 'lowpass';
        rumbleFilter.frequency.value = 150;

        // 2. パチパチ音 (ランダムなインパルス)
        const crackleBufferSize = 5 * this.engine.ctx.sampleRate;
        const crackleBuffer = this.engine.ctx.createBuffer(1, crackleBufferSize, this.engine.ctx.sampleRate);
        const crackleData = crackleBuffer.getChannelData(0);

        // 疎なインパルス
        for (let i = 0; i < crackleBufferSize; i++) {
            if (Math.random() > 0.9992) { // 非常に稀
                crackleData[i] = (Math.random() * 2 - 1) * 0.8;
            } else {
                crackleData[i] = 0;
            }
        }

        this.crackleNode = this.engine.ctx.createBufferSource();
        this.crackleNode.buffer = crackleBuffer;
        this.crackleNode.loop = true;

        // パチパチ音のためのハイパスフィルタ
        const crackleFilter = this.engine.ctx.createBiquadFilter();
        crackleFilter.type = 'highpass';
        crackleFilter.frequency.value = 1000;

        // ミキシング
        this.gainNode = this.engine.ctx.createGain();
        this.gainNode.gain.value = this.isMuted ? 0 : this.volume;

        this.sourceNode.connect(rumbleFilter);
        rumbleFilter.connect(this.gainNode);

        this.crackleNode.connect(crackleFilter);
        crackleFilter.connect(this.gainNode);

        this.gainNode.connect(this.engine.masterGain);

        this.sourceNode.start();
        this.crackleNode.start();
        this.isPlaying = true;
    }
}

export { AudioEngine, RainLayer, WindLayer, FireLayer, BrownNoiseLayer };
