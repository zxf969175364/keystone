var _ = require('lodash');
var fs = require('fs');
var assign = require('object-assign');
var keystone = require('../../../');
var FieldType = require('../Type');
var grappling = require('grappling-hook');
var moment = require('moment');
var util = require('util');
var utils = require('keystone-utils');
var ALY = require('aliyun-sdk');

/**
 * localfile FieldType Constructor
 * @extends Field
 * @api public
 */
function ossimage(list, path, options) {
	grappling.mixin(this).allowHooks('pre:upload');

	this._underscoreMethods = ['format', 'uploadFile'];
	this._fixedSize = 'full';
	options.nofilter = true;
	this.oss = new ALY.OSS(utils.options({
		accessKeyId: keystone.get('oss-access-key'),
		secretAccessKey: keystone.get('oss-secret-key'),
		endpoint: "http://oss-cn-beijing.aliyuncs.com",
		apiVersion: '2013-10-15'
	}, options.oss_config));

	if (options.initial) {
		throw new Error('Invalid Configuration\n\n'
			+ 'OSS fields (' + list.key + '.' + path + ') do not currently support being used as initial fields.\n');
	}

	ossimage.super_.call(this, list, path, options);


	// Allow hook into before and after
	if (options.pre && options.pre.upload) {
		this.pre('upload', options.pre.upload);
	}

}
ossimage.properName = 'OssImage';
util.inherits(ossimage, FieldType);

/**
 * Registers the field on the List's Mongoose Schema.
 *
 * @api public
 */
ossimage.prototype.addToSchema = function () {

	var field = this;
	var schema = this.list.schema;

	var paths = this.paths = {
		// fields
		filename: this._path.append('.filename'),
		originalname: this._path.append('.originalname'),
		dir: this._path.append('.dir'),
		size: this._path.append('.size'),
		filetype: this._path.append('.filetype'),
		url: this._path.append('.url'),
		// virtuals
		exists: this._path.append('.exists'),
		upload: this._path.append('_upload'),
		action: this._path.append('_action'),
	};

	var schemaPaths = this._path.addTo({}, {
		filename: String,
		originalname: String,
		dir: String,
		size: Number,
		filetype: String,
		url: String,
	});

	schema.add(schemaPaths);

	// exists checks for a matching file at run-time
	var exists = function (item) {
		return item.get(parts.url) ? true : false;
	};

	var reset = function (item) {
		item.set(field.path, {
			filename: '',
			originalname: '',
			dir: '',
			size: 0,
			filetype: '',
			url: '',
		});
	};

	// The .exists virtual indicates whether a file is stored
	schema.virtual(paths.exists).get(function () {
		return schemaMethods.exists.apply(this);
	});

	var schemaMethods = {
		exists: function () {
			return exists(this);
		},
		/**
		 * Resets the value of the field
		 *
		 * @api public
		 */
		reset: function () {
			reset(this);
		},
		/**
		 * Deletes the file from localfile and resets the field
		 *
		 * @api public
		 */
		delete: function () {
			if (exists(this)) {
				this.oss.deleteObject({
					Bucket: this.bucket,
					Key: '/'.join([this.get(paths.dir), this.get(paths.filename)]),
				}, function (err, res) {
					if (err) throw err;
				});
			}
			reset(this);
		},
	};

	_.forEach(schemaMethods, function (fn, key) {
		field.underscoreMethod(key, fn);
	});

	// expose a method on the field to call schema methods
	this.apply = function (item, method) {
		return schemaMethods[method].apply(item, Array.prototype.slice.call(arguments, 2));
	};

	this.bindUnderscoreMethods();
};

/**
 * Formats the field value
 *
 * Delegates to the options.format function if it exists.
 * @api public
 */
ossimage.prototype.format = function (item) {
	if (this.hasFormatter()) {
		return this.options.format(item, item[this.path]);
	}
	return item.get(this.paths.cndurl);
};

/**
 * Detects whether the field has formatter function
 *
 * @api public
 */
ossimage.prototype.hasFormatter = function () {
	return typeof this.options.format === 'function';
};

/**
 * Detects whether the field has been modified
 *
 * @api public
 */
