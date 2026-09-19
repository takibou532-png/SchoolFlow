import { BaseRepository } from './base.repository.js';
import { creditNote } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

export class CreditNoteRepository extends BaseRepository {
  constructor() {
    super(creditNote);
  }

  async findUnappliedByStudent(studentId) {
    const db = this.db();
    return await db
      .select()
      .from(creditNote)
      .where(
        and(
          eq(creditNote.studentId, studentId),
          eq(creditNote.isApplied, false)
        )
      );
  }

  async markAsApplied(creditNoteId, invoiceId, cycleNumber) {
    const db = this.db();
    return await db
      .update(creditNote)
      .set({
        isApplied: true,
        appliedToInvoiceId: invoiceId,
        appliedToCycle: cycleNumber
      })
      .where(eq(creditNote.id, creditNoteId))
      .returning();
  }
}