/**
 * The form that's visible when "Create <ItemName>" is clicked on either the
 * List screen or the Item screen
 */

import React from 'react';
import ReactDOM from 'react-dom';
import AlertMessages from './AlertMessages';
import { Fields } from 'FieldTypes';
import InvalidFieldType from './InvalidFieldType';
import { Button, Form, Modal } from 'elemental';

const CreateForm = React.createClass({
	displayName: 'CreateForm',
	propTypes: {
		err: React.PropTypes.object,
		isOpen: React.PropTypes.bool,
		list: React.PropTypes.object,
		onCancel: React.PropTypes.func,
		onCreate: React.PropTypes.func,
		values: React.PropTypes.object,
	},
	getDefaultProps () {
		return {
			err: null,
			values: {},
			isOpen: false,
		};
	},
	getInitialState () {
		var values = Object.assign({}, this.props.values);

		// Set the field values to their default values when first rendering the
		// form. (If they have a default value, that is)
		Object.keys(this.props.list.fields).forEach(key => {
			var field = this.props.list.fields[key];

			if (!values[field.path]) {
				values[field.path] = field.defaultValue;
			}
		});
		return {
			values: values,
			alerts: {},
		};
	},
	componentDidMount () {
		this.focusTarget();
	},
	componentDidUpdate (prevProps) {
		// If we just opened the modal an animation is playing
		if (this.props.isOpen !== prevProps.isOpen) {
			// focus the focusTarget after the animation has started
			setTimeout(() => {
				this.focusTarget();
			}, 0);
		}
	},
	// Focus the first input field
	focusTarget () {
		if (this.refs.focusTarget) {
			this.refs.focusTarget.focus();
		}
	},
	// Handle input change events
	handleChange (event) {
		var values = Object.assign({}, this.state.values);
		values[event.path] = event.value;
		this.setState({
			values: values,
		});
	},
	// Set the props of a field
	getFieldProps (field) {
		var props = Object.assign({}, field);
		props.value = this.state.values[field.path];
		props.values = this.state.values;
		props.onChange = this.handleChange;
		props.mode = 'create';
		props.key = field.path;
		return props;
	},
	// Create a new item when the form is submitted
	submitForm (event) {
		event.preventDefault();
		const createForm = ReactDOM.findDOMNode(this.refs.createForm);
		const formData = new FormData(createForm);
		this.props.list.createItem(formData, (err, data) => {
			if (data) {
				if (this.props.onCreate) {
					this.props.onCreate(data);
				} else {
					// Clear form
					this.setState({
						values: {},
						alerts: {
							success: {
								success: '创建成功',
							},
						},
					});
				}
			} else {
				// If we get a database error, show the database error message
				// instead of only saying "Database error"
				if (err.error === 'database error') {
					err.error = err.detail.errmsg;
				}
				this.setState({
					alerts: {
						error: err,
					},
				});
			}
		});
	},
	// Render the form itself
	renderForm () {
		if (!this.props.isOpen) return;

		var form = [];
		var list = this.props.list;
		var nameField = this.props.list.nameField;
		var focusRef;

		// If the name field is an initial one, we need to render a proper
		// input for it
		if (list.nameIsInitial) {
			var nameFieldProps = this.getFieldProps(nameField);
			nameFieldProps.ref = focusRef = 'focusTarget';
			if (nameField.type === 'text') {
				nameFieldProps.className = 'item-name-field';
				nameFieldProps.placeholder = nameField.label;
				nameFieldProps.label = false;
			}
			form.push(React.createElement(Fields[nameField.type], nameFieldProps));
		}

		// Render inputs for all initial fields
		Object.keys(list.initialFields).forEach(key => {
			var field = list.fields[list.initialFields[key]];
			// If there's something weird passed in as field type, render the
			// invalid field type component
			if (typeof Fields[field.type] !== 'function') {
				form.push(React.createElement(InvalidFieldType, { type: field.type, path: field.path, key: field.path }));
				return;
			}
			// Get the props for the input field
			var fieldProps = this.getFieldProps(field);
			// If there was no focusRef set previously, set the current field to
			// be the one to be focussed. Generally the first input field, if
			// there's an initial name field that takes precedence.
			if (!focusRef) {
				fieldProps.ref = focusRef = 'focusTarget';
			}
			form.push(React.createElement(Fields[field.type], fieldProps));
		});

		return (
			<Form
				ref="createForm"
				type="horizontal"
				onSubmit={this.submitForm}
				className="create-form"
			>
				{/*
					TODO Figure out if we still need this hidden inputs now that
					we use the API for creation
				*/}
				<input type="hidden" name="action" value="create" />
				<input
					type="hidden"
					name={Keystone.csrf.key}
					value={Keystone.csrf.value}
				/>
				<Modal.Header
					text={'创建 ' + list.singular}
					onClose={this.props.onCancel}
					showCloseButton
				/>
				<Modal.Body>
					<AlertMessages alerts={this.state.alerts} />
					{form}
				</Modal.Body>
				<Modal.Footer>
					<Button type="success" submit>创建</Button>
					<Button
						type="link-cancel"
						onClick={this.props.onCancel}
					>
						取消
					</Button>
				</Modal.Footer>
			</Form>
		);
	},
	render () {
		return (
			<Modal
				isOpen={this.props.isOpen}
				onCancel={this.props.onCancel}
				backdropClosesModal
			>
				{this.renderForm()}
			</Modal>
		);
	},
});

module.exports = CreateForm;
