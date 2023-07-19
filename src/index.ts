import cors from '@elysiajs/cors';
import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { ServerResponseStatus, serverStandardModels, runCampaignModel } from './models';
import { registerInitialCampaignEmailDeliveryStatus } from './service/campaign.service';

const app = new Elysia();

/**
 * Middleware
 */
app.use(cors()).use(
  swagger({
    exclude: ['/', '/ping'],
    documentation: {
      info: {
        title: 'Elysia',
        description: 'Elysia API Documentation',
        version: '1.0.0',
      },
    },
  }),
);

/**
 * Routes
 */
app
  .get('/', ({ set }) => (set.redirect = '/swagger'))
  .get('/ping', () => ({
    status: ServerResponseStatus.SUCCESS,
    response: 'pong',
  }))
  .get('/favicon.ico', ({ set }) => (set.status = 204));

/**
 * Application Routes
 */
app.model({ ...serverStandardModels, runCampaignModel }).guard(
  {
    headers: t.Object({
      ['x-api-key']: t.String({
        description: 'API Key for authorization',
      }),
    }),
    beforeHandle: ({ headers, set }) => {
      if (headers['x-api-key'] !== (process.env.API_KEY || 'test')) {
        set.status = 401;
        return {
          status: ServerResponseStatus.ERROR,
          details: 'Invalid API Key',
        };
      }
    },
    error: ({ error, set }) => {
      set.status = 400;
      return {
        status: ServerResponseStatus.ERROR,
        details: error.message,
      };
    },
  },
  (app) =>
    app.group('/api', (app) =>
      app.post(
        '/campaign',
        async ({ set, body }) => {
          try {
            // * entry in api table
            await registerInitialCampaignEmailDeliveryStatus({
              recipient: body.recipient,
              campaignName: body.campaignName,
            });

            return {
              status: ServerResponseStatus.SUCCESS,
              response: 'campaign created',
            };
          } catch (error) {
            console.error('🚀 ~ file: index.ts ~ line 118 ~ app.get ~ error', error);
            set.status = 500;
            return {
              status: ServerResponseStatus.ERROR,
              details: 'api cannot fulfill your request at this time',
            };
          }
        },
        {
          body: runCampaignModel,
          response: {
            200: serverStandardModels.standardResponse,
            400: serverStandardModels.standardErrorResponse,
          },
          detail: {
            tags: ['Api.Campaign'],
          },
        },
      ),
    ),
);

/**
 * Error Handling
 */
app.onError((error) => {
  console.error('🧯 🔥 ~ app.onError ~ error', error);
  return {
    status: ServerResponseStatus.ERROR,
    details: error,
  };
});

/**
 * start server
 */
app.listen(process.env.PORT || 3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
