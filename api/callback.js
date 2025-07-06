// Plik: api/callback.js

import { Pool } from 'pg';

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// =======================================================
// ▼▼▼ POPRAWIONA KONFIGURACJA POŁĄCZENIA ▼▼▼
// =======================================================
// Przekazujemy adres URL bezpośrednio do konstruktora Pool.
// Biblioteka 'pg' sama odczyta z niego potrzebę użycia SSL.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
// =======================================================


async function initializeDatabase() {
  const client = await pool.connect();
  try {
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
    // Rzucamy błąd dalej, aby Vercel wiedział, że funkcja startowa zawiodła
    throw err;
  } finally {
    client.release();
  }
}

// Wywołujemy inicjalizację. Jeśli się nie powiedzie, funkcja nie będzie działać.
initializeDatabase().catch(err => {
    console.error("Krytyczny błąd inicjalizacji bazy danych. Funkcja nie będzie dostępna.", err);
    // Proces zostanie zakończony z błędem, co jest pożądane w tym przypadku
    process.exit(1);
});


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
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: data,
    });

    if (!tokenRes.ok) throw new Error(`Błąd tokenu: ${await tokenRes.text()}`);

    const tokenJson = await tokenRes.json();
    const access_token = tokenJson.access_token;

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    
    if (!userRes.ok) throw new Error(`Błąd pobierania użytkownika: ${await userRes.text()}`);
    
    const userData = await userRes.json();
    
    try {
      const client = await pool.connect();
      try {
        const sql = 'INSERT INTO users (id, username) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING;';
        const values = [userData.id, userData.username];
        await client.query(sql, values);
        console.log(`✅ Zapisano użytkownika w bazie danych: ${userData.username} (${userData.id})`);
      } finally {
        client.release();
      }
    } catch (dbError) {
        console.error('❌ Błąd zapisu do bazy danych:', dbError.stack);
        // Rzucamy błąd, aby główny blok catch go obsłużył
        throw dbError;
    }
    
    return res.redirect('/autoryzacja.html');

  } catch (error) {
    console.error("❌ Wystąpił błąd w procesie autoryzacji:", error);
    return res.status(500).send("Wystąpił wewnętrzny błąd serwera. Sprawdź logi na Vercel.");
  }
}
