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
            `KoaComponent_${random({ length: 6 })}`;
        inputs.codeUri = ensureString(inputs.code, { isOptional: true }) || process.cwd();
        inputs.region = ensureString(inputs.region, { default: 'ap-guangzhou' });
        inputs.include = ensureIterable(inputs.include, { default: [], ensureItem: ensureString });
        inputs.exclude = ensureIterable(inputs.exclude, { default: [], ensureItem: ensureString });
        const apigatewayConf = ensurePlainObject(inputs.apigatewayConf, { default: {} });

        if (!(await utils.fileExists(path.resolve(inputs.codeUri, 'app.js')))) {
            throw new Error(`app.js not found in ${inputs.codeUri}`);
        }

        inputs.exclude.push('.git/**', '.gitignore', '.serverless', '.DS_Store');

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
        this.context.debug(inputs);

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
        this.context.debug(apigwParam);
        const tencentApiGatewayOutputs = await tencentApiGateway(apigwParam);
        return {
            region: inputs.region,
            functionName: inputs.name,
            apiGatewayServiceId: tencentApiGatewayOutputs.serviceId,
            url: `${tencentApiGatewayOutputs.protocol}://${tencentApiGatewayOutputs.subDomain}/${tencentApiGatewayOutputs.environment}/`,
        };
    }

    async remove() {
        const tencentApiGateway = await this.load('@serverless/tencent-apigateway');
        const tencentCloudFunction = await this.load('@serverless/tencent-scf');

        await tencentApiGateway.remove();
        await tencentCloudFunction.remove();

        return {};
    }
};
