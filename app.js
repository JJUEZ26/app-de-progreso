/* WRITER'S DASHBOARD APP
    Versión: 0.4.0 (Project Wizard & Config)
*/

// --- 1. CONFIGURACIÓN Y MODELO DE DATOS ---

const STORAGE_KEY_SESSIONS = "writerDashboard_sessions_proj_001";
const STORAGE_KEY_PROJECT = "writerDashboard_project";

// Plantilla por defecto (Inmutable)
const DEFAULT_PROJECT = {
    id: "proj_default",
    name: "Mi Nuevo Proyecto",
    targetWords: 50000,
    startDate: new Date().toISOString().split('T')[0],
    schedule: {
        workDays: [1, 2, 3, 4, 5], // 1=Lun ... 5=Vie, 6=Sab, 0=Dom
        hoursPerSession: 1,
        wordsPerHour: 500 
    },
    currentWords: 0,
    currentPercent: 0
};

// Estado global
let currentProject = { ...DEFAULT_PROJECT };
let sessions = []; 


// --- 2. REFERENCIAS AL DOM ---

const domElements = {
    // Dashboard Stats
    projectName: document.getElementById('project-name'),
    wordsProgress: document.getElementById('words-progress'),
    percentProgress: document.getElementById('percent-progress'),
    progressBar: document.getElementById('progress-bar-fill'),
    etaDate: document.getElementById('eta-date'),
    
    // Settings Display
    settingGoal: document.getElementById('setting-goal'),
    settingDays: document.getElementById('setting-days'),
    settingHours: document.getElementById('setting-hours'),
    settingWph: document.getElementById('setting-wph'),
    
    // Main Actions
    btnLogSession: document.getElementById('btn-log-session'),
    btnExplore: document.getElementById('btn-explore-scenarios'),
    btnOpenProjectWizard: document.getElementById('btn-open-project-wizard'),

    // --- Modal: Registrar Sesión ---
    modalSession: document.getElementById('modal-log-session'),
    btnCloseSessionModal: document.getElementById('btn-close-modal'), // Asegúrate de que el ID coincida en HTML
    btnCancelSession: document.getElementById('btn-cancel-session'),
    btnSaveSession: document.getElementById('btn-save-session'),
    inputSessionHours: document.getElementById('input-hours'),
    inputSessionWords: document.getElementById('input-words'),

    // --- Modal: Configurar Proyecto ---
    modalProject: document.getElementById('modal-project'),
    btnCloseProjectModal: document.getElementById('btn-close-project-modal'),
    btnCancelProject: document.getElementById('btn-cancel-project'),
    btnSaveProject: document.getElementById('btn-save-project'),
    inputProjectName: document.getElementById('input-project-name'),
    inputProjectTarget: document.getElementById('input-project-target'),
    inputProjectHours: document.getElementById('input-project-hours'),
    inputProjectWph: document.getElementById('input-project-wph'),
    // Checkboxes se seleccionarán dinámicamente por clase
};


// --- 3. LÓGICA DE NEGOCIO (Cálculos) ---

function calculateProgress(project, currentSessions) {
    let totalWords = 0;
    let totalMinutes = 0;

    currentSessions.forEach(session => {
        let sessionWords = 0;
        
        // Si hay palabras registradas las usamos, si no, estimamos
        if (session.words !== undefined && session.words !== null && session.words !== "") {
            sessionWords = parseInt(session.words);
        } else {
            sessionWords = (session.minutes / 60) * project.schedule.wordsPerHour;
        }

        totalWords += sessionWords;
        totalMinutes += session.minutes;
    });

    let percentage = 0;
    if (project.targetWords > 0) {
        percentage = Math.floor((totalWords / project.targetWords) * 100);
        if (percentage > 100) percentage = 100;
    }

    let averageWordsPerHour = 0;
    if (totalMinutes > 0) {
        const totalHours = totalMinutes / 60;
        averageWordsPerHour = Math.floor(totalWords / totalHours);
    } else {
        averageWordsPerHour = project.schedule.wordsPerHour;
    }

    return { totalWords, percentage, totalMinutes, averageWordsPerHour };
}

