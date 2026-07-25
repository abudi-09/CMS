import { MongoMemoryServer } from "mongodb-memory-server";

export default async function globalSetup(project) {
  process.env.JWT_SECRET = "test-jwt-secret-for-ci";
  process.env.NODE_ENV = "test";

  if (process.env.MONGO_URI) {
    project.provide("mongoUri", process.env.MONGO_URI);
    return;
  }

  const mongo = await MongoMemoryServer.create();
  project.provide("mongoUri", mongo.getUri());

  return async () => {
    await mongo.stop();
  };
}
