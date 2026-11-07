const readline = require('readline');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sequelize = require('../config/db');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      options.email = args[++i].trim().toLowerCase();
    } else if (args[i] === '--name' && args[i + 1]) {
      options.name = args[++i].trim();
    } else if (args[i] === '--role' && args[i + 1]) {
      options.role = args[++i].trim().toLowerCase();
    }
  }
  return options;
}

function askPassword() {
  return new Promise((resolve) => {
    // Read from environment variable if provided
    if (process.env.ADMIN_INITIAL_PASSWORD) {
      return resolve(process.env.ADMIN_INITIAL_PASSWORD);
    }
    if (process.env.USER_PASSWORD) {
      return resolve(process.env.USER_PASSWORD);
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Enter password (min 10 characters): ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const { email, name, role } = parseArgs();

  if (!email || !email.includes('@')) {
    console.error('Error: A valid --email argument is required.');
    process.exit(1);
  }
  if (!name || name.length < 2) {
    console.error('Error: A valid --name argument (min 2 characters) is required.');
    process.exit(1);
  }
  if (!role || !['candidate', 'interviewer'].includes(role)) {
    console.error('Error: A valid --role argument ("candidate" or "interviewer") is required.');
    process.exit(1);
  }

  const password = await askPassword();
  if (!password || password.length < 10) {
    console.error('Error: Password must be at least 10 characters long.');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    const passwordHash = await bcrypt.hash(password, 10);

    const [user, created] = await User.findOrCreate({
      where: { email },
      defaults: {
        name,
        email,
        passwordHash,
        role,
      },
    });

    if (!created) {
      await user.update({ name, passwordHash, role });
      console.log(`[USER CLI] Existing user ${email} updated successfully with role "${role}".`);
    } else {
      console.log(`[USER CLI] New user ${email} created successfully with role "${role}".`);
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error(`[USER CLI ERROR] Failed to create user: ${err.message}`);
    process.exit(1);
  }
}

main();

