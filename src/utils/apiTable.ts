import { APITable } from 'apitable';

const apiTable = new APITable({
  token: process.env.API_TABLE_API_KEY || '',
  fieldKey: 'name',
});

const emailDeliveryDS = apiTable.datasheet(process.env.EMAIL_DELIVERY_STATUS_DATASET || '');
const generalEmailTrackingDS = apiTable.datasheet(process.env.GENERAL_EMAIL_TRACKING_DATESET || '');

export { emailDeliveryDS, generalEmailTrackingDS };
