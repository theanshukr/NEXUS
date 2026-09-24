import AIService from '../services/AIService.js';

class AIController {
  /**
   * Get initial contextual history and quick prompts for the UI
   */
  async getHistory(req, res, next) {
    try {
      const context = await AIService.getInitialContext(req.user);
      
      res.status(200).json({
        success: true,
        data: context,
        message: 'AI context fetched successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process a user query
   */
  async processQuery(req, res, next) {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ success: false, error: { message: 'Query is required' }});
      }

      const response = await AIService.processQuery(req.user, query);
      
      res.status(200).json({
        success: true,
        data: response,
        message: 'Query processed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AIController();
