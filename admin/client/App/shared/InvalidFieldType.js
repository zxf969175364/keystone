/**
 * Renders an "Invalid Field Type" error
 */

import React from 'react';

const InvalidFieldType = function (props) {
	return (
		<div className="alert alert-danger">
			不合法的 <strong>{props.type}</strong> 在 <strong>{props.path}</strong>
		</div>
	);
};

InvalidFieldType.propTypes = {
	path: React.PropTypes.string,
	type: React.PropTypes.string,
};

module.exports = InvalidFieldType;
