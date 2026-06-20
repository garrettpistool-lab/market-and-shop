/**
 * Market and Shop Database → SQL Backup Script
 * 
 * Usage:
 *   node scripts/export-to-sql.js
 * 
 * This will create a fresh backup.sql file with the current database state.
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'marketshop.db');
const outputPath = path.join(__dirname, '..', 'backup.sql');

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database not found at:', dbPath);
  console.log('   Run the server at least once to create the database.');
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

console.log('📦 Exporting database to SQL...');

let sql = `-- Market and Shop Database Export
-- Generated: ${new Date().toISOString()}
-- Source: ${dbPath}

PRAGMA foreign_keys = ON;

`;

// Get all tables
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all();

for (const { name: table } of tables) {
  // Get CREATE TABLE statement
  const createStmt = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type='table' AND name=?
  `).get(table);

  if (createStmt && createStmt.sql) {
    sql += `-- Table: ${table}\n`;
    sql += createStmt.sql + ';\n\n';
  }

  // Get all rows
  const rows = db.prepare(`SELECT * FROM ${table}`).all();

  if (rows.length > 0) {
    const columns = Object.keys(rows[0]);

    for (const row of rows) {
      const values = columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          // Escape single quotes
          return `'${val.replace(/'/g, "''")}'`;
        }
        return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      });

      sql += `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
    sql += '\n';
  }
}

fs.writeFileSync(outputPath, sql, 'utf8');

console.log(`✅ Backup created successfully!`);
console.log(`   File: ${outputPath}`);
console.log(`   Tables exported: ${tables.length}`);

db.close();