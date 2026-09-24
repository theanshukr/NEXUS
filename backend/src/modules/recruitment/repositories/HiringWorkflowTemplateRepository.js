import BaseRepository from '#@/core/repositories/BaseRepository.js';
import HiringWorkflowTemplate from '../models/HiringWorkflowTemplate.js';

class HiringWorkflowTemplateRepository extends BaseRepository {
  constructor() {
    super(HiringWorkflowTemplate);
  }
}

export const hiringWorkflowTemplateRepository = new HiringWorkflowTemplateRepository();
export default hiringWorkflowTemplateRepository;
