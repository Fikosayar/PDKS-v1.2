const fs = require('fs');
let c = fs.readFileSync('server.ts', 'utf8');

// Replace the initDb that uses $$ blocks with simple sequential queries
const newInitDb = `
// --- INITIALIZE DATABASE ---
const initDb = async () => {
  try {
    const client = await pool.connect();
    
    // Create enum types
    await client.query("DO ' BEGIN CREATE TYPE role AS ENUM (''superadmin'', ''admin'', ''mudur'', ''takim_lideri'', ''personel''); EXCEPTION WHEN duplicate_object THEN null; END '");
    await client.query("DO ' BEGIN CREATE TYPE log_type AS ENUM (''in'', ''out''); EXCEPTION WHEN duplicate_object THEN null; END '");
    await client.query("DO ' BEGIN CREATE TYPE status AS ENUM (''pending'', ''approved'', ''rejected''); EXCEPTION WHEN duplicate_object THEN null; END '");

    // Create tables
    await client.query(\`CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT now() NOT NULL
    )\`);

    await client.query(\`CREATE TABLE IF NOT EXISTS company_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) NOT NULL,
      office_ip TEXT,
      qr_secret TEXT,
      shift_start TEXT DEFAULT '08:00',
      shift_end TEXT DEFAULT '18:00',
      work_days_per_week INTEGER DEFAULT 5,
      break_rules JSONB,
      updated_at TIMESTAMP DEFAULT now() NOT NULL
    )\`);

    await client.query(\`CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id),
      personnel_id TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT,
      role role DEFAULT 'personel' NOT NULL,
      manager_id UUID,
      leave_balance REAL DEFAULT 14,
      start_date TIMESTAMP,
      allowed_device TEXT,
      device_id TEXT,
      can_remote_check_in BOOLEAN DEFAULT false,
      avatar_url TEXT,
      push_subscription TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT now() NOT NULL
    )\`);

    await client.query(\`CREATE TABLE IF NOT EXISTS attendance_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) NOT NULL,
      user_id UUID REFERENCES users(id) NOT NULL,
      timestamp TIMESTAMP DEFAULT now() NOT NULL,
      type log_type NOT NULL,
      ip_address TEXT,
      status TEXT,
      error_message TEXT,
      latitude REAL,
      longitude REAL,
      is_remote BOOLEAN DEFAULT false,
      remote_note TEXT,
      manual_entry BOOLEAN DEFAULT false,
      deleted BOOLEAN DEFAULT false
    )\`);

    await client.query(\`CREATE TABLE IF NOT EXISTS leave_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) NOT NULL,
      user_id UUID REFERENCES users(id) NOT NULL,
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP NOT NULL,
      days REAL NOT NULL,
      reason TEXT,
      type TEXT NOT NULL,
      status status DEFAULT 'pending' NOT NULL,
      attachment_url TEXT,
      deleted BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT now() NOT NULL
    )\`);

    await client.query(\`CREATE TABLE IF NOT EXISTS overtime_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) NOT NULL,
      user_id UUID REFERENCES users(id) NOT NULL,
      date TIMESTAMP NOT NULL,
      hours REAL NOT NULL,
      description TEXT,
      status status DEFAULT 'pending' NOT NULL,
      deleted BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT now() NOT NULL
    )\`);

    await client.query(\`CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      read BOOLEAN DEFAULT false NOT NULL,
      link TEXT,
      created_at TIMESTAMP DEFAULT now() NOT NULL
    )\`);

    // Seed admin if no users exist
    const existing = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(existing.rows[0].count) === 0) {
      const compResult = await client.query("INSERT INTO companies (name, is_active) VALUES ('PDKS Demo', true) RETURNING id");
      const companyId = compResult.rows[0].id;
      
      const bcryptLib = require('bcryptjs');
      const hash = await bcryptLib.hash('admin', 10);
      await client.query(
        "INSERT INTO users (company_id, personnel_id, password_hash, name, role, leave_balance, can_remote_check_in, is_active) VALUES ($1, 'admin', $2, 'Sistem Yoneticisi', 'superadmin', 14, true, true)",
        [companyId, hash]
      );
      
      await client.query("INSERT INTO company_settings (company_id, shift_start, shift_end) VALUES ($1, '08:00', '18:00')", [companyId]);
      console.log('Default admin user created (admin/admin)');
    }
    
    client.release();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
};
initDb();
`;

c = c.replace(/\/\/ --- INITIALIZE DATABASE ---[\s\S]*?initDb\(\);/, newInitDb.trim());
fs.writeFileSync('server.ts', c, 'utf8');
console.log('initDb fixed - no more $$ blocks');
