import logger from '#@/platform/logger/index.js';

/**
 * Platform Email Delivery Service Adapter.
 * Prepared for future integration with Nodemailer / SendGrid / AWS SES.
 */
export class MailService {
  async sendEmail({ to, subject, html, text }) {
    logger.info({ to, subject }, '[MailService Stub] Simulated sending email in development mode');
    return { success: true, messageId: `mock_${Date.now()}` };
  }
}

export default new MailService();
