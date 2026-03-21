import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import borrowerRoutes from './routes/borrowerRoutes.js';
import lenderRoutes from './routes/lenderRoutes.js';
import loanRoutes from './routes/loanRoutes.js';
import interestRoutes from './routes/interestRoutes.js';
import interestRecordRoutes from './routes/interestRecordRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { startInterestCronJob } from './jobs/interestCron.js';
import { startReceiptCronJob } from './jobs/receiptCron.js';
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB (and start background jobs) before listening.
await connectDB();

// Daily background interest generation
startInterestCronJob();

// Daily receipt generation/backfill
startReceiptCronJob();

// Security middleware
app.use(helmet());

// CORS configuration
// app.use(
//   cors({
//     origin: process.env.NODE_ENV === 'production' ? 'http://localhost:5173' : true,
//     credentials: true,
//   })
// );
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://money-lending-alpha.vercel.app"
    ],
    credentials: true,
  })
);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/borrowers', borrowerRoutes);
app.use('/api/lenders', lenderRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/interest', interestRoutes);
app.use('/api/interest-records', interestRecordRoutes);
app.use('/api/reports', reportRoutes);

// Serve generated receipt PDFs
app.use('/receipts', express.static(path.resolve(process.cwd(), 'receipts')));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message,
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
