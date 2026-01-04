import { AudioManager } from './audio-manager.js';
import { UIManager } from './ui-manager.js';
import { Modulator } from './modulator.js';

// --- Initialization ---
const audioManager = new AudioManager();
const uiManager = new UIManager();
const modulator = new Modulator(audioManager, uiManager);

let isRunning = false;

// --- Event Binding ---

// Play/Pause Button
uiManager.bindPlayButton(() => {
    if (!isRunning) {
        // First time start
        if (!audioManager.isInitialized) {
            audioManager.init();
            audioManager.startAll();

            // Sync initial volume/mute states from UI to Audio
            const layerNames = ['rain', 'wind', 'fire', 'brown'];
            layerNames.forEach(name => {
                const state = uiManager.getLayerState(name);
                audioManager.setLayerVolume(name, state.volume);
                audioManager.toggleLayer(name, state.enabled);
            });
        }

        audioManager.resume();
        uiManager.updatePlayButtonState(true);
        isRunning = true;
    } else {
        // Toggle Suspend/Resume
        if (audioManager.state === 'running') {
            audioManager.suspend();
            uiManager.updatePlayButtonState(false);
        } else {
            audioManager.resume();
            uiManager.updatePlayButtonState(true);
        }
    }
});

// Auto Modulation Toggle
uiManager.bindAutoModToggle((e) => {
    const isChecked = e.target.checked;
    uiManager.updateModulationIndicator(isChecked);

    if (isChecked) {
        modulator.start();
    } else {
        modulator.stop();
    }
});

// Layer Controls (Volume & Mute)
uiManager.bindLayerControls(
    // On Toggle
    (name, isChecked) => {
        audioManager.toggleLayer(name, isChecked);
    },
    // On Volume Change
    (name, volume) => {
        audioManager.setLayerVolume(name, volume);
    }
);

// --- Initial Setup ---
uiManager.initVisuals();

// Initialize Auto Modulation state based on DOM
if (uiManager.autoModToggle.checked) {
    modulator.start();
    uiManager.updateModulationIndicator(true);
}

