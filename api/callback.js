import clientPromise from "../../lib/mongodb";

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("Brak kodu autoryzacyjnego");
  }

  const CLIENT_ID = process.env.CLIENT_ID;
  const CLIENT_SECRET = process.env.CLIENT_SECRET;
  const REDIRECT_URI = process.env.REDIRECT_URI;

  const data = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    scope: "identify guilds.join bot applications.commands guilds"
  });

  try {
    // Wymiana kodu na token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: data,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      return res.status(500).send(`Błąd tokenu: ${errorText}`);
    }

    const tokenJson = await tokenRes.json();
    const access_token = tokenJson.access_token;

    // Pobranie danych użytkownika
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const userData = await userRes.json();

    // Połączenie z bazą
    const client = await clientPromise;
    const db = client.db("vercel-discord");

    // Zapis lub aktualizacja użytkownika
    await db.collection("users").updateOne(
      { id: userData.id },
      { $set: userData },
      { upsert: true }
    );

    // Odpowiedź HTML z podziękowaniem
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(`
      <html>
        <head><title>Dziękujemy za weryfikację!</title></head>
        <body style="font-family:sans-serif; text-align:center; margin-top:50px;">
          <h1>Dziękujemy, ${userData.username}!</h1>
          <p>Twoja weryfikacja przebiegła pomyślnie.</p>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).json({ error: "Wewnętrzny błąd serwera", details: error.message });
  }
}
