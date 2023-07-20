import type { RunCampaignModel } from '../models';
import { emailDeliveryDS, generalEmailTrackingDS } from '../utils/apiTable';
import { mailingQueue, analyticsQueue } from '../utils/queue';
import { Mailer } from '../utils/mailer';
import * as cheerio from 'cheerio';

const mailer = new Mailer({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || ''),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  from: process.env.MAIL_FROM,
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
    mailingQueue.add(async () => {
      try {
        const $ = cheerio.load(mailer.renderTemplate(template.html, recipient.data));

        $('body').append(
          `<img src="${process.env.API_HOST}/link/${campaignName}/${recipient.email}" style="display: none; width: 1px; height: 1px;" alt=""/>`,
        );
        await mailer
          .sendMail({
            to: recipient.email,
            html: $.html(),
            subject: template.subject,
            from: process.env.MAIL_FROM,
          })
          .then(console.log);
        updateCampaignMailDeliveryStatus(campaignName, recipient.email, 'SUCCESS').catch(
          console.error,
        );
      } catch (error) {
        console.error('🚀 ~ file: campaign.service.ts:48 ~ queue.add ~ error:', error);
        updateCampaignMailDeliveryStatus(campaignName, recipient.email, 'FAILED').catch(
          console.error,
        );
      }
    });
  });
};

export type EmailDeliveryStatus = 'SUCCESS' | 'FAILED';
/**
 * @description
 * @param campaignName
 * @param email
 * @param status
 * @returns
 */
export const updateCampaignMailDeliveryStatus = async (
  campaignName: string,
  email: string,
  status: EmailDeliveryStatus,
) => {
  const recordIds = await getRecordIdsByCampaignNameAndEmail(campaignName, email);

  if (!recordIds) {
    return;
  }

  await emailDeliveryDS.records
    .update(
      recordIds.map((recordId) => ({
        recordId,
        fields: {
          send_status: status,
        },
      })),
    )
    .catch(console.error);
};

/**
 * @description
 * @param campaignName
 * @param email
 */
export const getRecordIdsByCampaignNameAndEmail = async (
  campaignName: string,
  email: string,
): Promise<string[] | null> => {
  const record = await emailDeliveryDS.records.query({
    filterByFormula: `AND(campaign_name = '${campaignName}', email = '${email}')`,
    fields: ['email'],
  });
  if (!record.data) {
    return null;
  }
  const ids = record.data.records.map((record) => record.recordId);

  return ids.length ? ids : null;
};

/**
 * @description
 * @param campaignName
 * @param email
 * @returns
 */
export const getGeneralEmailTrackingRecordIds = async (
  campaignName: string,
  email: string,
): Promise<string[] | null> => {
  const record = await generalEmailTrackingDS.records.query({
    filterByFormula: `AND(campaign_name = '${campaignName}', email = '${email}')`,
    fields: ['email'],
  });
  if (!record.data) {
    return null;
  }
  const ids = record.data.records.map((record) => record.recordId);

  return ids.length ? ids : null;
};

/**
 * @description
 * @param campaignName
 * @param email
 */
export const createGeneralEmailTrackingRecord = async (campaignName: string, email: string) => {
  await generalEmailTrackingDS.records.create([
    {
      fields: {
        campaign_name: campaignName,
        email,
        open_count: 1,
        open_at: new Date().getTime(),
      },
    },
  ]);
};

/**
 * @description
 * @param recordIds
 */
export const updateGeneralEmailTrackingOpenCount = async (recordIds: string[]) => {
  const response = await generalEmailTrackingDS.records.query({
    recordIds,
    fields: ['open_count'],
  });

  const records = response.data?.records || [];

  records.forEach(async (record) => {
    const openCount = record.fields.open_count;
    if (!openCount && typeof openCount !== 'number') {
      return;
    }
    await generalEmailTrackingDS.records.update([
      {
        recordId: record.recordId,
        fields: {
          open_count: Number(openCount) + 1,
          last_open_at: new Date().getTime(),
        },
      },
    ]);
  });
};

/**
 * @description
 * @param campaignName
 * @param email
 */
export const handleGeneralEmailOpenStatus = async (campaignName: string, email: string) => {
  const generaTrackingRecord = await getGeneralEmailTrackingRecordIds(campaignName, email);
  if (generaTrackingRecord) {
    await updateGeneralEmailTrackingOpenCount(generaTrackingRecord);
    return;
  }
  await createGeneralEmailTrackingRecord(campaignName, email);
};

/**
 * @description
 * @param recordIds
 * @returns
 */
export const handleCampaignEmailOpenStatus = async (recordIds: string[]) => {
  const response = await emailDeliveryDS.records.query({
    recordIds,
    fields: ['open_count'],
  });

  const records = response.data?.records || [];

  records.forEach(async (record) => {
    const openCount = record.fields.open_count;
    if (!openCount && typeof openCount !== 'number') {
      return;
    }

    if (Number(openCount) > 0) {
      await emailDeliveryDS.records.update([
        {
          recordId: record.recordId,
          fields: {
            open_count: Number(openCount) + 1,
            last_open_at: new Date().getTime(),
          },
        },
      ]);
    } else {
      await emailDeliveryDS.records.update([
        {
          recordId: record.recordId,
          fields: {
            open_count: 1,
            open_at: new Date().getTime(),
            last_open_at: new Date().getTime(),
            open: 'YES',
          },
        },
      ]);
    }
  });
};

/**
 * @description
 * @param param0
 */
export const trackEmailOpen = async ({
  campaignName,
  email,
}: {
  campaignName: string;
  email: string;
}) => {
  analyticsQueue.add(async () => {
    try {
      const deliveryRecordIds = await getRecordIdsByCampaignNameAndEmail(campaignName, email);

      if (!deliveryRecordIds) {
        await handleGeneralEmailOpenStatus(campaignName, email);
      } else {
        handleCampaignEmailOpenStatus(deliveryRecordIds).catch(console.error);
      }
    } catch (error) {
      console.error('🚀 ~ analyticsQueue.add ~ error:', error);
    }
  });
};
