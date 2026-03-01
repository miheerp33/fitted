import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Always load backend/.env regardless of process.cwd()
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Helpful debug (does not print secret values)
if (process.env.NODE_ENV !== 'production') {
  console.log(`[env] loaded ${envPath}`);
  console.log(`[env] MODAL_AI_URL ${process.env.MODAL_AI_URL ? 'SET' : 'MISSING'}`);
  try {
    const fs = await import('fs');
    const raw = fs.readFileSync(envPath, 'utf8');
    if (!raw.includes('MODAL_AI_URL=')) {
      console.log('[env] NOTE: backend/.env on disk does not contain MODAL_AI_URL= (make sure you saved the file).');
    }
  } catch (_) {
    // ignore
  }
}

