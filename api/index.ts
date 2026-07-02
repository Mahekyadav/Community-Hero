import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize express app globally so Vercel can bind routes instantly
export const app = express();

// Configure global body parsers and cross-origin controls at the root file layer
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Gemini AI client globally
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.warn('GEMINI_API_KEY is not defined. AI features will fallback to mock data.');
}

// ----------------- API ROUTES (ROOT ACCESSIBLE) -----------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', aiEnabled: !!ai });
});

// Retries a Gemini call on transient errors (429 rate limit, 503 model overloaded),
// which the free-tier API key hits intermittently even under normal, low-volume use.
async function generateContentWithRetry(params: any, retries = 3, delayMs = 800) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await ai!.models.generateContent(params);
    } catch (error: any) {
      const status = error?.status;
      const isTransient = status === 429 || status === 503;
      if (!isTransient || attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw new Error('Unreachable');
}

// 1. Analyze Civic Issue Image via Gemini
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 parameter is required' });
    }

    if (!ai) {
      console.warn('Gemini API is not initialized. Using mock fallback.');
      return res.json({
        title: 'Damaged Road Surface',
        description: 'A large pothole and cracking in the middle of the street, posing a hazard to traffic and bicyclists.',
        category: 'Road Damage',
        severity: 'High',
        suggestedDepartment: 'Department of Public Works',
        possibleDuplicatesCount: 0
      });
    }

    const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+);base64,(.*)$/);
    let mimeType = 'image/jpeg';
    let cleanBase64 = imageBase64;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      cleanBase64 = matches[2];
    }

    const prompt = `You are an expert civic analyst AI. Analyze this image of a civic/municipal issue and suggest report details.
You must classify the category strictly into one of the following:
- Road Damage
- Garbage
- Water Leakage
- Street Light
- Electricity
- Traffic
- Public Safety
- Other

Also estimate severity from: Low, Medium, High, Critical.
Suggest a suitable government department responsible for resolving it.
Create a professional, clear, descriptive title and a comprehensive, helpful description of the issue.

Your response MUST be a single, valid, raw JSON object (with NO markdown code block wrapper, no leading or trailing text). The keys must be exactly:
{
  "title": "string",
  "description": "string",
  "category": "Road Damage" | "Garbage" | "Water Leakage" | "Street Light" | "Electricity" | "Traffic" | "Public Safety" | "Other",
  "severity": "Low" | "Medium" | "High" | "Critical",
  "suggestedDepartment": "string"
}`;

    const response = await generateContentWithRetry({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: cleanBase64
              }
            }
          ]
        }
      ]
    });

    const responseText = response.text ? response.text.trim() : '';
    
    let cleanJson = responseText;
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.substring(3);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }
    cleanJson = cleanJson.trim();

    try {
      const parsed = JSON.parse(cleanJson);
      res.json(parsed);
    } catch (e) {
      console.error('Failed to parse Gemini response as JSON:', responseText, e);
      res.json({
        title: 'Civic Report Proposal',
        description: 'Issue identified from uploaded image.',
        category: 'Other',
        severity: 'Medium',
        suggestedDepartment: 'Municipal Council',
      });
    }
  } catch (error: any) {
    console.error('Error analyzing image with Gemini:', error);
    const isTransient = error?.status === 429 || error?.status === 503;
    res.status(isTransient ? 503 : 500).json({
      error: isTransient
        ? 'AI analysis is temporarily busy. Please try again in a moment.'
        : (error.message || 'Error analyzing image')
    });
  }
});

// 2. Chat Assistant Proxy Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, issuesContext } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message parameter is required' });
    }

    if (!ai) {
      return res.json({
        text: `Hi there! I am the Community Hero Civic Assistant.
It looks like the Gemini API is not fully configured, but I can help explain that we can report issues like Road Damage or Water Leakage on this platform, upvote reports to help officers prioritize them, and earn Hero Points!`
      });
    }

    let systemPrompt = `You are "HeroBot", the official AI Civic Assistant for the "Community Hero" platform.
Your purpose is to help citizens report municipal issues, check complaint statuses, understand local government rules, and details about "Hero Points".
Keep your answers friendly, professional, and clear. Avoid overly technical developer jargon.
Gamification system rules:
- Submit an issue: 50 Hero Points
- Verify/Upvote an issue: 10 Hero Points
- Helpful comments: 5 Hero Points
- When their reported issue is resolved: 100 Hero Points
Badges:
- Community Hero (highest contributor)
- Eco Warrior (frequent Garbage reporter)
- Road Guardian (frequent Road Damage reporter)
- Water Protector (frequent Water Leakage reporter)
- First Reporter (first submitted report)

Available categories: Road Damage, Garbage, Water Leakage, Street Light, Electricity, Traffic, Public Safety, Other.`;

    if (issuesContext && Array.isArray(issuesContext) && issuesContext.length > 0) {
      systemPrompt += `\n\nHere are some of the active reported issues nearby for context:\n`;
      issuesContext.forEach((issue: any) => {
        systemPrompt += `- [${issue.category}] "${issue.title}" located at ${issue.address || `${issue.latitude}, ${issue.longitude}`}. Current Status: ${issue.status}. Priority: ${issue.priority}.\n`;
      });
    }

    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: `System Context: ${systemPrompt}\n\nUser Question: ${message}` }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Error in AI Chat proxy:', error);
    res.status(500).json({ error: error.message || 'Error processing chat' });
  }
});

// 3. Generate Officer Resolution Summary
app.post('/api/resolution-summary', async (req, res) => {
  try {
    const { issueTitle, issueDesc, resolutionDetails } = req.body;
    if (!issueTitle || !resolutionDetails) {
      return res.status(400).json({ error: 'issueTitle and resolutionDetails are required' });
    }

    if (!ai) {
      return res.json({
        summary: `Resolution processed successfully: ${resolutionDetails}`
      });
    }

    const prompt = `You are a municipal public communications officer. Summarize the civic resolution in a polite, professional, and clear manner for the citizen who filed the report.
Issue Title: ${issueTitle}
Original Description: ${issueDesc}
Officer Actions taken: ${resolutionDetails}

Please write a concise, human-friendly resolution message (2-4 sentences) that updates the citizen, thanking them for being a Community Hero, and detailing exactly what was completed. Do not use markdown wrappers, just raw text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    res.json({ summary: response.text ? response.text.trim() : `The issue has been resolved: ${resolutionDetails}` });
  } catch (error: any) {
    console.error('Error generating resolution summary:', error);
    res.status(500).json({ error: error.message || 'Error generating summary' });
  }
});

// 🟢 CRITICAL CRUX FOR VERCEL: Export the module handler instance out to edge cloud network
// NOTE: this file must stay free of dev-only tooling imports (e.g. `vite`). Vite bundles
// build-time tools (esbuild's native binary, rollup, chokidar) that break Vercel's Node.js
// serverless runtime at cold start (FUNCTION_INVOCATION_FAILED). Local dev bootstrapping
// (vite middleware + app.listen) lives in dev-server.ts instead.
export default app;