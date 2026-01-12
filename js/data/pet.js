/**
 * Tamagotchi logic - Pet management.
 */

export const PET_STAGES = {
    EGG: 'egg',
    BABY: 'baby',
    TEEN: 'teen',
    ADULT: 'adult'
};

const EXP_PER_LEVEL = 100;

export const PetLogic = {
    /**
     * Create a new pet.
     */
    createInitialPet() {
        return {
            name: 'MetaPet',
            health: 100,
            hunger: 20, // 0 is full, 100 is starving
            exp: 0,
            level: 1,
            stage: PET_STAGES.BABY,
            inventory: {
                food: 5
            },
            lastUpdate: Date.now()
        };
    },

    /**
     * Update pet state based on elapsed time.
     * Decreases hunger and health slowly.
     */
    tick(pet) {
        const now = Date.now();
        const elapsedHours = (now - pet.lastUpdate) / (1000 * 60 * 60);

        if (elapsedHours < 1) return pet; // Only update every hour

        const updatedPet = { ...pet, lastUpdate: now };

        // Hunger increases by 5 units per hour
        updatedPet.hunger = Math.min(100, updatedPet.hunger + (elapsedHours * 5));

        // If hunger is > 80, health starts decreasing
        if (updatedPet.hunger > 80) {
            updatedPet.health = Math.max(0, updatedPet.health - (elapsedHours * 10));
        }

        return updatedPet;
    },

    /**
     * Feed the pet.
     */
    feed(pet) {
        if (pet.inventory.food <= 0) return pet;

        return {
            ...pet,
            hunger: Math.max(0, pet.hunger - 30),
            health: Math.min(100, pet.health + 10),
            inventory: {
                ...pet.inventory,
                food: pet.inventory.food - 1
            },
            exp: pet.exp + 10 // Feeding gives a bit of exp
        };
    },

    /**
     * Add rewards from completed goals.
     */
    addRewards(pet, amount) {
        const updatedPet = {
            ...pet,
            exp: pet.exp + (amount * 20),
            inventory: {
                ...pet.inventory,
                food: pet.inventory.food + amount
            }
        };

        // Check for level up & evolution
        return this.checkEvolution(updatedPet);
    },

    checkEvolution(pet) {
        let { exp, level, stage } = pet;

        while (exp >= EXP_PER_LEVEL) {
            exp -= EXP_PER_LEVEL;
            level++;
        }

        if (level >= 10 && stage === PET_STAGES.TEEN) stage = PET_STAGES.ADULT;
        else if (level >= 5 && stage === PET_STAGES.BABY) stage = PET_STAGES.TEEN;

        return { ...pet, exp, level, stage };
    }
};
