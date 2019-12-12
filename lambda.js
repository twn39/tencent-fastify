const tencentCloudFastify = require('./tencent-cloud-fastify');
const app = require('./app');

const proxy = tencentCloudFastify(app);
exports.handler = (event, context) => proxy(event, context);
