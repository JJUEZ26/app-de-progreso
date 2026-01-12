/**
 * Data migration from old Writer's Dashboard to new MetaLogic format.
 */
import { Storage } from './data/storage.js';
import { GOAL_TYPES, GoalFactory, PRIORITIES } from './data/models.js';

const OLD_PROJECT_KEY = "writerDashboard_project";
const OLD_SESSIONS_KEY = "writerDashboard_sessions_proj_001";

export function migrateData() {
    try {
        const oldProjectString = localStorage.getItem(OLD_PROJECT_KEY);
        const oldSessionsString = localStorage.getItem(OLD_SESSIONS_KEY);

        if (!oldProjectString) return;

        const oldProject = JSON.parse(oldProjectString);
        const oldSessions = oldSessionsString ? JSON.parse(oldSessionsString) : [];

        // Check if already migrated
        const existingGoals = Storage.getGoals();
        if (existingGoals.some(g => g.id === 'migrated_writer_proj')) return;

        console.log('Migrando datos antiguos de Escritura...');

        // Calculate current words from sessions
        let totalWords = 0;
        oldSessions.forEach(s => {
            if (s.words) totalWords += parseInt(s.words);
        });

        const newGoal = GoalFactory.create(GOAL_TYPES.QUANTITATIVE, {
            title: oldProject.name || 'Proyecto de Escritura',
            targetValue: oldProject.targetWords || 50000,
            currentValue: totalWords,
            unit: 'palabras',
            category: 'Escritura',
            priority: PRIORITIES.HIGH,
            startDate: oldProject.startDate
        });

        // Set persistent ID to avoid repeat migration
        newGoal.id = 'migrated_writer_proj';

        // Save
        Storage.saveGoal(newGoal);

        // Optionally clear old data? Better keep it for safety but rename keys or just leave it.
    } catch (e) {
        console.error('Error during migration', e);
    }
}
