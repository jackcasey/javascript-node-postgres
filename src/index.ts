// src/index.ts
import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { User } from "./entities/user.entity";
import { MikroORM } from "@mikro-orm/core";
import { Day } from "./entities/day.entity";
import pg from 'pg'
import setupDB from "./db/db_setup";
import * as bip39 from 'bip39';
import { setTimeout } from "timers/promises";

var orm:MikroORM;
dotenv.config();
const app: Express = express();

app.use(express.json());

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
  console.log("Setting up DB...");
  await setupDB();
  console.log("MikroORM starting...");
  orm = await MikroORM.init();

  console.log("MikroORM done...");
  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
}

// app.get("/", async (req: Request, res: Response) => {
//   const db_response = await pool.query('SELECT now() as message');
//   const result = db_response.rows[0].message;
//   res.send("Express + TypeScript Server is great! " + result);
// });

app.get("/generate_phrase", async (req: Request, res: Response) => {
  await setTimeout(1000);
  res.header("Content-Type", "application/json");
  const mnemonic = await bip39.generateMnemonic(64);
  var phrase_hex = bip39.mnemonicToEntropy(mnemonic);
  res.send(JSON.stringify({mnemonic, phrase_hex}));
});

const get_user_payload = (user: User):string => {
  const userDays = user.days.map((day) => {return {key: day.key, share_text: day.share_text}});
  const days: {[key: string]: string} = {};
  for (let day of userDays) {
    days[day.key] = day.share_text;
  }

  return JSON.stringify({id: user.id, days});
}

app.get("/get_user", async (req: Request, res: Response) => {
  await setTimeout(1000);
  res.header("Content-Type", "application/json");
  const em = orm.em.fork();
  const q_phrase = req.query.phrase?.toString();
  if (!q_phrase) {
    res.status(400).send(JSON.stringify({error: "No phrase provided"}));
    return;
  }
  if (!bip39.validateMnemonic(q_phrase)) {
    res.status(400).send(JSON.stringify({error: "Invalid phrase"}));
    return;
  }
  const phrase_hex = bip39.mnemonicToEntropy(q_phrase!);

  const user = await em.findOne(User, {phrase_hex: phrase_hex}, { populate: ['days'] });
  if (!user) {
    res.status(404).send(JSON.stringify({error: "User not found"}));
    return;
  }
  res.send(get_user_payload(user));
});

app.post("/add_user", async (req: Request, res: Response) => {
  await setTimeout(1000);
  res.header("Content-Type", "application/json");
  const em = orm.em.fork();
  const q_phrase = req.query.phrase?.toString();
  if (!q_phrase) {
    res.status(400).send(JSON.stringify({error: "No phrase provided"}));
    return;
  }
  if (!bip39.validateMnemonic(q_phrase)) {
    res.status(400).send(JSON.stringify({error: "Invalid phrase"}));
    return;
  }
  const phrase_hex = bip39.mnemonicToEntropy(q_phrase!);

  const user = await em.findOne(User, {phrase_hex: phrase_hex});
  if (user) {
    res.status(409).send(JSON.stringify({error: "User already exists"}));
    return;
  }

  const new_user = em.create(User, {phrase_hex: phrase_hex});
  em.persist(new_user);
  await em.flush();
  res.send(get_user_payload(new_user));
});

const add_day = async (user: User, key: string, share_text: string):Promise<Day|null> => {
  const em = orm.em.fork();
  try {
    const day = em.create(Day, {key: key, share_text: share_text, user: user});
    em.persist(day);
    await em.flush();
    return day;
  } catch (e) {
    // couldn't add
    return null;
  }
}

app.post("/add_days", async (req: Request, res: Response) => {
  res.header("Content-Type", "application/json");
  const em = orm.em.fork();
  const q_phrase = req.query.phrase?.toString();
  console.log("Body:");
  console.log(req.body);
  const days = req.body;
  if (!q_phrase) {
    res.status(400).send(JSON.stringify({error: "No phrase provided"}));
    return;
  }
  if (!bip39.validateMnemonic(q_phrase)) {
    res.status(400).send(JSON.stringify({error: "Invalid phrase"}));
    return;
  }
  const phrase_hex = bip39.mnemonicToEntropy(q_phrase!);
  const user = await em.findOne(User, {phrase_hex: phrase_hex}, { populate: ['days'] });
  if (!user) {
    res.status(404).send(JSON.stringify({error: "User not found"}));
    return;
  }
  console.log(days);
  if (days) {
    for (const [day, share_text] of Object.entries(days)) {
      if (!user.days.find((d) => d.key === day)) {
        await add_day(user, day, share_text as string);
      }
    }
  }
  console.log(days);
  res.send(get_user_payload(user));

});

app.use(express.static('public'))

startServer();
