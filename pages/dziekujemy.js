export default function Dziekujemy() {
  return (
    <div style={{
      height: "100vh",
      backgroundColor: "#1e1e2f",
      color: "#ffffff",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Arial, sans-serif",
      textAlign: "center",
      padding: "20px"
    }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✅ Dziękujemy za weryfikację!</h1>
      <p style={{ fontSize: "1.2rem", maxWidth: "600px" }}>
        Twoja autoryzacja przebiegła pomyślnie. Możesz teraz wrócić na serwer Discord i korzystać z pełnych funkcji!
      </p>
      <a
        href="https://discord.com/"
        style={{
          marginTop: "2rem",
          backgroundColor: "#5865F2",
          color: "white",
          padding: "12px 24px",
          borderRadius: "6px",
          textDecoration: "none",
          fontSize: "1rem",
          transition: "background-color 0.3s ease"
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#4752C4"}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#5865F2"}
      >
        🔙 Powrót na Discord
      </a>
    </div>
  );
}
