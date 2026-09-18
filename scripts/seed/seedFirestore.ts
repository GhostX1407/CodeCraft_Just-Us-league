/**
 * Firestore Database Seeder Script CLI
 * 
 * Invokes seedAllDemoData from functions/src/data/seedData.ts.
 */

import { seedAllDemoData } from '../../functions/src/data/seedData';

export { seedAllDemoData };

if (require.main === module) {
  seedAllDemoData()
    .then((result) => {
      console.log('✅ Demo data successfully seeded:');
      console.log(`   - Hospitals: ${result.hospitalsCount}`);
      console.log(`   - Cases: ${result.casesCount}`);
      console.log(`   - Reliability Records: ${result.reliabilityCount}`);
      console.log(`   - Audit Records: ${result.auditCount}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error seeding demo data:', err);
      process.exit(1);
    });
}
