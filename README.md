# Simple deployments
![npm version](https://img.shields.io/npm/v/@instant.dev/deploy?label=) ![Build Status](https://app.travis-ci.com/instant-dev/deploy.svg?branch=main)

## Deploy to AWS ElasticBeanstalk

Deploy packages to AWS Elastic Beanstalk easily. Used by the
[Instant CLI](https://github.com/instant-dev/instant) to automate Elastic Beanstalk deployments.

It can be used with the [@instant.dev/encrypt](https://github.com/instant-dev/encrypt) to
automatically encrypt `.env` files stored in plaintext, with the encryption keys
loaded into ElasticBeanstalk at runtime as environment variables.

```javascript
import { DeploymentManager } from '@instant.dev/deploy';
import EncryptionTools from '@instant.dev/encrypt';

const envName = `staging`;

// Prepare to encrypt .env file
const et = new EncryptionTools();
// Loads deployment variables from ".deployconfig.staging" INI-format file
const dm = new DeploymentManager(`.deployconfig.${envName}`);

// Encrypts `.env.staging` as `.env` in final package
// Also deletes all files matching `.env.*` from final package
const {files, env} = et.encryptEnvFileFromPackage(
  // Reads all files in this directory, stores them in files {} object
  dm.readPackageFiles('~/projects/instant.dev/test-empty'),
  `.env.${envName}`,
  `.env`,
  /^\.env\..*$/
);

// Deploys to ElasticBeanstalk
let deployResult = await dm.deployToElasticBeanstalk(files, envName, env);
/**
{
  app_url: 'my-app.elasticbeanstalk.com',
  dashboard_url: 'https://console.aws.amazon.com/...'
}
 */
```

## Acknowledgements

Special thank you to [Scott Gamble](https://x.com/threesided) who helps run all
of the front-of-house work for instant.dev 💜!

| Destination | Link |
| ----------- | ---- |
| Home | [instant.dev](https://instant.dev) |
| GitHub | [github.com/instant-dev](https://github.com/instant-dev) |
| Discord | [discord.gg/puVYgA7ZMh](https://discord.gg/puVYgA7ZMh) |
| X / instant.dev | [x.com/instantdevs](https://x.com/instantdevs) |
| X / Keith Horwood | [x.com/keithwhor](https://x.com/keithwhor) |
| X / Scott Gamble | [x.com/threesided](https://x.com/threesided) |