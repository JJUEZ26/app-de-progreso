/**
 * Storage module for the Goal Tracking App.
 * Handles persistence using localStorage.
 */

const KEYS = {
    GOALS: 'goal_app_goals',
    SETTINGS: 'goal_app_settings',
    PET: 'goal_app_pet'
};

export const Storage = {
    /**
     * Get all goals from storage.
     * @returns {Array} Array of goal objects.
     */
    getGoals() {
        try {
            const data = localStorage.getItem(KEYS.GOALS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error loading goals from storage', e);
            return [];
        }
    },

    /**
     * Save all goals to storage.
     * @param {Array} goals Array of goal objects.
     */
    saveGoals(goals) {
        try {
            localStorage.setItem(KEYS.GOALS, JSON.stringify(goals));
        } catch (e) {
            console.error('Error saving goals to storage', e);
        }
    },

    /**
     * Add or update a single goal.
     * @param {Object} goal Goal object.
     */
    saveGoal(goal) {
        const goals = this.getGoals();
        const index = goals.findIndex(g => g.id === goal.id);
        if (index !== -1) {
            goals[index] = goal;
        } else {
            goals.push(goal);
        }
        this.saveGoals(goals);
    },

    /**
     * Remove a goal by ID.
     * @param {string|number} id Goal ID.
     */
    deleteGoal(id) {
        const goals = this.getGoals().filter(g => g.id !== id);
        this.saveGoals(goals);
    },

    /**
     * Get app settings.
     * @returns {Object} Settings object.
     */
    getSettings() {
        try {
            const data = localStorage.getItem(KEYS.SETTINGS);
            return data ? JSON.parse(data) : { theme: 'light' };
        } catch (e) {
            return { theme: 'light' };
        }
    },

    /**
     * Save app settings.
     * @param {Object} settings Settings object.
     */
    saveSettings(settings) {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    },

    /**
     * Get pet state.
     */
    getPet() {
        try {
            const data = localStorage.getItem(KEYS.PET);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Save pet state.
     */
    savePet(pet) {
        localStorage.setItem(KEYS.PET, JSON.stringify(pet));
    }
};
