import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleApiRequest } from './src/server/api.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API Middleware
app.use((req, res, next) => {
  if (handleApiRequest(req, res)) {
    return;
  }
  next();
});

// Serve Vite build output in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`EndoSim-WCE server listening on port ${PORT}`);
});
