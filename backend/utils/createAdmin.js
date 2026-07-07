/**
 * Bootstrap an admin account (self-registration can never create one).
 * Usage: npm run create-admin -- admin@yourdomain.com "StrongPassword123" "Admin Name"
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

const [email, password, name = 'Administrator'] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: npm run create-admin -- <email> <password> [name]');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters.');
  process.exit(1);
}

const run = async () => {
  await connectDB();
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin';
    existing.password = password;
    existing.name = name;
    await existing.save();
    console.log(`Existing user ${email} promoted to admin.`);
  } else {
    await User.create({ name, email, password, role: 'admin' });
    console.log(`Admin ${email} created.`);
  }
  await mongoose.disconnect();
};

run().catch((e) => { console.error(e); process.exit(1); });
