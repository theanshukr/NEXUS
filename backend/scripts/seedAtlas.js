import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import { seedDevMode } from './seedDevMode.js';

console.log('🚀 Starting direct seed into MongoDB Atlas...');
seedDevMode()
  .then(() => {
    console.log('🎉 Seeding successfully finished!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  });
