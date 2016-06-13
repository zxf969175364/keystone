import React from 'react';
import Popout from '../../../../shared/Popout';
import { Filters } from 'FieldTypes';
import { Pill } from 'elemental';

import { setFilter, clearFilter, clearAllFilters } from '../../actions';

const Filter = React.createClass({
	propTypes: {
		filter: React.PropTypes.object.isRequired,
	},
	getInitialState () {
		return {
			isOpen: false,
		};
	},
	open () {
		this.setState({
			isOpen: true,
			filterValue: this.props.filter.value,
		});
	},
	close () {
		this.setState({
			isOpen: false,
		});
	},
	updateValue (filterValue) {
		this.setState({
			filterValue: filterValue,
		});
	},
	updateFilter (e) {
		this.props.dispatch(setFilter(this.props.filter.field.path, this.state.filterValue));
		this.close();
		e.preventDefault();
	},
	removeFilter () {
		this.props.dispatch(clearFilter(this.props.filter.field.path));
	},
	render () {
		const { filter } = this.props;
		const filterId = `activeFilter__${filter.field.path}`;
		const FilterComponent = Filters[filter.field.type];
		return (
			<span>
				<Pill
					label={filter.field.label}
					onClick={this.open}
					onClear={this.removeFilter}
					type="primary"
					id={filterId}
					showClearButton
				/>
				<Popout isOpen={this.state.isOpen} onCancel={this.close} relativeToID={filterId}>
					<form onSubmit={this.updateFilter}>
						<Popout.Header title="编辑过滤器" />
						<Popout.Body>
							<FilterComponent field={filter.field} filter={this.state.filterValue} onChange={this.updateValue} />
						</Popout.Body>
						<Popout.Footer
							ref="footer"
							primaryButtonIsSubmit
							primaryButtonLabel="Apply"
							secondaryButtonAction={this.close}
							secondaryButtonLabel="Cancel" />
					</form>
				</Popout>
			</span>
		);
	},
});

const ListFilters = React.createClass({
	clearAllFilters () {
		this.props.dispatch(clearAllFilters());
	},
	render () {
		if (!this.props.filters.length) return <div />;

		const currentFilters = this.props.filters.map((filter, i) => {
			return (
				<Filter
					key={'f' + i}
					filter={filter}
					dispatch={this.props.dispatch}
				/>
			);
		});

		// append the clear button
		if (currentFilters.length > 1) {
			currentFilters.push(
				<Pill
					key="listFilters__clear"
					label="清除所有"
					onClick={this.clearAllFilters}
				/>
			);
		}
		return (
			<div className="ListFilters mb-2">
				{currentFilters}
			</div>
		);
	},
});

module.exports = ListFilters;
