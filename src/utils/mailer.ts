import { createTransport, Transporter, SendMailOptions } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import Handlebars from 'handlebars';

export class Mailer {
  private transporter: Transporter;
  private templateEngine: typeof Handlebars;

  constructor(config: SMTPTransport.Options) {
    this.transporter = createTransport(config);
    this.templateEngine = Handlebars;
  }

  public async sendMail(mailOptions: SendMailOptions): Promise<boolean> {
    return this.transporter
      .sendMail(mailOptions)
      .then(() => true)
      .catch((error: unknown) => {
        console.warn('🧯 🔥 ~ Mailer ~ sendMail ~ error', error);
        return false;
      });
  }

  public renderTemplate(template: string, data: Record<string, unknown>): string {
    return this.templateEngine.compile(template)(data);
  }

  public close(): void {
    return this.transporter.close();
  }
}
