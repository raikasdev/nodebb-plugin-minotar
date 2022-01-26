"use strict";

var user = require.main.require('./src/user'),
	meta = require.main.require('./src/meta'),
	winston = require.main.require('winston'),
	async = require('async'),

	controllers = require('./lib/controllers'),
	plugin = {};

plugin.init = function(params, callback) {
	var router = params.router,
		hostMiddleware = params.middleware;
		
	router.get('/admin/plugins/minotar', hostMiddleware.admin.buildHeader, controllers.renderAdminPage);
	router.get('/api/admin/plugins/minotar', controllers.renderAdminPage);

	meta.settings.get('minotar', function(err, settings) {
		if (err) {
			winston.error('[plugin/minotar] Could not retrieve plugin settings! Using defaults.');
			plugin.settings = {
				default: false,
				force: false
			};
			return;
		}

		plugin.settings = settings;
	});

	callback();
};

plugin.addAdminNavigation = function(header, callback) {
	header.plugins.push({
		route: '/plugins/minotar',
		icon: 'fa-picture',
		name: 'Minotar'
	});

	callback(null, header);
};

plugin.list = function(data, callback) {
	user.getUserFields(data.uid, ['email', 'username'], function(err, userData) {
		data.pictures.push({
			type: 'minotar',
			url: getMinotarUrl(userData.username),
			text: 'Minotar'
		});

		callback(null, data);
	});
};

plugin.get = function(data, callback) {
	if (data.type === 'minotar') {
		user.getUserFields(data.uid, ['email', 'username'], function(err, userData) {
			data.picture = getMinotarUrl(userData.username);
			callback(null, data);
		});
	} else {
		callback(null, data);
	}
};

plugin.updateUser = function(data, callback) {
	if (plugin.settings.default === 'on') {
		winston.verbose('[plugin/minotar] Updating uid ' + data.user.uid + ' to use minotar');
		data.user.picture = getMinotarUrl(data.user.username);
		callback(null, data);
	} else {
		// No transformation
		callback(null, data);
	}
};

plugin.onForceEnabled = function(users, callback) {
	if (plugin.hasOwnProperty('settings') && plugin.settings.force === 'on') {
		async.map(users, function(userObj, next) {
			if (!userObj) {
				return next(null, userObj);
			}

			userObj.picture = getMinotarUrl(userObj.username);
			next(null, userObj);
		}, callback);
	} else if (plugin.hasOwnProperty('settings') && plugin.settings.default === 'on') {
		async.map(users, function(userObj, next) {
			if (!userObj) {
				return next(null, userObj);
			}

			if (userObj.picture === null || userObj.picture === '') {
				userObj.picture = getMinotarUrl(userObj.username);
				next(null, userObj);
			} else {
				setImmediate(next, null, userObj);
			}
		}, callback);
	} else {
		// No transformation
		callback(null, users);
	}
}

function getMinotarUrl(username) {
	var size = parseInt(meta.config.profileImageDimension, 10) || 128;

	return 'https://minotar.net/avatar/' + username + '/' + size;
};

module.exports = plugin;
