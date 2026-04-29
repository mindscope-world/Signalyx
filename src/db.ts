import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'niche_engine.db');
const db = new Database(dbPath, { verbose: console.log });

// Initialize database schema
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS raw_documents (
        id TEXT PRIMARY KEY,
        source VARCHAR(50),
        query TEXT,
        url TEXT,
        title TEXT,
        content TEXT,
        author VARCHAR(255),
        published_at DATETIME,
        scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        language VARCHAR(10),
        metadata TEXT,
        content_hash TEXT UNIQUE
    );

    CREATE TABLE IF NOT EXISTS raw_comments (
        id TEXT PRIMARY KEY,
        document_id TEXT REFERENCES raw_documents(id),
        content TEXT,
        author VARCHAR(255),
        upvotes INTEGER,
        sentiment_score REAL,
        created_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        raw_id TEXT REFERENCES raw_documents(id),
        cleaned_content TEXT,
        word_count INTEGER,
        language VARCHAR(10),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS keywords (
        id TEXT PRIMARY KEY,
        keyword TEXT UNIQUE,
        normalized_keyword TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS document_keywords (
        document_id TEXT REFERENCES documents(id),
        keyword_id TEXT REFERENCES keywords(id),
        score REAL,
        PRIMARY KEY (document_id, keyword_id)
    );

    CREATE TABLE IF NOT EXISTS topics (
        id TEXT PRIMARY KEY,
        name TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS topic_keywords (
        topic_id TEXT REFERENCES topics(id),
        keyword_id TEXT REFERENCES keywords(id),
        weight REAL,
        PRIMARY KEY (topic_id, keyword_id)
    );

    CREATE TABLE IF NOT EXISTS document_topics (
        document_id TEXT REFERENCES documents(id),
        topic_id TEXT REFERENCES topics(id),
        confidence REAL,
        PRIMARY KEY (document_id, topic_id)
    );

    CREATE TABLE IF NOT EXISTS intents (
        id TEXT PRIMARY KEY,
        type VARCHAR(50)
    );

    CREATE TABLE IF NOT EXISTS document_intents (
        document_id TEXT REFERENCES documents(id),
        intent_id TEXT REFERENCES intents(id),
        confidence REAL,
        PRIMARY KEY (document_id, intent_id)
    );

    CREATE TABLE IF NOT EXISTS sentiments (
        document_id TEXT PRIMARY KEY REFERENCES documents(id),
        sentiment_score REAL,
        emotion TEXT
    );

    CREATE TABLE IF NOT EXISTS keyword_trends (
        keyword_id TEXT REFERENCES keywords(id),
        date DATE,
        search_volume INTEGER,
        mention_count INTEGER,
        growth_rate REAL,
        PRIMARY KEY (keyword_id, date)
    );

    CREATE TABLE IF NOT EXISTS topic_trends (
        topic_id TEXT REFERENCES topics(id),
        date DATE,
        volume INTEGER,
        growth_rate REAL,
        PRIMARY KEY (topic_id, date)
    );

    CREATE TABLE IF NOT EXISTS serp_results (
        id TEXT PRIMARY KEY,
        keyword_id TEXT REFERENCES keywords(id),
        url TEXT,
        title TEXT,
        rank INTEGER,
        domain VARCHAR(255),
        fetched_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS competitors (
        id TEXT PRIMARY KEY,
        domain VARCHAR(255) UNIQUE,
        category TEXT
    );

    CREATE TABLE IF NOT EXISTS competitor_keywords (
        competitor_id TEXT REFERENCES competitors(id),
        keyword_id TEXT REFERENCES keywords(id),
        rank INTEGER,
        PRIMARY KEY (competitor_id, keyword_id)
    );

    CREATE TABLE IF NOT EXISTS keyword_scores (
        keyword_id TEXT PRIMARY KEY REFERENCES keywords(id),
        demand_score REAL,
        competition_score REAL,
        opportunity_score REAL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS topic_scores (
        topic_id TEXT PRIMARY KEY REFERENCES topics(id),
        demand_score REAL,
        competition_score REAL,
        opportunity_score REAL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        niche TEXT,
        type VARCHAR(50),
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS content_outputs (
        id TEXT PRIMARY KEY,
        niche TEXT,
        type VARCHAR(50),
        input_context TEXT,
        output TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        plan VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_queries (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        query TEXT,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("Database initialized check passed.");
}

export default db;
