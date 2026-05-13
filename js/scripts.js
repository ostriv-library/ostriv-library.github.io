const BOOKS_URL = '/data/books.json';
const AVAILABILITY_URL = 'https://script.google.com/macros/s/AKfycbzd-N4y7CeNWsasOr0a7RXh9dd8iwPjUPubX0FXDufrMkuHCGtodLUel5RLc9G7W5zA/exec?availability=true';

const ALL_LANGS = ['UA', 'ENG'];
const BOOK_PLURAL_FORMS = { one: 'книжка', few: 'книжки', many: 'книжок', other: 'книжки' };
const ukPluralRules = new Intl.PluralRules('uk-UA');

function bookWord(n) {
	return BOOK_PLURAL_FORMS[ukPluralRules.select(n)] || BOOK_PLURAL_FORMS.many;
}
const DEFAULT_STATE = {
	availability: 'all', // 'all' | 'Yes' | 'No'
	langs: [...ALL_LANGS],
	query: '',
	sortBy: 'Name',
	order: 'asc',
};

let jsonData = [];
let state = cloneDefaultState();

function cloneDefaultState() {
	return { ...DEFAULT_STATE, langs: [...DEFAULT_STATE.langs] };
}

// Каталог тягнемо зі статичного JSON (швидко, з CDN GitHub Pages),
// а свіжий статус доступності — окремим запитом до Apps Script. Якщо
// другий запит не вдався, фолбекаємось на поле Available з books.json.
Promise.all([
	fetch(BOOKS_URL).then(response => {
		if (!response.ok) {
			throw new Error('Мережева помилка: ' + response.status);
		}
		return response.json();
	}),
	fetch(AVAILABILITY_URL)
		.then(response => response.ok ? response.json() : null)
		.catch(() => null),
])
.then(([books, availability]) => {
	jsonData = books.map(book => {
		const id = book['Book ID'];
		const fresh = availability && id != null ? availability[id] : undefined;
		return {
			...book,
			Available: fresh != null && fresh !== '' ? fresh : book.Available,
		};
	});

	readStateFromURL();
	syncControlsFromState();
	bindControls();
	applyAndRender();
})
.catch(error => {
	document.getElementById('data-container').innerText = 'Помилка: ' + error.message;
	console.error('Помилка при завантаженні JSON:', error);
});

// Рендеринг карток
function renderData(data) {
	const container = document.getElementById('data-container');
	container.innerHTML = '';

	if (data.length === 0) {
		container.innerHTML = `
			<div class="d-flex flex-column min-vw-100" style="min-height: calc(100vh - 202px);">
				<div class="d-flex flex-grow-1 justify-content-center align-items-center">
					<p>Немає результатів для вибраного фільтру</p>
				</div>
			</div>
		`;
		return;
	}

	data.forEach(item => {
		const div = document.createElement('div');
		div.className = 'col';

		div.innerHTML = `
			<div class="card h-100">
				<img src="${item.Cover}" class="card-img-top h-100" alt="${item.Name}">
				<div class="card-body">
					<h6 class="card-title">${item.Name}</h6>
					<p class="card-text text-truncate"><small class="text-body-secondary">${item.Author}</small><br>
						<a href="#myModal" class="" data-description="${escapeHTML(item.Description)}" data-bs-toggle="modal">
							Опис
						</a>
					</p>
			${item.Available === 'Yes' ? `<span class="badge rounded-pill text-bg-success"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" class="bi bi-check-circle-fill " viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>&nbsp;&nbsp;Доступна</span>
			` : `<span class="badge rounded-pill text-bg-danger"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" class="bi bi-x-circle-fill" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293z"/></svg>&nbsp;&nbsp;Зайнята</span>`}
			<p class="card-text float-end">${item.Lang === 'UA' ? `<span class="bookLang h5" title="Українською">🇺🇦</span>`:`<span class="bookLang h5" title="Англійською">🇬🇧</span>`}</p>

				</div>
			</div>
		`;
		container.appendChild(div);
	});
}

