import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (!uri) {
  throw new Error("Brak MONGODB_URI w zmiennych środowiskowych");
}

if (process.env.NODE_ENV === "development") {
  // W trybie development używamy globalnego klienta, żeby uniknąć wielokrotnych połączeń
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // W produkcji tworzymy nowego klienta
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
