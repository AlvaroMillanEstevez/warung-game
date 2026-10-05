import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogs, detectLanguage, initialLanguage, saveLanguage, Localization, LOCALES, STORAGE_KEY } from '../src/i18n/core.ts';

test('Catálogos completos: mismas claves, parámetros y textos no vacíos en es/en/id', () => {
  const keys = Object.keys(catalogs.en).sort();
  const params = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  for (const language of ['es', 'en', 'id']) {
    assert.deepEqual(Object.keys(catalogs[language]).sort(), keys);
    for (const key of keys) {
      assert.ok(catalogs[language][key].trim(), language + ':' + key);
      assert.deepEqual(params(catalogs[language][key]), params(catalogs.en[key]), language + ':' + key);
    }
  }
});

test('Detección: elección guardada, orden del navegador, variantes regionales y respaldo inglés', () => {
  assert.equal(detectLanguage('id', ['es-ES', 'en-US']), 'id');
  assert.equal(detectLanguage('es', ['id-ID']), 'es');
  assert.equal(detectLanguage('en', ['es']), 'en');
  assert.equal(detectLanguage(null, ['fr-FR', 'es-MX', 'en-US']), 'es');
  assert.equal(detectLanguage(null, ['ID-id', 'es-ES']), 'id');
  assert.equal(detectLanguage(null, ['en-GB', 'id-ID']), 'en');
  assert.equal(detectLanguage('invalid', ['es-ES']), 'es');
  assert.equal(detectLanguage(null, ['fr', 'de-DE']), 'en');
  assert.equal(detectLanguage(null, []), 'en');
});

test('Almacenamiento: solo una preferencia, lectura/escritura inaccesibles no impiden jugar', () => {
  const entries = new Map();
  const storage = () => ({ getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) });
  assert.equal(initialLanguage(storage, ['id-ID']), 'id');
  assert.equal(entries.size, 0, 'Detectar no guarda una elección implícita');
  saveLanguage(storage, 'es');
  assert.deepEqual([...entries], [[STORAGE_KEY, 'es']]);
  assert.equal(initialLanguage(storage, ['en-US']), 'es');
  entries.set(STORAGE_KEY, 'bad');
  assert.equal(initialLanguage(storage, ['id']), 'id');
  const unavailable = () => { throw new Error('Storage blocked'); };
  assert.equal(initialLanguage(unavailable, ['es']), 'es');
  assert.doesNotThrow(() => saveLanguage(unavailable, 'id'));
  const throwsOnAccess = () => ({ getItem() { throw new Error(); }, setItem() { throw new Error(); } });
  assert.equal(initialLanguage(throwsOnAccess, ['id']), 'id');
  assert.doesNotThrow(() => saveLanguage(throwsOnAccess, 'en'));
});

test('Clave ausente: respaldo inglés, aviso una vez y parámetros del locale activo', () => {
  const issues = [];
  const partial = { es: {}, id: {}, en: catalogs.en };
  const l = new Localization('id', partial, issue => issues.push(issue));
  assert.equal(l.t('notice.sale', { price: 12345 }), '+12.345 coins');
  l.t('notice.sale', { price: 2 });
  assert.equal(issues.length, 1);
  assert.match(issues[0], /id:notice.sale/);
  l.setLanguage('es');
  assert.equal(l.t('station.office'), 'Office');
  assert.equal(issues.length, 2);
});

test('Cambio en caliente: mismo mensaje se traduce sin mutarlo, números locales y baja de suscripción', () => {
  const l = new Localization('en');
  const message = Object.freeze({ key: 'notice.sale', params: Object.freeze({ price: 12345 }) });
  let updates = 0;
  const unsubscribe = l.subscribe(() => updates++);
  for (const language of ['es', 'id', 'en']) {
    l.setLanguage(language);
    const amount = new Intl.NumberFormat(LOCALES[language]).format(12345);
    assert.equal(l.number(12345), amount);
    assert.ok(l.t(message).includes(amount));
    const seconds = new Intl.NumberFormat(LOCALES[language]).format(1.2);
    assert.ok(l.t('effect.actionSpeed', { seconds: 1.2 }).includes(seconds));
    assert.equal(message.params.price, 12345);
  }
  assert.equal(updates, 3);
  l.setLanguage('en'); assert.equal(updates, 3);
  unsubscribe(); l.setLanguage('es'); assert.equal(updates, 3);
});
