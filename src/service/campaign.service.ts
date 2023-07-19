import type { RunCampaignModel } from '../models';
import { emailDeliveryDS } from '../utils/apiTable';
import queue from '../utils/queue';
import { Mailer } from '../utils/mailer';

const mailer = new Mailer({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || ''),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  from: process.env.SMTP_FROM,
});

/**
 * @description
 * @param {*} param
 */
export const registerInitialCampaignEmailDeliveryStatus = async ({
  campaignName,
  recipient,
}: Omit<RunCampaignModel, 'template'>) => {
  return await emailDeliveryDS.records.create(
    recipient.map((recipient) => ({
      fields: {
        campaign_name: campaignName,
        email: recipient.email,
      },
    })),
  );
};

/**
 * @description
 * @param {*} param0
 */
export const insertIntoEmailDeliveryQueue = async ({
  campaignName,
  recipient,
  template,
}: RunCampaignModel) => {
  recipient.forEach((recipient) => {
    queue.add(async () => {
      try {
        await mailer.sendMail({
          to: recipient.email,
          html: mailer.renderTemplate(template.html, recipient.data),
          subject: template.subject,
          from: process.env.SMTP_FROM,
        });

        const record = await emailDeliveryDS.records.query({
          filterByFormula: `AND(campaign_name = '${campaignName}', email = '${recipient.email}')`,
        });

        if (!record.data) {
          return;
        }
        const recordIds = record.data.records.map((record) => record.recordId);

        await emailDeliveryDS.records.update(
          recordIds.map((recordId) => ({
            recordId,
            fields: {
              send_status: 'SUCCESS',
            },
          })),
        );
      } catch (error) {
        console.error('🚀 ~ file: campaign.service.ts:48 ~ queue.add ~ error:', error);
        const record = await emailDeliveryDS.records.query({
          filterByFormula: `AND(campaign_name = '${campaignName}', email = '${recipient.email}')`,
          fields: ['email'],
        });
        if (!record.data) {
          return;
        }
        const recordIds = record.data.records.map((record) => record.recordId);

        await emailDeliveryDS.records
          .update(
            recordIds.map((recordId) => ({
              recordId,
              fields: {
                send_status: 'FAILED',
              },
            })),
          )
          .catch(console.error);
      }
    });
  });
};

insertIntoEmailDeliveryQueue({
  campaignName: 'string',
  recipient: [
    {
      email: 'kuldeep@onlint.com',
      data: {},
    },
  ],
  template: {
    html: 'string',
    subject: 'string',
    // replyTo: 'I <k@gmail.com>',
  },
});
