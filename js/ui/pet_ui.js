/**
 * UI Module for the Tamagotchi (Pet).
 */
import { Storage } from '../data/storage.js';
import { PetLogic, PET_STAGES } from '../data/pet.js';

const DOM = {
    container: document.getElementById('pet-container'),
    name: document.getElementById('pet-name-display'),
    stage: document.getElementById('pet-stage-display'),
    health: document.getElementById('pet-health-bar'),
    hunger: document.getElementById('pet-hunger-bar'),
    exp: document.getElementById('pet-exp-bar'),
    foodCount: document.getElementById('food-count'),
    btnFeed: document.getElementById('btn-feed-pet')
};

export const PetUI = {
    init() {
        let pet = Storage.getPet();
        if (!pet) {
            pet = PetLogic.createInitialPet();
            Storage.savePet(pet);
        }

        this.render(pet);

        DOM.btnFeed.addEventListener('click', () => {
            let currentPet = Storage.getPet();
            if (currentPet.inventory.food > 0) {
                const updated = PetLogic.feed(currentPet);
                Storage.savePet(updated);
                this.render(updated, true);
            } else {
                alert("¡No tienes comida! Completa metas para conseguir galletas.");
            }
        });

        // Tick loop (every minute for smoother background updates)
        setInterval(() => {
            let p = Storage.getPet();
            const updated = PetLogic.tick(p);
            if (updated !== p) {
                Storage.savePet(updated);
                this.render(updated);
            }
        }, 60000);
    },

    render(pet, isFeeding = false) {
        DOM.name.textContent = pet.name;
        DOM.stage.textContent = `Nivel ${pet.level} - ${this.getStageLabel(pet.stage)}`;

        DOM.health.style.width = `${pet.health}%`;
        DOM.hunger.style.width = `${pet.hunger}%`;
        DOM.exp.style.width = `${(pet.exp % 100)}%`;
        DOM.foodCount.textContent = pet.inventory.food;

        this.renderSVG(pet, isFeeding);
    },

    getStageLabel(stage) {
        const labels = {
            [PET_STAGES.BABY]: 'Bebé',
            [PET_STAGES.TEEN]: 'Adolescente',
            [PET_STAGES.ADULT]: 'Adulto'
        };
        return labels[stage] || 'Bebé';
    },

    renderSVG(pet, isFeeding) {
        const color = pet.health < 30 ? '#94a3b8' : '#6366f1';
        const classes = `pet-svg ${isFeeding ? 'eating' : ''}`;

        let svgContent = '';

        if (pet.stage === PET_STAGES.BABY) {
            svgContent = `
                <svg viewBox="0 0 100 100" class="${classes}">
                    <circle cx="50" cy="50" r="40" fill="${color}" />
                    <circle cx="35" cy="40" r="5" fill="white" />
                    <circle cx="65" cy="40" r="5" fill="white" />
                    <circle cx="35" cy="40" r="2" fill="black" />
                    <circle cx="65" cy="40" r="2" fill="black" />
                    <path d="M 40 65 Q 50 75 60 65" stroke="white" stroke-width="3" fill="none" />
                </svg>
            `;
        } else if (pet.stage === PET_STAGES.TEEN) {
            svgContent = `
                <svg viewBox="0 0 100 100" class="${classes}">
                    <rect x="25" y="25" width="50" height="50" rx="15" fill="${color}" />
                    <circle cx="35" cy="45" r="6" fill="white" />
                    <circle cx="65" cy="45" r="6" fill="white" />
                    <circle cx="35" cy="45" r="3" fill="black" />
                    <circle cx="65" cy="45" r="3" fill="black" />
                    <path d="M 40 60 L 60 60" stroke="white" stroke-width="3" />
                </svg>
            `;
        } else {
            // ADULT
            svgContent = `
                <svg viewBox="0 0 100 100" class="${classes}">
                    <path d="M 20 80 Q 50 10 80 80 Z" fill="${color}" />
                    <circle cx="40" cy="50" r="6" fill="white" />
                    <circle cx="60" cy="50" r="6" fill="white" />
                    <circle cx="40" cy="50" r="3" fill="black" />
                    <circle cx="60" cy="50" r="3" fill="black" />
                    <path d="M 45 65 Q 50 70 55 65" stroke="white" stroke-width="3" fill="none" />
                </svg>
            `;
        }

        DOM.container.innerHTML = svgContent;

        if (isFeeding) {
            setTimeout(() => this.render(pet, false), 1000);
        }
    }
};
