/**
 * setup.js — Configuración global para todos los tests
 *
 * Levanta MongoDB en memoria (sin necesidad de Atlas ni .env.test).
 * Se ejecuta automáticamente antes y después de todos los tests.
 *
 * Requiere: npm install --save-dev mongodb-memory-server
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Variables de entorno necesarias para los tests
process.env.JWT_SECRET = 'secreto_para_tests_local';
process.env.NODE_ENV   = 'test';

let mongod;

// ─── Conectar antes de todos los tests ───────────────────────────────────────
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

// ─── Limpiar colecciones y desconectar después de todos los tests ─────────────
afterAll(async () => {
  const colecciones = Object.keys(mongoose.connection.collections);
  for (const nombre of colecciones) {
    await mongoose.connection.collections[nombre].deleteMany({});
  }
  await mongoose.disconnect();
  await mongod.stop();
});
