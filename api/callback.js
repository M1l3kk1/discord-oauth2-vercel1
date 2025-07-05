const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

export default async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    console.error("Brak kodu autoryzacyjnego w zapytaniu.");
    return res.status(400).send("Brak kodu autoryzacyjnego.");
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
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: data,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Błąd podczas pobierania tokenu:", errorText);
      return res.status(500).send("Nie udało się uzyskać tokenu dostępu.");
    }

    const tokenJson = await tokenRes.json();
    const access_token = tokenJson.access_token;

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    if (!userRes.ok) {
      const errorUser = await userRes.text();
      console.error("Błąd podczas pobierania użytkownika:", errorUser);
      return res.status(500).send("Nie udało się pobrać danych użytkownika.");
    }

    const userData = await userRes.json();
    console.log("✅ Użytkownik zweryfikowany:", userData);

    // ✅ PRZEKIEROWANIE NA STRONĘ Z PODZIĘKOWANIEM
    return res.redirect("/dziekujemy");
  } catch (error) {
    console.error("❌ Wewnętrzny błąd serwera:", error.message);
    return res.status(500).send("Wystąpił wewnętrzny błąd serwera.");
  }
}