// Один прохід фільтрації під заданий стан (з можливістю ігнорувати окремі осі —
// потрібно щоб лічильники в сайдбарі показували, скільки лишиться при перемиканні
// саме цієї осі, але з урахуванням решти активних фільтрів).
function filterBooks({ ignoreAvailability = false, ignoreLangs = false } = {}) {
	const q = state.query.trim().toLocaleLowerCase('uk-UA');

	return jsonData.filter(item => {
		if (!ignoreAvailability && state.availability !== 'all' && item.Available !== state.availability) {
			return false;
		}
		if (!ignoreLangs && !state.langs.includes(item.Lang)) {
			return false;
		}
		if (q) {
			const haystack = `${item.Name || ''} ${item.Author || ''}`.toLocaleLowerCase('uk-UA');
			if (!haystack.includes(q)) return false;
		}
		return true;
	});
}

function applyAndRender() {
	const filtered = filterBooks();

	const sorted = [...filtered].sort((a, b) => {
		const aVal = (a[state.sortBy] || '').toString();
		const bVal = (b[state.sortBy] || '').toString();
		return state.order === 'desc'
			? bVal.localeCompare(aVal, 'uk-UA')
			: aVal.localeCompare(bVal, 'uk-UA');
	});

	renderData(sorted);
	updateCounters(filtered.length);
	writeStateToURL();
}

// Лічильники бейджів — для осі availability рахуємо без її врахування,
// для мов — без урахування мовного фільтра. Так користувач завжди бачить,
// що дасть перемикання саме цього контролу.
function updateCounters(visibleCount) {
	document.getElementById('bookCount').textContent =
		`${visibleCount} ${bookWord(visibleCount)}`;

	const availabilityScope = filterBooks({ ignoreAvailability: true });
	document.getElementById('allBooks').textContent = availabilityScope.length;
	document.getElementById('availableBooks').textContent =
		availabilityScope.filter(b => b.Available === 'Yes').length;
	document.getElementById('unavailableBooks').textContent =
		availabilityScope.filter(b => b.Available === 'No').length;

	const langScope = filterBooks({ ignoreLangs: true });
	document.getElementById('langUACount').textContent =
		langScope.filter(b => b.Lang === 'UA').length;
	document.getElementById('langENGCount').textContent =
		langScope.filter(b => b.Lang === 'ENG').length;
}

function updateSortButtonUI() {
	const sortBtn = document.getElementById('sort-button');
	const iconEl = document.getElementById('sort-icon');
	const ascending = state.order === 'asc';

	sortBtn?.setAttribute('aria-label',
		ascending ? 'Сортування за зростанням (А → Я)' : 'Сортування за спаданням (Я → А)');
	sortBtn?.setAttribute('title',
		ascending ? 'А → Я, натисніть щоб поміняти напрям' : 'Я → А, натисніть щоб поміняти напрям');

	iconEl.outerHTML = ascending
		? `<svg id="sort-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sort-alpha-down" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10.082 5.629 9.664 7H8.598l1.789-5.332h1.234L13.402 7h-1.12l-.419-1.371zm1.57-.785L11 2.687h-.047l-.652 2.157z"/><path d="M12.96 14H9.028v-.691l2.579-3.72v-.054H9.098v-.867h3.785v.691l-2.567 3.72v.054h2.645zM4.5 2.5a.5.5 0 0 0-1 0v9.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L4.5 12.293z"/></svg>`
		: `<svg id="sort-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sort-alpha-up" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10.082 5.629 9.664 7H8.598l1.789-5.332h1.234L13.402 7h-1.12l-.419-1.371zm1.57-.785L11 2.687h-.047l-.652 2.157z"/><path d="M12.96 14H9.028v-.691l2.579-3.72v-.054H9.098v-.867h3.785v.691l-2.567 3.72v.054h2.645zm-8.46-.5a.5.5 0 0 1-1 0V3.707L2.354 4.854a.5.5 0 1 1-.708-.708l2-1.999.007-.007a.5.5 0 0 1 .7.006l2 2a.5.5 0 1 1-.707.708L4.5 3.707z"/></svg>`;
}

