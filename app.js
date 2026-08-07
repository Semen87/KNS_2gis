import { knsData } from './kns_data_export.js';

const list = document.querySelector('#stationList');
const template = document.querySelector('#stationTemplate');
const searchInput = document.querySelector('#searchInput');
const clearSearch = document.querySelector('#clearSearch');
const districtSelect = document.querySelector('#districtSelect');
const stationCount = document.querySelector('#stationCount');
const statusMessage = document.querySelector('#statusMessage');
const installButton = document.querySelector('#installButton');
const primaryFields = [
  ['address', 'Адрес', '⌖'],
  ['coordinates', 'Координаты', '◎'],
  ['pumps', 'Насосы', '⚙']
];

const records = Array.isArray(knsData) ? knsData.map(normalizeRecord) : [];
let deferredInstallPrompt;

function normalizeRecord(record, index) {
  const source = record && typeof record === 'object' ? record : {};
  const lower = Object.fromEntries(Object.entries(source).map(([key, value]) => [key.toLowerCase(), value]));
  const get = (...keys) => keys.map(key => source[key] ?? lower[key.toLowerCase()]).find(value => value !== undefined && value !== null && String(value).trim() !== '');
  const coordinates = get('coordinates', 'координаты', 'coordinate') || '';
  const twoGisUrl = get('twoGisUrl', '2gis', '2gisUrl', 'ссылка 2гис') || (coordinates ? `https://2gis.kz/search/${encodeURIComponent(String(coordinates).replace(/\s+/g, ''))}` : '');
  return {
    id: String(get('id', 'number', 'номер', 'кнс', '№ кнс') || `КНС ${index + 1}`),
    number: String(get('number', 'номер', 'кнс', '№ кнс') || `КНС ${index + 1}`),
    address: String(get('address', 'адрес') || ''),
    district: String(get('district', 'район') || ''),
    coordinates: String(coordinates),
    pumps: String(get('pumps', 'насосы', 'насосное оборудование') || ''),
    notes: String(get('notes', 'примечание', 'примечания') || ''),
    twoGisUrl: String(twoGisUrl),
    fields: source.fields && typeof source.fields === 'object' ? source.fields : {},
    original: source
  };
}

function searchText(item) { return Object.values({ ...item.original, ...item.fields }).flatMap(value => typeof value === 'object' ? Object.values(value) : value).join(' ').toLocaleLowerCase('ru'); }
function escapeText(value) { return String(value ?? '').trim(); }
function fieldRow(label, value, icon = '•') { const row = document.createElement('div'); row.className = 'field-row'; row.innerHTML = `<dt aria-hidden="true">${icon}</dt><dd><strong class="sr-only">${label}: </strong>${escapeText(value)}</dd>`; return row; }

function render() {
  const query = searchInput.value.trim().toLocaleLowerCase('ru');
  const district = districtSelect.value;
  const filtered = records.filter(item => (!district || item.district === district) && (!query || searchText(item).includes(query)));
  list.replaceChildren();
  clearSearch.hidden = !searchInput.value;
  stationCount.textContent = records.length ? `Всего станций: ${records.length}` : 'Справочник ожидает данные';
  statusMessage.textContent = records.length ? `Показано: ${filtered.length}` : 'Добавьте актуальные данные в kns_data_export.js.';
  if (!filtered.length) { const empty = document.createElement('div'); empty.className = 'empty-state'; empty.textContent = records.length ? 'По этому запросу станции не найдены.' : 'В файле данных пока нет станций.'; list.append(empty); return; }
  filtered.forEach(item => {
    const card = template.content.cloneNode(true);
    card.querySelector('h2').textContent = item.number;
    const districtText = card.querySelector('.district'); districtText.textContent = item.district || 'Район не указан';
    const main = card.querySelector('.primary-fields');
    primaryFields.forEach(([key, label, icon]) => { if (item[key]) main.append(fieldRow(label, item[key], icon)); });
    const extras = { ...(item.notes ? { 'Примечания': item.notes } : {}), ...item.fields };
    const extraList = card.querySelector('.extra-fields');
    Object.entries(extras).filter(([, value]) => value !== '' && value != null).forEach(([key, value]) => extraList.append(fieldRow(key, value)));
    const details = card.querySelector('.details'); details.hidden = !extraList.children.length;
    const gis = card.querySelector('.two-gis-button'); if (item.twoGisUrl) { gis.href = item.twoGisUrl; gis.hidden = false; }
    list.append(card);
  });
}

function setupDistricts() { [...new Set(records.map(item => item.district).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru')).forEach(district => districtSelect.add(new Option(district, district))); }
searchInput.addEventListener('input', render);
districtSelect.addEventListener('change', render);
clearSearch.addEventListener('click', () => { searchInput.value = ''; searchInput.focus(); render(); });
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; installButton.hidden = false; });
installButton.addEventListener('click', async () => { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = undefined; installButton.hidden = true; });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
setupDistricts(); render();
