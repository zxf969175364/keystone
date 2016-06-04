var React = require('react');

module.exports = React.createClass({
	
	displayName: 'InvalidFieldType',
	
	render: function() {
		return <div className="alert alert-danger">无效的字段类型 <strong>{this.props.type}</strong> 路径: <strong>{this.props.path}</strong></div>;
	}
	
});
