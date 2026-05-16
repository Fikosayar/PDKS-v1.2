const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

c = c.replace(/Sistem hatas/g, 'Sistem hatası');
c = c.replace(/Hatal/g, 'Hatalı');
c = c.replace(/Geersiz giri/g, 'Geçersiz giriş');
c = c.replace(/ok/g, 'Çok');
c = c.replace(/devre d/g, 'devre dışı');
c = c.replace(/Ynetici/g, 'Yönetici');
c = c.replace(/kullanc/g, 'kullanıcı');
c = c.replace(/balants/g, 'bağlantısı');
c = c.replace(/Kayt/g, 'Kayıt');
c = c.replace(/Gemi/g, 'Geçmiş');
c = c.replace(/alr/g, 'çalışır');
c = c.replace(/tokens/g, 'tokens');
c = c.replace(/gnderilemedi/g, 'gönderilemedi');

const initDbSQL = `
// --- INITIALIZE DATABASE ---
const initDb = async () => {
  try {
    const client = await pool.connect();
    await client.query(\`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        subscription_status TEXT DEFAULT 'active'
      );
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id INTEGER REFERENCES companies(id),
        personnel_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        title TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        manager_id UUID,
        avatar_url TEXT,
        password_hash TEXT NOT NULL,
        leave_balance REAL DEFAULT 14,
        can_remote_check_in BOOLEAN DEFAULT false,
        allowed_device TEXT,
        push_subscription TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id INTEGER REFERENCES companies(id),
        user_id UUID REFERENCES users(id),
        user_name TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT now(),
        type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        ip_address TEXT,
        device_info TEXT,
        location TEXT,
        is_remote BOOLEAN DEFAULT false,
        remote_note TEXT,
        manual_entry BOOLEAN DEFAULT false,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS leave_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id INTEGER REFERENCES companies(id),
        user_id UUID REFERENCES users(id),
        user_name TEXT NOT NULL,
        manager_id UUID,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        days REAL NOT NULL,
        type TEXT NOT NULL,
        reason TEXT,
        attachment_url TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS overtime_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id INTEGER REFERENCES companies(id),
        user_id UUID REFERENCES users(id),
        user_name TEXT NOT NULL,
        manager_id UUID,
        date TEXT NOT NULL,
        hours REAL NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS company_settings (
        company_id INTEGER PRIMARY KEY REFERENCES companies(id),
        qr_secret TEXT,
        tolerance_minutes INTEGER DEFAULT 15,
        shift_start TEXT DEFAULT '09:00',
        shift_end TEXT DEFAULT '18:00',
        require_location BOOLEAN DEFAULT false,
        allowed_ips TEXT
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      );
      
      -- Default Admin User Check
      DO \\$\\$
      DECLARE
        comp_id INTEGER;
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM companies WHERE name = 'PDKS Demo') THEN
          INSERT INTO companies (name, subscription_status) VALUES ('PDKS Demo', 'active') RETURNING id INTO comp_id;
          INSERT INTO users (company_id, personnel_id, name, role, password_hash, leave_balance, can_remote_check_in)
          VALUES (comp_id, 'admin', 'Sistem Yöneticisi', 'superadmin', '\\$2a\\$10\\$D1PjV.M/vG3R2GjQj.7qG./37L.Y.p9nO5rI8c7L3oH9qL8aU3.Y6', 14, true);
        END IF;
      END \\$\\$;
    \`);
    client.release();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
};
initDb();
`;

if (!c.includes('INITIALIZE DATABASE')) {
  c = c.replace('const app = express();', initDbSQL + '\n\nconst app = express();');
}

fs.writeFileSync('server.ts', c, 'utf8');
