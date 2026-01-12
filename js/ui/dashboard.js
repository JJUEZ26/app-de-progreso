/**
 * UI Module for the Dashboard view.
 */
import { Storage } from '../data/storage.js';
import { GOAL_TYPES } from '../data/models.js';
import { Progress } from '../data/progress.js';
import { Visuals } from './visuals.js';
import { PetLogic } from '../data/pet.js';
import { PetUI } from './pet_ui.js';

const DOM = {
    goalsGrid: document.getElementById('goals-grid'),
    statActive: document.getElementById('stat-active-count'),
    statStreak: document.getElementById('stat-global-streak'),
    statCompleted: document.getElementById('stat-completed-count')
};

export const Dashboard = {
    render() {
        const goals = Storage.getGoals();
        this.updateStats(goals);

        if (goals.length === 0) {
            DOM.goalsGrid.innerHTML = `
                <div class="empty-state">
                    <p>No tienes metas activas. ¡Habla con el asistente para crear una!</p>
                </div>
            `;
            return;
        }

        DOM.goalsGrid.innerHTML = '';
        goals.forEach(goal => {
            const card = this.createGoalCard(goal);
            DOM.goalsGrid.appendChild(card);
            this.renderVisuals(goal, card);
        });

        this.setupDashboardEvents();
    },

    setupDashboardEvents() {
        DOM.goalsGrid.querySelectorAll('.btn-log').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleQuickLog(e.target.dataset.id));
        });
    },

    handleQuickLog(goalId) {
        const goals = Storage.getGoals();
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return;

        // Add to history
        const today = new Date().toISOString().split('T')[0];
        if (!goal.history) goal.history = [];

        goal.history.push({ date: today, value: 1 });

        if (goal.type === GOAL_TYPES.QUANTITATIVE) {
            goal.currentValue = (goal.currentValue || 0) + 1;
        }

        Storage.saveGoal(goal);

        // REWARD: PET
        let pet = Storage.getPet();
        if (pet) {
            const updatedPet = PetLogic.addRewards(pet, 1);
            Storage.savePet(updatedPet);
            // We don't need to call PetUI.render here since it ticks every minute 
            // but for immediate feedback:
            PetUI.render(updatedPet);
            alert("¡Buen trabajo! Has ganado 1 Galleta Meta y experiencia para tu mascota.");
        }

        this.render();
    },

    updateStats(goals) {
        const active = goals.filter(g => g.status === 'active').length;
        const completed = goals.filter(g => g.status === 'completed').length;

        // Calculate global streak (highest streak among habits)
        const streaks = goals
            .filter(g => g.type === GOAL_TYPES.HABIT)
            .map(g => Progress.calculateMetrics(g).streak);
        const maxStreak = streaks.length > 0 ? Math.max(...streaks) : 0;

        DOM.statActive.textContent = active;
        DOM.statCompleted.textContent = completed;
        DOM.statStreak.textContent = `${maxStreak} días`;
    },

    createGoalCard(goal) {
        const div = document.createElement('div');
        div.className = `card goal-card ${goal.type}`;
        div.dataset.id = goal.id;

        const metrics = Progress.calculateMetrics(goal);

        div.innerHTML = `
            <div class="goal-header">
                <span class="badge ${goal.priority}">${goal.priority}</span>
                <h3 class="goal-title">${goal.title}</h3>
                <small class="category">${goal.category}</small>
            </div>
            
            <div class="goal-body">
                <div class="visual-container"></div>
                ${goal.type !== GOAL_TYPES.HABIT ? `
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${metrics.percent}%"></div>
                </div>
                ` : ''}
                <div class="metrics-info">
                    <span class="progress-label">${metrics.label}</span>
                </div>
            </div>
            
            <footer class="goal-footer">
                <button class="btn btn-sm btn-primary btn-log" data-id="${goal.id}">+ Registrar</button>
                <button class="btn btn-sm btn-secondary btn-edit" data-id="${goal.id}">⚙️</button>
            </footer>
        `;

        return div;
    },

    renderVisuals(goal, card) {
        const container = card.querySelector('.visual-container');
        const metrics = Progress.calculateMetrics(goal);

        switch (goal.type) {
            case GOAL_TYPES.HABIT:
                Visuals.renderHabitCalendar(container, goal.history || []);
                break;
            case GOAL_TYPES.QUANTITATIVE:
                Visuals.renderCircularProgress(container, metrics.percent, metrics.label);
                break;
            case GOAL_TYPES.PROJECT:
                Visuals.renderTimeline(container, goal.milestones || []);
                break;
        }
    }
};
