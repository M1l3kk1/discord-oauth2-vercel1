// Plik: api/callback.js

import { Pool } from 'pg';

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Konfiguracja połączenia z bazą danych Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Tworzymy tabelę 'users', jeśli nie istnieje
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        verified_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Inicjalizacja bazy danych zakończona. Tabela 'users' gotowa.");
  } catch (err) {
    console.error('❌ Błąd podczas inicjalizacji bazy danych:', err.stack);
  } finally {
    client.release();
  }
}

// Wywołujemy inicjalizację raz na starcie, aby upewnić się, że tabela istnieje
initializeDatabase().catch(console.error);


export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: "Brak kodu autoryzacyjnego" });
  }

  const data = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.REDIRECT_URI,
  });

  try {
    // Krok 1: Wymiana kodu na token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: data,
    });

    if (!tokenRes.ok) throw new Error(await tokenRes.text());

    const tokenJson = await tokenRes.json();
    const access_token = tokenJson.access_token;

    // Krok 2: Pobranie danych użytkownika
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    
    if (!userRes.ok) throw new Error(await userRes.text());
    
    const userData = await userRes.json();
    
    // =======================================================
    // ▼▼▼ KROK 3: ZAPIS UŻYTKOWNIKA DO BAZY DANYCH NEON ▼▼▼
    // =======================================================
    try {
      const client = await pool.connect();
      try {
        const sql = 'INSERT INTO users (id, username) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING;';
        const values = [userData.id, userData.username];
        await client.query(sql, values);
        console.log(`✅ Zapisano użytkownika w bazie danych: ${userData.username} (${userData.id})`);
      } finally {
        // Zawsze zwalniaj klienta z powrotem do puli
        client.release();
      }
    } catch (dbError) {
        console.error('❌ Błąd zapisu do bazy danych:', dbError.stack);
    }
    // =======================================================
    
    // Krok 4: Przekierowanie użytkownika
    return res.redirect('/autoryzacja.html');

  } catch (error) {
    console.error("❌ Wystąpił błąd w procesie autoryzacji:", error);
    // Możesz przekierować na stronę błędu
    return res.status(500).send("Wystąpił wewnętrzny błąd serwera.");
  }
}
