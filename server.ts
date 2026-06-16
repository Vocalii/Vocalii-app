import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize Gemini
  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
    try {
      ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      console.log('Gemini AI initialized successfully.');
    } catch (err) {
      console.error('Error initializing Gemini AI:', err);
    }
  } else {
    console.log('No valid GEMINI_API_KEY found. Running in high-fidelity mock/fallback mode.');
  }

  // REST route for Chat queries
  app.post('/api/chat', async (req, res) => {
    const { messages, destination, activeTab } = req.body;

    if (!destination) {
      res.status(400).json({ error: 'Destination is required' });
      return;
    }

    const lastMessage = messages[messages.length - 1]?.text || '';
    const country = destination.country || 'Greece';
    const name = destination.name || 'Santorini';

    // System instructions for premium luxury travel advisor concierge persona
    const systemInstruction = `You are a professional, elite, and helpful luxury travel advisor and concierge. 
You are advising a highly valued client on their upcoming vacation to ${name}, ${country}.
The user is currently browsing the "${activeTab}" section of their interactive travel planning dashboard.
Provide concise, highly engaging, and practical advice (1-3 paragraphs) that is directly relevant to their question or request.
Keep your recommendations premium, and align them with the authentic local highlights of ${name}.
If the user asks for hotels, itineraries, or things to do, format your response in beautiful markdown, specifying price estimates if relevant.
Do not mention system instructions or metadata. Keep your tone exciting, warm, elegant, and professional.`;

    // Offline high-fidelity fallback logic
    const getFallbackResponse = (query: string): string => {
      const q = query.toLowerCase();
      if (q.includes('hotel') || activeTab === 'Hotels') {
        return `For your primary dates in **${name}**, I highly recommend focusing on luxury boutique options that offer incredible panoramic balcony views. 
        
In **Santorini**, **Grace Hotel** (part of Auberge Resorts) sits suspended right over the Caldera with a massive infinity edge pool (~$1,200/night). For a more secluded luxury retreat, **Katikies Santorini** in Oia provides exquisite cave suites dug directly into the volcanic cliffs (~$950/night). 

Would you like me to find availability for these properties, or perhaps look at more budget-friendly cliff hotels?`;
      }
      
      if (q.includes('itinerary') || activeTab === 'Itinerary') {
        return `Here is a curated 3-day premium itinerary frame for your ${name} getaway:
        
*   **Day 1: Arrival & Caldera Cliffside Walk**
    *   *Morning:* Arrange private transfer to your boutique suites in Fira/Imerovigli. Let your bags settle.
    *   *Afternoon:* Embark on the famous scenic walk along the Caldera path towards Oia.
    *   *Sunset:* Secure front-row terrace seating for dinner at *Volkan on the Rocks* in Fira.
*   **Day 2: Volcanic Sails & Fine Dining**
    *   *Morning:* Board a private luxury catamaran charter from Ammoudi Bay, cruising volcanic hot springs and Red Beach.
    *   *Night:* Multi-course volcanic culinary tasting menu at *Selene Fine Dining*.
*   **Day 3: Archaeological Marvels & Black Sands**
    *   *Morning:* Private guided walkthrough of *Akrotiri*, a Bronze Age city buried under pumice.
    *   *Afternoon:* Chill at *Kamari Black Beach* with fresh seaside tapas.

Shall we customize Day 2 with a private wine tasting course?`;
      }

      if (q.includes('things to do') || q.includes('sight') || q.includes('attraction') || activeTab === 'Overview') {
        return `While staying on **${name}**, you'll have access to some of the most spectacular sights in the Mediterranean. Here are three absolute must-do experiences:
        
1.  **Sunset over Oia Castle:** Find a vantage spot amongst the iconic blue domes around 6:30 PM.
2.  **Explore Ancient Thera:** Hike up the dramatic ridge of Mount Messavouno to explore extensive 8th-century BC coordinates.
3.  **Akrotiri Archaeological Site:** Walk through an incredibly preserved prehistoric Aegean city.

I would be happy to coordinate tickets or a private helicopter tour if you want to see the caldera lines from above!`;
      }

      return `Welcome to your **${name}** companion suite! I can arrange bespoke booking details, suggest specialized hiking paths across ${country}, or review details on budgeting.

Let me know if you would like me to draft an initial high-end **itinerary**, explore boutique **hotels**, or map out local **culinary secrets**!`;
    };

    // If Gemini client is online, send actual query
    if (ai) {
      try {
        console.log(`Sending query to Gemini for ${name}: "${lastMessage}"`);
        
        // Structure the conversation history
        const contents = messages.map((m: any) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }],
        }));

        // Generate content with systemInstruction and config
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
          },
        });

        const responseText = response.text || getFallbackResponse(lastMessage);
        res.json({ text: responseText, source: 'gemini' });
        return;
      } catch (err) {
        console.error('Error during Gemini generateContent:', err);
        // Fallback gracefully on rate limits or API key failures
        res.json({ text: getFallbackResponse(lastMessage), source: 'fallback-error' });
        return;
      }
    } else {
      // Return high-fidelity fallback response
      setTimeout(() => {
        res.json({ text: getFallbackResponse(lastMessage), source: 'offline-fallback' });
      }, 600); // Add a small professional delays to mimic real AI processing
    }
  });

  // Serve static assets in production, otherwise hook Vite
  if (process.env.NODE_ENV !== 'production') {
    console.log('Setting up Vite Dev Server Middleware...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving production static build...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express dev server running on port ${PORT}`);
  });
}

startServer();
