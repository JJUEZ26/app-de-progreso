/**
 * Heuristic NLP Parser for extracting goal data from text.
 */
export const Parser = {
    parse(text) {
        text = text.toLowerCase();

        const data = {
            title: text,
            targetValue: null,
            unit: null,
            frequency: null,
            weeks: null,
            months: null,
            type: null
        };

        // 1. Detect Goal Type
        if (text.includes('diario') || text.includes('cada día') || text.includes('semanal')) {
            data.type = 'habit';
        } else if (text.includes('proyecto') || text.includes('hitos') || text.includes('preparar') || text.includes('maratón')) {
            data.type = 'project';
        } else {
            data.type = 'quantitative';
        }

        // 2. Extract Numbers & Units (e.g., "300 páginas", "$1000", "5 km")
        const valMatch = text.match(/(\d+)\s*(páginas|paginas|km|m|palabras|\$|euros|€|kg|minutos)/i);
        if (valMatch) {
            data.targetValue = parseInt(valMatch[1]);
            data.unit = valMatch[2];
        } else {
            // Check for currency prefix e.g. "$500"
            const curMatch = text.match(/[\$€]\s*(\d+)/);
            if (curMatch) {
                data.targetValue = parseInt(curMatch[1]);
                data.unit = text.includes('$') ? '$' : '€';
            }
        }

        // 3. Extract Timeframes (e.g., "3 semanas", "2 meses")
        const weekMatch = text.match(/(\d+)\s*semana/);
        if (weekMatch) data.weeks = parseInt(weekMatch[1]);

        const monthMatch = text.match(/(\d+)\s*mes/);
        if (monthMatch) data.months = parseInt(monthMatch[1]);

        // 4. Extract Frequency
        if (text.includes('diario') || text.includes('cada día')) data.frequency = 'daily';
        if (text.includes('3 veces por semana')) data.frequency = '3pw';

        return data;
    },

    needsClarification(parsedData) {
        const issues = [];
        if (!parsedData.targetValue && parsedData.type !== 'habit') issues.push('cantidad');
        if (!parsedData.weeks && !parsedData.months && parsedData.type !== 'habit') issues.push('plazo');
        return issues;
    }
};
