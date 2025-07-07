import { Pool } from 'pg';

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Konfiguracja połączenia z bazą danych Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Ta funkcja jest wywoływana tylko raz, gdy serwer startuje
async function initializeDatabase() {
  let client;
  try {
    client = await pool.connect();
    // Upewniamy się, że tabela ma wszystkie potrzebne kolumny
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        expires_at TIMESTAMPTZ,
        verified_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Dodajemy nowe kolumny, jeśli ich brakuje
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS access_token TEXT,
      ADD COLUMN IF NOT EXISTS refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
    `);
    console.log("✅ Baza danych gotowa do zapisywania tokenów.");
  } catch (err) {
    console.error('❌ Krytyczny błąd podczas inicjalizacji bazy danych:', err.stack);
    // Rzucamy błąd, aby Vercel wiedział, że funkcja startowa zawiodła
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Inicjalizujemy bazę. Jeśli to się nie uda, funkcja nie będzie działać,
// a błąd będzie widoczny w logach Vercela.
const dbInitializationPromise = initializeDatabase();

export default async function handler(req, res) {
  try {
    // Czekamy, aż inicjalizacja bazy się zakończy, zanim obsłużymy żądanie
    await dbInitializationPromise;
  } catch (initError) {
    console.error("Inicjalizacja bazy danych nie powiodła się, nie można obsłużyć żądania.", initError);
    return res.status(500).send("Błąd serwera: Konfiguracja bazy danych nie powiodła się.");
  }

  const code = req.query.code;
  if (!code) return res.status(400).json({ error: "Brak kodu autoryzacyjnego" });

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
    
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!userRes.ok) throw new Error(`Błąd pobierania użytkownika: ${await userRes.text()}`);
    const userData = await userRes.json();

    // Zapisujemy użytkownika ORAZ jego tokeny do bazy danych
    const client = await pool.connect();
    try {
      const sql = `
        INSERT INTO users (id, username, access_token, refresh_token, expires_at)
        VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 day')
        ON CONFLICT (id) DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          expires_at = EXCLUDED.expires_at;
      `;
      const values = [userData.id, userData.username, tokenJson.access_token, tokenJson.refresh_token];
      await client.query(sql, values);
      console.log(`✅ Zapisano tokeny dla użytkownika: ${userData.username}`);
    } finally {
      client.release();
    }
    
    return res.redirect('/autoryzacja.html');
  } catch (error) {
    console.error("❌ Błąd w procesie autoryzacji:", error);
    return res.status(500).send("Wystąpił wewnętrzny błąd serwera.");
  }
}
