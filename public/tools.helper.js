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

export function wordId(a, b) {
	if (arguments.length === 2) return `${a}_${b}`;
	return `${a.w_basic_form}_${a.wt_name}`;
}

export function focusCard(card) {
	card?.focus();
	card?.scrollIntoView({
		behavior: "smooth",
		block: "nearest"
	});
};

export function focusModifiedCard(card, cardHandler) {
	let newCard = cardHandler(card);
	while (newCard) {
		if (newCard.classList.contains('modified')) {
			focusCard(newCard);
			break;
		}
		newCard = cardHandler(newCard);
	}
}

export function focusUnmodifiedCard(card, cardHandler) {
	let newCard = cardHandler(card);
	while (newCard) {
		if (!newCard.classList.contains('modified')) {
			focusCard(newCard);
			break;
		}
		newCard = cardHandler(newCard);
	}
}
