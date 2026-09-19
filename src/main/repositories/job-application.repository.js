import { BaseRepository } from './base.repository.js';
import { jobApplication } from '../db/index.js';

export class JobApplicationRepository extends BaseRepository {
  constructor() {
    super(jobApplication, ['fullName', 'phone']);
  }
}