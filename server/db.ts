import {createClient, type Client} from '@libsql/client';
import {mkdirSync} from 'node:fs';
let instance:Client|undefined;
export function database(){
 if(!instance){
  const url=process.env.TURSO_DATABASE_URL;
  if(process.env.NETLIFY && !url)throw new Error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Netlify.');
  if(!url)mkdirSync('.data',{recursive:true});
  instance=createClient({url:url||'file:.data/soul-cat.db',authToken:process.env.TURSO_AUTH_TOKEN});
 }
 return instance;
}
export async function migrate(db=database()){
 await db.batch([
  `CREATE TABLE IF NOT EXISTS cats (key TEXT PRIMARY KEY, source_id TEXT NOT NULL, body TEXT NOT NULL, first_seen TEXT NOT NULL, last_seen TEXT NOT NULL, availability TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS cats_source ON cats(source_id)`,
  `CREATE TABLE IF NOT EXISTS scans (id TEXT PRIMARY KEY, started_at TEXT NOT NULL, body TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sources (id TEXT PRIMARY KEY, body TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS locks (name TEXT PRIMARY KEY, expires INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS scan_jobs (id TEXT PRIMARY KEY, trigger TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, lease_until INTEGER, lease_token TEXT, finished_at INTEGER)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS one_active_scan_job ON scan_jobs((1)) WHERE status IN ('queued','running')`,
  `CREATE TABLE IF NOT EXISTS scope_memberships (scope_id TEXT NOT NULL, key TEXT NOT NULL, last_seen TEXT NOT NULL, PRIMARY KEY(scope_id,key))`,
  `CREATE INDEX IF NOT EXISTS memberships_key ON scope_memberships(key)`,
  `CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY)`,
  `INSERT OR IGNORE INTO scope_memberships(scope_id,key,last_seen) SELECT source_id,key,last_seen FROM cats WHERE availability='listed' AND NOT EXISTS (SELECT 1 FROM schema_meta WHERE key='legacy_memberships_v1')`,
  `INSERT OR IGNORE INTO schema_meta(key) VALUES('legacy_memberships_v1')`
 ],'write');
}
