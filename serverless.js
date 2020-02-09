'use strict';

const ensureIterable = require('type/iterable/ensure');
const ensurePlainObject = require('type/plain-object/ensure');
const ensureString = require('type/string/ensure');
const random = require('ext/string/random');
const path = require('path');
const { Component, utils } = require('@serverless/core');

module.exports = class TencentFastify extends Component {
    async default(inputs = {}) {
        inputs.name =
            ensureString(inputs.functionName, { isOptional: true }) ||
            this.state.functionName ||
            `FastifyComponent_${random({ length: 6 })}`;
        inputs.codeUri = ensureString(inputs.code, { isOptional: true }) || process.cwd();
        inputs.region = ensureString(inputs.region, { default: 'ap-guangzhou' });
        inputs.include = ensureIterable(inputs.include, { default: [], ensureItem: ensureString });
        inputs.exclude = ensureIterable(inputs.exclude, { default: [], ensureItem: ensureString });
        const apigatewayConf = ensurePlainObject(inputs.apigatewayConf, { default: {} });

        if (!(await utils.fileExists(path.resolve(inputs.codeUri, 'app.js')))) {
            throw new Error(`app.js not found in ${inputs.codeUri}`);
        }

        inputs.exclude.push('.git/**', '.gitignore', '.serverless', '.DS_Store');

        const filePath = path.resolve(__dirname, 'lambda.js');
        const tencentFastifyPath = path.resolve(__dirname, 'tencent-cloud-fastify.js');
        inputs.include.push(filePath);
        inputs.include.push(tencentFastifyPath);
        inputs.handler = 'lambda.handler';
        inputs.runtime = 'Nodejs8.9';

        const tencentCloudFunction = await this.load('@serverless/tencent-scf');
        const tencentApiGateway = await this.load('@serverless/tencent-apigateway');

        if (inputs.functionConf) {
            inputs.timeout = inputs.functionConf.timeout || 3;
            inputs.memorySize = inputs.functionConf.memorySize || 128;
            if (inputs.functionConf.environment) inputs.environment = inputs.functionConf.environment;
            if (inputs.functionConf.vpcConfig) inputs.vpcConfig = inputs.functionConf.vpcConfig;
        }

        inputs.fromClientRemark = inputs.fromClientRemark || 'tencent-fastify'
        const tencentCloudFunctionOutputs = await tencentCloudFunction(inputs);
        const apigwParam = {
            serviceName: inputs.serviceName,
            description: 'Serverless Framework tencent-fastify Component',
            serviceId: inputs.serviceId,
            region: inputs.region,
            protocol: apigatewayConf.protocol || 'http',
            environment: apigatewayConf.environment || 'release',
            endpoints: [
                {
                    path: '/',
                    method: 'ANY',
                    function: {
                        isIntegratedResponse: true,
                        functionName: tencentCloudFunctionOutputs.Name,
                    },
                },
            ],
        };
        if (apigatewayConf.usagePlan) apigwParam.endpoints[0].usagePlan = apigatewayConf.usagePlan;
        if (apigatewayConf.auth) apigwParam.endpoints[0].auth = inputs.apigatewayConf.auth;

        this.state.functionName = inputs.name;
        await this.save();
        apigwParam.fromClientRemark = inputs.fromClientRemark || 'tencent-fastify';
        const tencentApiGatewayOutputs = await tencentApiGateway(apigwParam);
        return {
            region: tencentApiGatewayOutputs.region,
            functionName: inputs.name,
            apiGatewayServiceId: tencentApiGatewayOutputs.serviceId,
            url: `${tencentApiGatewayOutputs.protocols[0]}://${tencentApiGatewayOutputs.subDomain}/${tencentApiGatewayOutputs.environment}/`,
        };
    }

    async remove(inputs = {}) {
        const removeInput = {
            fromClientRemark: inputs.fromClientRemark || 'tencent-fastify'
        };
        const tencentApiGateway = await this.load('@serverless/tencent-apigateway');
        const tencentCloudFunction = await this.load('@serverless/tencent-scf');

        await tencentApiGateway.remove(removeInput);
        await tencentCloudFunction.remove(removeInput);

        return {};
    }
};
