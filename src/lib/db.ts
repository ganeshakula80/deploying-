import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.DATABASE_URL;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the DATABASE_URL environment variable inside .env.local. Make sure to restart your server after setting it.'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    // console.log('Using cached MongoDB connection');
    return { client: cachedClient, db: cachedDb };
  }

  // console.log('Creating new MongoDB connection');
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    // By default, the MongoDB driver connects to the 'test' database if no database name is specified in the URI.
    // If your DATABASE_URL includes the database name (e.g., ...mongodb.net/yourDbName?retryWrites...), it will use that.
    // Otherwise, you might need to specify it here: client.db('yourDbName')
    const dbName = new URL(MONGODB_URI!).pathname.substring(1) || 'Cluster0'; // Fallback to 'Cluster0' or your default DB name if not in URI
    const db = client.db(dbName);
    
    console.log(`Successfully connected to MongoDB database: ${db.databaseName}`);

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    // If connection fails, ensure cached values are reset to allow retry on next call
    cachedClient = null;
    cachedDb = null;
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Initial check when this module is loaded
if (MONGODB_URI) {
  console.log('db.ts: DATABASE_URL is set.');
} else {
  // This case is technically handled by the throw Error above, but good for clarity
  console.warn('db.ts: DATABASE_URL is NOT set. This will cause an error when connectToDatabase is called.');
}
