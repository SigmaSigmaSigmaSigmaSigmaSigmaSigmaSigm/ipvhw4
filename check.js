// Вставити в консоль браузера після завантаження 50 викладачів.
(async () => {
  const $ = (selector) => document.querySelector(selector);
  const count = () => $('#teacher-list').children.length;
  const rows = () => [...$('#statistics-body').rows];
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const wait = async (predicate) => {
    const deadline = Date.now() + 30000;
    while (!predicate()) {
      if (Date.now() > deadline) throw new Error('Timed out waiting for the UI');
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  };
  const reset = () => {
    $('#filters').reset();
    $('#search').value = '';
    $('#search').dispatchEvent(new Event('input'));
  };
  check(count() === 50 && rows().length === 50, 'Initial 50 teachers and statistics');
  const first = rows()[0];
  const firstAge = first.cells[2].textContent;
  const gender = first.cells[3].textContent;
  const country = first.cells[4].textContent;
  $('#region').value = country;
  $('#sex').value = gender;
  $('#filters').dispatchEvent(new Event('change'));
  check(count() > 0 && count() === rows().length, 'Filter updates statistics');
  check(rows().every((row) => row.cells[3].textContent === gender && row.cells[4].textContent === country), 'Combined filters');
  reset();
  $('#search').value = firstAge;
  $('#search').dispatchEvent(new Event('input'));
  check(count() > 0 && rows().every((row) => row.cells[2].textContent === firstAge), 'Exact age search');
  reset();
  $('#teacher-list .teacher-open').click();
  check($('#info-dialog').open, 'Info popup');
  $('#profile-favorite').click();
  check($('#favorites-list').children.length === 1, 'Favorite');
  $('#info-dialog .close-dialog').click();
  $('#only-favorites').checked = true;
  $('#filters').dispatchEvent(new Event('change'));
  check(count() === 1 && rows().length === 1, 'Favorite filter statistics');
  reset();
  for (const field of ['full_name', 'course', 'age', 'gender', 'country', 'b_day']) {
    const column = ['full_name', 'course', 'age', 'gender', 'country', 'b_day'].indexOf(field);
    for (const direction of [1, -1]) {
      $(`[data-sort="${field}"]`).click();
      if (direction === 1 && $(`[data-sort="${field}"]`).closest('th').getAttribute('aria-sort') === 'descending') $(`[data-sort="${field}"]`).click();
      const values = rows().map((row) => row.cells[column].textContent);
      check(values.every((value, i) => !i || direction * (field === 'age' ? Number(value) - Number(values[i - 1]) : value.localeCompare(values[i - 1])) >= 0), `Sort ${field}, ${direction}`);
    }
  }
  for (const total of [60, 70]) {
    $('#load-more').click();
    $('#load-more').click();
    await wait(() => !$('#load-more').disabled);
    check(count() === total && rows().length === total, `Next page ${total}`);
  }
  const originalFetch = window.fetch;
  let failedPage;
  try {
    window.fetch = async (url, options) => {
      if (String(url).includes('randomuser.me')) {
        failedPage = String(url);
        return new Response('', { status: 503 });
      }
      return originalFetch(url, options);
    };
    $('#load-more').click();
    await wait(() => !$('#load-more').disabled);
    check(count() === 70 && $('#load-status').textContent.includes('503'), 'Load failure preserves data');
    window.fetch = async (url, options) => {
      if (String(url).includes('randomuser.me')) check(String(url) === failedPage, 'Retry keeps the same page');
      return originalFetch(url, options);
    };
    $('#load-more').click();
    await wait(() => !$('#load-more').disabled);
    check(count() === 80, 'Retry succeeds');
    $('header .add-teacher').click();
    const form = $('#teacher-form');
    const values = { name: '<b>Test Teacher</b>', email: 'test@example.com', sex: 'female', birth: '2000-01-01', phone: '-------', notes: 'Browser test note' };
    for (const [field, value] of Object.entries(values)) form.elements[field].value = value;
    form.requestSubmit();
    check($('#add-dialog').open && $('#form-status').textContent.includes('phone'), 'Invalid phone rejected');
    form.elements.phone.value = '+380671234567';
    window.fetch = async (url, options) => options?.method === 'POST' ? new Response('', { status: 503 }) : originalFetch(url, options);
    form.requestSubmit();
    await wait(() => !form.querySelector('[type="submit"]').disabled);
    check($('#add-dialog').open && count() === 80 && $('#form-status').textContent.includes('503'), 'POST failure preserves form and count');
    window.fetch = originalFetch;
    form.requestSubmit();
    await wait(() => !$('#add-dialog').open);
    check(count() === 81 && rows().length === 81, 'POST adds a teacher and updates statistics');
    const saved = await (await originalFetch('/teachers')).json();
    check(saved.some((teacher) => teacher.full_name === values.name && teacher.note === values.notes), 'Teacher persisted on server');
    $('#search').value = values.notes;
    $('#search').dispatchEvent(new Event('input'));
    check(count() === 1 && rows().length === 1, 'Note search updates statistics');
    const name = $('#teacher-list .teacher-name');
    check(name.textContent === values.name && !name.querySelector('b'), 'Form text is escaped');
    reset();
    check(new Set([...$('#teacher-list').children].map((card) => card.dataset.id)).size === count(), 'No duplicate IDs');
    check(document.documentElement.scrollWidth <= innerWidth, 'No horizontal page overflow');
    return 'OK';
  } finally {
    window.fetch = originalFetch;
  }
})();
