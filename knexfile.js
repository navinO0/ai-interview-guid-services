import dotenv from "dotenv";
dotenv.config();

const config = {
  client: process.env.DB_CLIENT || "sqlite3",
  connection:
    process.env.DB_CLIENT === "sqlite3"
      ? { filename: process.env.DATABASE_URL || "./dev.db" }
      : process.env.DATABASE_URL,
  useNullAsDefault: process.env.DB_CLIENT === "sqlite3",
  migrations: {
    directory: "./migrations",
  },
  seeds: {
    directory: "./seeds",
  },
};

export default config;
