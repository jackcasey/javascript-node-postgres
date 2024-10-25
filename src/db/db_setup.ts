import pg from 'pg'

// configure database
const setupDB = async () => {
  console.log("Setting up users...");
  const users_table = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nickname VARCHAR(255),
      phrase_hex VARCHAR(16),
      CONSTRAINT phrase_hex UNIQUE (phrase_hex)
    );
  `;
  const client = new pg.Client();
  await client.connect();
  var response = await client.query(users_table);

  console.log("Setting up days...");
  const days_table = `
    CREATE TABLE IF NOT EXISTS days (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      key VARCHAR(255),
      share_text TEXT,
      CONSTRAINT user_id_key UNIQUE (user_id, key)
    );
  `;
  response = await client.query(days_table);
  console.log("Done");

  await client.end();
}

export default setupDB;
