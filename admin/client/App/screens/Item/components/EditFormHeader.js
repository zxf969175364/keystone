import React from 'react';
import ReactDOM from 'react-dom';
import Toolbar from './Toolbar';
import ToolbarSection from './Toolbar/ToolbarSection';
import { Button, FormIconField, FormInput, ResponsiveText } from 'elemental';
import { Link } from 'react-router';

var Header = React.createClass({
	displayName: 'EditFormHeader',
	propTypes: {
		data: React.PropTypes.object,
		list: React.PropTypes.object,
		toggleCreate: React.PropTypes.func,
	},
	getInitialState () {
		return {
			searchString: '',
		};
	},
	toggleCreate (visible) {
		this.props.toggleCreate(visible);
	},
	searchStringChanged (event) {
		this.setState({
			searchString: event.target.value,
		});
	},
	handleEscapeKey (event) {
		const escapeKeyCode = 27;

		if (event.which === escapeKeyCode) {
			ReactDOM.findDOMNode(this.refs.searchField).blur();
		}
	},
	renderDrilldown () {
		return (
			<ToolbarSection left>
				{this.renderDrilldownItems()}
				{this.renderSearch()}
			</ToolbarSection>
		);
	},
	renderDrilldownItems () {

		var list = this.props.list;
		var items = this.props.data.drilldown ? this.props.data.drilldown.items : [];

		var els = items.map((dd, i) => {
			var links = [];

			dd.items.forEach((el, i) => {
				links.push(<Link key={'dd' + i} to={el.href} title={dd.list.singular}>{el.label}</Link>);
				if (i < dd.items.length - 1) {
					links.push(<span key={'ds' + i} className="separator">,</span>); // eslint-disable-line comma-spacing
				}
			});

			var more = dd.more ? <span>...</span> : '';

			return (
				<li key={`dd-${i}`}>
					{links}
					{more}
				</li>
			);
		});

		if (!els.length) {
			return (
				<Link className="EditForm__header__back" to={`${Keystone.adminPath}/${list.path}`}>
					<span className="octicon octicon-chevron-left" />
					{list.plural}
				</Link>
			);
		} else {
			// add the current list
			els.push(
				<li key="back">
					<Link className="EditForm__header__back" to={`${Keystone.adminPath}/${list.path}`}>{list.plural}</Link>
				</li>
			);
			return <ul className="item-breadcrumbs" key="drilldown">{els}</ul>;
		}
	},
	renderSearch () {
		var list = this.props.list;
		return (
			<form action={`${Keystone.adminPath}/${list.path}`} className="EditForm__header__search">
				<FormIconField iconPosition="left" iconColor="primary" iconKey="search" className="EditForm__header__search-field">
					<FormInput
						ref="searchField"
						type="search"
						name="search"
						value={this.state.searchString}
						onChange={this.searchStringChanged}
						onKeyUp={this.handleEscapeKey}
						placeholder="Search"
						className="EditForm__header__search-input" />
				</FormIconField>
			</form>
		);
	},
	renderInfo () {
		return (
			<ToolbarSection right>
				{this.renderCreateButton()}
			</ToolbarSection>
		);
	},
	renderCreateButton () {
		if (this.props.list.nocreate) return null;

		var props = {};
		if (this.props.list.autocreate) {
			props.href = '?new' + Keystone.csrf.query;
		} else {
			props.onClick = () => { this.toggleCreate(true); };
		}
		return (
			<Button type="success" {...props}>
				<span className="octicon octicon-plus" />
				<ResponsiveText hiddenXS={`新 ${this.props.list.singular}`} visibleXS="创建" />
			</Button>
		);
	},
	render () {
		return (
			<Toolbar>
				{this.renderDrilldown()}
				{this.renderInfo()}
			</Toolbar>
		);
	},
});

module.exports = Header;
