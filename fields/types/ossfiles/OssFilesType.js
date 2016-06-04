/*!
 * Module dependencies.
 */

var fs = require('fs'),
	path = require('path'),
	_ = require('underscore'),
	moment = require('moment'),
	keystone = require('../../../'),
	util = require('util'),
	utils = require('keystone-utils'),
	super_ = require('../Type'),
	ALY = require('aliyun-sdk'),
	async = require('async');

/**
 * ossfiles FieldType Constructor
 * @extends Field
 * @api public
 */

function ossfiles(list, path, options) {

	this.oss = new ALY.OSS(utils.options({
		accessKeyId: "",
		secretAccessKey: "",
		endpoint: "http://oss-cn-hangzhou.aliyuncs.com",
		apiVersion: '2013-10-15'
	},options.oss_config));

	this._underscoreMethods = ['format', 'uploadFiles'];
	this._fixedSize = 'full';

	// event queues
	this._pre = {
		move: [] // Before file is moved into final destination
	};

	this._post = {
		move: [] // After file is moved into final destination
	};

	// TODO: implement filtering, usage disabled for now
	options.nofilter = true;

	// TODO: implement initial form, usage disabled for now
	if (options.initial) {
		throw new Error('Invalid Configuration\n\n' +
			'ossfiles fields (' + list.key + '.' + path + ') do not currently support being used as initial fields.\n');
	}

	if (options.overwrite !== false) {
		options.overwrite = true;
	}

	ossfiles.super_.call(this, list, path, options);

	// validate destination dir
	if (!options.oss_config || !options.oss_config.accessKeyId || !options.oss_config.secretAccessKey) {
		throw new Error('Invalid Configuration\n\n' +
			'ossfiles fields (' + list.key + '.' + path + ') require the "oss_config.accessKeyId" and the "oss_config.secretAccessKey" option to be set.');
	}

	// Allow hook into before and after
	if (options.pre && options.pre.move) {
		this._pre.move = this._pre.move.concat(options.pre.move);
	}

	if (options.post && options.post.move) {
		this._post.move = this._post.move.concat(options.post.move);
	}

}

/*!
 * Inherit from Field
 */

util.inherits(ossfiles, super_);


Object.defineProperty(ossfiles.prototype, 'oss_config', { get: function() {
	return this.options.oss_config || keystone.get('oos config');
}});

/**
 * Allows you to add pre middleware after the field has been initialised
 *
 * @api public
 */

ossfiles.prototype.pre = function(event, fn) {
	if (!this._pre[event]) {
		throw new Error('ossfiles (' + this.list.key + '.' + this.path + ') error: ossfiles.pre()\n\n' +
			'Event ' + event + ' is not supported.\n');
	}
	this._pre[event].push(fn);
	return this;
};


/**
 * Allows you to add post middleware after the field has been initialised
 *
 * @api public
 */

ossfiles.prototype.post = function(event, fn) {
	if (!this._post[event]) {
		throw new Error('ossfiles (' + this.list.key + '.' + this.path + ') error: ossfiles.post()\n\n' +
			'Event ' + event + ' is not supported.\n');
	}
	this._post[event].push(fn);
	return this;
};


/**
 * Registers the field on the List's Mongoose Schema.
 *
 * @api public
 */

ossfiles.prototype.addToSchema = function() {

	var field = this,
		schema = this.list.schema;
	var mongoose = keystone.mongoose;

	var paths = this.paths = {
		// fields
		filename:		this._path.append('.filename'),
		path:			  this._path.append('.path'),
		size:			  this._path.append('.size'),
		filetype:		this._path.append('.filetype'),
		url:            this._path.append('.url'),
		// virtuals
		exists:			this._path.append('.exists'),
		upload:			this._path.append('_upload'),
		action:			this._path.append('_action'),
		order: 			this._path.append('_order'),
	};

	var schemaPaths = new mongoose.Schema({
		filename:		String,
		path:			String,
		size:			Number,
		filetype:		String,
		url:            String
	});

	schema.add(this._path.addTo({}, [schemaPaths]));

	var exists = function(item,element_id) {
		return (item.get(field.path) ? true : false);
	};

	// The .exists virtual indicates whether a file is stored
	schema.virtual(paths.exists).get(function() {
		return schemaMethods.exists.apply(this);
	});

	var reset = function(item, element_id) {
		if (typeof element_id === 'undefined') {
			item.set(field.path, []);
		} else {
			var values = item.get(field.path);
			var value = _.findWhere(values, { 'id': element_id });
			if (typeof(value !== 'undefined')) {
				values.splice(values.indexOf(value), 1);
			}
		}
	};

	var schemaMethods = {
		exists: function() {
			return exists(this);
		},
		/**
		 * Resets the value of the field
		 *
		 * @api public
		 */
		reset: function() {
			reset(this);
		},
		/**
		 * Deletes the file from ossfiles and resets the field
		 *
		 * @api public
		 */
		remove: function(element_id) {
			if (exists(this, element_id)) {
				var values = this.get(field.path);
				var value = _.findWhere(values, { 'id': element_id });
				if (typeof value !== 'undefined') {
					field.oss.deleteObject({
						Bucket:field.options.oss_upload.Bucket,
						Key:value.filename
					},function(err,res){
						if(err) throw err;
					});
				}
			}
			reset(this, element_id);
		}
	};

	_.each(schemaMethods, function(fn, key) {
		field.underscoreMethod(key, fn);
	});

	// expose a method on the field to call schema methods
	this.apply = function(item, method) {
		return schemaMethods[method].apply(item, Array.prototype.slice.call(arguments, 2));
	};

	this.bindUnderscoreMethods();
};


