import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  json,
  pgEnum,
  real,
} from 'drizzle-orm/pg-core';

// --- Enums ---
export const roleEnum = pgEnum('role', ['superadmin', 'admin', 'mudur', 'takim_lideri', 'personel']);
export const logTypeEnum = pgEnum('log_type', ['in', 'out']);
export const statusEnum = pgEnum('status', ['pending', 'approved', 'rejected']);

// --- Multi-Tenant Companies ---
export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Settings per Company ---
export const companySettings = pgTable('company_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  officeIp: text('office_ip'),
  qrSecret: text('qr_secret'),
  shiftStart: text('shift_start').default('08:00'),
  shiftEnd: text('shift_end').default('18:00'),
  workDaysPerWeek: integer('work_days_per_week').default(5),
  breakRules: json('break_rules'), // array of objects
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Users (Employees & Admins) ---
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id), // Null for superadmin
  personnelId: text('personnel_id').notNull(), // S-001 vs
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  title: text('title'),
  role: roleEnum('role').default('personel').notNull(),
  managerId: uuid('manager_id'), // Self referential foreign key (yöneticisi kim)
  leaveBalance: real('leave_balance').default(14),
  startDate: timestamp('start_date'),
  allowedDevice: text('allowed_device'),
  deviceId: text('device_id'), // fixed hardware ID
  canRemoteCheckIn: boolean('can_remote_check_in').default(false),
  avatarUrl: text('avatar_url'),
  pushSubscription: text('push_subscription'), // JSON string
  isActive: boolean('is_active').default(true), // Instead of 'deleted' role
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Attendance Logs ---
export const attendanceLogs = pgTable('attendance_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  type: logTypeEnum('type').notNull(), // 'in' | 'out'
  ipAddress: text('ip_address'),
  status: text('status'), // 'success' | 'warning' | 'error' | 'pending'
  errorMessage: text('error_message'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  isRemote: boolean('is_remote').default(false),
  remoteNote: text('remote_note'),
  manualEntry: boolean('manual_entry').default(false),
  deleted: boolean('deleted').default(false),
});

// --- Leave Requests ---
export const leaveRequests = pgTable('leave_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  days: real('days').notNull(),
  reason: text('reason'),
  type: text('type').notNull(), // 'annual' | 'report' | 'excuse'
  status: statusEnum('status').default('pending').notNull(),
  attachmentUrl: text('attachment_url'),
  deleted: boolean('deleted').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Overtime Requests ---
export const overtimeRequests = pgTable('overtime_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  date: timestamp('date').notNull(),
  hours: real('hours').notNull(),
  description: text('description'),
  status: statusEnum('status').default('pending').notNull(),
  deleted: boolean('deleted').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Notifications ---
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(), // info, success, warning, error
  read: boolean('read').default(false).notNull(),
  link: text('link'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
