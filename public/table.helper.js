export function filterItems(items, filter) {
	return filter ? items.filter(filter) : items;
}

export function sortItems(items, compare) {
	return compare ? [...items].sort(compare) : items;
}

export function getNextSort(sort, column) {
	if (sort.column !== column) return { column, direction: 'asc' };
	if (sort.direction === 'asc') return { column, direction: 'desc' };
	if (sort.direction === 'desc') return { column: null, direction: null };

	return { column, direction: 'asc' };
}

export function getPageCount(items, itemPerPage) {
	if (!items.length) return 0;
	if (!itemPerPage) return 1;
	return Math.ceil(items.length / itemPerPage);
}

export function clampPage(page, totalPages) {
	if (!totalPages) return 0;
	return Math.min(Math.max(page, 1), totalPages);
}

export function paginateItems(items, page, itemPerPage) {
	const totalPages = getPageCount(items, itemPerPage);
	const currentPage = clampPage(page, totalPages);
	const start = itemPerPage ? (currentPage - 1) * itemPerPage : 0;

	return {
		items: items.slice(start, itemPerPage ? start + itemPerPage : undefined),
		page: currentPage,
		totalPages,
	};
}
