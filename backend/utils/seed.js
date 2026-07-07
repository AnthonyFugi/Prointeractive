import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Business from '../models/Business.js';
import Product from '../models/Product.js';

const run = async () => {
  await connectDB();
  await Promise.all([User.deleteMany(), Business.deleteMany(), Product.deleteMany()]);

  const [customer, seller] = await User.create([
    { name: 'Demo Customer', email: 'customer@demo.com', password: 'password123', role: 'customer' },
    { name: 'Demo Seller', email: 'seller@demo.com', password: 'password123', role: 'business' },
    { name: 'Demo Customer 2', email: 'fugiinvestments@gmail.com', password: 'password123', role: 'customer' },
    { name: 'Demo Seller 2', email: 'mufugi12@gmail.com', password: 'password123', role: 'business' },
  ]);

  const business = await Business.create({
    owner: seller._id,
    name: 'Kalulu Traders',
    description: 'Quality goods and honest business interactions.',
    category: 'retail',
    location: 'Lusaka',
    phone: '+260 000 000 000',
  });

  await Product.create([
    { business: business._id, name: 'Chitenge Fabric (2m)', price: 85, category: 'fashion', stock: 40, description: 'Vibrant printed chitenge, 100% cotton.' },
    { business: business._id, name: 'Solar Lamp', price: 150, category: 'electronics', stock: 25, description: 'Rechargeable solar lamp with USB output.' },
    { business: business._id, name: 'Honey (500ml)', price: 60, category: 'food', stock: 60, description: 'Pure forest honey from Northwestern Province.' },
  ]);

  console.log('Seed complete. Login: customer@demo.com / seller@demo.com (password123)');
  await mongoose.disconnect();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
