import BaseRepository from '#@/core/repositories/BaseRepository.js';
import ApprovalInstance from '../models/ApprovalInstance.js';

class ApprovalInstanceRepository extends BaseRepository {
  constructor() {
    super(ApprovalInstance);
  }
}

export const approvalInstanceRepository = new ApprovalInstanceRepository();
export default approvalInstanceRepository;
