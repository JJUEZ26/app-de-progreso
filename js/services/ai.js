export const AIService = {
    async askAI(prompt) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                throw new Error('Backend failed');
            }

            const data = await response.json();
            return data.response;
        } catch (e) {
            console.error('Error calling AI Service', e);
            return null; // Fallback to local logic handled by chat.js
        }
    }
};