ossimage.prototype.isModified = function (item) {
	return item.isModified(this.paths.cdnurl);
};

/**
 * Validates that a value for this field has been provided in a data object
 *
 * Deprecated
 */
ossimage.prototype.inputIsValid = function (data) { // eslint-disable-line no-unused-vars
													// TODO - how should file field input be validated?
	return true;
};

/**
 * Updates the value for this field in the item from a data object
 *
 * @api public
 */
ossimage.prototype.updateItem = function (item, data, callback) { // eslint-disable-line no-unused-vars
																  // TODO - direct updating of data (not via upload)
	process.nextTick(callback);
};

/**
 * Uploads the file for this field
 */
ossimage.prototype.uploadFile = function (item, file, update, callback) {

	var field = this;
	var endpoint = field.options.oss_config.endpoint ? field.options.oss_config.endpoint : keystone.get('oss-endpoint') ;
	var cdn = field.options.oss_config.cdn ? field.options.oss_config.cdn : keystone.get('oss-cdn');
	var bucket = field.options.oss_config.bucket ? field.options.oss_config.bucket : keystone.get('oss-bucket');
	var dir = field.options.oss_config.dir ? field.options.oss_config.dir : keystone.get('oss-dir');
	var prefix = field.options.oss_config.datePrefix ? moment().format(field.options.oss_config.datePrefix) + '-' : '';
	var filename = prefix + file.name;
	var originalname = file.originalname;
	var filetype = file.mimetype || file.type;

	if (typeof update === 'function') {
		callback = update;
		update = false;
	}

	if (field.options.allowedTypes && _.indexOf(field.options.allowedTypes, filetype) < 0) {
		return callback(new Error('Unsupported File Type: ' + filetype));
	}

	var doUpload = function () {

		if (typeof field.options.oss_config.dir === 'function') {
			dir = field.options.path(item, dir);
		}

		if (typeof field.options.filename === 'function') {
			filename = field.options.filename(item, filename, originalname);
		}

		fs.readFile(file.path, function (err, data) {
			field.oss.putObject({
					Bucket: field.options.oss_config.bucket ? field.options.oss_config.bucket : keystone.get('oss-bucket'),
					Key: dir + '/' + filename,
					Body: data,
					AccessControlAllowOrigin: '',
					ContentType: filetype,
					ContentDisposition: '',
					ContentEncoding: 'utf-8',
					Expires: null
				},
				function (err, data) {
					if (err) return callback(err);
					if (cdn) {
						url = `http://${cdn}/${dir}/${filename}`;
					}
					else if (endpoint && bucket) {
						url = `http://${bucket}.${endpoint}/${dir}/${filename}`;
					}

					var fileData = {
						filename: filename,
						originalname: originalname,
						dir: dir,
						size: file.size,
						filetype: filetype,
						url: url,
					};

					if (update) {
						item.set(field.path, fileData);
					}

					callback(null, fileData);
				});
		})


	};

	this.callHook('pre:upload', item, file, function (err) {
		if (err) return callback(err);
		doUpload();
	});
};

/**
 * Returns a callback that handles a standard form submission for the field
 *
 * Expected form parts are
 * - `field.paths.action` in `req.body` (`clear` or `delete`)
 * - `field.paths.upload` in `req.files` (uploads the file to s3file)
 */
ossimage.prototype.getRequestHandler = function (item, req, paths, callback) {

	var field = this;

	if (utils.isFunction(paths)) {

		callback = paths;
		paths = field.paths;
	} else if (!paths) {
		paths = field.paths;
	}

	callback = callback || function () {
		};

	return function () {

		if (req.body) {
			var action = req.body[paths.action];

			if (/^(delete|reset)$/.test(action)) {
				field.apply(item, action);
			}
		}

		if (req.files && req.files[paths.upload] && req.files[paths.upload].size) {
			return field.uploadFile(item, req.files[paths.upload], true, callback);
		}

		return callback();

	};

};

/**
 * Immediately handles a standard form submission for the field (see `getRequestHandler()`)
 */
ossimage.prototype.handleRequest = function (item, req, paths, callback) {
	this.getRequestHandler(item, req, paths, callback)();
};

/* Export Field Type */
module.exports = ossimage;
