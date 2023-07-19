import { APITable } from 'apitable';

const apiTable = new APITable({
  token: process.env.API_TABLE_API_KEY || '',
  fieldKey: 'name',
});

const emailDeliveryDS = apiTable.datasheet('dst8MmSqoNfEUcW5se');

export { emailDeliveryDS };
