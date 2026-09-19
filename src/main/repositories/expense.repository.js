import { BaseRepository } from './base.repository.js';
import { expense } from '../db/index.js';

export class ExpenseRepository extends BaseRepository {
  constructor() {
    super(expense, ['name']); // searchable fields: name only
  }
}