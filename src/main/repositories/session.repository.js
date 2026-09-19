// src/main/repositories/session.repository.js
import { BaseRepository } from './base.repository.js';
import { session } from '../db/index.js';
import { getDb } from '../db/client.js';

export class SessionRepository extends BaseRepository {
  constructor() {
    super(session);
  }

  async bulkCreate(sessionsData) {
    if (sessionsData.length === 0) return [];
    const db = getDb();
    const result = await db.insert(session).values(sessionsData).returning();
    return result;
  }
}