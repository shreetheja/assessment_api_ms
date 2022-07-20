const aws = require('aws-sdk')
class AwsSQS {
  constructor(awsKey, awsSecretKey, queueUrl, groupId) {
    aws.config.update({ region: 'ap-southeast-1' });
    this.sqs = new aws.SQS({
      // apiVersion: '2012-11-05',
      accessKeyId: awsKey,
      secretAccessKey: awsSecretKey,
    });
    this.groupId = groupId;
    this.queueUrl = queueUrl;
  }

  async pushMessage(messageJson, messageDeduplicationId) {
    try {
      const params = {
        MessageBody: JSON.stringify(messageJson),
        MessageDeduplicationId: messageDeduplicationId,
        QueueUrl: this.queueUrl,
        MessageGroupId: this.groupId,
      };
      const response = await this.sqs.sendMessage(params).promise();
      console.log(response);
      return response;
    } catch (error) {
      logger.error('Error in pushing queue aws SQS', error);
      throw error;
    }
  }

  async popMessage(maxNumber) {
    const params = {
      MaxNumberOfMessages: maxNumber,
      QueueUrl: this.queueUrl,
      VisibilityTimeout: 20,
      WaitTimeSeconds: 5,
    };
    try {
      const response = await this.sqs.receiveMessage(params).promise();
      console.log(response);
      if (response.Messages && response.Messages.length > 0) {
        return response.Messages;
      }
      return undefined;
    } catch (error) {
      logger.error('Error in popping queue aws SQS', error);
      throw error;
    }
  }

  async deleteProcessedMessage(recieptHandle) {
    const deleteParams = {
      QueueUrl: this.queueUrl,
      ReceiptHandle: recieptHandle,
    };
    try {
      await this.sqs.deleteMessage(deleteParams).promise();
    } catch (error) {
      logger.error('Error in deleting queue aws SQS', error);
      throw error;
    }
  }
}
const AwsPriceSQS = new AwsSQS(
  process.env.AWS_ACCESS_KEY,
  process.env.AWS_SECRET_KEY,
  process.env.AWS_PRICE_QUEUE_URL,
  'answers',
);
module.exports = AwsPriceSQS;
