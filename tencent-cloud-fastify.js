module.exports = (app) => (event, context) => {
    event.body = event.body || '';

    const method = event.httpMethod;
    const url = event.path;
    const query = event.queryString || {};
    const headers = Object.assign({}, event.headers);
    const payload = Buffer.from(
        event.body,
        event.isBase64Encoded ? 'base64' : 'utf8',
    );

    delete event.body;
    headers['x-apigateway-event'] = encodeURIComponent(JSON.stringify(event));
    if (context)
        headers['x-apigateway-context'] = encodeURIComponent(
            JSON.stringify(context),
        );

    if (event.requestContext && event.requestContext.requestId) {
        headers['x-request-id'] =
            headers['x-request-id'] || event.requestContext.requestId;
    }

    return new Promise((resolve, reject) => {
        app.inject({ method, url, query, payload, headers }, (err, res) => {
            if (err) {
                console.error(err);
                return resolve({
                    statusCode: 500,
                    body: '',
                    headers: {},
                });
            }

            const ret = {
                statusCode: res.statusCode,
                body: res.payload,
                headers: res.headers,
                isBase64Encoded: false,
            };
            resolve(ret);
        });
    });
};
