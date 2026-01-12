/**
 * Logic for calculating complex progress metrics.
 */
import { GOAL_TYPES } from '../data/models.js';

export const Progress = {
    /**
     * Calculate all metrics for a goal.
     */
    calculateMetrics(goal) {
        const history = goal.history || [];

        const metrics = {
            percent: 0,
            label: '',
            streak: 0,
            adherence: 0,
            totalValue: 0
        };

        switch (goal.type) {
            case GOAL_TYPES.HABIT:
                metrics.streak = this.calculateStreak(history);
                metrics.adherence = this.calculateAdherence(history, goal.startDate);
                metrics.percent = metrics.adherence;
                metrics.label = `${metrics.streak} días racha / ${metrics.adherence}%`;
                break;

            case GOAL_TYPES.QUANTITATIVE:
                metrics.totalValue = goal.currentValue || 0;
                metrics.percent = Math.min(100, Math.floor((metrics.totalValue / goal.targetValue) * 100));
                metrics.label = `${metrics.totalValue} / ${goal.targetValue} ${goal.unit}`;
                break;

            case GOAL_TYPES.PROJECT:
                const total = goal.milestones?.length || 0;
                const done = goal.milestones?.filter(m => m.completed).length || 0;
                metrics.percent = total > 0 ? Math.floor((done / total) * 100) : 0;
                metrics.label = `${done} / ${total} hitos`;
                break;
        }

        return metrics;
    },

    calculateStreak(history) {
        if (!history || history.length === 0) return 0;

        // Simple streak: consecutive days in history
        const sortedDates = [...new Set(history.map(h => h.date))].sort().reverse();
        let streak = 0;
        let today = new Date().toISOString().split('T')[0];
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday = yesterday.toISOString().split('T')[0];

        // If last record is not today or yesterday, streak is 0
        if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;

        for (let i = 0; i < sortedDates.length; i++) {
            const current = new Date(sortedDates[i]);
            const expected = new Date();
            expected.setDate(new Date().getDate() - i);

            // Allow checking from today or yesterday
            if (i === 0 && sortedDates[i] === yesterday) {
                // started from yesterday
            }

            // This is a simplified version, actually checking if dates are sequential
            if (i > 0) {
                const prev = new Date(sortedDates[i - 1]);
                const diff = (prev - current) / (1000 * 60 * 60 * 24);
                if (diff === 1) {
                    streak++;
                } else {
                    break;
                }
            } else {
                streak = 1;
            }
        }
        return streak;
    },

    calculateAdherence(history, startDate) {
        if (!history || history.length === 0) return 0;
        const start = new Date(startDate);
        const today = new Date();
        const daysSinceStart = Math.max(1, Math.ceil((today - start) / (1000 * 60 * 60 * 24)));
        const uniqueDays = new Set(history.map(h => h.date)).size;
        return Math.min(100, Math.floor((uniqueDays / daysSinceStart) * 100));
    }
};
