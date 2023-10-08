import { DeploymentManager } from '../index.js';
import dotenv from 'dotenv';
dotenv.config({path: '.deployconfig.test'});

const dm = new DeploymentManager({
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_EBS_S3_BUCKET: process.env.AWS_EBS_S3_BUCKET,
  AWS_EBS_APPLICATION_NAME: process.env.AWS_EBS_APPLICATION_NAME,
  AWS_EBS_ENVIRONMENT_NAME: process.env.AWS_EBS_ENVIRONMENT_NAME
});

let deployResult = await dm.deployToEBS('./sample_app');
console.log(deployResult);