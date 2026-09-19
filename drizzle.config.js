import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/main/db/index.js',
  out: './src/main/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './school.db', // or a full path
  },
});