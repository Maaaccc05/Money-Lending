// Migration: Drop existing panNumber unique index and recreate it as sparse
// This allows multiple borrowers/lenders to have no PAN number (null)

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixPanIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection;

    // ── Borrowers ────────────────────────────────────────────────────────
    try {
      await db.collection('borrowers').dropIndex('panNumber_1');
      console.log('✓ Dropped old borrowers.panNumber index');
    } catch (e) {
      console.log(`  borrowers index not found / already dropped: ${e.message}`);
    }

    await db.collection('borrowers').createIndex(
      { panNumber: 1 },
      { unique: true, sparse: true, background: true }
    );
    console.log('✓ Created sparse unique index on borrowers.panNumber');

    // ── Lenders ──────────────────────────────────────────────────────────
    try {
      await db.collection('lenders').dropIndex('panNumber_1');
      console.log('✓ Dropped old lenders.panNumber index');
    } catch (e) {
      console.log(`  lenders index not found / already dropped: ${e.message}`);
    }

    await db.collection('lenders').createIndex(
      { panNumber: 1 },
      { unique: true, sparse: true, background: true }
    );
    console.log('✓ Created sparse unique index on lenders.panNumber');

    console.log('\nMigration complete! You can now add borrowers/lenders without a PAN number.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixPanIndex();
