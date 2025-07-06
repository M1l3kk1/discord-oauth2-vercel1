import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!uri) {
  throw new Error("Brak zmiennej środowiskowej MONGODB_URI");
}

if (process.env.NODE_ENV === "development") {
  // Zapobiega wielokrotnemu tworzeniu klienta podczas hot reload w dev
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // W prod tworzymy tylko raz
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
