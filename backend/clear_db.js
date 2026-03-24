require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI || "mongodb+srv://d81889649_db_user:NK0ZTbhDawxISBCR@farmerdb.rusvfuo.mongodb.net/agrimater?appName=farmerDB";

async function clearDatabase() {
    try {
        console.log("Connecting to MongoDB Atlas...");
        await mongoose.connect(uri);
        console.log("Connected successfully.");

        const collections = await mongoose.connection.db.collections();
        for (let collection of collections) {
            console.log(`Dropping collection: \${collection.collectionName}...`);
            await collection.drop();
        }

        console.log("✅ All collections successfully dropped! The database is now completely wiped.");

    } catch (e) {
        console.error("❌ Failed to clear database. Error:", e);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

clearDatabase();
