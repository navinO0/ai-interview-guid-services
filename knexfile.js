
export default {
  client: "sqlite3",
  connection: {
    filename: "./dev.db",
  },
  useNullAsDefault: true,
  migrations: {
    directory: "./migrations",
  },
  seeds: {
    directory: "./seeds",
  },
};
