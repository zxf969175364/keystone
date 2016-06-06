import React from 'react';
import Popout from '../../../shared/Popout';
import PopoutList from '../../../shared/Popout/PopoutList';
import { Button, Checkbox, Form, FormField, InputGroup, SegmentedControl } from 'elemental';

import { downloadItems } from '../actions';
const FORMAT_OPTIONS = [
	{ label: 'CSV', value: 'csv' },
	{ label: 'JSON', value: 'json' },
];

var ListDownloadForm = React.createClass({
	propTypes: {
		className: React.PropTypes.string.isRequired,
	},
	getInitialState () {
		return {
			format: FORMAT_OPTIONS[0].value,
			isOpen: false,
			useCurrentColumns: true,
			selectedColumns: this.getDefaultSelectedColumns(),
		};
	},
	getDefaultSelectedColumns () {
		var selectedColumns = {};
		this.props.activeColumns.forEach(col => {
			selectedColumns[col.path] = true;
		});
		return selectedColumns;
	},
	getListUIElements () {
		return this.props.list.uiElements.map((el) => {
			return el.type === 'field' ? {
				type: 'field',
				field: this.props.list.fields[el.field],
			} : el;
		});
	},
	togglePopout (visible) {
		this.setState({
			isOpen: visible,
		});
	},
	toggleColumn (column, value) {
		const newColumns = Object.assign({}, this.state.selectedColumns);
		if (value) {
			newColumns[column] = value;
		} else {
			delete newColumns[column];
		}
		this.setState({
			selectedColumns: newColumns,
		});
	},
	changeFormat (value) {
		this.setState({
			format: value,
		});
	},
	toggleCurrentlySelectedColumns (e) {
		const newState = {
			useCurrentColumns: e.target.checked,
			selectedColumns: this.getDefaultSelectedColumns(),
		};
		this.setState(newState);
	},
	handleDownloadRequest () {
		this.props.dispatch(downloadItems(this.state.format, Object.keys(this.state.selectedColumns)));
		this.togglePopout(false);
	},
	renderColumnSelect () {
		if (this.state.useCurrentColumns) return null;

		const possibleColumns = this.getListUIElements().map((el, i) => {
			if (el.type === 'heading') {
				return <PopoutList.Heading key={'heading_' + i}>{el.content}</PopoutList.Heading>;
			}

			const columnKey = el.field.path;
			const columnValue = this.state.selectedColumns[columnKey];

			return (
				<PopoutList.Item
					key={'item_' + el.field.path}
					icon={columnValue ? 'check' : 'dash'}
					iconHover={columnValue ? 'dash' : 'check'}
					isSelected={columnValue}
					label={el.field.label}
					onClick={() => this.toggleColumn(columnKey, !columnValue)} />
			);
		});

		return (
			<div style={{ borderTop: '1px dashed rgba(0,0,0,0.1)', marginTop: '1em', paddingTop: '1em' }}>
				{possibleColumns}
			</div>
		);
	},
	render () {
		const { useCurrentColumns } = this.state;

		return (
			<InputGroup.Section className={this.props.className}>
				<Button id="listHeaderDownloadButton" isActive={this.state.isOpen} onClick={() => this.togglePopout(!this.state.isOpen)}>
					<span className={this.props.className + '__icon octicon octicon-cloud-download'} />
					<span className={this.props.className + '__label'}>下载</span>
					<span className="disclosure-arrow" />
				</Button>
				<Popout isOpen={this.state.isOpen} onCancel={() => this.togglePopout(false)} relativeToID="listHeaderDownloadButton">
					<Popout.Header title="下载" />
					<Popout.Body scrollable>
						<Form type="horizontal" component="div">
							<FormField label="文件格式:">
								<SegmentedControl equalWidthSegments options={FORMAT_OPTIONS} value={this.state.format} onChange={this.changeFormat} />
							</FormField>
							<FormField label="列:">
								<Checkbox autofocus label="使用当前选择" onChange={this.toggleCurrentlySelectedColumns} value checked={useCurrentColumns} />
							</FormField>
							{this.renderColumnSelect()}
						</Form>
					</Popout.Body>
					<Popout.Footer
						primaryButtonAction={this.handleDownloadRequest}
						primaryButtonLabel="下载"
						secondaryButtonAction={() => this.togglePopout(false)}
						secondaryButtonLabel="取消" />
				</Popout>
			</InputGroup.Section>
		);
	},
});

module.exports = ListDownloadForm;
