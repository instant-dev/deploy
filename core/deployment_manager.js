const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');

process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = '1';
const AWS = require('aws-sdk');

const zip = require('./zip.js');

/**
 * Deploys to multiple providers
 */
class DeploymentManager {

  requiredKeys = {
    'AWS': [
      'AWS_REGION',
      'AWS_ACCESS_KEY',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_EBS_S3_BUCKET',
      'AWS_EBS_APPLICATION_NAME',
      'AWS_EBS_ENVIRONMENT_NAME'
    ]
  };

  constructor (cfg) {
    this.__initialize__(cfg);
  }

  /**
   * @private
   */
  __initialize__ (cfg) {
    /**
     * @private
     */
    this.cfg = {};
    for (const key in cfg) {
      this.cfg[key] = cfg[key];
    }
  }

  /**
   * @private
   */
  async __sleep__ (t) {
    return new Promise(r => setTimeout(() => r(true), t));
  }

  /**
   * @private
   * @param {string[]} keys
   */
  __requireKeys__ (keys) {
    for (const key of keys) {
      if (!this.cfg[key]) {
        throw new Error(`Requires "${key}" config to deploy`);
      }
    }
  }

  /**
   * @private
   */
  __createS3__ () {
    const s3Cfg = {
      accessKeyId: this.cfg.AWS_ACCESS_KEY,
      secretAccessKey: this.cfg.AWS_SECRET_ACCESS_KEY,
      region: this.cfg.AWS_REGION,
      apiVersion: '2006-03-01'
    };
    return new AWS.S3(s3Cfg);
  }

  /**
   * @private
   */
  __createEBS__ () {
    const ebsCfg = {
      accessKeyId: this.cfg.AWS_ACCESS_KEY,
      secretAccessKey: this.cfg.AWS_SECRET_ACCESS_KEY,
      region: this.cfg.AWS_REGION,
      apiVersion: '2010-12-01'
    };
    return new AWS.ElasticBeanstalk(ebsCfg);
  }

