/**
 * Scoreboard Module
 * Allows users to keep score for multiple teams
 */

class ScoreboardInstance {
    constructor(id, manager, config = {}) {
        this.id = id;
        this.manager = manager;
        this.config = {
            title: '',
            teams: [
                { name: 'Team A', score: 0 },
                { name: 'Team B', score: 0 }
            ],
            ...config
        };

        // UI
        this.element = null;
        this.dragOffset = { x: 0, y: 0 };
        this.isDragging = false;

        this.createElement();
    }

    createElement() {
        const div = document.createElement('div');
        div.className = 'scoreboard-widget feature-widget';
        div.id = `scoreboard-${this.id}`;

        // Default position
        const offset = (this.id % 5) * 20;
        div.style.left = `${window.innerWidth / 2 - 150 + offset}px`;
        div.style.top = `${window.innerHeight / 2 - 100 + offset}px`;

        const title = this.config.title || window.i18n.t('scoreboard.title');

        div.innerHTML = `
            <div class="scoreboard-header">
                <span class="scoreboard-title">${title}</span>
                <div class="scoreboard-controls-top">
                    <button class="scoreboard-icon-btn scoreboard-add-team-btn" title="${window.i18n.t('scoreboard.addTeam')}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <button class="scoreboard-icon-btn scoreboard-reset-btn" title="${window.i18n.t('scoreboard.reset')}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                            <path d="M21 3v5h-5"></path>
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                            <path d="M3 21v-5h5"></path>
                        </svg>
                    </button>
                    <button class="scoreboard-icon-btn scoreboard-close-btn" title="${window.i18n.t('common.close')}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="scoreboard-content">
                <!-- Teams will be injected here -->
            </div>
        `;

        document.body.appendChild(div);
        this.element = div;

        this.renderTeams();
        this.setupEvents();
    }

    renderTeams() {
        const container = this.element.querySelector('.scoreboard-content');
        container.innerHTML = '';

        this.config.teams.forEach((team, index) => {
            const col = document.createElement('div');
            col.className = 'score-column';
            col.dataset.index = index;

            col.innerHTML = `
                <div class="score-team-name" contenteditable="true">${team.name}</div>
                <div class="score-value">${team.score}</div>
                <div class="score-controls">
                    <button class="score-btn minus">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <button class="score-btn plus">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                </div>
                <button class="score-remove-btn" title="${window.i18n.t('scoreboard.removeTeam')}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;

            // Name edit
            const nameEl = col.querySelector('.score-team-name');
            nameEl.addEventListener('blur', (e) => {
                this.config.teams[index].name = e.target.textContent;
            });
            nameEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });

            // Score controls
            col.querySelector('.score-btn.minus').addEventListener('click', () => {
                this.config.teams[index].score--;
                this.updateScore(index);
            });

            col.querySelector('.score-btn.plus').addEventListener('click', () => {
                this.config.teams[index].score++;
                this.updateScore(index);
            });

            // Remove team button
            const removeBtn = col.querySelector('.score-remove-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(window.i18n.t('scoreboard.confirmRemoveTeam'))) {
                        this.removeTeam(index);
                    }
                });
            }

            container.appendChild(col);
        });
    }

    updateScore(index) {
        const col = this.element.querySelector(`.score-column[data-index="${index}"]`);
        if (col) {
            col.querySelector('.score-value').textContent = this.config.teams[index].score;
        }
    }

    addTeam() {
        const newIndex = this.config.teams.length;
        this.config.teams.push({
            name: `${window.i18n.t('scoreboard.teamDefault')} ${String.fromCharCode(65 + newIndex)}`,
            score: 0
        });
        this.renderTeams();
    }

    removeTeam(index) {
        if (this.config.teams.length <= 1) return; // Keep at least one
        this.config.teams.splice(index, 1);
        this.renderTeams();
    }

    resetScores() {
        this.config.teams.forEach(t => t.score = 0);
        this.renderTeams();
    }

    setupEvents() {
        // Dragging
        const header = this.element.querySelector('.scoreboard-header');

        const startDrag = (e) => {
            if (e.target.closest('button')) return;
            // Stop propagation to prevent drawing
            e.stopPropagation();

            this.isDragging = true;
            this.element.classList.add('dragging');

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const rect = this.element.getBoundingClientRect();
            this.dragOffset.x = clientX - rect.left;
            this.dragOffset.y = clientY - rect.top;

            e.preventDefault();
        };

        const doDrag = (e) => {
            if (!this.isDragging) return;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            let x = clientX - this.dragOffset.x;
            let y = clientY - this.dragOffset.y;

            const rect = this.element.getBoundingClientRect();
            x = Math.max(0, Math.min(window.innerWidth - rect.width, x));
            y = Math.max(0, Math.min(window.innerHeight - rect.height, y));

            this.element.style.left = `${x}px`;
            this.element.style.top = `${y}px`;
        };

        const stopDrag = () => {
            this.isDragging = false;
            this.element.classList.remove('dragging');
        };

        header.addEventListener('mousedown', startDrag);
        header.addEventListener('touchstart', startDrag);

        document.addEventListener('mousemove', doDrag);
        document.addEventListener('touchmove', doDrag, { passive: false });

        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);

        // Buttons
        this.element.querySelector('.scoreboard-close-btn').addEventListener('click', () => {
            this.destroy();
        });

        this.element.querySelector('.scoreboard-add-team-btn').addEventListener('click', () => {
            this.addTeam();
        });

        this.element.querySelector('.scoreboard-reset-btn').addEventListener('click', () => {
            if (confirm(window.i18n.t('scoreboard.confirmReset'))) {
                this.resetScores();
            }
        });
    }

    destroy() {
        this.element.remove();
        this.manager.remove(this.id);
    }
}

class ScoreboardManager {
    constructor() {
        this.instances = new Map();
        this.nextId = 1;
    }

    create() {
        const id = this.nextId++;
        const instance = new ScoreboardInstance(id, this);
        this.instances.set(id, instance);
    }

    remove(id) {
        this.instances.delete(id);
    }
}

// Export
if (typeof window !== 'undefined') {
    window.ScoreboardManager = ScoreboardManager;
}
