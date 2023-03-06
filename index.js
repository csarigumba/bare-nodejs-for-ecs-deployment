const http = require('http');
const express = require('express');
const ws = require('websocket');
const mysql = require('mysql2');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const newUUID = uuidv4();

const APPID = newUUID;
let connections = [];
const WebSocketServer = ws.server;
const sav2Url = 'https://sa2-api.dev01.nihon-ma.co.jp/deals/12503';

// REDIS PUB-SUB

const REDIS_HOST = 'bp-dev-redis.zg3fst.ng.0001.apne1.cache.amazonaws.com';
const REDIS_PORT = 6379;
const url = `redis://${REDIS_HOST}:${REDIS_PORT}`;
const redisChannel = 'livechat';

const client = redis.createClient({
  url,
});
let subscriber;
let publisher;

initRedisClient();

const app = express();
const httpserver = http.createServer(express);
// Also mount the app here
httpserver.on('request', app);

//pass the httpserver object to the WebSocketServer library to do all the job, this class will override the req/res
const websocket = new WebSocketServer({
  httpServer: httpserver,
});

// BP
const BP_RDS_DB_HOST = 'bp-dev-app-db.cluster-cvh8idkwdnkt.ap-northeast-1.rds.amazonaws.com';
const BP_RDS_DB_USER = 'appuser';
const BP_RDS_DB_PASSWORD = 'x';
const BP_RDS_DB_NAME = 'bp';
const BP_RDS_DB_PORT = '3306';

// SD
const SD_RDS_DB_HOST = 'nw-dev-sd-proxy.proxy-cp9qt7cqaxsb.ap-northeast-1.rds.amazonaws.com';
const SD_RDS_DB_USER = 'bpuser';
const SD_RDS_DB_PASSWORD = 'x';
const SD_RDS_DB_NAME = 'sd';
const SD_RDS_DB_PORT = '3306';

const bpPool = mysql.createPool({
  host: BP_RDS_DB_HOST,
  user: BP_RDS_DB_USER,
  password: BP_RDS_DB_PASSWORD,
  database: BP_RDS_DB_NAME,
  port: BP_RDS_DB_PORT,
});

const sdPool = mysql.createPool({
  host: SD_RDS_DB_HOST,
  user: SD_RDS_DB_USER,
  password: SD_RDS_DB_PASSWORD,
  database: SD_RDS_DB_NAME,
  port: SD_RDS_DB_PORT,
  ssl: 'Amazon RDS',
});

app.get('/health', async (req, res) => {
  res.send({
    health: 'OK',
  });
});

app.get('/client-check', async (req, res) => {
  res.send({
    health: 'OK',
  });
});

app.get('/connectivity-test', async (req, res) => {
  const responseObject = {
    server_id: newUUID,
    rds_bp: {},
    rds_sd: {},
    redis: {},
    sav2: {},
  };
  console.log(`Calling BP RDS Connection test.`);
  let isBPRdsConnectionOK = await checkRDSConnection(bpPool);

  responseObject.rds_bp.host = BP_RDS_DB_HOST;
  responseObject.rds_bp.status = isBPRdsConnectionOK == true ? 'UP' : 'DOWN';

  console.log(`Calling SD RDS Connection test.`);
  let isSDRdsConnectionOK = await checkRDSConnection(sdPool);

  responseObject.rds_sd.host = SD_RDS_DB_HOST;
  responseObject.rds_sd.status = isSDRdsConnectionOK == true ? 'UP' : 'DOWN';

  console.log(`Calling Redis Connection test.`);
  let isRedisConnectionOK = await checkRedisConnection();

  responseObject.redis.host = REDIS_HOST;
  responseObject.redis.status = isRedisConnectionOK == true ? 'UP' : 'DOWN';

  console.log(`Calling SA Connection test.`);
  const saConnectionResponse = await checkSAConnection();

  responseObject.sav2.url = sav2Url;
  responseObject.sav2.statusCode = saConnectionResponse.status;
  responseObject.sav2.status = saConnectionResponse.status == 200 ? 'UP' : 'DOWN';

  res.status(200).json(responseObject);
});

const checkRDSConnection = pool => {
  return new Promise((resolve, reject) => {
    pool.getConnection((error, connection) => {
      if (error) {
        reject(error);
      } else {
        connection.release();
        resolve(true);
      }
    });
  });
};

const checkRedisConnection = async () => {
  return (await client.ping()) === 'PONG' ? true : false;
};

const checkSAConnection = async () => {
  try {
    const response = await axios.get(sav2Url, {
      headers: {
        'x-sa-api-key': 'x',
      },
    });
    return response;
  } catch (error) {
    console.log(error);
    const response = {
      statusCode: error.response.status,
    };
    return response;
  }
};

httpserver.listen(3000, () => console.log('My server is listening on port 3000'));

//when a legit websocket request comes listen to it and get the connection .. once you get a connection thats it!
websocket.on('request', request => {
  const con = request.accept(null, request.origin);
  con.on('open', () => console.log('opened'));
  con.on('close', () => console.log('CLOSED!!!'));
  con.on('message', message => {
    //publish the message to redis
    console.log(`${APPID} Received message ${message.utf8Data}`);
    try {
      console.log('Publishing message.');
      publisher.publish(redisChannel, message.utf8Data);
    } catch (error) {
      console.log(error);
    }
  });

  setTimeout(() => con.send(`Connected successfully to server ${APPID}`), 3000);
  connections.push(con);
});

async function initRedisClient() {
  console.log('Initializing Redis client.');

  await client.connect();
  subscriber = client.duplicate();
  publisher = redis.createClient({
    url,
  });

  await subscriber.connect();
  await publisher.connect();

  await subscriber.subscribe(redisChannel, message => {
    console.log(`Server ${APPID} received message in channel ${redisChannel} msg: ${message}`);
    connections.forEach(c => c.send(APPID + ':' + message));
  });
}
