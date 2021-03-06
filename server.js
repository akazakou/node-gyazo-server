
// создаем объект оперирущий доступными сервисами
var cluster = require('cluster'),
    config = require('config'),
    serviceLoaderLib = require(__dirname + '/services/ServiceLocator');

// Переоределение временных зон
process.env.TZ = config.get('server.timezone');

// инициализация глобальных переменных
moment = require('moment');
util = require('util');
serviceLoader = new serviceLoaderLib(config.get('services'));

if (config.get('server.cluster') && cluster.isMaster) {
    
    // запуск иницализации сервисов
    serviceLoader.init();
    
    logger.log('info', "Controlling cluster service started");
    
    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    serviceLoader.on('initialized', function(){
        // Create a worker for each CPU
        for (var i = 0; i < cpuCount; i += 1) {
            cluster.fork();
            logger.log('debug', "Runing cluster worker");
        }
    });
    
    // Listen for dying workers
    cluster.on('exit', function (worker) {
        logger.log('error','Worker ' + worker.id + ' died');
        cluster.fork();
    });
    
} else {
    var express = require('express'),
        session = require('express-session'),
        bodyParser = require('body-parser'),
        multipart = require('connect-multiparty'),
        expressWinston = require('express-winston'),
        autoroute = require('express-autoroute'),
        twig = require("twig"),
        app = express();
    
    // парсинг параметров из json и post
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(multipart());
    app.use(bodyParser.json());

    // поддержка обработки Session
    var excludedPaths = ['/upload.cgi'];
    var sessionMiddleware = session({
        secret: config.get('server.session.secretKey'),
        name: "sid",
        cookie: {maxAge: 1000 * 3600 * 24 * 365 * 10}
    });
    app.use(function (req, res, next) {
        if (excludedPaths.indexOf(req.url) >= 0) return next();
        sessionMiddleware(req, res, next);
    });
    
    // подключение Twig шаблонизатора
    app.set('views', __dirname + '/views');
    app.set('view engine', 'twig');

    // This section is optional and can be used to configure twig.
    app.set('twig options', { 
        strict_variables: false
    });
    
    // определение автоматических роутов
    autoroute(app, {
        throwErrors: true,
        logger: require('winston'),
        routesDir: __dirname + '/routes'
    });

    // переопределяем максимальное количество одновременных запросов к сервису
    var http = require('http');
    http.globalAgent.maxSockets = config.get('server.maxSockets');

    // инициализация загрузчика сервсов
    serviceLoader.on('initialized', function(){
        app.use(expressWinston.logger({winstonInstance: serviceLoader.get('Logs').access}));
        app.use(expressWinston.errorLogger({winstonInstance: serviceLoader.get('Logs').error}));
        app.listen(config.get('server.port'));

        logger.log('info', "HTTP Server runing on port " + config.get('server.port'));
    });

    // запуск иницализации сервисов
    serviceLoader.init();
}

