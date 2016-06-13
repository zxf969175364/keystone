import React from 'react';
import ReactDOM from 'react-dom';
import Select from 'react-select';
import { Fields } from 'FieldTypes';
import InvalidFieldType from '../../../shared/InvalidFieldType';
import { plural } from '../../../../utils/string';
import { BlankState, Button, Form, Modal } from 'elemental';

var UpdateForm = React.createClass({
	displayName: 'UpdateForm',
	propTypes: {
		isOpen: React.PropTypes.bool,
		itemIds: React.PropTypes.array,
		list: React.PropTypes.object,
		onCancel: React.PropTypes.func,
	},
	getDefaultProps () {
		return {
			isOpen: false,
		};
	},
	getInitialState () {
		return {
			fields: [],
		};
	},
	componentDidMount () {
		if (this.refs.focusTarget) {
			this.refs.focusTarget.focus();
		}
	},
	componentDidUpdate () {
		if (this.refs.focusTarget) {
			this.refs.focusTarget.focus();
		}
	},
	getOptions () {
		const { fields } = this.props.list;
		return Object.keys(fields).map(key => ({ value: fields[key].path, label: fields[key].label }));
	},
	getFieldProps (field) {
		var props = Object.assign({}, field);
		props.value = this.state.fields[field.path];
		props.values = this.state.fields;
		props.onChange = this.handleChange;
		props.mode = 'create';
		props.key = field.path;
		return props;
	},
	updateOptions (fields) {
		this.setState({
			fields: fields,
		}, () => {
			ReactDOM.findDOMNode(this.refs.focusTarget).focus();
		});
	},
	handleChange (value) {
		console.log('handleChange:', value);
	},
	handleClose () {
		this.setState({
			fields: [],
		});
		this.props.onCancel();
	},

	renderFields () {
		const { list } = this.props;
		const { fields } = this.state;
		const formFields = [];
		let focusRef;

		fields.forEach((fieldOption) => {
			const field = list.fields[fieldOption.value];

			if (typeof Fields[field.type] !== 'function') {
				formFields.push(React.createElement(InvalidFieldType, { type: field.type, path: field.path, key: field.path }));
				return;
			}
			var fieldProps = this.getFieldProps(field);
			if (!focusRef) {
				fieldProps.ref = focusRef = 'focusTarget';
			}
			formFields.push(React.createElement(Fields[field.type], fieldProps));
		});

		const fieldsUI = formFields.length ? formFields : (
			<BlankState style={{ padding: '3em 2em' }}>
				<BlankState.Heading style={{ fontSize: '1.5em' }}>从上面选择一个字段开始</BlankState.Heading>
			</BlankState>
		);

		return (
			<div style={{ borderTop: '1px dashed rgba(0,0,0,0.1)', marginTop: 20, paddingTop: 20 }}>
				{fieldsUI}
			</div>
		);
	},
	renderForm () {
		const { itemIds, list } = this.props;
		const itemCount = plural(itemIds, ('* ' + list.singular), ('* ' + list.plural));
		const formAction = `${Keystone.adminPath}/${list.path}`;

		return (
			<Form type="horizontal" encType="multipart/form-data" method="post" action={formAction} noValidate="true">
				<input type="hidden" name="action" value="update" />
				<input type="hidden" name={Keystone.csrf.key} value={Keystone.csrf.value} />
				<Modal.Header text={'更新 ' + itemCount} onClose={this.handleClose} showCloseButton />
				<Modal.Body>
					<Select ref="initialFocusTarget" onChange={this.updateOptions} options={this.getOptions()} value={this.state.fields} key="field-select" multi />
					{this.renderFields()}
				</Modal.Body>
				<Modal.Footer>
					<Button type="primary" submit>更新</Button>
					<Button type="link-cancel" onClick={this.handleClose}>取消</Button>
				</Modal.Footer>
			</Form>
		);
	},
	render () {
		return (
			<Modal isOpen={this.props.isOpen} onCancel={this.handleClose} backdropClosesModal>
				{this.renderForm()}
			</Modal>
		);
	},
});

module.exports = UpdateForm;
