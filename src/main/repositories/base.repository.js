// src/main/repositories/base.repository.js
import { getDb } from '../db/client.js'
import { eq, and, or, like, desc, asc, SQL, sql, count } from 'drizzle-orm'

export class BaseRepository {
  constructor(table, searchFields = []) {
    this.table = table
    this.searchFields = searchFields
    this.db = getDb
  }

  findAll(options = {}) {
    const {
      limit,
      offset,
      orderBy = 'id',
      orderDir = 'desc',
      where = {},
      search
    } = options

    let query = this.db().select().from(this.table)

    const conditions = []

    for (const [key, value] of Object.entries(where)) {
      if (value !== undefined && value !== null) {
        conditions.push(eq(this.table[key], value))
      }
    }

    if (search && this.searchFields.length > 0) {
      const searchConditions = this.searchFields.map(field =>
        like(this.table[field], `%${search}%`)
      )
      conditions.push(or(...searchConditions))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    query = query.orderBy(
      orderDir === 'desc'
        ? desc(this.table[orderBy])
        : asc(this.table[orderBy])
    )

    if (limit) query = query.limit(limit)
    if (offset) query = query.offset(offset)

    return query.all() // sync — no await needed
  }

  findById(id) {
    const result = this.db()
      .select()
      .from(this.table)
      .where(eq(this.table.id, id))
      .limit(1)
      .get() // single row directly, no array indexing needed

    return result || null
  }

  create(data) {
    return this.db()
      .insert(this.table)
      .values({
        ...data,
        createdAt: new Date().toISOString()
      })
      .returning()
      .get()
  }

  update(id, data) {
    const result = this.db()
      .update(this.table)
      .set({
        ...data,
        updatedAt: new Date().toISOString()
      })
      .where(eq(this.table.id, id))
      .returning()
      .get()

    return result || null
  }

  delete(id) {
    const result = this.db()
      .delete(this.table)
      .where(eq(this.table.id, id))
      .returning()
      .get()

    return result || null
  }

  count(where = {}) {
    const conditions = []

    for (const [key, value] of Object.entries(where)) {
      if (value !== undefined && value !== null) {
        conditions.push(eq(this.table[key], value))
      }
    }

    let query = this.db()
      .select({ count: sql`count(*)` })
      .from(this.table)

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const result = query.get()
    return Number(result?.count || 0)
  }

  // Soft delete for tables with isActive field
  softDelete(id) {
    if (this.table.isActive !== undefined) {
      return this.update(id, { isActive: false })
    }
    throw new Error('Soft delete not supported for this table')
  }

  // Restore soft deleted
  restore(id) {
    if (this.table.isActive !== undefined) {
      return this.update(id, { isActive: true })
    }
    throw new Error('Restore not supported for this table')
  }
}