  async deployToEBS (pathname, devEnvironmentName = 'staging', logFn = null) {

    const start = new Date().valueOf();

    this.__requireKeys__(this.requiredKeys.AWS);

    let applicationName = this.cfg.AWS_EBS_APPLICATION_NAME;
    let environmentName = this.cfg.AWS_EBS_ENVIRONMENT_NAME;

    logFn = (logFn === null || logFn === void 0)
      ? ((...args) => console.log(...args))
      : logFn || (() => {});
    const logger = {
      log: (...args) => {
        const t = new Date().valueOf();
        logFn(...[].concat(args, `(${t - start}ms)`));
      }
    };

    if (!pathname) {
      throw new Error(`deployToEBS: pathname required`);
    } else if (!fs.existsSync(pathname)) {
      throw new Error(`deployToEBS: pathname "${pathname}" does not exist`);
    } else if (!fs.statSync(pathname).isDirectory()) {
      throw new Error(`deployToEBS: pathname "${pathname}" is not a directory`);
    } else if (
      !applicationName ||
      !applicationName.match(/[A-Z0-9\-]/gi) ||
      applicationName.match(/^\-|\-$/)
    ) {
      throw new Error(`deployToEBS: AWS_EBS_APPLICATION_NAME must be alphanumeric and can contain "-" only`);
    } else if (
      !environmentName ||
      !environmentName.match(/[A-Z0-9\-]/gi) ||
      environmentName.match(/^\-|\-$/)
    ) {
      throw new Error(`deployToEBS: AWS_EBS_ENVIRONMENT_NAME must be alphanumeric and can contain "-" only`);
    } else if (typeof logFn !== 'function') {
      throw new Error(`deployToEBS: logger must be a function`);
    }

    logger.log(`Beginning AWS ElasticBeanstalk deployment for development environment "${devEnvironmentName}" ...`);

    const s3 = this.__createS3__();
    const ebs = this.__createEBS__();

    const buffer = await zip.packdir(pathname);
    const timeString = new Date().toISOString();
    const sDate = timeString.split('T')[0];
    const sTime = timeString.split('T')[1].split('Z')[0].replace(/[^\d]/gi, '-');
    const filename = `${applicationName}/${sDate}/${sTime}.zip`;
    const version = `${sDate}-${sTime}`;

    logger.log(`Uploading package "${filename}" (${buffer.byteLength} bytes) to S3 bucket "${this.cfg.AWS_EBS_S3_BUCKET}" ...`);
    let s3Response = await new Promise((resolve, reject) => {
      s3.putObject(
        {
          Bucket: this.cfg.AWS_EBS_S3_BUCKET,
          Key: filename,
          Body: buffer,
          ACL: 'private',
          ContentType: 'application/zip'
        },
        (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        }
      );
    });
    logger.log(`Successfully uploaded package "${filename}"!`);

    logger.log(`Creating ElasticBeanstalk application "${applicationName}" version "${version}" ...`);
    let avResponse = await new Promise((resolve, reject) => {
      ebs.createApplicationVersion(
        {
          ApplicationName: applicationName,
          Process: false,
          SourceBundle: {
            S3Bucket: this.cfg.AWS_EBS_S3_BUCKET,
            S3Key: filename
          },
          VersionLabel: version
        },
        (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        }
      );
    });
    logger.log(`Successfully created application "${applicationName}" version "${version}"!`);

    let applicationVersion = avResponse.ApplicationVersion;
    let MinEventDate = applicationVersion.DateCreated;

    logger.log(`Retrieving ElasticBeanstalk environment "${environmentName}" ...`);
    let envResponse = await new Promise((resolve, reject) => {
      ebs.describeEnvironments(
        {
          EnvironmentNames: [
            environmentName
          ]
        },
        (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        }
      );
    });

    let environment = envResponse.Environments[0] || null;
    if (!environment) {
      throw new Error(`Environment "${environmentName}" not found`);
    } else if (environment.Status === 'Terminated') {
      throw new Error(`Environment "${environmentName}" is in "Terminated" state`);
    }

    logger.log(`Retrieved environment "${environmentName}" successfully!`);
    logger.log(`Updating environment "${environmentName}" ...`);
    let envUpdateResponse = await new Promise((resolve, reject) => {
      ebs.updateEnvironment(
        {
          ApplicationName: applicationName, 
          EnvironmentName: environmentName, 
          VersionLabel: version,
          OptionSettings: [
            {
              Namespace: 'aws:elasticbeanstalk:application:environment',
              OptionName: 'NODE_ENV',
              Value: devEnvironmentName
            }
          ]
        },
        (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        }
      );
    });

    const RequestId = envUpdateResponse.ResponseMetadata.RequestId;

    logger.log(`Update for ElasticBeanstalk environment "${environmentName}" started ...`);
    let status = envUpdateResponse.Status;
    let events = [];
    while (status === `Updating` || status === `Launching`) {
      await this.__sleep__(1000);
      // First get environment ...
      let envStatusResponse = await new Promise((resolve, reject) => {
        ebs.describeEnvironments(
          {
            EnvironmentNames: [
              environmentName
            ]
          },
          (err, response) => {
            if (err) {
              reject(err);
            } else {
              resolve(response);
            }
          }
        );
      });
      environment = envStatusResponse.Environments[0];
      if (!environment) {
        throw new Error(`Update failed: Environment "${environmentName}" not found`);
      } else if (environment.Status === 'Terminated') {
        throw new Error(`Update failed: Environment "${environmentName}" is in "Terminated" state`);
      }
      status = environment.Status;
      // Then get events ... 
      let envEventsResponse = await new Promise((resolve, reject) => {
        ebs.describeEvents(
          {
            RequestId: RequestId,
            StartTime: MinEventDate
          },
          (err, response) => {
            if (err) {
              reject(err);
            } else {
              resolve(response);
            }
          }
        );
      });
      if (envEventsResponse.Events.length) {
        let newEvents = envEventsResponse.Events.slice().reverse();
        for (const event of newEvents) {
          events.push(event);
          logger.log(`Received event: [${event.Severity}] ${event.Message}`);
        }
        MinEventDate = new Date(new Date(events[events.length - 1].EventDate).valueOf() + 1000);
      }
    }

    if (environment.Status === 'Ready') {
      logger.log(`Updated environment "${environmentName}" successfully!`);
    } else {
      logger.log(`Environment update failed in ${t} ms with status: "${environment.Status}"`);
    }

    return {
      app_url: environment.CNAME,
      dashboard_url: `https://${this.cfg.AWS_REGION}.console.aws.amazon.com/elasticbeanstalk/home?region=${this.cfg.AWS_REGION}#/environment/dashboard?environmentId=${environment.EnvironmentId}`
    };

  }

};

module.exports = DeploymentManager;