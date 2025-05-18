const url = 'https://script.google.com/macros/s/AKfycbzd-N4y7CeNWsasOr0a7RXh9dd8iwPjUPubX0FXDufrMkuHCGtodLUel5RLc9G7W5zA/exec?json=true'; 

let jsonData = [];
let currentOrder = 'asc'; // За зростанням
let currentFilter = 'all'; // 'all', 'Yes', 'No'

// Завантаження та початкове сортування
fetch(url)
.then(response => {
	if (!response.ok) {
		throw new Error('Мережева помилка: ' + response.status);
	}
	return response.json();
})
.then(data => {
	jsonData = data;
	sortAndRender();
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

// Основна функція: фільтр + сортування
function sortAndRender() {
	let filtered = jsonData;

	if (currentFilter !== 'all') {
		filtered = jsonData.filter(item => item.Available === currentFilter);
	}

	const sorted = [...filtered].sort((a, b) => {
		const aVal = a.Name || '';
		const bVal = b.Name || '';

		return currentOrder === 'desc'
		? bVal.toString().localeCompare(aVal.toString())
		: aVal.toString().localeCompare(bVal.toString());
	});

	renderData(sorted);
}

// Перемикання сортування
function toggleSortOrder() {
  currentOrder = currentOrder === 'asc' ? 'desc' : 'asc';

  const sortButton = document.getElementById('sort-button');
  const arrow = currentOrder === 'asc' ? `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sort-alpha-down" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10.082 5.629 9.664 7H8.598l1.789-5.332h1.234L13.402 7h-1.12l-.419-1.371zm1.57-.785L11 2.687h-.047l-.652 2.157z"/><path d="M12.96 14H9.028v-.691l2.579-3.72v-.054H9.098v-.867h3.785v.691l-2.567 3.72v.054h2.645zM4.5 2.5a.5.5 0 0 0-1 0v9.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L4.5 12.293z"/></svg> Назва
  ` : `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sort-alpha-up" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10.082 5.629 9.664 7H8.598l1.789-5.332h1.234L13.402 7h-1.12l-.419-1.371zm1.57-.785L11 2.687h-.047l-.652 2.157z"/><path d="M12.96 14H9.028v-.691l2.579-3.72v-.054H9.098v-.867h3.785v.691l-2.567 3.72v.054h2.645zm-8.46-.5a.5.5 0 0 1-1 0V3.707L2.354 4.854a.5.5 0 1 1-.708-.708l2-1.999.007-.007a.5.5 0 0 1 .7.006l2 2a.5.5 0 1 1-.707.708L4.5 3.707z"/></svg> Назва
`;
  sortButton.innerHTML = arrow;

  sortAndRender();
}

// Установка фільтру
function setFilter(value) {
	currentFilter = value;
	sortAndRender();
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