// Прив'язка контролів до стану
function bindControls() {
	document.querySelectorAll('input[name="bookAvailable"]').forEach(radio => {
		radio.addEventListener('change', e => {
			state.availability = e.target.value;
			applyAndRender();
		});
	});

	document.querySelectorAll('.langFilter').forEach(input => {
		input.addEventListener('change', () => {
			const checked = Array.from(document.querySelectorAll('.langFilter:checked'))
				.map(el => el.value);
			// Не дозволяємо повністю очистити мови — інакше нічого не покажеться.
			if (checked.length === 0) {
				input.checked = true;
				return;
			}
			state.langs = checked;
			applyAndRender();
		});
	});

	const searchInput = document.getElementById('searchInput');
	let searchTimer = null;
	searchInput.addEventListener('input', (e) => {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			state.query = e.target.value;
			applyAndRender();
		}, 150);
	});

	document.getElementById('sortField').addEventListener('change', (e) => {
		state.sortBy = e.target.value;
		applyAndRender();
	});

	document.getElementById('sort-button').addEventListener('click', () => {
		state.order = state.order === 'asc' ? 'desc' : 'asc';
		updateSortButtonUI();
		applyAndRender();
	});

	document.getElementById('resetFilters').addEventListener('click', () => {
		state = cloneDefaultState();
		syncControlsFromState();
		applyAndRender();
	});
}

// Синхронізація DOM-контролів зі станом (потрібна після завантаження URL і ресету)
function syncControlsFromState() {
	const radioMap = { all: 'bookAvailable1', Yes: 'bookAvailable2', No: 'bookAvailable3' };
	const radio = document.getElementById(radioMap[state.availability] || 'bookAvailable1');
	if (radio) radio.checked = true;

	document.querySelectorAll('.langFilter').forEach(input => {
		input.checked = state.langs.includes(input.value);
	});

	document.getElementById('searchInput').value = state.query;
	document.getElementById('sortField').value = state.sortBy;
	updateSortButtonUI();
}

// URL-стейт — щоб поточний фільтр зберігався в посиланні
function readStateFromURL() {
	const params = new URLSearchParams(window.location.search);

	const availability = params.get('available');
	if (availability === 'all' || availability === 'Yes' || availability === 'No') {
		state.availability = availability;
	}

	const langs = params.get('lang');
	if (langs) {
		const list = langs.split(',').filter(l => ALL_LANGS.includes(l));
		if (list.length > 0) state.langs = list;
	}

	const q = params.get('q');
	if (q) state.query = q;

	const sortBy = params.get('sort');
	if (sortBy === 'Name' || sortBy === 'Author') state.sortBy = sortBy;

	const order = params.get('order');
	if (order === 'asc' || order === 'desc') state.order = order;
}

function writeStateToURL() {
	const params = new URLSearchParams();
	if (state.availability !== DEFAULT_STATE.availability) params.set('available', state.availability);
	if (state.langs.length !== DEFAULT_STATE.langs.length ||
		!DEFAULT_STATE.langs.every(l => state.langs.includes(l))) {
		params.set('lang', state.langs.join(','));
	}
	if (state.query) params.set('q', state.query);
	if (state.sortBy !== DEFAULT_STATE.sortBy) params.set('sort', state.sortBy);
	if (state.order !== DEFAULT_STATE.order) params.set('order', state.order);

	const qs = params.toString();
	const newURL = window.location.pathname + (qs ? '?' + qs : '');
	window.history.replaceState({}, '', newURL);
}

// Екранування тегів
function escapeHTML(text) {
	return text
	.replace(/&/g, "&amp;")
	.replace(/</g, "&lt;")
	.replace(/>/g, "&gt;")
	.replace(/"/g, "&quot;")
	.replace(/'/g, "&#039;")
	.replace(/"/g, "&#34;");
}

// Відправка даних з кнопки у модальне вікно
document.addEventListener('DOMContentLoaded', () => {
	const modal = document.getElementById('myModal');
	const modalBody = document.getElementById('modalContent');

	modal.addEventListener('show.bs.modal', function (event) {
		const button = event.relatedTarget;
		const description = button.getAttribute('data-description') || 'Опис відсутній';

		modalBody.innerHTML = `<p>${escapeHTML(description)}</p>`;
	});
});
