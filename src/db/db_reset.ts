'use strict';
import pg from 'pg'
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool()

// configure database
const resetDB = async () => {
  console.log('Resetting database...');
  const query = `DROP TABLE IF EXISTS users;`;
  const response = await pool.query(query);
  console.log('Done');
}

resetDB().finally(() => {
  process.exit();
});
