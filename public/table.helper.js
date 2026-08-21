export function filterItems(items, filter) {
	return filter ? items.filter(filter) : items;
}

export function sortItems(items, compare) {
	return compare ? [...items].sort(compare) : items;
}

export function getNextSort(sort, column) {
	if (sort.column === column) {
		return {
			column,
			direction: sort.direction === 'asc' ? 'desc' : 'asc',
		};
	}

	return { column, direction: 'asc' };
}

export function getPageCount(items, itemPerPage) {
	return Math.max(1, Math.ceil(items.length / itemPerPage));
}

export function clampPage(page, totalPages) {
	return Math.min(Math.max(page, 1), totalPages);
}

export function paginateItems(items, page, itemPerPage) {
	const totalPages = getPageCount(items, itemPerPage);
	const currentPage = clampPage(page, totalPages);
	const start = (currentPage - 1) * itemPerPage;

	return {
		items: items.slice(start, start + itemPerPage),
		page: currentPage,
		totalPages,
	};
}
