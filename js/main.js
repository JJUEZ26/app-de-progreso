/**
 * Main application entry point.
 */
import { Dashboard } from './ui/dashboard.js';
import { Chat } from './ui/chat.js';
import { PetUI } from './ui/pet_ui.js';
import { migrateData } from './migrate.js';
import { setupDemoData } from './demo.js';

const DOM = {
    navButtons: document.querySelectorAll('.nav-btn'),
    views: document.querySelectorAll('.view'),
    viewTitle: document.getElementById('view-title'),
    btnNewGoal: document.getElementById('btn-new-goal'),
    modalGoal: document.getElementById('modal-goal'),
    btnCloseModal: document.querySelector('.modal-close'),
    btnCancelModal: document.querySelector('.btn-cancel'),
    selectTheme: document.getElementById('select-theme'),
    inputApiKey: document.getElementById('input-api-key')
};

const Views = {
    DASHBOARD: 'dashboard',
    ASSISTANT: 'assistant',
    SETTINGS: 'settings'
};

function init() {
    // 1. Data Migration & Demo
    migrateData();
    setupDemoData();

    // 2. Setup UI
    setupNavigation();
    setupEventListeners();
    applyTheme();
    Chat.init();
    PetUI.init();

    // 3. Initial View & Render
    switchView(Views.DASHBOARD);
    Dashboard.render();
}

function setupNavigation() {
    DOM.navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });
}

function switchView(viewId) {
    // Update buttons
    DOM.navButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    // Update visibility
    DOM.views.forEach(view => {
        view.classList.toggle('hidden', view.id !== `view-${viewId}`);
    });

    // Update title
    const titles = {
        [Views.DASHBOARD]: 'Mi Dashboard',
        [Views.ASSISTANT]: 'Asistente IA',
        [Views.SETTINGS]: 'Ajustes',
        pet: 'Mi Mascota'
    };
    DOM.viewTitle.textContent = titles[viewId] || 'MetaLogic';
}

function setupEventListeners() {
    // New Goal Modal
    DOM.btnNewGoal.addEventListener('click', () => {
        DOM.modalGoal.classList.remove('hidden');
    });

    [DOM.btnCloseModal, DOM.btnCancelModal].forEach(btn => {
        btn.addEventListener('click', () => {
            DOM.modalGoal.classList.add('hidden');
        });
    });

    // Theme Selector
    DOM.selectTheme.addEventListener('change', (e) => {
        const settings = Storage.getSettings();
        settings.theme = e.target.value;
        Storage.saveSettings(settings);
        applyTheme();
    });

    // API Key Save
    DOM.inputApiKey.addEventListener('change', (e) => {
        const settings = Storage.getSettings();
        settings.apiKey = e.target.value;
        Storage.saveSettings(settings);
    });

    // Load API Key initial value
    const settings = Storage.getSettings();
    if (settings.apiKey) DOM.inputApiKey.value = settings.apiKey;
}

function applyTheme() {
    const settings = Storage.getSettings();
    document.body.className = settings.theme === 'dark' ? 'dark-theme' : 'light-theme';
    DOM.selectTheme.value = settings.theme;
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
