import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function testConnection() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT, 10),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });

  try {
    await client.connect();
    console.log('Conexão com o banco de dados PostgreSQL bem-sucedida!');
  } catch (err) {
    console.error('Erro ao conectar ao banco de dados PostgreSQL:', err);
  } finally {
    await client.end();
  }
}

testConnection();