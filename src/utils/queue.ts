import PQueue from 'p-queue';

const mailingQueue = new PQueue({ concurrency: 50 });

const analyticsQueue = new PQueue({ concurrency: 50 });

export { mailingQueue, analyticsQueue };
