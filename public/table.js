import { getNextSort, paginateItems, sortItems } from "./table.helper.js";
import { createElement, eventHandler, focusElem, focusable } from "./tools.helper.js";

const KeydownHandlers = {
	row: (table, row, item, ev) => {
		const rows = table.getRows();
		const index = rows.indexOf(row);
		switch (ev.key) {
			case 'j':
			case 'ArrowDown':
				ev.preventDefault();
				table.focusRow(rows[index + 1]);
				break;
			case 'k':
			case 'ArrowUp':
				ev.preventDefault();
				table.focusRow(rows[index - 1]);
				break;
			case 'g':
			case 'Home':
				ev.preventDefault();
				table.focusRow(rows[0]);
				break;
			case 'G':
			case 'End':
				ev.preventDefault();
				table.focusRow(rows.at(-1));
				break;
			case 'Enter':
			case ' ':
				ev.preventDefault();
				table.activateRow(item, row);
				break;
		}
	},
}

export class Table {
	constructor(table, options) {
		this.elems = { table };
		this.columns = options.columns;
		this.createRow = options.createRow;
		this.compareItems = options.compareItems;
		this.onActivate = options.onActivate;
		this.pageSizes = options.pageSizes ?? [25, 50, 100, 250, 'all'];
		this.sort = { column: null, direction: null };
		this.page = 1;
		this.itemPerPage = options.itemPerPage ?? 50;
		this.rowHeight = 0;
		this.items = [];
		this.collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
	}
	render(items) {
		this.items = items;
		this.elems.table.innerHTML = '';
		if (!items.length) return;

		const sortedItems = this.getSortedItems(items);
		const page = paginateItems(sortedItems, this.page, this.itemPerPage);
		this.page = page.page;
		const table = this.createTable(page.items);
		this.elems.table.appendChild(table);
		this.reserveRows(table, page);
		this.elems.table.appendChild(this.createPagination(page));
	}
	clear() {
		this.elems.table.innerHTML = '';
	}
	resetPage() {
		this.page = 1;
	}
	getSortedItems(items) {
		const column = this.columns.find(column => column.key === this.sort.column);
		if (!column || !this.sort.direction) return items;

		return sortItems(items, (item1, item2) => {
			const result = this.compareItems
				? this.compareItems(item1, item2, column)
				: this.compareValues(item1, item2, column);
			if (!result) return 0;

			return this.sort.direction === 'asc' ? result : -result;
		});
	}
	compareValues(item1, item2, column) {
		const value1 = column.getValue ? column.getValue(item1) : item1[column.key];
		const value2 = column.getValue ? column.getValue(item2) : item2[column.key];
		if (typeof value1 === 'number' && typeof value2 === 'number') return value1 - value2;

		return this.collator.compare(`${value1 ?? ''}`, `${value2 ?? ''}`);
	}
	sortBy(column) {
		this.sort = getNextSort(this.sort, column);
		this.page = 1;
		this.render(this.items);
	}
	setPage(page) {
		this.page = page;
		this.render(this.items);
	}
	setItemPerPage(itemPerPage) {
		this.itemPerPage = itemPerPage === 'all' ? null : Number(itemPerPage);
		this.page = 1;
		this.render(this.items);
	}
	createTable(items) {
		const table = createElement('table', 'table');
		const header = createElement('thead');
		const headerRow = createElement('tr');
		this.columns.forEach(column => headerRow.appendChild(this.createTableHeader(column)));
		header.appendChild(headerRow);
		table.appendChild(header);

		const body = createElement('tbody');
		items.forEach(item => {
			const row = this.createRow(item);
			this.alignRow(row);
			this.setupRow(row, item);
			body.appendChild(row);
		});
		table.appendChild(body);

		return table;
	}
	createTableHeader(column) {
		const header = createElement('th');
		header.scope = 'col';
		this.setColumnAlignment(header, column);
		const active = this.sort.column === column.key;
		header.setAttribute('aria-sort', active ? (this.sort.direction === 'asc' ? 'ascending' : 'descending') : 'none');

		const direction = active ? (this.sort.direction === 'asc' ? '↑' : '↓') : '';
		const button = createElement('button', `table-sort${active ? ' active' : ''}`);
		button.type = 'button';
		button.appendChild(createElement('span', 'table-sort-label', column.label));
		const indicator = createElement('span', 'table-sort-indicator', direction);
		indicator.setAttribute('aria-hidden', 'true');
		button.appendChild(indicator);
		button.onclick = eventHandler(() => this.sortBy(column.key));
		header.appendChild(button);

		return header;
	}
	alignRow(row) {
		this.columns.forEach((column, index) => this.setColumnAlignment(row.cells[index], column));
	}
	setColumnAlignment(element, column) {
		if (!element || !column.align || column.align === 'left') return;

		element.classList.add(`table-align-${column.align}`);
	}
	setupRow(row, item) {
		if (!this.onActivate) return;

		row.classList.add('table-row');
		focusable(row);
		row.onclick = eventHandler(() => this.activateRow(item, row));
		row.addEventListener('keydown', ev => KeydownHandlers.row(this, row, item, ev));
	}
	getRows() {
		return Array.from(this.elems.table.getElementsByClassName('table-row'));
	}
	focusRow(row) {
		focusElem(row);
	}
	activateRow(item, row) {
		this.onActivate?.(item, row);
	}
	createPagination(page) {
		const { totalPages } = page;
		const pagination = createElement('div', 'table-pagination');
		pagination.appendChild(this.createPageSizeControl());

		const controls = createElement('div', 'table-pagination-controls');
		const createPageButton = (text, label, targetPage, disabled) => {
			const button = createElement('button', 'header-btn table-page-btn', text);
			button.type = 'button';
			button.setAttribute('aria-label', label);
			button.disabled = disabled;
			button.onclick = eventHandler(() => this.setPage(targetPage));
			return button;
		};

		const firstPage = this.page === 1;
		const lastPage = this.page === totalPages;
		controls.appendChild(createPageButton('<<', 'First page', 1, firstPage));
		controls.appendChild(createPageButton('<', 'Previous page', this.page - 1, firstPage));
		controls.appendChild(this.createPageInput(totalPages));
		controls.appendChild(createPageButton('>', 'Next page', this.page + 1, lastPage));
		controls.appendChild(createPageButton('>>', 'Last page', totalPages, lastPage));
		pagination.appendChild(controls);

		return pagination;
	}
	createPageSizeControl() {
		const container = createElement('label', 'table-page-size');
		container.appendChild(createElement('span', null, 'Rows per page:'));

		const select = createElement('select');
		select.setAttribute('aria-label', 'Rows per page');
		this.pageSizes.forEach(value => {
			const option = createElement('option', null, value === 'all' ? 'All' : `${value}`);
			option.value = value;
			option.selected = this.itemPerPage === (value === 'all' ? null : value);
			select.appendChild(option);
		});
		select.onchange = eventHandler(ev => this.setItemPerPage(ev.target.value));
		container.appendChild(select);

		return container;
	}
	createPageInput(totalPages) {
		const pageInfo = createElement('div', 'table-page-info');
		pageInfo.setAttribute('aria-live', 'polite');
		pageInfo.appendChild(createElement('span', null, 'Page'));

		const input = createElement('input', 'table-page-input');
		input.type = 'number';
		input.min = '1';
		input.max = `${totalPages}`;
		input.step = '1';
		input.value = `${this.page}`;
		input.setAttribute('aria-label', 'Page number');
		input.addEventListener('keydown', ev => this.handlePageInput(input, ev));
		pageInfo.appendChild(input);
		pageInfo.appendChild(createElement('span', null, `of ${totalPages}`));

		return pageInfo;
	}
	handlePageInput(input, ev) {
		if (ev.key !== 'Enter') return;

		ev.preventDefault();
		const value = input.value.trim();
		const page = Number(value);
		if (!value || !Number.isInteger(page)) {
			input.value = `${this.page}`;
			return;
		}

		this.setPage(page);
	}
	reserveRows(table, page) {
		if (!this.itemPerPage || page.totalPages < 2) return;

		const rowHeight = this.getRowHeight(table);
		if (!rowHeight) return;
		if (page.items.length === this.itemPerPage) {
			this.rowHeight = rowHeight;
			return;
		}

		const missingRows = this.itemPerPage - page.items.length;
		const spacer = createElement('tr', 'table-spacer');
		spacer.setAttribute('aria-hidden', 'true');
		const cell = createElement('td');
		cell.colSpan = table.tHead.rows[0].cells.length;
		cell.style.height = `${(this.rowHeight || rowHeight) * missingRows}px`;
		spacer.appendChild(cell);
		table.tBodies[0].appendChild(spacer);
	}
	getRowHeight(table) {
		const row = table.tBodies[0].rows[0];
		return row?.getBoundingClientRect().height ?? 0;
	}
}
