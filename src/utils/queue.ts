import PQueue from 'p-queue';

const queue = new PQueue({ concurrency: 50 });

export default queue;
