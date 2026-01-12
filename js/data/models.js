/**
 * Goal models and utilities.
 */

export const GOAL_TYPES = {
    HABIT: 'habit',
    QUANTITATIVE: 'quantitative',
    PROJECT: 'project'
};

export const PRIORITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
};

/**
 * Base Goal Structure
 * {
 *   id: string,
 *   type: GOAL_TYPES,
 *   title: string,
 *   description: string,
 *   category: string,
 *   priority: PRIORITIES,
 *   startDate: string (ISO),
 *   endDate: string (ISO),
 *   status: 'active' | 'paused' | 'completed',
 *   history: Array<{date: string, value: number, note: string}>,
 *   
 *   // Type specific fields:
 *   // HABIT:
 *   frequency: 'daily' | 'weekly' | string (cron-like),
 *   targetStreak: number,
 *   
 *   // QUANTITATIVE:
 *   targetValue: number,
 *   currentValue: number,
 *   unit: string (e.g., '$', 'pages', 'km'),
 *   
 *   // PROJECT:
 *   milestones: Array<{id: string, title: string, completed: boolean, dueDate: string}>,
 *   tasks: Array<{id: string, title: string, completed: boolean}>
 * }
 */

export class GoalFactory {
    static create(type, data = {}) {
        const base = {
            id: Date.now().toString(),
            type,
            title: data.title || 'Nueva Meta',
            description: data.description || '',
            category: data.category || 'General',
            priority: data.priority || PRIORITIES.MEDIUM,
            startDate: data.startDate || new Date().toISOString().split('T')[0],
            endDate: data.endDate || null,
            status: 'active',
            history: [],
            createdAt: new Date().toISOString()
        };

        switch (type) {
            case GOAL_TYPES.HABIT:
                return {
                    ...base,
                    frequency: data.frequency || 'daily',
                    targetStreak: data.targetStreak || 30,
                    adherence: 0
                };
            case GOAL_TYPES.QUANTITATIVE:
                return {
                    ...base,
                    targetValue: data.targetValue || 100,
                    currentValue: data.currentValue || 0,
                    unit: data.unit || 'uds'
                };
            case GOAL_TYPES.PROJECT:
                return {
                    ...base,
                    milestones: data.milestones || [],
                    tasks: data.tasks || []
                };
            default:
                throw new Error(`Unknown goal type: ${type}`);
        }
    }
}
