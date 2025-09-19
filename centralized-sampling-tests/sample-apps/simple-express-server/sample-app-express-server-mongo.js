// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

const http = require('http');
const express = require('express');
const {
  S3Client, ListObjectsCommand, ListBucketsCommand, DeleteBucketCommand,
} = require('@aws-sdk/client-s3');
const { KinesisClient, CreateStreamCommand } = require('@aws-sdk/client-kinesis'); // CommonJS import
const mongoose = require('mongoose');
const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const { BatchGetItemCommand, DynamoDBClient, GetItemCommand } = require("@aws-sdk/client-dynamodb");


const PORT = parseInt(process.env.SAMPLE_APP_PORT || '8080', 10);

const app = express();

async function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

app.get('/rolldice', (req, res) => {
  getRandomNumber(1, 6).then((val) => {
    res.send(`rolldice: ${val.toString()}`);
  });
});

app.get('/http', (req, res) => {
  const options = {
    hostname: 'www.randomnumberapi.com',
    port: 80,
    path: '/api/v1.0/random',
    method: 'GET',
  };

  const httpRequest = http.request(options, (rs) => {
    rs.setEncoding('utf8');
    rs.on('data', (result) => {
      res.send(`random value from http request: ${result}`);
    });
    rs.on('error', console.log);
  });
  httpRequest.end();
});

app.get('/aws-sdk-s3', async (req, res) => {
  const s3Client = new S3Client({ region: 'us-east-1' });
  const bucketName = 'test-bucket-not-exist-or-accessible';
  try {
    await s3Client.send(
      new ListObjectsCommand({
        Bucket: bucketName,
      }),
    ).then((data) => {
      console.log(data);
    });
    // await s3Client.send(
    //   new ListBucketsCommand({})
    // ).then(data => {
    //   console.log(data)
    // })
    // await s3Client.send(
    //   new DeleteBucketCommand({Bucket:"delete-me-343243"})
    // ).then(data => {
    //   console.log(data)
    // })
    // const client = new KinesisClient({ region: 'us-east-1' });
    // const input = { // CreateStreamInput
    //   StreamName: "myNewKinesisStream", // required
    //   ShardCount: Number(3),
    //   StreamModeDetails: { // StreamModeDetails
    //     StreamMode: "ON_DEMAND", // required
    //   },
    // };
    // const command = new CreateStreamCommand(input);
    // await client.send(command).then(data => {
    //   console.log(data);
    // })
  } catch (e) {
    console.log('bleh');
    if (e instanceof Error) {
      console.error('Exception thrown: ', e.message);
    }
  } finally {
    res.send('done aws sdk s3 request');
  }
});

app.get('/aws-sdk-kinesis', async (req, res) => {
  const s3Client = new S3Client({ region: 'us-east-1' });
  const bucketName = 'test-bucket-not-exist-or-accessible';
  try {
    const client = new KinesisClient({ region: 'us-east-1' });
    const input = { // CreateStreamInput
      StreamName: "myNewKinesisStream", // required
      ShardCount: Number(3),
      StreamModeDetails: { // StreamModeDetails
        StreamMode: "ON_DEMAND", // required
      },
    };
    const command = new CreateStreamCommand(input);
    await client.send(command).then(data => {
      console.log(data);
    })
  } catch (e) {
    console.log('bleh');
    if (e instanceof Error) {
      console.error('Exception thrown: ', e.message);
    }
  } finally {
    res.send('done aws sdk s3 request');
  }
});

app.get('/aws-sdk-sqs', async (req, res) => {
  const s3Client = new S3Client({ region: 'us-east-1' });
  const bucketName = 'test-bucket-not-exist-or-accessible';
  try {
    const sqsClient = new SQSClient({});
    var val2 = sqsClient.send(
        new SendMessageCommand({
            QueueUrl: "https://sqs.us-east-1.amazonaws.com/976570290907/sqssame", // required
            MessageBody: "STRING_VALUE", // required
        })
    )


    var val3 = sqsClient.send(
        new ReceiveMessageCommand({
            QueueUrl: "https://sqs.us-east-1.amazonaws.com/976570290907/sqssame", // required
        })
    )

    var val4 = sqsClient.send(
        new DeleteMessageCommand({
            QueueUrl: "https://sqs.us-east-1.amazonaws.com/976570290907/sqssame", // required
            ReceiptHandle: "123654", // required
        })
    )
  } catch (e) {
    console.log('bleh');
    if (e instanceof Error) {
      console.error('Exception thrown: ', e.message);
    }
  } finally {
    res.send('done aws sdk s3 request');
  }
});

app.get('/aws-sdk-dynamo-batch', async (req, res) => {
  const s3Client = new S3Client({ region: 'us-east-1' });
  const bucketName = 'test-bucket-not-exist-or-accessible';
  try {
    const client = new DynamoDBClient({ region: 'us-east-1' });

    var params = {
      "RequestItems": {
          "table1": { // Table 1
              "Keys": [
                  {
                      "key1": { "S":"Amazon DynamoDB" } // Column and value to match
                  }
              ]
          },
          "table2": { // Table 1
              "Keys": [
                  {
                      "key2": { "S":"Amazon DynamoDB" } // Column and value to match
                  }
              ]
          }
      }
    };

    const command = new BatchGetItemCommand(params);
    await client.send(command).then(data => {
      console.log(data);
    })

  } catch (e) {
    console.log('bleh');
    if (e instanceof Error) {
      console.error('Exception thrown: ', e.message);
    }
  } finally {
    res.send('done aws sdk s3 request');
  }
});

app.get('/aws-sdk-dynamo', async (req, res) => {
  const s3Client = new S3Client({ region: 'us-east-1' });
  const bucketName = 'test-bucket-not-exist-or-accessible';
  try {
    const client = new DynamoDBClient({ region: 'us-east-1' });

    var params2 = {
      TableName: 'table1',
      Key: {
        'key1': {S: 'Amazon DynamoDB'}
      }
    };

    const command = new BatchGetItemCommand(params2);
    await client.send(command).then(data => {
      console.log(data);
    })

  } catch (e) {
    console.log('bleh');
    if (e instanceof Error) {
      console.error('Exception thrown: ', e.message);
    }
  } finally {
    res.send('done aws sdk s3 request');
  }
});


app.listen(PORT, async () => {
  try {
    const uri2 = 'mongodb+srv://Cluster25959:Password123@cluster25959.uzvfupm.mongodb.net/Cluster25959';
    await mongoose.connect(uri2);
  } catch (err) {
    console.log(err);
  }
  console.log(`Listening for requests on http://localhost:${PORT}`);
});

const { Schema } = mongoose;
const sc = new Schema({
  name: String,
});
const Reviews = mongoose.model('cluster25959.sample_airbnb.listingsandreviews', sc);
app.get('/mongo', async (req, res) => {
  const newSC = new Reviews({ name: 'SomeName' });
  await newSC.save().then(() => console.log('saved'));

  res.send('done mongo');
});
