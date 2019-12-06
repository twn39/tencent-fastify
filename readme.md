[![Serverless Components](https://s3.amazonaws.com/assets.github.serverless/readme-serverless-components-3.gif)](http://serverless.com)

Serverless tencent fastify component.

### Install

1. global install serverless

```
npm install -g serverless
```

2. install fastify

```
npm i --save fastify
```
3. install serverless component
```
npm i --save @twn39/tencent-fastify
```


### Configure

1. create `app.js` file:

```js
const fastify = require('fastify');

const app = fastify();
app.get('/', (request, reply) => reply.send({ hello: 'world' }));

if (require.main === module) {
  // called directly i.e. "node app"
  app.listen(3000, (err) => {
    if (err) console.error(err);
    console.log('server listening on 3000');
  });
} else {
  // required as a module => executed on aws lambda
  module.exports = app;
}
```

2. create serverless configure file:

```yml
# serverless.yml

fastify:
  component: '@twn39/tencent-fastify'
  inputs:
    region: ap-shanghai
```

### Deploy

```
sls --debug
```

### Have fun !