/**
 * Formats the field value
 *
 * @api public
 */

ossfiles.prototype.format = function(item, i) {
	if (this.hasFormatter()) {
		return this.options.format(item, item[this.path]);
	}
	return item.get(this.paths.url);
};


/**
 * Detects whether the field has a formatter function
 *
 * @api public
 */

ossfiles.prototype.hasFormatter = function() {
	return 'function' === typeof this.options.format;
};



/**
 * Detects whether the field has been modified
 *
 * @api public
 */

ossfiles.prototype.isModified = function(item) {
	return item.isModified(this.paths.path);
};


/**
 * Validates that a value for this field has been provided in a data object
 *
 * @api public
 */

ossfiles.prototype.validateInput = function(data) {
	// TODO - how should file field input be validated?
	return true;
};


/**
 * Updates the value for this field in the item from a data object
 *
 * @api public
 */

ossfiles.prototype.updateItem = function(item, data) {
	// TODO - direct updating of data (not via upload)
};


/**
 * Uploads the file for this field
 *
 * @api public
 */

ossfiles.prototype.uploadFiles = function(item, files, update, callback) {

	var field = this;

	if ('function' === typeof update) {
		callback = update;
		update = false;
	}

	async.map(files, function(file, processedFile) {

		var prefix = field.options.dir || '',
			filename = prefix + file.name,
			filetype = file.mimetype || file.type;

		if (field.options.allowedTypes && !_.contains(field.options.allowedTypes, filetype)) {
			return processedFile(new Error('Unsupported File Type: ' + filetype));
		}


		var putObject = function(donePut) {

			if ('function' === typeof field.options.filename) {
				filename = field.options.filename(item, filename);
			}


			if(!field.options.oss_upload.Bucket) throw new Error('Please define "oss_upload.Bucket"');
			var baseUrl = field.options.oss_config.endpoint.replace(/\/$/,"");
			var prefix = field.options.oss_upload.Bucket+".";
			var _path = baseUrl.indexOf("://") == -1 ? prefix+baseUrl : baseUrl.replace("://","://"+prefix);
			var url = _path + "/" + filename;

			fs.readFile(file.path, function (err, data) {

				if(err) throw err;

				var options = _.extend({
					Bucket: "",
					Key:filename,
					Body:data,
					ContentType: filetype,
					Expires: null
				},field.options.oss_upload);

				field.oss.putObject(options,function(err,data){
					if(err) throw err;
				});


				var fileData = {
					filename: filename,
					path: _path,
					size: file.size,
					filetype: filetype,
					url:url
				};

				if (update) {
					item.get(field.path).push(fileData);
				}

				donePut(null, fileData);
			});

		};


		async.eachSeries(field._pre.move, function(fn, next) {
			fn(item, file, next);
		}, function(err) {
			if (err) return processedFile(err);

			putObject(function(err, fileData) {
				if (err) return processedFile(err);

				async.eachSeries(field._post.move, function(fn, next) {
					fn(item, file, fileData, next);
				}, function(err) {
					return processedFile(err, fileData);
				});
			});
		});

	}, callback);

};


/**
 * Returns a callback that handles a standard form submission for the field
 *
 * Expected form parts are
 * - `field.paths.action` in `req.body` (`clear` or `delete`)
 * - `field.paths.upload` in `req.files` (uploads the file to ossfiles)
 *
 * @api public
 */

ossfiles.prototype.getRequestHandler = function(item, req, paths, callback) {

	var field = this;

	if (utils.isFunction(paths)) {
		callback = paths;
		paths = field.paths;
	} else if (!paths) {
		paths = field.paths;
	}

	callback = callback || function() {};

	return function() {

		// Order
		if (req.body[paths.order]) {
			var files = item.get(field.path),
				newOrder = req.body[paths.order].split(',');

			files.sort(function(a, b) {
				return (newOrder.indexOf(a._id.toString()) > newOrder.indexOf(b._id.toString())) ? 1 : -1;
			});
		}

		// Removals
		if (req.body && req.body[paths.action]) {
			var actions = req.body[paths.action].split('|');

			actions.forEach(function(action) {

				action = action.split(':');

				var method = action[0],
					ids = action[1];

				if (!(/^(remove|reset)$/.test(method)) || !ids) return;

				ids.split(',').forEach(function(id) {
					field.apply(item, method, id);
				});

			});
		}

		// Upload new files
		if (req.files) {

			var upFiles = req.files[paths.upload];
			if (upFiles) {
				if (!Array.isArray(upFiles)) {
					upFiles = [upFiles];
				}

				if (upFiles.length > 0) {
					upFiles = _.filter(upFiles, function(f) { return typeof f.name !== 'undefined' && f.name.length > 0; });

					if (upFiles.length > 0) {
						console.log('uploading files:');
						console.log(upFiles);
						return field.uploadFiles(item, upFiles, true, callback);
					}
				}
			}
		}

		return callback();
	};

};


/**
 * Immediately handles a standard form submission for the field (see `getRequestHandler()`)
 *
 * @api public
 */

ossfiles.prototype.handleRequest = function(item, req, paths, callback) {
	this.getRequestHandler(item, req, paths, callback)();
};


/*!
 * Export class
 */

exports = module.exports = ossfiles;
