/**
 * Demo Data Generator.
 */
import { Storage } from './data/storage.js';
import { GOAL_TYPES, GoalFactory, PRIORITIES } from './data/models.js';

export function setupDemoData() {
    const goals = Storage.getGoals();
    if (goals.length > 0) return; // Don't overwrite existing data

    console.log('Generando datos demo...');

    // 1. Habit: Meditate
    const habit = GoalFactory.create(GOAL_TYPES.HABIT, {
        title: 'Meditar diario',
        category: 'Salud',
        priority: PRIORITIES.HIGH,
        frequency: 'daily',
        history: [
            { date: getRelativeDate(-3), value: 1 },
            { date: getRelativeDate(-2), value: 1 },
            { date: getRelativeDate(-1), value: 1 },
            { date: getRelativeDate(0), value: 1 }
        ]
    });

    // 2. Quantitative: Save Money
    const quant = GoalFactory.create(GOAL_TYPES.QUANTITATIVE, {
        title: 'Ahorrar para vacaciones',
        targetValue: 1000,
        currentValue: 450,
        unit: '$',
        category: 'Finanzas',
        priority: PRIORITIES.MEDIUM
    });

    // 3. Project: Prep Thesis
    const project = GoalFactory.create(GOAL_TYPES.PROJECT, {
        title: 'Preparar tesis',
        category: 'Estudios',
        priority: PRIORITIES.HIGH,
        milestones: [
            { id: '1', title: 'Propuesta aprobada', completed: true, dueDate: getRelativeDate(-10) },
            { id: '2', title: 'Marco teórico', completed: true, dueDate: getRelativeDate(-5) },
            { id: '3', title: 'Recolección de datos', completed: false, dueDate: getRelativeDate(10) },
            { id: '4', title: 'Análisis y conclusiones', completed: false, dueDate: getRelativeDate(30) }
        ]
    });

    Storage.saveGoals([habit, quant, project]);
}

function getRelativeDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
}
