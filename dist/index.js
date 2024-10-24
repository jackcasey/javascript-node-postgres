"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const pg_1 = __importDefault(require("pg"));
const pool = new pg_1.default.Pool();
// configure database
const setupDB = () => __awaiter(void 0, void 0, void 0, function* () {
    const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      phrase NUMERIC(20),
      history JSONB,
      CONSTRAINT phrase_unique UNIQUE (phrase)
    );
  `;
    const response = yield pool.query(query);
});
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    yield setupDB();
    app.listen(port, () => {
        console.log(`[server]: Server is running at http://localhost:${port}`);
    });
});
app.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const db_response = yield pool.query('SELECT now() as message');
    const result = db_response.rows[0].message;
    res.send("Express + TypeScript Server is great! " + result);
}));
