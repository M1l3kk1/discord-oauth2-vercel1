const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: "Brak kodu autoryzacyjnego" });
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
    // Krok 1: Wymiana kodu na token dostępu
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: data,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      // W przypadku błędu, lepiej nie przekierowywać, a pokazać błąd
      return res.status(500).json({ error: "Błąd podczas pobierania tokenu z Discorda", details: errorText });
    }

    const tokenJson = await tokenRes.json();
    const access_token = tokenJson.access_token;

    // Krok 2: Pobranie danych użytkownika przy użyciu tokenu
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const userData = await userRes.json();
    
    // Tutaj możesz wykonać dodatkowe operacje, np. zapisać dane użytkownika do bazy danych
    console.log(`Użytkownik ${userData.username} (#${userData.id}) pomyślnie zakończył autoryzację.`);

    // Krok 3: Przekierowanie użytkownika na stronę z podziękowaniem ✅
    return res.redirect('/autoryzacja.html');

  } catch (error) {
    // Obsługa ewentualnych błędów sieciowych lub innych
    return res.status(500).json({ error: "Wewnętrzny błąd serwera", details: error.message });
  }
}
