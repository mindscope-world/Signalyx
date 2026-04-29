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

      // Get insights
      const insights = db.prepare(`SELECT * FROM insights WHERE niche = ? COLLATE NOCASE`).all(niche);
      
      // Get keywords
      // For simplicity of mockup, we just grab all keywords we currently have if the user asks.
      // In a real system, there'd be a join document_keywords -> keywords, filtered by niche-related documents
      // For our AI mock, we'll store scores straight to keyword_scores and keyword_trends
      const keywordsQuery = `
        SELECT k.keyword, k.normalized_keyword, ks.demand_score, ks.competition_score, ks.opportunity_score, kt.search_volume, kt.growth_rate
        FROM keywords k
        JOIN keyword_scores ks ON k.id = ks.keyword_id
        JOIN keyword_trends kt ON k.id = kt.keyword_id
        WHERE kt.date = date('now') OR kt.date = date('now', '-1 day')
        LIMIT 20
      `;
      const keywords = db.prepare(keywordsQuery).all();

      const topicsQuery = `
        SELECT t.name, t.description, ts.demand_score, ts.opportunity_score
        FROM topics t
        JOIN topic_scores ts ON t.id = ts.topic_id
        LIMIT 10
      `;
      const topics = db.prepare(topicsQuery).all();

      console.log(`Fetched dashboard for niche: ${niche}`, { insightsCount: insights.length, keywordsCount: keywords.length, topicsCount: topics.length });

      res.json({ insights, keywords, topics });
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
      // Return distinct niches from insights, acting as "Saved Dashboards"
      const niches = db.prepare('SELECT DISTINCT niche, MAX(created_at) as created_at FROM insights GROUP BY niche ORDER BY created_at DESC').all();
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

    // Step 1: Tell Groq to act as our NLP pipeline and generate structured data
    const prompt = `
You are the Insight Engine for a Data-to-Decision pipeline. The user has queried the niche "${niche}".
Act as the ETL pipeline that has scraped thousands of sources (search engines, Reddit, X). 
Synthesize real-world data about this niche into the following JSON schema. Include realistic market signals:
{
  "keywords": [
    {
      "keyword": "string",
      "demand_score": 85,
      "competition_score": 40,
      "search_volume": 5000,
      "growth_rate": 20.5
    }
  ],
  "topics": [
    {
      "name": "string",
      "description": "string"
    }
  ],
  "insights": [
    {
      "type": "trends|pain_points|opportunities",
      "content": "string"
    }
  ]
}
You MUST return exactly valid JSON representing this schema. Do NOT include markdown blocks. Do NOT include any accompanying text.
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
    
    // Step 2: Ingest the generated "Processed Data" into our Postgres-style SQLite schema
    const runInTransaction = db.transaction((data) => {
      const today = new Date().toISOString().split('T')[0];

      // Insert keywords & scores
      for (const kw of data.keywords || []) {
        const keywordId = uuidv4();
        const opportunity_score = kw.demand_score / Math.max(kw.competition_score, 1);
        
        db.prepare('INSERT OR IGNORE INTO keywords (id, keyword, normalized_keyword) VALUES (?, ?, ?)').run(keywordId, kw.keyword, kw.keyword.toLowerCase());
        
        // Find ID if it ignored
        const existingKw = db.prepare('SELECT id FROM keywords WHERE keyword = ?').get(kw.keyword) as any;
        const finalKwId = existingKw ? existingKw.id : keywordId;

        db.prepare('INSERT OR REPLACE INTO keyword_scores (keyword_id, demand_score, competition_score, opportunity_score) VALUES (?, ?, ?, ?)').run(finalKwId, kw.demand_score, kw.competition_score, opportunity_score);
        
        db.prepare('INSERT OR REPLACE INTO keyword_trends (keyword_id, date, search_volume, mention_count, growth_rate) VALUES (?, ?, ?, ?, ?)').run(finalKwId, today, kw.search_volume, Math.floor(kw.search_volume * 0.1), kw.growth_rate);
      }

      // Insert topics
      for (const t of data.topics || []) {
        const topicId = uuidv4();
        db.prepare('INSERT INTO topics (id, name, description) VALUES (?, ?, ?)').run(topicId, t.name, t.description);
        
        db.prepare('INSERT INTO topic_scores (topic_id, demand_score, competition_score, opportunity_score) VALUES (?, ?, ?, ?)').run(topicId, 70, 50, 1.4); // mock scores
      }

      // Insert insights
      for (const ins of data.insights || []) {
        const insightId = uuidv4();
        db.prepare('INSERT INTO insights (id, niche, type, content) VALUES (?, ?, ?, ?)').run(insightId, niche, ins.type, JSON.stringify(ins.content));
      }

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
      // Ignore schema column error if alter table not applied
      db.prepare("UPDATE user_queries SET status = 'failed' WHERE id = ?").run(queryId);
    }
  }
}
