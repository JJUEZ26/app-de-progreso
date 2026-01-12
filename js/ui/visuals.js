/**
 * Visualizations for goals.
 */

export const Visuals = {
    renderCircularProgress(container, percent, label) {
        const radius = 40;
        const circ = 2 * Math.PI * radius;
        const offset = circ - (percent / 100) * circ;

        container.innerHTML = `
            <div class="circular-progress">
                <svg width="100" height="100">
                    <circle class="bg" cx="50" cy="50" r="${radius}"></circle>
                    <circle class="fg" cx="50" cy="50" r="${radius}" 
                            style="stroke-dasharray: ${circ}; stroke-dashoffset: ${offset}"></circle>
                </svg>
                <div class="inner">
                    <strong>${percent}%</strong>
                    <small>${label}</small>
                </div>
            </div>
        `;
    },

    renderHabitCalendar(container, history) {
        // Simplified calendar: just a row of last 7 days for now
        const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
        const today = new Date();
        let html = '<div class="habit-calendar">';

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const active = history.some(h => h.date === dateStr);
            const dayName = days[d.getDay()];

            html += `
                <div class="day-dot ${active ? 'active' : ''}" title="${dateStr}">
                    <span>${dayName}</span>
                    <div class="dot"></div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
    },

    renderTimeline(container, milestones) {
        if (!milestones || milestones.length === 0) {
            container.innerHTML = '<p class="empty">Sin hitos definidos.</p>';
            return;
        }

        let html = '<div class="timeline">';
        milestones.forEach(m => {
            html += `
                <div class="timeline-item ${m.completed ? 'completed' : ''}">
                    <div class="marker"></div>
                    <div class="content">
                        <strong>${m.title}</strong>
                        <small>${m.dueDate || ''}</small>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }
};
