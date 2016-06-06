import {
	LOAD_ITEMS,
	ITEMS_LOADED,
	ITEM_LOADING_ERROR,
} from '../constants';

import {
	deleteItem,
} from '../../Item/actions';
import { NETWORK_ERROR_RETRY_DELAY } from '../../../../constants';

export function loadItems (options = {}) {
	return (dispatch, getState) => {
		dispatch({ type: LOAD_ITEMS });
		const state = getState();
		const currentList = state.lists.currentList;
		currentList.loadItems({
			search: state.active.search,
			filters: state.active.filters,
			sort: state.active.sort,
			columns: state.active.columns,
			page: state.lists.page,
		}, (err, items) => {
			if (items) {
				// if (page.index !== drag.page && drag.item) {
				// 	// add the dragging item
				// 	if (page.index > drag.page) {
				// 		_items.results.unshift(drag.item);
				// 	} else {
				// 		_items.results.push(drag.item);
				// 	}
				// }
				// _itemsResultsClone = items.results.slice(0);
				//

				// TODO Reenable this
				// if (options.success && options.id) {
				// 	// flashes a success background on the row
				// 	_rowAlert.success = options.id;
				// }
				// if (options.fail && options.id) {
				// 	// flashes a failure background on the row
				// 	_rowAlert.fail = options.id;
				// }
				dispatch(itemsLoaded(items));
			} else {
				dispatch(itemLoadingError(err));
			}
		});
	};
}

export function downloadItems (format, columns) {
	return (dispatch, getState) => {
		const state = getState();
		const active = state.active;
		const currentList = state.lists.currentList;
		const url = currentList.getDownloadURL({
			search: active.search,
			filters: active.filters,
			sort: active.sort,
			columns: columns ? currentList.expandColumns(columns) : active.columns,
			format: format,
		});
		window.open(url);
	};
}

export function itemsLoaded (items) {
	return {
		type: ITEMS_LOADED,
		items,
	};
}

/**
 * Dispatched when unsuccessfully trying to load the items, will redispatch
 * loadItems after NETWORK_ERROR_RETRY_DELAY milliseconds until we get items back
 */
export function itemLoadingError () {
	return (dispatch) => {
		dispatch({
			type: ITEM_LOADING_ERROR,
			err: '网络请求失败',
		});
		setTimeout(() => {
			dispatch(loadItems());
		}, NETWORK_ERROR_RETRY_DELAY);
	};
}

export function deleteItems (ids) {
	return (dispatch, getState) => {
		for (var i = 0; i < ids.length; i++) {
			dispatch(deleteItem(ids[i]));
		}
	};
}
