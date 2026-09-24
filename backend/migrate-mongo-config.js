import env from '#@/config/env.js';

/**
 * migrate-mongo configuration.
 * 
 * Architecture rules:
 * - Reads MONGODB_URI strictly from validated env configuration.
 * - Stores migrations in `migrations/`.
 * - Migrations are ONLY for document migrations, field renames, index creation, backfilling data, and cleanup.
 * - Never create MongoDB collections manually inside migrations.
 */
const config = {
  mongodb: {
    url: env.MONGODB_URI,
    options: {
      // Modern MongoDB driver v6+ production defaults
    }
  },

  // Store migration files inside the migrations directory
  migrationsDir: 'migrations',

  // The MongoDB collection where applied migration records are stored
  changelogCollectionName: 'changelog',

  // File extension for migration files
  migrationFileExtension: '.js',

  // Enable checksum algorithm to verify migration file integrity if needed
  useFileHash: false,

  // Set module system to ESM (ES Modules) to align with package.json "type": "module"
  moduleSystem: 'esm'
};

export default config;
