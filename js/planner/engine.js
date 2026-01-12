/**
 * Planner Engine for Goal templates and breakdowns.
 */
import { GOAL_TYPES } from '../data/models.js';

export const TEMPLATES = {
    READING: {
        id: 'tpl_reading',
        name: 'Leer X páginas en Y semanas',
        type: GOAL_TYPES.QUANTITATIVE,
        generate: (params) => {
            const { totalPages, weeks } = params;
            const dailyPages = Math.ceil(totalPages / (weeks * 7));
            return {
                title: `Leer ${totalPages} páginas`,
                targetValue: totalPages,
                unit: 'páginas',
                description: `Meta diaria sugerida: ${dailyPages} páginas.`,
                suggestedDaily: dailyPages
            };
        }
    },
    SAVINGS: {
        id: 'tpl_savings',
        name: 'Ahorrar X en Y meses',
        type: GOAL_TYPES.QUANTITATIVE,
        generate: (params) => {
            const { amount, months, unit = '$' } = params;
            const monthlyAmount = Math.ceil(amount / months);
            return {
                title: `Ahorrar ${unit}${amount}`,
                targetValue: amount,
                unit: unit,
                description: `Meta mensual: ${unit}${monthlyAmount}.`,
                suggestedMonthly: monthlyAmount
            };
        }
    },
    MARATHON: {
        id: 'tpl_marathon',
        name: 'Entrenar para carrera en Y meses',
        type: GOAL_TYPES.PROJECT,
        generate: (params) => {
            const { months } = params;
            const weeks = months * 4;
            const milestones = [];
            for (let i = 1; i <= weeks; i++) {
                if (i % 4 === 0 || i === weeks) {
                    milestones.push({
                        id: `m_${i}`,
                        title: `Finalizar mes ${i / 4}: Carrera de prueba`,
                        completed: false,
                        dueDate: this.getFutureDate(i * 7)
                    });
                }
            }
            return {
                title: `Entrenamiento Carrera (${months} meses)`,
                milestones: milestones,
                description: 'Plan incremental semanal con descansos cada 4 semanas.'
            };
        }
    }
};

export const Planner = {
    getFutureDate(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    },

    suggestPlan(type, params) {
        if (type === 'reading') return TEMPLATES.READING.generate(params);
        if (type === 'savings') return TEMPLATES.SAVINGS.generate(params);
        if (type === 'marathon') return TEMPLATES.MARATHON.generate(params);
        return null;
    }
};