function estimateCompletionDate(project, currentStats, paceModifier = 1.0) {
    const remainingWords = project.targetWords - currentStats.totalWords;

    if (remainingWords <= 0) {
        return { remainingWords: 0, daysNeeded: 0, estimatedDate: "¡Completado!" };
    }

    const baseWordsPerHour = (currentStats.averageWordsPerHour > 0) 
        ? currentStats.averageWordsPerHour 
        : project.schedule.wordsPerHour;

    const effectiveWordsPerHour = baseWordsPerHour * paceModifier;
    const hoursPerSession = project.schedule.hoursPerSession;
    const sessionsPerWeek = project.schedule.workDays.length; 
    
    // Evitar división por cero
    if (effectiveWordsPerHour <= 0 || hoursPerSession <= 0 || sessionsPerWeek <= 0) {
        return { remainingWords, daysNeeded: Infinity, estimatedDate: "Configura tu ritmo" };
    }

    const wordsPerWeek = effectiveWordsPerHour * hoursPerSession * sessionsPerWeek;
    const weeksNeeded = remainingWords / wordsPerWeek;
    const daysNeeded = Math.ceil(weeksNeeded * 7); 

    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysNeeded);

    const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    const formattedDate = targetDate.toLocaleDateString('es-ES', dateOptions);

    return { remainingWords, daysNeeded, estimatedDate: formattedDate };
}


// --- 4. GESTIÓN DE DATOS (Storage) ---

function loadSessions() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_SESSIONS);
        return stored ? JSON.parse(stored) : null;
    } catch (e) { console.error(e); return null; }
}

function saveSessions(data) {
    try { localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(data)); } 
    catch (e) { console.error(e); }
}

function loadProject() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_PROJECT);
        return stored ? JSON.parse(stored) : null;
    } catch (e) { console.error(e); return null; }
}

function saveProject(data) {
    try { localStorage.setItem(STORAGE_KEY_PROJECT, JSON.stringify(data)); } 
    catch (e) { console.error(e); }
}


// --- 5. RENDERIZADO (Vista) ---

function renderDashboard() {
    // Usar siempre currentProject y sessions globales
    const stats = calculateProgress(currentProject, sessions);

    // Actualizar datos en memoria visual
    currentProject.currentWords = stats.totalWords;
    currentProject.currentPercent = stats.percentage;

    const eta = estimateCompletionDate(currentProject, stats, 1.0);

    const fmt = new Intl.NumberFormat('es-ES'); 
    
    // Project Card
    domElements.projectName.textContent = currentProject.name;
    domElements.wordsProgress.textContent = `${fmt.format(stats.totalWords)} / ${fmt.format(currentProject.targetWords)} palabras`;
    domElements.percentProgress.textContent = `${stats.percentage}%`;
    domElements.progressBar.style.width = `${stats.percentage}%`;
    domElements.etaDate.textContent = eta.estimatedDate;

    // Settings Card
    domElements.settingGoal.textContent = fmt.format(currentProject.targetWords);
    domElements.settingDays.textContent = `${currentProject.schedule.workDays.length} días/sem`;
    domElements.settingHours.textContent = `${currentProject.schedule.hoursPerSession}h/sesión`;
    
    const speedToShow = (stats.averageWordsPerHour > 0) ? stats.averageWordsPerHour : currentProject.schedule.wordsPerHour;
    const speedLabel = (stats.averageWordsPerHour > 0) ? "Real" : "Est.";
    domElements.settingWph.textContent = `${fmt.format(speedToShow)} pal/h (${speedLabel})`;
}


// --- 6. MODAL: REGISTRAR SESIÓN ---

function openSessionModal() {
    domElements.modalSession.classList.remove('hidden');
    // Pre-llenar con valores del proyecto actual
    domElements.inputSessionHours.value = currentProject.schedule.hoursPerSession;
    domElements.inputSessionWords.value = '';
    domElements.inputSessionHours.focus();
}

function closeSessionModal() {
    domElements.modalSession.classList.add('hidden');
}

function handleSaveSession() {
    const hours = parseFloat(domElements.inputSessionHours.value);
    const wordsInput = domElements.inputSessionWords.value;
    
    if (isNaN(hours) || hours <= 0) {
        alert("Horas inválidas"); return;
    }

    let words = 0;
    if (wordsInput && !isNaN(parseInt(wordsInput))) {
        words = parseInt(wordsInput);
    } else {
        words = Math.floor(hours * currentProject.schedule.wordsPerHour);
    }

    const newSession = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        minutes: hours * 60,
        words: words
    };

    sessions.push(newSession);
    saveSessions(sessions);
    renderDashboard();
    closeSessionModal();
}


