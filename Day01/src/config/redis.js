const { createClient } = require("redis");

const redisclient = createClient({
  username: "default",
  password: process.env.REDIS_PASS,
  socket: {
    host: "redis-17762.crce263.ap-south-1-1.ec2.cloud.redislabs.com",
    port: 17762,
  },
});
module.exports = redisclient;
