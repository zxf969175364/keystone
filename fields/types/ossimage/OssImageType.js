var _ = require('lodash');
var keystone = require('../../../');
var FieldType = require('../Type');
var fs = require('fs-extra');
var grappling = require('grappling-hook');
var moment = require('moment');
var path = require('path');
var util = require('util');
var utils = require('keystone-utils');

/**
 * localfile FieldType Constructor
 * @extends Field
 * @api public
 */
function ossimage (list, path, options) {
	grappling.mixin(this).allowHooks('pre:upload');
	this._underscoreMethods = ['format', 'uploadFile'];
	this._fixedSize = 'full';
	options.nofilter = true;
	this.oss = new ALY.OSS(utils.options({
		accessKeyId: keystone.get('oss-access-key'),
		secretAccessKey: keystone.get('oss-secret-key'),
		endpoint: "http://oss-cn-hangzhou.aliyuncs.com",
		apiVersion: '2013-10-15'
	},options.oss_config));

	if (options.initial) {
		throw new Error('Invalid Configuration\n\n'
			+ 'OSS fields (' + list.key + '.' + path + ') do not currently support being used as initial fields.\n');
	}

	localfile.super_.call(this, list, path, options);

	// validate destination dirs
	if (!this.s3config) {
		throw new Error('Invalid Configuration\n\n'
			+ 'OSS fields (' + list.key + '.' + path + ') require the "s3 config" option to be set.\n\n');
	}

	// Allow hook into before and after
	if (options.pre && options.pre.upload) {
		this.pre('upload', options.pre.upload);
	}

}

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

	var url = function (item) {
		if (this.bucket && this.range && this.filename) {
			return `http://${this.bucket}.${this.range}.aliyuncs.com/${this.dir}/${this.filename}`;
		}
		return '';
	};

	var cdnurl = function (item) {
		if (this.cdn && this.filename) {
			return `http://${this.cdn}/${this.dir}/${this.filename}`;
		}
		return url(item);
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

	schema.virtual(paths.url).get(function () {
		return schemaMethods.url.apply(this);
	});

	schema.virtual(paths.cdnurl).get(function () {
		return schemaMethods.cdnurl.apply(this);
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
					}, function(err, res){
						if(err) throw err;
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
	var endpoint = field.options.endpoint;
	var cdn = field.options.cdn;
	var bucket = field.options.bucket;
	var dir = field.options.dir ? field.options.dir + '/' : '';
	var prefix = field.options.datePrefix ? moment().format(field.options.datePrefix) + '-' : '';
	var filename = prefix + file.name;
	var originalname = file.originalname;
	var filetype = file.mimetype || file.type;

	if (typeof update === 'function') {
		callback = update;
		update = false;
	}

	if (field.options.allowedTypes && !_.contains(field.options.allowedTypes, filetype)) {
		return callback(new Error('Unsupported File Type: ' + filetype));
	}

	var doUpload = function () {

		if (typeof field.options.dir === 'function') {
			dir = field.options.path(item, dir);
		}

		if (typeof field.options.filename === 'function') {
			filename = field.options.filename(item, filename, originalname);
		}

		oss.putObject(_.extends({
				Bucket: field.options.bucket,
				Key: dir + filename,
				Body: file,
				AccessControlAllowOrigin: '',
				ContentType: field.type,
				ContentDisposition: '',
				ContentEncoding: 'utf-8',
				Expires: null
			}, field.options.oss_upload),
			function (err, data) {
				if (err) return callback(err);
				if (cdn) {
					url = `${cdn}/${dir}/${filename}`;
				}
				if (endpoint && bucket) {
					url = `${bucket}.${endpoint}/${dir}/${filename}`;
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

		this.callHook('pre:upload', item, file, function (err) {
			if (err) return callback(err);
			doUpload();
		});
	};
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

	callback = callback || function () {};

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
