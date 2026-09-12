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
  `CREATE TABLE IF NOT EXISTS locks (name TEXT PRIMARY KEY, expires INTEGER NOT NULL)`
 ],'write');
}
