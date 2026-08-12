export async function asyncHandler(header, handler) {
	try {
		return await handler();
	} catch (error) {
		console.error(`${header.toUpperCase()} ERROR:`, error.message ?? error);
		return undefined;
	}
}

export const eventHandler = (handler) => {
	return async ev => {
		ev.preventDefault();
		await handler?.(ev);
	}
}

export function createElement(tag, className = null, text = null) {
	const element = document.createElement(tag);
	if (className !== null) element.className = className;
	if (text !== null) element.textContent = text;

	return element;
}

export function hasClass(elem, className) {
	return elem.classList.contains(className);
}

export function setClass(elem, className, toggle) {
	if (toggle) {
		if (!elem.classList.contains(className)) {
			elem.classList.add(className);
			return true;
		}
	} else {
		if (elem.classList.contains(className)) {
			elem.classList.remove(className);
			return true;
		}
	}
	return false;
}

export function unsetClass(elem, className) {
	if (!elem.classList.contains(className)) elem.classList.add(className);
}

export const nextElem = elem => elem.nextElementSibling;
export const prevElem = elem => elem.previousElementSibling;

export function focusable(elem) {
	elem.tabIndex = 0;
}

export function focusElem(elem) {
	elem?.focus();
	elem?.scrollIntoView({
		behavior: "smooth",
		block: "nearest"
	});
};

export function focusOnClassCard(card, className, cardHandler) {
	let newCard = cardHandler(card);
	while (newCard) {
		if (newCard.classList.contains(className)) {
			focusElem(newCard);
			break;
		}
		newCard = cardHandler(newCard);
	}
}

export function focusOffClassCard(card, className, cardHandler) {
	let newCard = cardHandler(card);
	while (newCard) {
		if (!newCard.classList.contains(className)) {
			focusElem(newCard);
			break;
		}
		newCard = cardHandler(newCard);
	}
}

export const wordId = (wordBuffer) => `${wordBuffer.w_basic_form}_${wordBuffer.wt_name}`; // returns es_id