// --- 7. MODAL: CONFIGURAR PROYECTO (WIZARD) ---

function openProjectModal() {
    domElements.modalProject.classList.remove('hidden');
    fillProjectModalFromCurrent();
}

function closeProjectModal() {
    domElements.modalProject.classList.add('hidden');
}

function fillProjectModalFromCurrent() {
    domElements.inputProjectName.value = currentProject.name;
    domElements.inputProjectTarget.value = currentProject.targetWords;
    domElements.inputProjectHours.value = currentProject.schedule.hoursPerSession;
    domElements.inputProjectWph.value = currentProject.schedule.wordsPerHour;

    // Checkboxes (Días)
    const checkboxes = document.querySelectorAll('.day-checkbox');
    const activeDays = currentProject.schedule.workDays; // Array de números [1, 3, 5...]

    checkboxes.forEach(chk => {
        const dayVal = parseInt(chk.value);
        if (activeDays.includes(dayVal)) {
            chk.checked = true;
        } else {
            chk.checked = false;
        }
    });
}

function handleSaveProject() {
    const name = domElements.inputProjectName.value.trim();
    const target = parseInt(domElements.inputProjectTarget.value);
    const hours = parseFloat(domElements.inputProjectHours.value);
    const wph = parseInt(domElements.inputProjectWph.value);

    // Obtener días seleccionados
    const checkboxes = document.querySelectorAll('.day-checkbox:checked');
    const selectedDays = Array.from(checkboxes).map(chk => parseInt(chk.value));

    // Validaciones
    if (!name) return alert("El nombre es obligatorio");
    if (isNaN(target) || target <= 0) return alert("Meta inválida");
    if (isNaN(hours) || hours <= 0) return alert("Horas inválidas");
    if (isNaN(wph) || wph <= 0) return alert("Palabras por hora inválidas");
    if (selectedDays.length === 0) return alert("Selecciona al menos un día de escritura");

    // Actualizar objeto proyecto
    const updatedProject = {
        ...currentProject,
        name: name,
        targetWords: target,
        schedule: {
            workDays: selectedDays,
            hoursPerSession: hours,
            wordsPerHour: wph
        }
    };

    // Guardar y Renderizar
    currentProject = updatedProject;
    saveProject(currentProject);
    renderDashboard();
    closeProjectModal();
}


// --- 8. INICIALIZACIÓN ---

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Cargar Proyecto
    const storedProject = loadProject();
    if (storedProject) {
        currentProject = storedProject;
    } else {
        currentProject = { ...DEFAULT_PROJECT };
    }

    // 2. Cargar Sesiones
    const storedSessions = loadSessions();
    if (storedSessions && storedSessions.length > 0) {
        sessions = storedSessions;
    } else {
        sessions = []; // Empezar limpio si no hay nada guardado
    }

    // 3. Render Inicial
    renderDashboard();

    // --- EVENT LISTENERS ---

    // Session Modal
    domElements.btnLogSession.addEventListener('click', openSessionModal);
    domElements.btnCloseSessionModal.addEventListener('click', closeSessionModal); // Botón X
    domElements.btnCancelSession.addEventListener('click', closeSessionModal);
    domElements.btnSaveSession.addEventListener('click', handleSaveSession);

    // Project Modal
    domElements.btnOpenProjectWizard.addEventListener('click', openProjectModal);
    domElements.btnCloseProjectModal.addEventListener('click', closeProjectModal);
    domElements.btnCancelProject.addEventListener('click', closeProjectModal);
    domElements.btnSaveProject.addEventListener('click', handleSaveProject);

    // Click outside closing (para ambos modales)
    window.addEventListener('click', (e) => {
        if (e.target === domElements.modalSession) closeSessionModal();
        if (e.target === domElements.modalProject) closeProjectModal();
    });

    // Navigation
    domElements.btnExplore.addEventListener('click', () => {
        const sec = document.getElementById('scenarios-section');
        if(sec) sec.scrollIntoView({ behavior: 'smooth' });
    });
});
