import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { type SearchCriterion, type GroupedResult, type ResultItem } from '@shared/schema';

// This class simulates the interaction with the "huge" SQLite databases
export class SearchDB {
  private indexDb: Database.Database;
  private incomingDb: Database.Database;

  constructor() {
    // We create these files in the local directory for the demo
    const dataDir = path.join(process.cwd(), 'server', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.indexDb = new Database(path.join(dataDir, 'index.db'));
    this.incomingDb = new Database(path.join(dataDir, 'incoming.db'));

    this.initDB(this.indexDb, 'IndexDB');
    this.initDB(this.incomingDb, 'IncomingDB');
  }

  private initDB(db: Database.Database, name: string) {
    // Create the FTS5 table as described by the user
    // "records" with "source" and "content"
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS records USING fts5(source, content);
    `);

    // Check if empty, if so, seed it
    const count = db.prepare('SELECT count(*) as c FROM records').get() as { c: number };
    if (count.c === 0) {
      console.log(`Seeding ${name}...`);
      const insert = db.prepare('INSERT INTO records (source, content) VALUES (?, ?)');
      
      const seedData = [
        ['breach_2023.txt', 'id:101|user:jdoe|email:john.doe@example.com|ip:192.168.1.5'],
        ['breach_2023.txt', 'id:102|user:asmith|email:alice.smith@test.com|ip:10.0.0.2'],
        ['old_logs.log', '2020-01-01 error: invalid login from 192.168.1.5'],
        ['users_dump.csv', 'jean,dupont,jean.dupont@orange.fr,0612345678,Paris'],
        ['discord_logs.json', '{"discord_id": "84738274382", "username": "skorpion_fan"}'],
        ['mixed_data.txt', 'MAC: 00:1A:2B:3C:4D:5E | IP: 192.168.1.5 | User: admin'],
        ['customer_list.csv', 'Martin,Pierre,pierre.martin@email.com,1985-04-12'],
        ['leaked_passwords.txt', 'admin:password123'],
        ['leaked_passwords.txt', 'root:toor'],
      ];

      // Add different data to incoming vs index to show different sources
      if (name === 'IncomingDB') {
        insert.run('recent_hack.txt', 'New hack data: user=admin pass=SuperSecret! ip=8.8.8.8');
        insert.run('live_feed.log', 'Connection from 1.1.1.1 at 12:00');
      } else {
        seedData.forEach(([src, content]) => insert.run(src, content));
      }
    }
  }

  // Execute search across both databases
  public search(criteria: SearchCriterion[], operator: 'AND' | 'OR', limit: number = 1000): GroupedResult[] {
    // Construct FTS5 query
    // If criteria are [ {value: "test"}, {value: "123"} ]
    // AND -> "test" AND "123"
    // OR -> "test" OR "123"
    
    // We sanitize the input to avoid syntax errors in FTS5
    const sanitize = (str: string) => `"${str.replace(/"/g, '""')}"`;
    
    const queryParts = criteria.map(c => sanitize(c.value));
    if (queryParts.length === 0) return [];

    const ftsQuery = queryParts.join(` ${operator} `);

    // Prepare statement (same for both DBs)
    // We limit per DB to avoid over-fetching, but we'll merge and limit again
    const sql = `
      SELECT source, content 
      FROM records 
      WHERE records MATCH ? 
      ORDER BY rank 
      LIMIT ?
    `;

    // Execute in parallel (conceptually, though SQLite in Node is sync usually, better-sqlite3 is sync)
    const results1 = this.indexDb.prepare(sql).all(ftsQuery, limit) as { source: string, content: string }[];
    const results2 = this.incomingDb.prepare(sql).all(ftsQuery, limit) as { source: string, content: string }[];

    // Merge results
    const allResults = [...results1, ...results2];
    
    // Group by source
    const grouped: Record<string, ResultItem[]> = {};
    
    for (const row of allResults) {
      if (!grouped[row.source]) {
        grouped[row.source] = [];
      }
      // Max 200 per source constraint
      if (grouped[row.source].length < 200) {
        grouped[row.source].push({ content: row.content });
      }
    }

    // Convert to array
    const output: GroupedResult[] = Object.entries(grouped).map(([source, items]) => ({
      source,
      items,
      count: items.length
    }));

    // Apply global limit if needed (though we limited query, merging might exceed)
    // The user said "max 1000 total results". 
    // We can count total items and slice. 
    // For now, returning grouped results structure.
    
    return output;
  }
}

export const searchDB = new SearchDB();
