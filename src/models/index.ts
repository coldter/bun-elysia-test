import { UnwrapSchema, t } from 'elysia';

export enum ServerResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export const serverStandardModels = {
  standardResponse: t.Object({
    status: t.Enum(ServerResponseStatus, {
      default: ServerResponseStatus.SUCCESS,
    }),
    response: t.Any(),
  }),
  standardErrorResponse: t.Object({
    status: t.Enum(ServerResponseStatus, {
      default: ServerResponseStatus.ERROR,
    }),
    details: t.String(),
  }),
} as const;

export const runCampaignModel = t.Object({
  campaignName: t.String({
    description: 'Campaign Name',
  }),
  recipient: t.Array(
    t.Object({
      email: t.String({
        format: 'email',
      }),
      data: t.Object({}),
    }),
  ),
  template: t.Object({
    subject: t.String(),
    html: t.String(),
    replyTo: t.Optional(
      t.String({
        format: 'email',
      }),
    ),
  }),
});

export type RunCampaignModel = UnwrapSchema<typeof runCampaignModel>;
