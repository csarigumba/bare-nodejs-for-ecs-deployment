const express = require('express');
const mysql = require('mysql2');
const redis = require('redis');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

const RDS_DB_HOST = 'localhost';
const RDS_DB_USER = 'bp';
const RDS_DB_PASSWORD = 'bp';
const RDS_DB_NAME = 'bp';
const RDS_DB_PORT = '33310';

const REDIS_HOST = 'localhost';
const REDIS_PORT = 6379;

const pool = mysql.createPool({
  host: RDS_DB_HOST,
  user: RDS_DB_USER,
  password: RDS_DB_PASSWORD,
  database: RDS_DB_NAME,
  port: RDS_DB_PORT,
});

const client = redis.createClient({
  host: REDIS_HOST,
  port: REDIS_PORT,
});

const newUUID = uuidv4();
client.connect();

app.get('/health', async (req, res) => {
  const responseObject = {
    server_id: newUUID,
    rds: {},
    redis: {},
  };
  let isRDSConnectionOK = await checkRDSConnection();

  responseObject.rds.host = RDS_DB_HOST;
  responseObject.rds.status = isRDSConnectionOK == true ? 'UP' : 'DOWN';

  let isRedisConnectionOK = await checkRedisConnection();

  responseObject.redis.host = REDIS_HOST;
  responseObject.redis.status = isRedisConnectionOK == true ? 'UP' : 'DOWN';

  res.status(200).json(responseObject);
});

const checkRDSConnection = () => {
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

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
