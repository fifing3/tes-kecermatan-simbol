import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Read config directly to avoid ESM import issues with JSON
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(configPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

if (!getApps().length && firebaseConfig.projectId) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId);

interface ParticipantCode {
  code: string;
  createdAt: string;
  isUsed: boolean;
  usedAt?: string;
  notes: string;
  deviceId?: string;
  expiresAt?: string;
}

async function getCodes(): Promise<ParticipantCode[]> {
  const snapshot = await db.collection('access_codes').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => doc.data() as ParticipantCode);
}

async function seedDefaultCodes() {
  const snapshot = await db.collection('access_codes').limit(1).get();
  if (snapshot.empty) {
    const defaultCodes: ParticipantCode[] = [
      { code: 'PESERTA-5219', createdAt: new Date().toISOString(), isUsed: false, notes: 'Agus Setiawan (Simulasi)' },
      { code: 'PESERTA-9043', createdAt: new Date().toISOString(), isUsed: true, usedAt: new Date().toISOString(), notes: 'Siti Rahma (Simulasi)' },
      { code: 'PESERTA-7104', createdAt: new Date().toISOString(), isUsed: false, notes: 'Budi Hartono (Simulasi)' }
    ];
    const batch = db.batch();
    for (const code of defaultCodes) {
      const docRef = db.collection('access_codes').doc(code.code);
      batch.set(docRef, code);
    }
    await batch.commit();
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Seed initially
  await seedDefaultCodes().catch(console.error);

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
  app.get('/api/codes', requireAdmin, async (req, res) => {
    try {
      const codes = await getCodes();
      res.json(codes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch codes' });
    }
  });

  // Create codes (Admin Only - single or bulk)
  app.post('/api/codes', requireAdmin, async (req, res) => {
    try {
      const { codes } = req.body;
      if (!codes || !Array.isArray(codes)) {
        return res.status(400).json({ error: 'Invalid codes format. Expected { codes: ParticipantCode[] }' });
      }

      const batch = db.batch();
      for (const item of codes) {
        const docRef = db.collection('access_codes').doc(item.code);
        batch.set(docRef, item);
      }
      await batch.commit();

      const updated = await getCodes();
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create codes' });
    }
  });

  // Delete a code (Admin Only)
  app.delete('/api/codes/:code', requireAdmin, async (req, res) => {
    try {
      const codeToDelete = req.params.code.trim().toUpperCase();
      await db.collection('access_codes').doc(codeToDelete).delete();
      
      const updated = await getCodes();
      res.json(updated);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete code' });
    }
  });

  // Delete all codes (Admin Only)
  app.delete('/api/codes', requireAdmin, async (req, res) => {
    try {
      const snapshot = await db.collection('access_codes').get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      res.json([]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete all codes' });
    }
  });

  // Verify access code (Public)
  app.post('/api/verify', async (req, res) => {
    try {
      const { code, deviceId } = req.body;

      if (!code) {
        return res.status(400).json({ success: false, message: 'Kode akses tidak boleh kosong.' });
      }

      const normalized = code.trim().toUpperCase();

      // 1. Admin bypass code
      if (normalized === 'UNHAN2027') {
        return res.json({ success: true, isAdmin: true });
      }

      // 2. Dynamic participant codes check
      const docRef = db.collection('access_codes').doc(normalized);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const codeData = docSnap.data() as ParticipantCode;

        if (codeData.expiresAt) {
          const now = new Date();
          const expiresAt = new Date(codeData.expiresAt);
          if (now > expiresAt) {
            return res.status(403).json({ success: false, message: 'Kode akses ini sudah kedaluwarsa (expired).' });
          }
        }

        if (codeData.isUsed) {
          if (codeData.deviceId && codeData.deviceId !== deviceId) {
            return res.status(403).json({ success: false, message: 'Kode akses ini sudah digunakan di perangkat lain.' });
          }
        } else {
          await docRef.update({
            isUsed: true,
            usedAt: new Date().toISOString(),
            deviceId: deviceId || 'unknown-device'
          });
        }
        return res.json({ success: true, isAdmin: false });
      }

      return res.status(400).json({ success: false, message: 'Kode akses tidak valid atau belum terdaftar.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error during verification.' });
    }
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
