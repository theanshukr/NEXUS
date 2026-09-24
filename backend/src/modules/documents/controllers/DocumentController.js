import { catchAsync } from '../../../core/utils/catchAsync.js';
import { successResponse } from '../../../core/utils/response.js';

class DocumentController {
  getAllDocuments = catchAsync(async (req, res) => {
    return successResponse(res, [], 'Documents retrieved successfully');
  });

  uploadDocument = catchAsync(async (req, res) => {
    return successResponse(res, { id: 'doc_' + Date.now() }, 'Document uploaded successfully');
  });
}

export default new DocumentController();
