import BaseRepository from '#@/core/repositories/BaseRepository.js';
import ApprovalWorkflowTemplate from '../models/ApprovalWorkflowTemplate.js';

class ApprovalWorkflowTemplateRepository extends BaseRepository {
  constructor() {
    super(ApprovalWorkflowTemplate);
  }
}

export const approvalWorkflowTemplateRepository = new ApprovalWorkflowTemplateRepository();
export default approvalWorkflowTemplateRepository;
