import axios from 'axios';

class SkillExtractionService {
  constructor() {
    this.extractUrl = process.env.SKILL_EXTRACTION_SERVICE_URL || 'http://localhost:8002';
  }

  /**
   * Extracts skill mentions from a raw text using the isolated GLiNER2 Python service.
   * @param {string} text 
   * @returns {Promise<Array<{text: string, confidence: number, start: number, end: number, label: string}>>}
   */
  async extractSkills(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    try {
      const response = await axios.post(`${this.extractUrl}/extract`, { text });
      
      if (response.data && response.data.skills) {
        return response.data.skills;
      }
      return [];
    } catch (error) {
      console.error('Failed to extract skills from GLiNER2 service:', error.message);
      // Fail gracefully so the application doesn't crash if the AI microservice is down
      return [];
    }
  }
}

export default new SkillExtractionService();
