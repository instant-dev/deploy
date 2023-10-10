import { DeploymentManager } from '../index.js';
import InstantAPI from '@instant.dev/api';
const EncryptionTools = InstantAPI.EncryptionTools;

const envName = `preview`;
const et = new EncryptionTools();
const dm = new DeploymentManager('.deployconfig.test');

const {files, env} = et.encryptEnvFileFromPackage(
  dm.readPackageFiles('~/projects/instant.dev/test-empty'),
  `.env.${envName}`,
  `.env`,
  /^\.env\..*$/
);
let deployResult = await dm.deployToElasticBeanstalk(files, envName, env);