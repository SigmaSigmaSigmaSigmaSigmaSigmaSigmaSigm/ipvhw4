export const courses = ['Mathematics', 'Physics', 'English', 'Computer Science', 'Dancing', 'Chess', 'Biology', 'Chemistry', 'Law', 'Art', 'Medicine', 'Statistics'];

export function getAge(birthday) {
  const [year, month, day] = String(birthday).slice(0, 10).split('-').map(Number);
  const birth = new Date(year, month - 1, day);
  if (!year || birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) return NaN;
  const today = new Date();
  if (birth > today) return NaN;
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age--;
  return age;
}

export function normalizeUser(user) {
  return {
    id: user.login.uuid, full_name: `${user.name.first} ${user.name.last}`,
    course: courses[Math.floor(Math.random() * courses.length)],
    country: user.location?.country || '', city: user.location?.city || '',
    age: user.dob.age, b_day: user.dob.date,
    gender: user.gender || '', email: user.email || '', phone: user.phone || '',
    picture: user.picture?.large || '', favorite: false, note: '', bg_color: '#ffffff',
  };
}

export function matchesSearch(teacher, query) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  if (/^\d+$/.test(text)) return teacher.age === Number(text);
  return teacher.full_name.toLowerCase().includes(text) || teacher.note.toLowerCase().includes(text);
}

export function validateTeacher(teacher) {
  if (!teacher.full_name.trim()) return 'Enter a name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teacher.email)) return 'Enter a valid email.';
  if (!Number.isFinite(teacher.age) || teacher.age < 0) return 'Enter a valid date of birth, not in the future.';
  if (!['male', 'female'].includes(teacher.gender)) return 'Select a sex.';
  if (teacher.phone && (!/^[+()\d .-]{7,25}$/.test(teacher.phone) || !/^\d{7,15}$/.test(teacher.phone.replace(/\D/g, '')))) return 'Enter a phone number with 7–15 digits.';
  return '';
}

export async function fetchUsers(page, amount, seed) {
  const url = new URL('https://randomuser.me/api/');
  url.search = new URLSearchParams({ results: amount, page, seed }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.results) || data.results.length !== amount || data.results.some((user) =>
    typeof user.login?.uuid !== 'string' || !user.login.uuid || typeof user.name?.first !== 'string' ||
    typeof user.name?.last !== 'string' || !Number.isFinite(user.dob?.age) || typeof user.dob?.date !== 'string')) {
    throw new Error(data.error || 'Invalid user data');
  }
  return data.results;
}
