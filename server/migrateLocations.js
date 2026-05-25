require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const Location = require('./models/Location');
const Entry = require('./models/Entry');
const User = require('./models/User');
const { standardizeMajorSection, standardizeString } = require('./utils/standardize');

const runMigration = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secr-megger';
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully.');

    // 1. Standardize Location master records
    console.log('\n--- Step 1: Standardizing Location records ---');
    const locations = await Location.find({});
    console.log(`Found ${locations.length} locations to process.`);
    
    let locUpdatedCount = 0;
    for (const loc of locations) {
      const origDiv = loc.division;
      const origMajor = loc.majorSection;
      const origSection = loc.section;

      loc.division = standardizeString(origDiv).toUpperCase();
      loc.majorSection = standardizeMajorSection(origMajor);
      loc.section = standardizeString(origSection);

      if (loc.division !== origDiv || loc.majorSection !== origMajor || loc.section !== origSection) {
        await loc.save();
        locUpdatedCount++;
      }
    }
    console.log(`Standardized ${locUpdatedCount} location records.`);

    // 2. Remove duplicate Locations
    console.log('\n--- Step 2: Merging duplicate Location master records ---');
    const allLocs = await Location.find({});
    const seen = new Set();
    let locDeletedCount = 0;

    for (const loc of allLocs) {
      const key = `${loc.division.toLowerCase()}|${loc.majorSection.toLowerCase()}|${loc.section.toLowerCase()}`;
      if (seen.has(key)) {
        await Location.findByIdAndDelete(loc._id);
        locDeletedCount++;
      } else {
        seen.add(key);
      }
    }
    console.log(`Merged and removed ${locDeletedCount} duplicate Location master records.`);

    // 3. Standardize Entry records (KEEPING DATA SAFE, NO DELETIONS)
    console.log('\n--- Step 3: Standardizing Entry records (Updating fields, keeping records safe) ---');
    const entries = await Entry.find({});
    console.log(`Found ${entries.length} entries to process.`);
    
    let entryUpdatedCount = 0;
    for (const entry of entries) {
      const origDivId = entry.divisionId;
      const origDivName = entry.divisionName;
      const origMajorId = entry.majorSectionId;
      const origMajorName = entry.majorSectionName;
      const origSectionId = entry.sectionId;
      const origSectionName = entry.sectionName;

      entry.divisionId = standardizeString(origDivId).toUpperCase();
      entry.divisionName = standardizeString(origDivName).toUpperCase();
      entry.majorSectionId = standardizeMajorSection(origMajorId);
      entry.majorSectionName = standardizeMajorSection(origMajorName);
      entry.sectionId = standardizeString(origSectionId);
      entry.sectionName = standardizeString(origSectionName);

      if (
        entry.divisionId !== origDivId ||
        entry.divisionName !== origDivName ||
        entry.majorSectionId !== origMajorId ||
        entry.majorSectionName !== origMajorName ||
        entry.sectionId !== origSectionId ||
        entry.sectionName !== origSectionName
      ) {
        await entry.save();
        entryUpdatedCount++;
      }
    }
    console.log(`Standardized fields on ${entryUpdatedCount} entries. All entries preserved safely.`);

    // 4. Standardize User records
    console.log('\n--- Step 4: Standardizing User records ---');
    const users = await User.find({});
    let userUpdatedCount = 0;
    for (const user of users) {
      if (user.division) {
        const origDiv = user.division;
        user.division = standardizeString(origDiv).toUpperCase();
        if (user.division !== origDiv) {
          await user.save();
          userUpdatedCount++;
        }
      }
    }
    console.log(`Standardized division on ${userUpdatedCount} users.`);

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed with error:', err);
    process.exit(1);
  }
};

runMigration();
