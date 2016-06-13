import React from 'react';
import { findDOMNode } from 'react-dom';
import moment from 'moment';
import {
	Button,
	Col,
	Form,
	FormField,
	FormInput,
	ResponsiveText,
	Row,
	Spinner,
} from 'elemental';
import { Fields } from 'FieldTypes';

import AlertMessages from '../../../shared/AlertMessages';
import ConfirmationDialog from './../../../shared/ConfirmationDialog';

import FormHeading from './FormHeading';
import AltText from './AltText';
import FooterBar from './FooterBar';
import InvalidFieldType from '../../../shared/InvalidFieldType';

import { deleteItem } from '../actions';

import { upcase } from '../../../../utils/string';

function getNameFromData (data) {
	if (typeof data === 'object') {
		if (typeof data.first === 'string' && typeof data.last === 'string') {
			return data.first + ' ' + data.last;
		} else if (data.id) {
			return data.id;
		}
	}
	return data;
}

var EditForm = React.createClass({
	displayName: 'EditForm',
	propTypes: {
		data: React.PropTypes.object,
		list: React.PropTypes.object,
	},
	getInitialState () {
		return {
			values: Object.assign({}, this.props.data.fields),
			confirmationDialog: null,
			loading: false,
			lastValues: null, // used for resetting
		};
	},
	getFieldProps (field) {
		const props = Object.assign({}, field);
		const alerts = this.state.alerts;
		// Display validation errors inline
		if (alerts && alerts.error && alerts.error.error === 'validation errors') {
			if (alerts.error.detail[field.path]) {
				// NOTE: This won't work yet, as ElementalUI doesn't allow
				// passed in isValid, only invalidates via internal state.
				// PR to fix that: https://github.com/elementalui/elemental/pull/149
				props.isValid = false;
			}
		}
		props.value = this.state.values[field.path];
		props.values = this.state.values;
		props.onChange = this.handleChange;
		props.mode = 'edit';
		return props;
	},
	handleChange (event) {
		const values = Object.assign({}, this.state.values);

		values[event.path] = event.value;
		this.setState({ values });
	},
	confirmReset (event) {
		const confirmationDialog = (
			<ConfirmationDialog
				isOpen
				body={`Reset your changes to <strong>${this.props.data.name}</strong>?`}
				confirmationLabel="Reset"
				onCancel={this.removeConfirmationDialog}
				onConfirmation={this.handleReset}
			/>
		);
		event.preventDefault();
		this.setState({ confirmationDialog });
	},
	handleReset () {
		this.setState({
			values: Object.assign({}, this.state.lastValues || this.props.data.fields),
			confirmationDialog: null,
		});
	},
	confirmDelete () {
		const confirmationDialog = (
			<ConfirmationDialog
				isOpen
				body={`是否删除 <strong>${this.props.data.name}?</strong><br /><br />这个操作将不可恢复.`}
				confirmationLabel="删除"
				onCancel={this.removeConfirmationDialog}
				onConfirmation={this.handleDelete}
			/>
		);
		this.setState({ confirmationDialog });
	},
	handleDelete () {
		const { data } = this.props;
		this.props.dispatch(deleteItem(data.id, this.props.router));
	},
	handleKeyFocus () {
		const input = findDOMNode(this.refs.keyOrIdInput);
		input.select();
	},
	removeConfirmationDialog () {
		this.setState({
			confirmationDialog: null,
		});
	},
	updateItem () {
		const { data, list } = this.props;
		const editForm = this.refs.editForm;
		const formData = new FormData(editForm);

		// Show loading indicator
		this.setState({
			loading: true,
		});

		list.updateItem(data.id, formData, (err, data) => {
			// TODO: implement smooth scolling
			scrollTo(0, 0); // Scroll to top
			if (err) {
				this.setState({
					alerts: {
						error: err,
					},
					loading: false,
				});
			} else {
				// Success, display success flash messages, replace values
				// TODO: Update key value
				this.setState({
					alerts: {
						success: {
							success: '修改保存成功',
						},
					},
					lastValues: this.state.values,
					values: data.fields,
					loading: false,
				});
			}
		});
	},
	renderKeyOrId () {
		var className = 'EditForm__key-or-id';
		var list = this.props.list;

		if (list.nameField && list.autokey && this.props.data[list.autokey.path]) {
			return (
				<div className={className}>
					<AltText
						component="span"
						title="按住 <alt> 查看ID"
						modifiedLabel="ID:"
						modifiedValue={null}
						normalLabel={`${upcase(list.autokey.path)}: `}
						normalValue={null}
						className="EditForm__key-or-id__label" />
					<AltText
						component="span"
						title="按住 <alt> 查看ID"
						modifiedLabel=""
						modifiedValue={<input ref="keyOrIdInput" onFocus={this.handleKeyFocus} value={this.props.data.id} className="EditForm__key-or-id__input" readOnly />}
						normalLabel={null}
						normalValue={<input ref="keyOrIdInput" onFocus={this.handleKeyFocus} value={this.props.data[list.autokey.path]} className="EditForm__key-or-id__input" readOnly />}
						className="EditForm__key-or-id__field" />
				</div>
			);
		} else if (list.autokey && this.props.data[list.autokey.path]) {
			return (
				<div className={className}>
					<span className="EditForm__key-or-id__label">{list.autokey.path}: </span>
					<div className="EditForm__key-or-id__field">
						<input ref="keyOrIdInput" onFocus={this.handleKeyFocus} value={this.props.data[list.autokey.path]} className="EditForm__key-or-id__input" readOnly />
					</div>
				</div>
			);
		} else if (list.nameField) {
			return (
				<div className={className}>
					<span className="EditForm__key-or-id__label">ID: </span>
					<div className="EditForm__key-or-id__field">
						<input ref="keyOrIdInput" onFocus={this.handleKeyFocus} value={this.props.data.id} className="EditForm__key-or-id__input" readOnly />
					</div>
				</div>
			);
		}
	},
	renderNameField () {
		var nameField = this.props.list.nameField;
		var nameIsEditable = this.props.list.nameIsEditable;
		var wrapNameField = field => (
			<div className="EditForm__name-field">
				{field}
			</div>
		);
		if (nameIsEditable) {
			var nameFieldProps = this.getFieldProps(nameField);
			nameFieldProps.label = null;
			nameFieldProps.size = 'full';
			nameFieldProps.inputProps = {
				className: 'item-name-field',
				placeholder: nameField.label,
				size: 'lg',
			};
			return wrapNameField(
				React.createElement(Fields[nameField.type], nameFieldProps)
			);
		} else {
			return wrapNameField(
				<h2>{this.props.data.name || '(无名称)'}</h2>
			);
		}
	},
	renderFormElements () {
		var headings = 0;

		return this.props.list.uiElements.map((el) => {
			if (el.type === 'heading') {
				headings++;
				el.options.values = this.state.values;
				el.key = 'h-' + headings;
				return React.createElement(FormHeading, el);
			}

			if (el.type === 'field') {
				var field = this.props.list.fields[el.field];
				var props = this.getFieldProps(field);
				if (typeof Fields[field.type] !== 'function') {
					return React.createElement(InvalidFieldType, { type: field.type, path: field.path, key: field.path });
				}
				if (props.dependsOn) {
					props.currentDependencies = {};
					Object.keys(props.dependsOn).forEach(dep => {
						props.currentDependencies[dep] = this.state.values[dep];
					});
				}
				props.key = field.path;
				return React.createElement(Fields[field.type], props);
			}
		}, this);
	},
	renderFooterBar () {
		var buttons = [
			<Button
				key="save"
				type="primary"
				disabled={this.state.loading}
				onClick={() => this.updateItem()}
			>
				{this.state.loading ? (
					<span>
						<Spinner type="inverted" />
						&nbsp;保存中
					</span>
				) : (
					'保存'
				)}
			</Button>,
		];
		buttons.push(
			<Button key="reset" onClick={this.confirmReset} type="link-cancel">
				<ResponsiveText hiddenXS="重置修改" visibleXS="重置" />
			</Button>
		);
		if (!this.props.list.nodelete) {
			buttons.push(
				<Button key="del" onClick={this.confirmDelete} type="link-delete" className="u-float-right">
					<ResponsiveText hiddenXS={`删除 ${this.props.list.singular.toLowerCase()}`} visibleXS="删除" />
				</Button>
			);
		}
		return (
			<FooterBar className="EditForm__footer">
				{buttons}
			</FooterBar>
		);
	},
	renderTrackingMeta () {
		if (!this.props.list.tracking) return null;

		var elements = [];
		var data = {};

		if (this.props.list.tracking.createdAt) {
			data.createdAt = this.props.data.fields[this.props.list.tracking.createdAt];
			if (data.createdAt) {
				elements.push(
					<FormField key="createdAt" label="创建于">
						<FormInput noedit title={moment(data.createdAt).format('DD/MM/YYYY h:mm:ssa')}>{moment(data.createdAt).format('DD MMM YYYY')}</FormInput>
					</FormField>
				);
			}
		}

		if (this.props.list.tracking.createdBy) {
			data.createdBy = this.props.data.fields[this.props.list.tracking.createdBy];
			if (data.createdBy && data.createdBy.name) {
				let createdByName = getNameFromData(data.createdBy.name);
				if (createdByName) {
					elements.push(
						<FormField key="createdBy" label="创建于">
							<FormInput noedit>{data.createdBy.name.first} {data.createdBy.name.last}</FormInput>
						</FormField>
					);
				}
			}
		}

		if (this.props.list.tracking.updatedAt) {
			data.updatedAt = this.props.data.fields[this.props.list.tracking.updatedAt];
			if (data.updatedAt && (!data.createdAt || data.createdAt !== data.updatedAt)) {
				elements.push(
					<FormField key="updatedAt" label="更新于">
						<FormInput noedit title={moment(data.updatedAt).format('DD/MM/YYYY h:mm:ssa')}>{moment(data.updatedAt).format('DD MMM YYYY')}</FormInput>
					</FormField>
				);
			}
		}

		if (this.props.list.tracking.updatedBy) {
			data.updatedBy = this.props.data.fields[this.props.list.tracking.updatedBy];
			if (data.updatedBy && data.updatedBy.name) {
				let updatedByName = getNameFromData(data.updatedBy.name);
				if (updatedByName) {
					elements.push(
						<FormField key="updatedBy" label="更新于">
							<FormInput noedit>{data.updatedBy.name.first} {data.updatedBy.name.last}</FormInput>
						</FormField>
					);
				}
			}
		}

		return Object.keys(elements).length ? (
			<div className="EditForm__meta">
				<h3 className="form-heading">元数据</h3>
				{elements}
			</div>
		) : null;
	},
	render () {
		return (
			<form ref="editForm" method="post" encType="multipart/form-data" className="EditForm-container">
				{(this.state.alerts) ? <AlertMessages alerts={this.state.alerts} /> : null}
				<Row>
					<Col lg="3/4">
						<Form type="horizontal" className="EditForm" component="div">
							<input type="hidden" name="action" value="updateItem" />
							<input type="hidden" name={Keystone.csrf.key} value={Keystone.csrf.value} />
							{this.renderNameField()}
							{this.renderKeyOrId()}
							{this.renderFormElements()}
							{this.renderTrackingMeta()}
						</Form>
					</Col>
					<Col lg="1/4"><span /></Col>
				</Row>
				{this.renderFooterBar()}
				{this.state.confirmationDialog}
			</form>
		);
	},
});

module.exports = EditForm;
