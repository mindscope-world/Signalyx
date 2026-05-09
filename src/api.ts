import { Express } from 'express';
import db from './db.js';
import Groq from "groq-sdk";
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

// Live SERP scraper using DuckDuckGo HTML endpoint (no API key needed)
async function scrapeSERP(keyword: string): Promise<{ titles: string[], snippets: string[], urls: string[] }> {
  try {
    // We prioritize Lite version as it's cleaner and often less protected than the HTML/Main versions
    const url = `https://duckduckgo.com/lite/?q=${encodeURIComponent(keyword)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    });

    if (!response.ok) throw new Error(`SERP fetch failed: ${response.status}`);
    const html = await response.text();

    const titles: string[] = [];
    const snippets: string[] = [];
    const urls: string[] = [];

    // Lite Version parsing
    // Titles and URLs are in <a class="result-link" href="...">Title</a>
    const titleRegex = /<a class="result-link" href="([^"]+)">([^<]+)<\/a>/g;
    // Snippets are in <td class="result-snippet">Snippet</td>
    const snippetRegex = /<td class="result-snippet">([^<]+)<\/td>/g;

    let match;
    while ((match = titleRegex.exec(html)) !== null && titles.length < 10) {
      urls.push(match[1]);
      titles.push(match[2].trim());
    }

    while ((match = snippetRegex.exec(html)) !== null && snippets.length < 10) {
      snippets.push(match[1].trim());
    }

    if (titles.length === 0) {
        console.warn(`[SERP] No results found in Lite version for: ${keyword}. Checking for anomaly detection...`);
        if (html.includes('anomaly-modal')) {
            throw new Error("DuckDuckGo triggered bot protection (Anomaly Modal)");
        }
    }

    console.log(`[SERP] Scraped ${titles.length} results for: ${keyword}`);
    return { titles, snippets, urls };
  } catch (err: any) {
    console.warn(`[SERP] Scrape failed (${err.message}). Grounding with LLM synthesis.`);
    return { titles: [], snippets: [], urls: [] };
  }
}

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

      // Check if we already have insights AND the final strategy output for this niche
      const existingOutput = db.prepare("SELECT 1 FROM content_outputs WHERE niche = ? AND type = 'seo_strategy' COLLATE NOCASE LIMIT 1").get(niche);
      const existingQuery = db.prepare('SELECT * FROM user_queries WHERE query = ? COLLATE NOCASE ORDER BY created_at DESC LIMIT 1').get(niche) as any;

      if (existingQuery && existingQuery.status === 'completed' && existingOutput) {
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

  app.post('/api/generate-content', async (req, res) => {
    try {
      const { topic, platform, tone, seoContext, contentType } = req.body;
      if (!topic || !platform) {
        return res.status(400).json({ error: "topic and platform are required" });
      }

      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("GROQ_API_KEY is not set.");
      const groq = new Groq({ apiKey });

      const isComment = contentType === 'Comment';

      const platformPrompts: Record<string, string> = {
        'Website': isComment
          ? `Write a thoughtful, SEO-relevant comment for a blog post or article. It should add value, ask a question, or provide a unique perspective. Avoid spammy links.`
          : `Write a long-form, SEO-optimized blog post/article for a website. Include an H1, multiple H2s, a punchy introduction, and a conclusion. Content should be around 800-1000 words.`,
        'Reddit': isComment
          ? `Write a conversational Reddit comment that answers a user's question or contributes to a thread. Be helpful, use community slang if appropriate, and avoid looking like an ad.`
          : `Write a high-value Reddit post (not a comment). It should be formatted with markdown, have a clear title, and provide actionable insights. Ensure it captures attention without being clickbaity.`,
        'X': isComment
          ? `Write a punchy, engaging reply to a post on X. It should be witty, insightful, or provocative to encourage engagement. Keep it under 280 characters.`
          : `Write a viral-ready X (Twitter) thread with 5-7 individual posts. Start with a massive hook. Use clean formatting.`,
        'LinkedIn': isComment
          ? `Write a professional, value-adding comment for a LinkedIn post. Acknowledge the author's point and add your own professional insight or experience.`
          : `Write a professional LinkedIn post with a strong lead, professional insights, and a call to action. Use appropriate hashtags.`
      };

      const systemPrompt = `You are Signalyx Content Engine, an elite AI copywriter specialized in ${platform} ${contentType || 'Post'} SEO. 
      Target Platform: ${platform}
      Content Type: ${contentType || 'Post'}
      Tone of Voice: ${tone || 'Professional'}
      
      Your goal is to transform the provided topic into high-performance, platform-native content. 
      ${platformPrompts[platform] || 'Generate high-quality SEO content.'}
      
      ${isComment ? 'CRITICAL: The output MUST be a COMMENT/REPLY, not a standalone post. It should be conversational and non-spammy.' : 'CRITICAL: The output MUST be a standalone POST/ARTICLE optimized for reader attention.'}

      ${seoContext ? `INTEGRATE THESE SEO INSIGHTS (Keywords/Pain Points) NATURALLY:\n${JSON.stringify(seoContext)}` : ''}

      Respond ONLY with the generated content. Use Markdown.`;

      const response = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Topic: ${topic}` }
        ],
        model: "llama-3.3-70b-versatile",
      });

      const content = response.choices[0]?.message?.content || "Generation failed.";
      res.json({ content });

    } catch (err: any) {
      console.error("Content Gen Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
}

async function processNicheWithAI(niche: string, queryId: string) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set.");
    const groq = new Groq({ apiKey });

    // Step 1: Scrape live SERP data to ground the LLM in search reality
    const { titles, snippets, urls } = await scrapeSERP(niche);
    
    // Step 2: SIOS Module A - AI Citation Simulation
    // We simulate an LLM's response to see which brands are cited for this niche
    const aiSimulationResponse = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are the SIOS AI Simulator. Identify exactly which brand names and websites are most frequently cited or recommended by generative AI for the given niche. Return a concise list of cited brands and a brief sentiment analysis for each." 
        },
        { role: "user", content: `Niche: ${niche}` }
      ],
      model: "llama-3.3-70b-versatile",
    });
    const aiCitations = aiSimulationResponse.choices[0]?.message?.content || "No AI citation data available.";
    
    // Step 3: SIOS Module B - GEO Retrieval Simulation
    // We simulate a RAG (Retrieval-Augmented Generation) process to predict pickup likelihood
    const geoSimulationResponse = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are the SIOS GEO Engine. Analyze the relationship between the user query and the likely top-ranking content. Assess: 1. Information Density 2. Answer-Engine Compatibility 3. Semantic Relevance. Predict how likely this niche's content is to be 'picked up' as a source for an AI search summary (0-100%)." 
        },
        { role: "user", content: `Query Context: ${niche}\nScraped Signals: ${titles.join(', ')}` }
      ],
      model: "llama-3.3-70b-versatile",
    });
    const geoSimulation = geoSimulationResponse.choices[0]?.message?.content || "GEO simulation unavailable.";

    const scrapedContext = titles.length > 0
      ? `\n\n--- LIVE SEARCH & SIOS DATA FOR "${niche}" ---\n
SEARCH DATA (SERP):\n${titles.map((t, i) => `${i + 1}. TITLE: ${t}\n   URL: ${urls[i] || ''}`).join('\n')}\n
AI CITATIONS (SIOS Module A):\n${aiCitations}\n
GEO SIMULATION (SIOS Module B):\n${geoSimulation}\n
--- END LIVE DATA ---\n`
      : `\n(No live signals available. Use your training knowledge for Synthesis Mode.)\n`;

    const prompt = `
You are Signalyx, an AI-powered SEO Intelligence Engine. The user has queried the keyword: "${niche}".
${scrapedContext}

INSTRUCTIONS FOR DATA HANDLING:
1. IF LIVE SEARCH DATA IS PROVIDED: Use it as the source of truth for "top_domains", "serp_characteristics", and "data_sources".
2. IF NO LIVE DATA (Synthesis Mode): Brainstorm the most likely dominant domains and competitors based on your vast training set for this specific niche. Mark these as "AI-Estimates".
3. TRANSPARENCY: For total_search_volume and growth percentages, ALWAYS provide a clearly estimated range (e.g. "~1M–2M (est.)").

Return exactly valid JSON for the following 10-module SEO strategy:
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
    "insight": "string",
    "ai_visibility_score": 75,
    "ai_cited_competitors": ["string", "string"],
    "citation_sentiment": "Positive|Mixed|Neutral",
    "geo_intelligence": {
      "geo_score": 82,
      "geo_pickup_likelihood": "High|Medium|Low",
      "retrieval_density": "High|Medium|Low",
      "optimization_tips": ["string", "string"],
      "insight": "string"
    }
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
  "final_strategic_insight": "string",
  "data_sources": [
    { "title": "string", "url": "string" }
  ]
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
    console.log(`Generated JSON for ${niche}:`, JSON.stringify(parsed).slice(0, 200), '...');

    // Merge the scraped URLs as guaranteed data_sources (override LLM's guess)
    if (urls.length > 0) {
      parsed.data_sources = titles.map((t, i) => ({ title: t, url: urls[i] || '' })).filter(s => s.url);
    }

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
