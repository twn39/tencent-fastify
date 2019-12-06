const awsLambdaFastify = require('./aws-lambda-fastify');
const app = require('./app');

const proxy = awsLambdaFastify(app);
exports.handler = proxy;
