import { AudioEngine, RainLayer, WindLayer, FireLayer, BrownNoiseLayer } from './audio-engine.js';

// --- グローバル状態 ---
const engine = new AudioEngine();
const layers = {};
let isRunning = false;
let isAutoModulating = false;

// --- DOM要素 ---
const playButton = document.getElementById('play-pause-btn');
const autoModToggle = document.getElementById('auto-modulate-toggle');

// --- 初期化 ---

function initLayers() {
    layers.rain = new RainLayer(engine);
    layers.wind = new WindLayer(engine);
    layers.fire = new FireLayer(engine);
    layers.brown = new BrownNoiseLayer(engine);

    // UIとの初期同期
    syncLayer('rain');
    syncLayer('wind');
    syncLayer('fire');
    syncLayer('brown');
}

function syncLayer(name) {
    const layer = layers[name];
    const toggle = document.getElementById(`${name}-toggle`);
    const slider = document.getElementById(`${name}-vol`);

    // UI -> オーディオ
    toggle.addEventListener('change', () => {
        layer.toggle(toggle.checked);
        updateCardVisual(name, toggle.checked);
    });

    slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        layer.setVolume(val);
        // 自動変調中の場合、ユーザー入力は一時的に現在のターゲットを上書きしますが、
        // 次のサイクルで再び自動変調が引き継ぎます
    });

    // 状態の初期化
    layer.setVolume(parseFloat(slider.value));
    layer.toggle(toggle.checked);
    updateCardVisual(name, toggle.checked);
}

function updateCardVisual(name, isActive) {
    const card = document.querySelector(`.sound-card[data-layer="${name}"]`);
    if (isActive) {
        card.style.borderColor = "var(--primary-accent)";
        card.style.boxShadow = "0 0 20px rgba(100, 255, 218, 0.1)";
    } else {
        card.style.borderColor = "var(--card-border)";
        card.style.boxShadow = "none";
    }
}

// --- メイン制御 ---

playButton.addEventListener('click', () => {
    if (!isRunning) {
        // 初回のユーザー操作: オーディオコンテキストの初期化
        if (!engine.isInitialized) {
            engine.init();
            initLayers();

            // 全レイヤーを開始（ミュートの場合は無音）
            Object.values(layers).forEach(l => l.start());
        }

        engine.resume();
        playButton.classList.add('active');
        playButton.querySelector('.icon').textContent = '⏸';
        playButton.childNodes[playButton.childNodes.length - 1].textContent = " 一時停止";
        isRunning = true;
    } else {
        if (engine.ctx.state === 'running') {
            engine.ctx.suspend();
            playButton.classList.remove('active');
            playButton.querySelector('.icon').textContent = '▶';
            playButton.childNodes[playButton.childNodes.length - 1].textContent = " 再開";
        } else {
            engine.ctx.resume();
            playButton.classList.add('active');
            playButton.querySelector('.icon').textContent = '⏸';
            playButton.childNodes[playButton.childNodes.length - 1].textContent = " 一時停止";
        }
    }
});

// --- 自動変調ロジック ---

autoModToggle.addEventListener('change', (e) => {
    isAutoModulating = e.target.checked;
    const indicator = document.querySelector('.indicator');
    indicator.style.color = isAutoModulating ? 'var(--primary-accent)' : 'var(--secondary-accent)';
});

// スムーズな遷移のための目標音量を保持
const modulationTargets = {
    rain: { target: 0.5, lastChange: 0 },
    wind: { target: 0.4, lastChange: 0 },
    fire: { target: 0.3, lastChange: 0 },
    brown: { target: 0.6, lastChange: 0 }
};

function modulationLoop() {
    if (isAutoModulating && isRunning && engine.ctx.state === 'running') {
        const now = Date.now();

        for (const [name, layer] of Object.entries(layers)) {
            // レイヤーが有効（トグルがチェックされている）な場合のみ変調
            const toggle = document.getElementById(`${name}-toggle`);
            if (!toggle.checked) continue;

            const state = modulationTargets[name];

            // 3〜8秒ごとに新しいターゲットを選択
            if (now - state.lastChange > (Math.random() * 5000 + 3000)) {
                // 0.1から0.8の間でランダムな新しい音量
                state.target = 0.1 + Math.random() * 0.7;
                state.lastChange = now;
            }

            // 現在のスライダー値をターゲットに向かってスムーズに移動
            /* 注: 視覚的なフィードバックのためにスライダーを更新し、
               スライダーのイベントリスナーが音声を更新します */
            const slider = document.getElementById(`${name}-vol`);
            const current = parseFloat(slider.value);
            const diff = state.target - current;

            if (Math.abs(diff) > 0.01) {
                const step = diff * 0.02; // ゆっくりとしたアプローチ
                const newVal = current + step;
                slider.value = newVal;
                layer.setVolume(newVal);
            }
        }
    }

    requestAnimationFrame(modulationLoop);
}

// ループの開始
modulationLoop();
