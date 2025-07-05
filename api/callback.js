import fetch from "node-fetch";

export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) {
    res.status(400).json({ error: "Brak kodu autoryzacyjnego" });
    return;
  }

  const clientSecret = process.env.CLIENT_SECRET;

  const data = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.REDIRECT_URI,
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
      const errorData = await tokenRes.text();
      res.status(500).json({ error: "Nie udało się wymienić kodu na token", details: errorData });
      return;
    }

    const tokenJson = await tokenRes.json();
    const access_token = tokenJson.access_token;

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const userData = await userRes.json();

    res.status(200).json({ user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
