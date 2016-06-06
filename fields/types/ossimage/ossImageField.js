import xhr from 'xhr';
import React from 'react';
import ReactDOM from 'react-dom';
import Field from '../Field';
import Select from 'react-select';
import { Button, FormField, FormInput, FormNote } from 'elemental';
import Lightbox from '../../components/Lightbox';
import classnames from 'classnames';


const SUPPORTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

const iconClassUploadPending = [
	'upload-pending',
	'mega-octicon',
	'octicon-cloud-upload',
];

const iconClassDeletePending = [
	'delete-pending',
	'mega-octicon',
	'octicon-x',
];

module.exports = Field.create({

	displayName: 'OssImageField',

	openLightbox (index) {
		event.preventDefault();
		this.setState({
			lightboxIsVisible: true,
			lightboxImageIndex: index,
		});
	},

	closeLightbox () {
		this.setState({
			lightboxIsVisible: false,
			lightboxImageIndex: null,
		});
	},

	renderLightbox () {
		const { value } = this.props;
		if (!value || !Object.keys(value).length) return;

		const images = [value.url];

		return (
			<Lightbox
				images={images}
				initialImage={this.state.lightboxImageIndex}
				isOpen={this.state.lightboxIsVisible}
				onCancel={this.closeLightbox}
			/>
		);
	},

	fileFieldNode () {
		return ReactDOM.findDOMNode(this.refs.fileField);
	},

	changeImage () {
		this.fileFieldNode().click();
	},

	getImageSource () {
		if (this.hasLocal()) {
			return this.state.localSource;
		} else if (this.hasExisting()) {
			return this.props.value.url;
		} else {
			return null;
		}
	},

	getImageURL () {
		if (!this.hasLocal() && this.hasExisting()) {
			return this.props.value.url;
		}
	},

	/**
	 * Reset origin and removal.
	 */
	undoRemove () {
		this.fileFieldNode().value = '';
		this.setState({
			removeExisting: false,
			localSource: null,
			origin: false,
			action: null,
		});
	},

	/**
	 * Check support for input files on input change.
	 */
	fileChanged (event) {
		var self = this;

		if (window.FileReader) {
			var files = event.target.files;
			Array.prototype.forEach.call(files, function (f) {
				if (SUPPORTED_TYPES.indexOf(f.type) === -1) {
					self.removeImage();
					alert('不支持的文件格式. 支持的文件格式有: PNG, JPG');
					return false;
				}

				var fileReader = new FileReader();
				fileReader.onload = function (e) {
					if (!self.isMounted()) return;
					self.setState({
						localSource: e.target.result,
						origin: 'local'
					});
				};
				fileReader.readAsDataURL(f);
			});
		} else {
			this.setState({
				origin: 'local'
			});
		}
	},

	/**
	 * If we have a local file added then remove it and reset the file field.
	 */
	removeImage  (e) {
		var state = {
			localSource: null,
			origin: false,
		};

		if (this.hasLocal()) {
			this.fileFieldNode().value = '';
		} else if (this.hasExisting()) {
			state.removeExisting = true;

			if (this.props.autoCleanup) {
				if (e.altKey) {
					state.action = 'reset';
				} else {
					state.action = 'delete';
				}
			} else {
				if (e.altKey) {
					state.action = 'delete';
				} else {
					state.action = 'reset';
				}
			}
		}

		this.setState(state);
	},

	/**
	 * Is the currently active image uploaded in this session?
	 */
	hasLocal () {
		return this.state.origin === 'local';
	},

	/**
	 * Do we have an image preview to display?
	 */
	hasImage () {
		return this.hasExisting() || this.hasLocal();
	},

	/**
	 * Do we have an existing file?
	 */
	hasExisting () {
		return !!this.props.value.url;
	},

	/**
	 * Render an image preview
	 */
	renderImagePreview () {
		var iconClassName;
		var className = ['image-preview'];

		if (this.hasLocal()) {
			iconClassName = classnames(iconClassUploadPending);
		} else if (this.state.removeExisting) {
			className.push(' removed');
			iconClassName = classnames(iconClassDeletePending);
		}
		className = classnames(className);

		var body = [this.renderImagePreviewThumbnail()];
		if (iconClassName) body.push(<div key={this.props.path + '_preview_icon'} className={iconClassName} />);

		var url = this.getImageURL();

		if (url) {
			body = <a className="img-thumbnail" href={this.getImageURL()} onClick={this.openLightbox.bind(this, 0)} target="__blank">{body}</a>;
		} else {
			body = <div className="img-thumbnail">{body}</div>;
		}

		return <div key={this.props.path + '_preview'} className={className}>{body}</div>;
	},

	renderImagePreviewThumbnail () {
		var url = this.getImageURL();

		if (url) {
			// add cloudinary thumbnail parameters to the url
			url = url.replace(/image\/upload/, 'image/upload/c_thumb,g_face,h_90,w_90');
		} else {
			url = this.getImageSource();
		}

		return <img key={this.props.path + '_preview_thumbnail'} className="img-load" style={{ height: '90' }} src={url} />;
	},

	/**
	 * Render image details - leave these out if we're uploading a local file or
	 * the existing file is to be removed.
	 */
	renderImageDetails  (add) {
		var values = null;

		if (!this.hasLocal() && !this.state.removeExisting) {
			values = (
				<div className="image-values">
					<FormInput noedit>{this.props.value.url}</FormInput>
					{/*
						TODO: move this somewhere better when appropriate
						this.renderImageDimensions()
					*/}
				</div>
			);
		}

		return (
			<div key={this.props.path + '_details'} className="image-details">
				{values}
				{add}
			</div>
		);
	},

	renderImageDimensions () {
		return <FormInput noedit>{this.props.value.width} x {this.props.value.height}</FormInput>;
	},

	/**
	 * Render an alert.
	 *
	 *  - On a local file, output a "to be uploaded" message.
	 *  - On a cloudinary file, output a "from cloudinary" message.
	 *  - On removal of existing file, output a "save to remove" message.
	 */
	renderAlert () {
		if (this.hasLocal()) {
			return (
				<FormInput noedit>选择图片 - 保存后上传</FormInput>
			);
		} else if (this.state.origin === 'cloudinary') {
			return (
				<FormInput noedit>Image selected from Cloudinary</FormInput>
			);
		} else if (this.state.removeExisting) {
			return (
				<FormInput noedit>图片{this.props.autoCleanup ? '删除' : '移除'} - 是否保存</FormInput>
			);
		} else {
			return null;
		}
	},

	/**
	 * Output clear/delete/remove button.
	 *
	 *  - On removal of existing image, output "undo remove" button.
	 *  - Otherwise output Cancel/Delete image button.
	 */
	renderClearButton () {
		if (this.state.removeExisting) {
			return (
				<Button type="link" onClick={this.undoRemove}>
					撤销删除
				</Button>
			);
		} else {
			var clearText;
			if (this.hasLocal()) {
				clearText = '取消';
			} else {
				clearText = (this.props.autoCleanup ? '删除图片' : '移除图片');
			}
			return (
				<Button type="link-cancel" onClick={this.removeImage}>
					{clearText}
				</Button>
			);
		}
	},

	renderFileField () {
		return <input ref="fileField" type="file" name={this.props.paths.upload} className="field-upload" onChange={this.fileChanged} tabIndex="-1" />;
	},

	renderFileAction () {
		return <input type="hidden" name={this.props.paths.action} className="field-action" value={this.state.action} />;
	},

	renderImageToolbar () {
		return (
			<div key={this.props.path + '_toolbar'} className="image-toolbar">
				<div className="u-float-left">
					<Button onClick={this.changeImage}>
						{this.hasImage() ? '修改' : '上传'} 图片
					</Button>
					{this.hasImage() && this.renderClearButton()}
				</div>
				{this.props.select && this.renderImageSelect()}
			</div>
		);
	},

	renderImageSelect () {
		var selectPrefix = this.props.selectPrefix;
		var self = this;
		var getOptions = function (input, callback) {

			// build our url, accounting for selectPrefix
			var uri = Keystone.adminPath + '/api/cloudinary/autocomplete';
			if (selectPrefix) {
				uri = uri + '?prefix=' + selectPrefix;
			}

			// make the request
			xhr({
				body: JSON.stringify({
					q: input,
				}),
				uri: uri,
				headers: {
					'Content-Type': 'application/json',
				},
			}, function (err, resp, body) {

				// callback with err
				if (err) {
					callback(null, {
						options: [],
						complete: false,
					});
					return;
				}

				// try and parse the response
				try {
					var data = JSON.parse(body);
					var options = [];

					data.items.forEach(function (item) {
						options.push({
							value: item.public_id,
							label: item.public_id,
						});
					});
					callback(null, {
						options: options,
						complete: true,
					});
				} catch (e) {
					callback(null, {
						options: [],
						complete: false,
					});
				}
			});
		};

		// listen for changes
		var onChange = function onChange (data) {
			if (data && data.value) {
				self.setState({ selectedCloudinaryImage: data.value });
			} else {
				self.setState({ selectedCloudinaryImage: null });
			}
		};

		return (
			<div className="image-select">
				<Select.Async
					placeholder="Search for an image from Cloudinary ..."
					name={this.props.paths.select}
					value={this.state.selectedCloudinaryImage}
					onChange={onChange}
					id={'field_' + this.props.paths.select}
					loadOptions={getOptions}
				/>
			</div>
		);
	},

	renderNote () {
		if (!this.props.note) return null;
		return <FormNote note={this.props.note} />;
	},

	renderUI () {
		var container = [];
		var body = [];
		var hasImage = this.hasImage();

		if (this.shouldRenderField()) {
			if (hasImage) {
				container.push(this.renderImagePreview());
				container.push(this.renderImageDetails(this.renderAlert()));
			}
			body.push(this.renderImageToolbar());
		} else {
			if (hasImage) {
				container.push(this.renderImagePreview());
				container.push(this.renderImageDetails());
			} else {
				container.push(<div className="help-block">没有图片</div>);
			}
		}
		return (
			<FormField label={this.props.label} className="field-type-cloudinaryimage" htmlFor={this.props.path}>
				{this.renderFileField()}
				{this.renderFileAction()}
				<div className="image-container">{container}</div>
				{body}
				{this.renderNote()}
				{this.renderLightbox()}
			</FormField>
		);
	},
});
