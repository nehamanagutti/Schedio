const mongoose = require('mongoose');

let connectionPromise;

async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!process.env.MONGODB_URI) {
    const error = new Error('MongoDB is not configured on the server.');
    error.code = 'MONGODB_NOT_CONFIGURED';
    throw error;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    }).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  await connectionPromise;
  return mongoose.connection;
}

module.exports = { connectMongo };
