const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
require('dotenv').config();

// Mongoose connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB via Mongoose"))
  .catch(err => process.exit(1));

// Generic Schema for any CSV import
const GenericData = mongoose.model('energy_stats', new mongoose.Schema({}, { strict: false }));

async function runImport() {
    try {
        await GenericData.collection.drop().catch(() => {});
        console.log("Starting CSV stream...");

        let batch = [];
        const BATCH_SIZE = 10000;
        let inserted = 0;

        const stream = fs.createReadStream('../data.csv').pipe(csv());

        for await (const row of stream) {
            let cleaned = {};
            for (let key in row) {
                let val = row[key].trim();
                if (val === "" || val === "-" || val === "NA") {
                    cleaned[key] = null;
                } else if (!isNaN(Number(val)) && key !== 'Entity') {
                    cleaned[key] = Number(val);
                } else {
                    cleaned[key] = val;
                }
            }
            batch.push(cleaned);

            if (batch.length >= BATCH_SIZE) {
                await GenericData.insertMany(batch);
                inserted += batch.length;
                console.log(`Inserted \${inserted} documents...`);
                batch = [];
            }
        }

        if (batch.length > 0) {
            await GenericData.insertMany(batch);
            inserted += batch.length;
        }

        console.log(`✅ Import finished. Total Rows: \${inserted}`);
    } catch (e) {
        console.error("Import failed:", e);
    } finally {
        mongoose.connection.close();
    }
}

runImport();
