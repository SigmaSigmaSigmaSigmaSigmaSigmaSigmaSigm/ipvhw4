import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAge, normalizeUser, matchesSearch, validateTeacher, fetchUsers, courses } from './public/users.js';

const user = { login: { uuid: 'uuid-1' }, name: { first: 'Anna', last: 'Test' },
  location: { country: 'Ukraine', city: 'Kyiv' }, dob: { age: 31, date: '1995-01-01' },
  email: 'anna@example.com', gender: 'female', phone: '+380 67 123 4567', picture: { large: 'https://example.com/photo.jpg' } };

test('Форматування', () => {
  const teacher = normalizeUser(user);
  assert.equal(teacher.id, 'uuid-1');
  assert.equal(teacher.full_name, 'Anna Test');
  assert.equal(teacher.country, 'Ukraine');
  assert.equal(teacher.age, 31);
  assert.ok(courses.includes(teacher.course));
  assert.equal(validateTeacher(teacher), '');
});

test('Пошук', () => {
  const teacher = { ...normalizeUser(user), note: 'Chess club' };
  assert.equal(matchesSearch(teacher, ' ANNA '), true);
  assert.equal(matchesSearch(teacher, 'club'), true);
  assert.equal(matchesSearch(teacher, '31'), true);
  assert.equal(matchesSearch(teacher, '3'), false);
  assert.equal(matchesSearch(teacher, ''), true);
});

test('Дати', () => {
  const year = new Date().getFullYear();
  assert.equal(getAge(`${year}-01-01`), 0);
  assert.equal(getAge(`${year - 20}-01-01`), 20);
  for (const bad of ['', 'invalid', '2000-02-30', '2999-01-01']) assert.ok(Number.isNaN(getAge(bad)));
});

test('Валідація', () => {
  const teacher = normalizeUser(user);
  for (const change of [{ full_name: ' ' }, { email: 'bad@' }, { age: NaN }, { gender: '' }, { phone: '-------' }, { phone: '123' }]) {
    assert.notEqual(validateTeacher({ ...teacher, ...change }), '');
  }
  assert.equal(validateTeacher({ ...teacher, phone: '' }), '');
});

test('Запити', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url.searchParams.get('results'), '1');
    assert.equal(url.searchParams.get('page'), '6');
    assert.equal(url.searchParams.get('seed'), 'test');
    return new Response(JSON.stringify({ results: [user] }));
  });
  assert.deepEqual(await fetchUsers(6, 1, 'test'), [user]);
  mock.mock.mockImplementation(async () => new Response('', { status: 503 }));
  await assert.rejects(fetchUsers(6, 1, 'test'), /HTTP 503/);
  mock.mock.mockImplementation(async () => new Response(JSON.stringify({ error: 'API unavailable' })));
  await assert.rejects(fetchUsers(6, 1, 'test'), /API unavailable/);
  mock.mock.mockImplementation(async () => new Response(JSON.stringify({ results: [{}] })));
  await assert.rejects(fetchUsers(6, 1, 'test'), /Invalid user data/);
});
