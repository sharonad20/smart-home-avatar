import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/generate-hash.mjs <your-password>');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
const secret = randomBytes(32).toString('hex');

console.log('\n── Add these to your .env.local and Vercel environment variables ──\n');
console.log(`AUTH_PASSWORD_HASH=${hash}`);
console.log(`SESSION_SECRET=${secret}`);
console.log('\n────────────────────────────────────────────────────────────────────\n');
