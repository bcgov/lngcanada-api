'use strict';

var app = require('express')();
var fs = require('fs');
var uploadDir = process.env.UPLOAD_DIRECTORY || './uploads/';
var hostname = process.env.API_HOSTNAME || 'localhost:3000';
var swaggerTools = require('swagger-tools');
var YAML = require('yamljs');
var swaggerConfig = YAML.load('./api/swagger/swagger.yaml');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');

// winston logger needs to be created before any local classes (that use the logger) are loaded.
const winston = require('winston');
const defaultLog = winston.loggers.add('default', {
  transports: [new winston.transports.Console({ level: 'silly', handleExceptions: true })]
});

var auth = require('./api/helpers/auth');

var dbConnection =
  'mongodb://' +
  (process.env.MONGODB_SERVICE_HOST || process.env.DB_1_PORT_27017_TCP_ADDR || 'localhost') +
  '/' +
  (process.env.MONGODB_DATABASE || 'nrts-dev');
var db_username = process.env.MONGODB_USERNAME || '';
var db_password = process.env.MONGODB_PASSWORD || '';

// Increase postbody sizing
app.use(bodyParser.json({ limit: '10mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Enable CORS
app.use(function(req, res, next) {
  defaultLog.info(req.method, req.url);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization,responseType');
  res.setHeader('Access-Control-Expose-Headers', 'x-total-count');
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.setHeader('Expires', '-1');
  res.setHeader('Pragma', 'no-cache');
  next();
});

// Dynamically set the hostname based on what environment we're in.
swaggerConfig.host = hostname;

// Swagger UI needs to be told that we only serve https in Openshift
if (hostname !== 'localhost:3000') {
  swaggerConfig.schemes = ['https'];
}

swaggerTools.initializeMiddleware(swaggerConfig, function(middleware) {
  app.use(middleware.swaggerMetadata());

  // TODO: Fix this
  // app.use(middleware.swaggerValidator({ validateResponse: false}));

  app.use(
    middleware.swaggerSecurity({
      Bearer: auth.verifyToken
    })
  );

  var routerConfig = {
    controllers: './api/controllers',
    useStubs: false
  };

  app.use(middleware.swaggerRouter(routerConfig));

  app.use(middleware.swaggerUi({ apiDocs: '/api/docs', swaggerUi: '/api/docs' }));

  // Make sure uploads directory exists
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
  } catch (e) {
    // Fall through - uploads will continue to fail until this is resolved locally.
    defaultLog.info("Couldn't create upload folder:", e);
  }
  // Load up DB
  var options = {
    user: db_username,
    pass: db_password,
    reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
    reconnectInterval: 500, // Reconnect every 500ms
    poolSize: 10, // Maintain up to 10 socket connections
    // If not connected, return errors immediately rather than waiting for reconnect
    bufferMaxEntries: 0,
    connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    useNewUrlParser: true,
    useCreateIndex: true
  };
  defaultLog.info('Connecting to:', dbConnection);
  mongoose.Promise = global.Promise;
  mongoose.connect(encodeURI(dbConnection), options).then(
    () => {
      defaultLog.info('Database connected');

      // Load database models
      defaultLog.info('loading db models.');
      require('./api/helpers/models/user');
      require('./api/helpers/models/application');
      require('./api/helpers/models/feature');
      require('./api/helpers/models/document');
      require('./api/helpers/models/comment');
      require('./api/helpers/models/commentperiod');
      require('./api/helpers/models/decision');
      require('./api/helpers/models/review');
      defaultLog.info('db model loading done.');

      app.listen(3000, '0.0.0.0', function() {
        defaultLog.info('Started server on port 3000');
      });
    },
    err => {
      defaultLog.info('err:', err);
      return;
    }
  );
});
