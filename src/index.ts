// src/index.ts
import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

import pg from 'pg'
const pool = new pg.Pool()

// configure database
const setupDB = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      phrase NUMERIC(20),
      history JSONB,
      CONSTRAINT phrase_unique UNIQUE (phrase)
    );
  `;
  const response = await pool.query(query);
}

const startServer = async () => {
  await setupDB();
  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
}

app.get("/", async (req: Request, res: Response) => {
  const db_response = await pool.query('SELECT now() as message');
  const result = db_response.rows[0].message;
  res.send("Express + TypeScript Server is great! " + result);
});
