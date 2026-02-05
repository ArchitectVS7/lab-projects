/**
 * Email Service
 * 
 * Abstracts email sending. Easy to mock in tests,
 * easy to swap providers (SendGrid, SES, etc.)
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export class EmailService {
  async send(options: SendEmailOptions): Promise<void> {
    // In real implementation: call SendGrid, SES, etc.
    console.log(`Sending email to ${options.to}: ${options.subject}`);
    // await sendgrid.send(...)
  }
}

// Singleton instance
export const emailService = new EmailService();
