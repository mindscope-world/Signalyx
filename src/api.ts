import { Express } from 'express';
import db from './db';
import Groq from "groq-sdk";
import { v4 as uuidv4 } from 'uuid';

import * as fs from 'fs';

export function setupApiRoutes(app: Express) {
  app.post('/api/query', async (req, res) => {
    try {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
         console.warn("GROQ_API_KEY is undefined at query time!");
      }

      const { niche } = req.body;
      if (!niche) {
        return res.status(400).json({ error: "niche is required" });
      }

      // Check if we already have insights for this niche recently
      const existingQuery = db.prepare('SELECT * FROM user_queries WHERE query = ? COLLATE NOCASE ORDER BY created_at DESC LIMIT 1').get(niche) as any;
      
      if (existingQuery && existingQuery.status === 'completed') {
        return res.json({ message: "Engine already processed this niche.", data: existingQuery });
      }

      const queryId = uuidv4();
      db.prepare('INSERT INTO user_queries (id, query, status) VALUES (?, ?, ?)').run(queryId, niche, 'processing');

      // Async process to Gemini AI
      processNicheWithAI(niche, queryId).catch(console.error);

      res.json({ message: "Query processing started", queryId });

    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/status/:queryId', (req, res) => {
    try {
      const { queryId } = req.params;
      const q = db.prepare('SELECT * FROM user_queries WHERE id = ?').get(queryId);
      if (!q) return res.status(404).json({ error: "Query not found" });
      res.json(q);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Endpoints for Dashboard
  app.get('/api/dashboard/:niche', (req, res) => {
    try {
      const { niche } = req.params;
      
      const record = db.prepare("SELECT output FROM content_outputs WHERE niche = ? AND type = 'seo_strategy' COLLATE NOCASE ORDER BY created_at DESC LIMIT 1").get(niche) as any;
      
      if (!record) {
        return res.json({});
      }

      const strategyData = JSON.parse(record.output);
      console.log(`Fetched dashboard for niche: ${niche}`);

      res.json(strategyData);
    } catch (err: any) {
      console.error("Dashboard Fetch Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  
  app.get('/api/recent_niches', (req, res) => {
      const queries = db.prepare('SELECT DISTINCT query, status, created_at FROM user_queries ORDER BY created_at DESC LIMIT 10').all();
      res.json(queries);
  });

  app.get('/api/queries', (req, res) => {
    try {
      const queries = db.prepare('SELECT id, query, status, created_at, error_message FROM user_queries ORDER BY created_at DESC LIMIT 50').all();
      res.json(queries);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/dashboards', (req, res) => {
    try {
      const niches = db.prepare("SELECT DISTINCT niche, MAX(created_at) as created_at FROM content_outputs WHERE type = 'seo_strategy' GROUP BY niche ORDER BY created_at DESC").all();
      res.json(niches);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}

async function processNicheWithAI(niche: string, queryId: string) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set.");
    const groq = new Groq({ apiKey });

    const prompt = `
You are Signalyx, an AI-powered SEO Intelligence Engine. The user has queried the keyword: "${niche}".
Act as a Data-to-Decision pipeline that has synthesized real-time search behavior, competitive metrics, and marketing intelligence for this keyword.

You MUST return exactly valid JSON representing the following structure to map to our 10-module dashboard layout. 
Populate it with realistic, industry-accurate strategic analysis:
{
  "demand_intelligence": {
    "total_search_volume": "string (e.g. 1.2M)",
    "trend": "string (e.g. +18%)",
    "demand_stability": "string",
    "top_queries": [ { "query": "string", "growth": "string", "intent": "Informational|Commercial|Transactional" } ],
    "insight": "string"
  },
  "search_intent": {
    "informational_pct": 52,
    "commercial_pct": 33,
    "transactional_pct": 15,
    "insight": "string"
  },
  "topic_clusters": {
    "pillar_topic": "string",
    "clusters": [ { "name": "string", "keywords": ["string", "string"] } ],
    "insight": "string"
  },
  "competitive_landscape": {
    "top_domains": ["string", "string"],
    "serp_characteristics": ["string", "string"],
    "content_gaps": [ { "gap_area": "string", "opportunity": "High|Medium|Low", "practical_step": "string" } ],
    "insight": "string"
  },
  "opportunity_scoring": {
    "demand_score": 92,
    "competition_score": 78,
    "opportunity_score": 74,
    "high_roi_keywords": [ { "keyword": "string", "score": 88 } ],
    "insight": "string"
  },
  "audience_pain_points": {
    "points": ["string", "string"],
    "insight": "string"
  },
  "content_strategy": {
    "pillar_page": "string",
    "cluster_content": ["string", "string"],
    "conversion_content": ["string", "string"]
  },
  "seo_execution_plan": {
    "week_1_2": ["string", "string"],
    "week_3_4": ["string", "string"],
    "month_2": ["string", "string"]
  },
  "ai_content_angle": {
    "winning_messaging": ["string", "string"]
  },
  "final_strategic_insight": "string"
}
You MUST return exactly valid JSON. Do NOT include markdown blocks. Do NOT include any accompanying text.
`;

    async function callModelWithRetry(fn: () => Promise<any>, retries = 3, backoffMs = 2000): Promise<any> {
      try {
        return await fn();
      } catch (err: any) {
        if ((err.status === 429 || err.status === 503) && retries > 0) {
          console.warn(`API error (${err.status}). Retrying in ${backoffMs}ms...`);
          await new Promise(r => setTimeout(r, backoffMs));
          return callModelWithRetry(fn, retries - 1, backoffMs * 2);
        }
        throw err;
      }
    }

    const response = await callModelWithRetry(() => groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    }));

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log(`Generated JSON for ${niche}:`, parsed);
    
    // Step 2: Store the massive strategic JSON object directly into content_outputs
    const runInTransaction = db.transaction((data) => {
      const outputId = uuidv4();
      db.prepare('INSERT INTO content_outputs (id, niche, type, input_context, output) VALUES (?, ?, ?, ?, ?)').run(
        outputId, niche, 'seo_strategy', niche, JSON.stringify(data)
      );

      // Update query status
      db.prepare("UPDATE user_queries SET status = 'completed' WHERE id = ?").run(queryId);
    });

    try {
      runInTransaction(parsed);
      console.log(`Transaction successful for ${niche}`);
    } catch (dbErr) {
      console.error("Database transaction error:", dbErr);
      throw dbErr;
    }

  } catch (error: any) {
    console.error("AI Processing Error:", error);
    fs.writeFileSync('ai_error.log', error.stack || error.message || String(error));
    try {
      db.prepare("UPDATE user_queries SET status = 'failed', error_message = ? WHERE id = ?").run(error.message || String(error), queryId);
    } catch (e) {
      db.prepare("UPDATE user_queries SET status = 'failed' WHERE id = ?").run(queryId);
    }
  }
}
