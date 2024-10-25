// src/index.ts
import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { User } from "./entities/user.entity";
import { MikroORM } from "@mikro-orm/core";
import pg from 'pg'
import setupDB from "./db/db_setup";
import bip39 from 'bip39';

var orm:MikroORM;
dotenv.config();
const app: Express = express();
const port = process.env.PORT || 5000;

const pool = new pg.Pool()

const testUser = async () => {
  const em = orm.em.fork();
  const user = new User();
  user.nickname = "test";
  user.phrase_hex = "1122334455667788";
  em.persist(user).flush();
}

const startServer = async () => {
  await setupDB();
  console.log("MikroORM starting...");
  orm = await MikroORM.init();

  console.log("MikroORM done...");
  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
}

app.get("/", async (req: Request, res: Response) => {
  const db_response = await pool.query('SELECT now() as message');
  const result = db_response.rows[0].message;
  res.send("Express + TypeScript Server is great! " + result);
});

app.get("/new_mnemonic", async (req: Request, res: Response) => {
  const mnemonic = await bip39.generateMnemonic(64);
  console.log(mnemonic);
  res.send("{\"mnemonic\": \"" + mnemonic + "\"}");
});

startServer();
