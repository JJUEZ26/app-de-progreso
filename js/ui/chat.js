import { Parser } from '../nlp/parser.js';
import { Planner } from '../planner/engine.js';
import { Storage } from '../data/storage.js';
import { GoalFactory, GOAL_TYPES } from '../data/models.js';
import { Dashboard } from './dashboard.js';
import { AIService } from '../services/ai.js';

const DOM = {
    messages: document.getElementById('chat-messages'),
    input: document.getElementById('chat-input'),
    btnSend: document.getElementById('btn-send-chat')
};

export const Chat = {
    state: {
        awaitingClarification: null,
        lastParsed: null
    },

    init() {
        DOM.btnSend.addEventListener('click', () => this.handleSendMessage());
        DOM.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSendMessage();
        });
    },

    handleSendMessage() {
        const text = DOM.input.value.trim();
        if (!text) return;

        this.addMessage(text, 'user');
        DOM.input.value = '';

        setTimeout(() => this.processMessage(text), 500);
    },

    addMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `message ${sender}`;
        div.textContent = text;
        DOM.messages.appendChild(div);
        DOM.messages.scrollTop = DOM.messages.scrollHeight;
    },

    processMessage(text) {
        // If we were waiting for clarification
        if (this.state.awaitingClarification) {
            this.handleClarification(text);
            return;
        }

        const parsed = Parser.parse(text);
        const issues = Parser.needsClarification(parsed);

        if (issues.length > 0) {
            this.state.awaitingClarification = issues[0];
            this.state.lastParsed = parsed;
            this.addMessage(`¡Suena bien! Pero necesito saber un detalle: ¿Cuál es el ${this.state.awaitingClarification} objetivo?`, 'assistant');
        } else {
            this.proposePlan(parsed);
        }
    },

    handleClarification(text) {
        const issue = this.state.awaitingClarification;
        const parsed = this.state.lastParsed;

        if (issue === 'cantidad') {
            const val = parseInt(text.match(/\d+/)?.[0]);
            parsed.targetValue = val;
        } else if (issue === 'plazo') {
            const weeks = parseInt(text.match(/\d+/)?.[0]);
            parsed.weeks = weeks;
        }

        this.state.awaitingClarification = null;
        this.proposePlan(parsed);
    },

    async proposePlan(parsed) {
        // Try AI first for general motivation or complex advice
        const aiResponse = await AIService.askAI(parsed.title);
        if (aiResponse) {
            this.addMessage(aiResponse, 'assistant');
        }

        let plan = null;
        if (parsed.unit === 'páginas' || parsed.unit === 'paginas') {
            plan = Planner.suggestPlan('reading', { totalPages: parsed.targetValue, weeks: parsed.weeks || 4 });
        } else if (parsed.unit === '$' || parsed.unit === 'euros') {
            plan = Planner.suggestPlan('savings', { amount: parsed.targetValue, months: parsed.months || 3, unit: parsed.unit });
        } else if (parsed.type === 'project') {
            plan = Planner.suggestPlan('marathon', { months: parsed.months || 3 });
        }

        if (plan) {
            this.addMessage(`¡Basado en tu meta, he generado un plan: "${plan.title}"! ${plan.description} ¿Te gustaría activarlo?`, 'assistant');
            this.addConfirmButtons(plan);
        } else if (!aiResponse) {
            this.addMessage("Entiendo. Vamos a crear esa meta. ¿Confirmas los detalles?", "assistant");
        }
    },

    addConfirmButtons(planData) {
        const div = document.createElement('div');
        div.className = 'chat-actions';

        const btnYes = document.createElement('button');
        btnYes.className = 'btn btn-primary';
        btnYes.textContent = 'Sí, crear meta';
        btnYes.onclick = () => {
            const type = planData.milestones ? GOAL_TYPES.PROJECT : GOAL_TYPES.QUANTITATIVE;
            const newGoal = GoalFactory.create(type, planData);
            Storage.saveGoal(newGoal);
            this.addMessage("¡Hecho! La meta ha sido añadida a tu dashboard.", "assistant");
            Dashboard.render();
            div.remove();
        };

        const btnNo = document.createElement('button');
        btnNo.className = 'btn btn-secondary';
        btnNo.textContent = 'No, ajustar';
        btnNo.onclick = () => {
            this.addMessage("Vale, cuéntame qué cambio quieres hacer.", "assistant");
            div.remove();
        };

        div.appendChild(btnYes);
        div.appendChild(btnNo);
        DOM.messages.appendChild(div);
    }
};
