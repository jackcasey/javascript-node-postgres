import pg from 'pg'

// configure database
const setupDB = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nickname VARCHAR(255),
      phrase_hex VARCHAR(16),
      CONSTRAINT phrase_hex UNIQUE (phrase_hex)
    );
  `;
  const response = await (new pg.Client()).query(query);
}

export default setupDB;
