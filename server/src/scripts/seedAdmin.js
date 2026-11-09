const bcrypt = require('bcryptjs');
const { User, AuditLog } = require('../models');
const config = require('../config/env');
const sequelize = require('../config/db');

const email = process.env.ADMIN_EMAIL || 'admin@intelliprep.local';
const password = process.env.ADMIN_PASSWORD || 'AdminPass123!';
const name = process.env.ADMIN_NAME || 'Platform Administrator';

async function seed() {
  if (config.env === 'production' && process.env.FORCE_PRODUCTION_ADMIN_SEED !== 'true') {
    console.error(
      '[SECURITY ERROR] Admin seeding is disabled in production without FORCE_PRODUCTION_ADMIN_SEED=true.'
    );
    process.exit(1);
  }

  if (!password || password.length < 10) {
    console.error('[VALIDATION ERROR] ADMIN_PASSWORD must be at least 10 characters long.');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log(`Connected to database for admin seeding.`);

    const existing = await User.findOne({ where: { email } });
    const passwordHash = await bcrypt.hash(password, 10);

    if (existing) {
      existing.name = name;
      existing.role = 'admin';
      existing.isActive = true;
      existing.passwordHash = passwordHash;
      await existing.save();

      console.log(`Updated existing user to Administrator: ${email}`);
      await AuditLog.create({
        actorId: existing.id,
        action: 'USER_ROLE_CHANGED',
        targetType: 'User',
        targetId: String(existing.id),
        metadata: { role: 'admin', updatedVia: 'seedAdmin' },
      });
    } else {
      const created = await User.create({
        name,
        email,
        passwordHash,
        role: 'admin',
        isActive: true,
      });

      console.log(`Successfully created new Administrator account: ${email}`);
      await AuditLog.create({
        actorId: created.id,
        action: 'ADMIN_SEEDED',
        targetType: 'User',
        targetId: String(created.id),
        metadata: { email, createdVia: 'seedAdmin' },
      });
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed administrator account:', err);
    try {
      await sequelize.close();
    } catch (_) {}
    process.exit(1);
  }
}

seed();

