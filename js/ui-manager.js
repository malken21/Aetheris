export class UIManager {
    constructor() {
        this.playButton = document.getElementById('play-pause-btn');
        this.autoModToggle = document.getElementById('auto-modulate-toggle');
        this.layerControls = ['rain', 'wind', 'fire', 'brown'];
    }

    bindPlayButton(handler) {
        this.playButton.addEventListener('click', handler);
    }

    bindAutoModToggle(handler) {
        this.autoModToggle.addEventListener('change', handler);
    }

    bindLayerControls(onToggle, onVolumeChange) {
        this.layerControls.forEach(name => {
            const toggle = document.getElementById(`${name}-toggle`);
            const slider = document.getElementById(`${name}-vol`);

            toggle.addEventListener('change', () => {
                const isChecked = toggle.checked;
                this.updateCardVisual(name, isChecked);
                onToggle(name, isChecked);
            });

            slider.addEventListener('input', () => {
                const val = parseFloat(slider.value);
                onVolumeChange(name, val);
            });
        });
    }

    getLayerState(name) {
        const toggle = document.getElementById(`${name}-toggle`);
        const slider = document.getElementById(`${name}-vol`);
        return {
            enabled: toggle.checked,
            volume: parseFloat(slider.value)
        };
    }

    setLayerVolume(name, value) {
        const slider = document.getElementById(`${name}-vol`);
        slider.value = value;
    }

    updateCardVisual(name, isActive) {
        const card = document.querySelector(`.sound-card[data-layer="${name}"]`);
        if (isActive) {
            card.style.borderColor = "var(--primary-accent)";
            card.style.boxShadow = "0 0 20px rgba(100, 255, 218, 0.1)";
        } else {
            card.style.borderColor = "var(--card-border)";
            card.style.boxShadow = "none";
        }
    }

    updatePlayButtonState(isRunning) {
        if (isRunning) {
            this.playButton.classList.add('active');
            this.playButton.querySelector('.icon').textContent = '⏸';
            // Use lastChild specifically as in original code, but cleaner finding of text node would be better.
            // Original: playButton.childNodes[playButton.childNodes.length - 1].textContent = " 一時停止";
            // Let's assume the structure is stable or try to find the text node.
            // For safety, let's stick to the original logic which seemed to work for them.
            const textNode = Array.from(this.playButton.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
            if (textNode) textNode.textContent = " 一時停止";
        } else {
            this.playButton.classList.remove('active');
            this.playButton.querySelector('.icon').textContent = '▶';
            const textNode = Array.from(this.playButton.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
            if (textNode) textNode.textContent = " 再開";
        }
    }

    updateModulationIndicator(isActive) {
        const indicator = document.querySelector('.indicator');
        indicator.style.color = isActive ? 'var(--primary-accent)' : 'var(--secondary-accent)';
    }

    // Initial sync from DOM state
    initVisuals() {
        this.layerControls.forEach(name => {
            const toggle = document.getElementById(`${name}-toggle`);
            this.updateCardVisual(name, toggle.checked);
        });
    }
}
