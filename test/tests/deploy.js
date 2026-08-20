const { DeploymentManager } = require('../../index.js');
const { expect } = require('chai');

module.exports = () => {

  describe('DeploymentManager', () => {

    it('Should log upload progress and stop logging after success', async () => {
      const dm = new DeploymentManager({});
      const logs = [];
      const request = {
        on: (event, callback) => {
          expect(event).to.equal('httpUploadProgress');
          callback({loaded: 50, total: 100});
          return request;
        },
        promise: () => new Promise(resolve => {
          setTimeout(() => resolve({ETag: 'test'}), 35);
        })
      };
      const s3 = {
        upload: params => {
          expect(params.Body.byteLength).to.equal(100);
          return request;
        }
      };
      const logger = {log: message => logs.push(message)};

      const response = await dm.__uploadToS3__(
        s3,
        {Body: Buffer.alloc(100)},
        logger,
        10
      );

      expect(response).to.deep.equal({ETag: 'test'});
      expect(logs.length).to.be.at.least(2);
      expect(logs[0]).to.equal('Upload progress: 50/100 bytes (50.0%) ...');
      const completedLogCount = logs.length;
      await new Promise(resolve => setTimeout(resolve, 25));
      expect(logs.length).to.equal(completedLogCount);
    });

    it('Should propagate upload errors and stop logging', async () => {
      const dm = new DeploymentManager({});
      const logs = [];
      const uploadError = new Error('Upload failed');
      const request = {
        on: (event, callback) => {
          callback({loaded: 25, total: 100});
          return request;
        },
        promise: () => new Promise((resolve, reject) => {
          setTimeout(() => reject(uploadError), 25);
        })
      };
      const s3 = {upload: () => request};
      const logger = {log: message => logs.push(message)};
      let receivedError;

      try {
        await dm.__uploadToS3__(
          s3,
          {Body: Buffer.alloc(100)},
          logger,
          10
        );
      } catch (error) {
        receivedError = error;
      }

      expect(receivedError).to.equal(uploadError);
      expect(logs.length).to.be.at.least(1);
      const completedLogCount = logs.length;
      await new Promise(resolve => setTimeout(resolve, 25));
      expect(logs.length).to.equal(completedLogCount);
    });

  });

};
