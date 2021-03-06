var basic = require('./BasicService'),
    events = require('events');

/**
 * Конструктор класса
 * @param {type} config
 */
var ImagesManager = function (name, config) {
    this.initialized = false;
    this.name = name;
    this.config = config;
    this.dependency = {};

    this.mysql = {};
};

/**
 * Наследуем класс сервис локатора от класса эмитера событий
 * @type events.EventEmitter
 */
util.inherits(ImagesManager, basic);

/**
 * Инициализация сервиса
 */
ImagesManager.prototype.init = function () {
    this._initTimeout();

    this.mysql = serviceLoader.get('Database').connection;

    this.initialized = true;
    this.emit('initialized', this.name, this);
};

/**
 * Получение списка изображений по фильтру
 * @param {object} where
 * @param {function} callback
 */
ImagesManager.prototype.getList = function (where, callback) {
    var self = this;
    var parameters = [this.config.table, where, this.config.limit];
    var sql = 'SELECT * FROM ?? WHERE ? ORDER BY `date` DESC LIMIT ?';
    
    this.mysql.query(sql, parameters, function (err, result) {
        if(err) return logger.log('error', util.format('Service "%s" can not complete query' + "\n" + err.stack, self.name));
        if(callback !== undefined) callback(result);
    });
};

/**
 * Удаление информации из базы данных
 * @param {object} where
 * @param {function} callback
 */
ImagesManager.prototype.delete = function (md5, owner, callback) {
    var sql = 'DELETE FROM ?? WHERE md5 = ? AND owner = ?';
    this.mysql.query(sql, [this.config.table, md5, owner], function (err, result) {
        if(err) throw err;
        if(callback !== undefined) callback(result);
    });
};

/**
 * Продление жизни файла на определенный срок
 * @param {string} md5
 * @param {function} callback
 */
ImagesManager.prototype.lifeup = function (md5, callback) {
    var sql = 'UPDATE ?? SET `lifetime` = DATE_ADD(NOW(), INTERVAL 1 MONTH) WHERE ?';
    this.mysql.query(sql, [this.config.table, {"md5":md5}], function (err, result) {
        if(err) throw err;
        if(callback !== undefined) callback(result);
    });
};

/**
 * Связывание загруженного изображения без владельца с его владельцем
 * @param {type} md5
 * @param {type} owner
 * @param {type} callback
 * @returns {undefined}
 */
ImagesManager.prototype.connectOwner = function (md5, owner, callback) {
    var sql = 'UPDATE ?? SET ? WHERE ?';
    var data = [this.config.table, {"owner":owner}, {"md5":md5}];
    
    this.mysql.query(sql, data, function (err, result) {
        if(err) throw err;
        if(callback !== undefined) callback(result);
    });
};

module.exports = ImagesManager;