import { db } from './src/db/index.js';
import { users, companies } from './src/db/schema.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('Seeding initial data...');
  
  // 1. Create a default company
  const newCompany = await db.insert(companies).values({
    name: 'PDKS Demo',
    subscriptionStatus: 'active'
  }).returning();
  
  const companyId = newCompany[0].id;
  
  // 2. Create admin user
  const passwordHash = await bcrypt.hash('admin', 10);
  
  await db.insert(users).values({
    companyId: companyId,
    personnelId: 'admin',
    name: 'Sistem Yöneticisi',
    role: 'superadmin',
    passwordHash: passwordHash,
    leaveBalance: 14,
    canRemoteCheckIn: true
  });
  
  console.log('Seed complete! You can now login with admin / admin');
  process.exit(0);
}

seed().catch(console.error);
