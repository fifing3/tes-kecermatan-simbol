import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

interface ParticipantCode {
  code: string;
  createdAt: string;
  isUsed: boolean;
  usedAt?: string;
  notes: string;
}

const CODES_FILE = path.join(process.cwd(), 'codes.json');

function readCodes(): ParticipantCode[] {
  try {
    if (fs.existsSync(CODES_FILE)) {
      const data = fs.readFileSync(CODES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading codes file:', error);
  }
  // Default seed codes
  const defaultCodes: ParticipantCode[] = [
    { code: 'PESERTA-5219', createdAt: new Date().toISOString(), isUsed: false, notes: 'Agus Setiawan (Simulasi)' },
    { code: 'PESERTA-9043', createdAt: new Date().toISOString(), isUsed: true, usedAt: new Date().toISOString(), notes: 'Siti Rahma (Simulasi)' },
    { code: 'PESERTA-7104', createdAt: new Date().toISOString(), isUsed: false, notes: 'Budi Hartono (Simulasi)' }
  ];
  writeCodes(defaultCodes);
  return defaultCodes;
}

function writeCodes(codes: ParticipantCode[]) {
  try {
    fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing codes file:', error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Middleware for Admin Authorization
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey === 'UNHAN2027') {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized admin access' });
    }
  };

  // --- API ROUTES ---

  // Get all codes (Admin Only)
  app.get('/api/codes', requireAdmin, (req, res) => {
    const codes = readCodes();
    res.json(codes);
  });

  // Create codes (Admin Only - single or bulk)
  app.post('/api/codes', requireAdmin, (req, res) => {
    const { codes } = req.body;
    if (!codes || !Array.isArray(codes)) {
      return res.status(400).json({ error: 'Invalid codes format. Expected { codes: ParticipantCode[] }' });
    }
    
    const existing = readCodes();
    // Prepend new codes to match existing client behavior (newest codes first)
    const updated = [...codes, ...existing];
    writeCodes(updated);
    res.json(updated);
  });

  // Delete a code (Admin Only)
  app.delete('/api/codes/:code', requireAdmin, (req, res) => {
    const codeToDelete = req.params.code.trim().toUpperCase();
    const existing = readCodes();
    const updated = existing.filter(c => c.code.trim().toUpperCase() !== codeToDelete);
    writeCodes(updated);
    res.json(updated);
  });

  // Delete all codes (Admin Only)
  app.delete('/api/codes', requireAdmin, (req, res) => {
    writeCodes([]);
    res.json([]);
  });

  // Verify access code (Public)
  app.post('/api/verify', (req, res) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Kode akses tidak boleh kosong.' });
    }

    const normalized = code.trim().toUpperCase();

    // 1. Admin bypass code
    if (normalized === 'UNHAN2027') {
      return res.json({ success: true, isAdmin: true });
    }

    // 2. Dynamic participant codes check
    const codes = readCodes();
    const foundIdx = codes.findIndex(c => c.code.trim().toUpperCase() === normalized);
    
    if (foundIdx !== -1) {
      // Mark code as used if not already
      if (!codes[foundIdx].isUsed) {
        codes[foundIdx].isUsed = true;
        codes[foundIdx].usedAt = new Date().toISOString();
        writeCodes(codes);
      }
      return res.json({ success: true, isAdmin: false });
    }

    return res.status(400).json({ success: false, message: 'Kode akses tidak valid atau belum terdaftar.' });
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
