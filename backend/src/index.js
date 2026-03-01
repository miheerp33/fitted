import './env.js';
import express from 'express';
import cors from 'cors';
import { uploadRouter } from './routes/upload.js';
import { recommendRouter } from './routes/recommend.js';
import { moodboardRouter } from './routes/moodboard.js';
import { feedbackRouter } from './routes/feedback.js';
import { wardrobeRouter } from './routes/wardrobe.js';
import { outfitsRouter } from './routes/outfits.js';
import { shareRouter } from './routes/share.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

app.use('/api/upload', asyncHandler(authMiddleware), uploadRouter);
app.use('/api/wardrobe', asyncHandler(authMiddleware), wardrobeRouter);
app.use('/api/recommend', asyncHandler(authMiddleware), recommendRouter);
app.use('/api/moodboard', asyncHandler(authMiddleware), moodboardRouter);
app.use('/api/feedback', asyncHandler(authMiddleware), feedbackRouter);
app.use('/api/outfits', asyncHandler(authMiddleware), outfitsRouter);
app.use('/api/share', shareRouter);

app.listen(PORT, () => console.log(`Fitted API running on http://localhost:${PORT}`));
