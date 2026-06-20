/**
 * Restore Market and Shop database from backup.sql
 * 
 * Usage:
 *   node scripts/restore-from-sql.js
 * 
 * WARNING: This will overwrite the current database!
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'marketshop.db');
const sqlPath = path.join(__dirname, '..', 'backup.sql');

if (!fs.existsSync(sqlPath)) {
  console.error('❌ backup.sql not found!');
  process.exit(1);
}

console.log('⚠️  WARNING: This will overwrite your current database.');
console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');

setTimeout(() => {
  if (fs.existsSync(dbPath)) {
    const backupName = `marketshop.db.backup-${Date.now()}`;
    fs.copyFileSync(dbPath, path.join(__dirname, '..', backupName));
    console.log(`📦 Existing database backed up as: ${backupName}`);
  }

  const db = new Database(dbPath);

  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split and execute statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`🔄 Executing ${statements.length} statements...`);

  let success = 0;
  let errors = 0;

  for (const stmt of statements) {
    try {
      db.exec(stmt + ';');
      success++;
    } catch (e) {
      // Ignore "table already exists" etc for safety
      if (!e.message.includes('already exists')) {
        console.error('Error:', e.message);
        errors++;
      }
    }
  }

  db.close();

  console.log(`✅ Restore complete!`);
  console.log(`   Successful: ${success}`);
  console.log(`   Errors (ignored): ${errors}`);
  console.log(`   Database: ${dbPath}`);

}, 5000);