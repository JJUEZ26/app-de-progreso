/**
 * Vercel Serverless Function: Proxy for Gemini API.
 */
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;
    const API_KEY = process.env.GOOGLE_API_KEY;

    if (!API_KEY) {
        return res.status(500).json({ error: 'Backend API Key not configured' });
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Eres MetaLogic AI, un experto en productividad y gamificación. El usuario quiere ayuda con sus metas. Responde de forma motivante, limpia e intuitiva. Contexto: ${prompt}` }]
                }]
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(400).json({ error: data.error.message });
        }

        const aiResponse = data.candidates[0].content.parts[0].text;
        res.status(200).json({ response: aiResponse });
    } catch (e) {
        console.error('API Error:', e);
        res.status(500).json({ error: 'Error connecting to AI service' });
    }
};
