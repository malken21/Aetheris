export class Modulator {
    constructor(audioManager, uiManager) {
        this.audioManager = audioManager;
        this.uiManager = uiManager;
        this.isActive = false;

        this.targets = {
            rain: { target: 0.5, lastChange: 0 },
            wind: { target: 0.4, lastChange: 0 },
            fire: { target: 0.3, lastChange: 0 },
            brown: { target: 0.6, lastChange: 0 }
        };

        this.loop = this.loop.bind(this);
    }

    start() {
        this.isActive = true;
        this.loop();
    }

    stop() {
        this.isActive = false;
    }

    loop() {
        if (!this.isActive) return;

        // Ensure audio is running before doing anything expensive or updating UI unnecessarily
        if (this.audioManager.state === 'running') {
            const now = Date.now();

            for (const name of Object.keys(this.targets)) {
                const layerState = this.uiManager.getLayerState(name);

                // Only modulate enabled layers
                if (!layerState.enabled) continue;

                const state = this.targets[name];

                // 3-8 seconds random interval for target change
                if (now - state.lastChange > (Math.random() * 5000 + 3000)) {
                    state.target = 0.1 + Math.random() * 0.7;
                    state.lastChange = now;
                }

                // Smooth transition
                const current = layerState.volume;
                const diff = state.target - current;

                if (Math.abs(diff) > 0.01) {
                    const step = diff * 0.02; // Slow approach
                    const newVal = current + step;

                    this.uiManager.setLayerVolume(name, newVal);
                    this.audioManager.setLayerVolume(name, newVal);
                }
            }
        }

        requestAnimationFrame(this.loop);
    }
}
