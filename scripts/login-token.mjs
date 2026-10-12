import "dotenv/config";

async function main() {
  const account = process.argv[2] ?? "admin";

  if (!["admin", "employee"].includes(account)) {
    throw new Error("Erlaubte Konten: admin oder employee.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    !process.env.API_BASE_URL
  ) {
    throw new Error("API_BASE_URL fehlt für die Produktionsumgebung.");
  }

  const baseUrl =
    process.env.API_BASE_URL ?? "http://localhost:3000";

  const prefix =
    account === "employee" ? "SEED_EMPLOYEE" : "SEED_ADMIN";

  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];

  if (!email || !password) {
    throw new Error("E-Mail oder Passwort fehlt in der Konfiguration.");
  }

  const response = await fetch(
    new URL("/api/v1/auth/login", baseUrl),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    }
  );

  const body = await response.json();

  if (!response.ok || typeof body.data?.accessToken !== "string") {
    throw new Error(`Login fehlgeschlagen: HTTP ${response.status}`);
  }

  process.stdout.write(body.data.accessToken);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});