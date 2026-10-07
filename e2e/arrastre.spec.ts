import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ADMIN, conSesionGuardada, simularApi, type Rutas } from './ayudas';

const CAMION = { id: '223e4567-e89b-42d3-a456-426614174000', patente: 'AB1234', alias: 'Camión 3', activo: true };
const FECHA = '2026-10-05';
/** Doce paradas: la lista no cabe en la pantalla y hay que desplazarla para llegar al final. */
const NOMBRES = Array.from({ length: 12 }, (_, i) => String(i + 1));
const idDe = (n: string) => `${n.padStart(2, '0')}3e4567-e89b-42d3-a456-426614174000`;
const parada = (n: string, posicion: number) => ({
  facturaId: idDe(n), folio: `100${n}`, localId: `${n.padStart(2, '0')}4e4567-e89b-42d3-a456-426614174000`, cliente: `Local ${n}`, direccion: `Calle ${n} 100`, comuna: 'Maipú', urgente: false,
  posicion, llegada: 540 + posicion * 25, inicioServicio: 540 + posicion * 25, salida: 548 + posicion * 25, espera: 0, atraso: 0, motivos: ['MENOR_DESVIO'], fijada: false,
});

/** Una API que se acuerda del orden: cada «mover» cambia la lista y sube la versión, como el servidor. */
const montarRuta = async (page: Page) => {
  let orden = [...NOMBRES];
  let version = 1;
  const operaciones: { version: number; operacion: { tipo: string; facturaId: string; posicion: number } }[] = [];
  const vista = () => ({
    camionId: CAMION.id, fecha: FECHA, planificada: true, modo: version > 1 ? 'manual' : 'sugerida', version, salidaMin: 480, horaLimiteRegresoMin: 1260, regreso: 700, regresoTardio: false,
    paradas: orden.map((n, i) => parada(n, i)), nuevas: [], hechas: [], sinPin: [], noAtendidas: [], enRiesgo: [],
  });
  const rutas: Rutas = {
    'GET /v1/me': () => ({ status: 200, json: { ...ADMIN, empresaId: 'e1' } }),
    'GET /v1/camiones': () => ({ status: 200, json: { camiones: [CAMION] } }),
    'GET /v1/rutas': () => ({ status: 200, json: vista() }),
    'GET /v1/empresa/config': () => ({ status: 200, json: { salidaPorDefectoMin: 480, horaLimiteRegresoMin: 1260 } }),
    'POST /v1/rutas/operaciones': (req) => {
      const cuerpo = req.postDataJSON() as (typeof operaciones)[number];
      operaciones.push(cuerpo);
      const n = NOMBRES.find((x) => idDe(x) === cuerpo.operacion.facturaId) ?? '';
      const resto = orden.filter((x) => x !== n);
      orden = [...resto.slice(0, cuerpo.operacion.posicion), n, ...resto.slice(cuerpo.operacion.posicion)];
      version += 1;
      return { status: 200, json: vista() };
    },
  };
  await simularApi(page, rutas);
  await conSesionGuardada(page);
  await page.goto('/rutas');
  await page.getByLabel('Camión', { exact: true }).selectOption(CAMION.id);
  await expect(page.getByRole('listitem', { name: 'Parada 1', exact: true })).toBeVisible();
  return { operaciones, orden: () => orden };
};

/** Centro del botón en la pantalla, después de desplazarla hasta él (la vista grande no deja todas las paradas a la vista). */
const centro = async (page: Page, nombre: string): Promise<{ x: number; y: number }> => {
  const boton = page.getByRole('button', { name: nombre, exact: true });
  await boton.scrollIntoViewIfNeeded();
  const caja = await boton.boundingBox();
  if (!caja) throw new Error(`no se ve «${nombre}»`);
  return { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 };
};
/** Distancia entre dos paradas contiguas (alto de una fila más el hueco), para arrastrar «n filas» sin depender del tamaño de la pantalla. */
const alturaDeFila = async (page: Page): Promise<number> => {
  const [a, b] = await Promise.all([page.getByRole('listitem', { name: 'Parada 2', exact: true }).boundingBox(), page.getByRole('listitem', { name: 'Parada 3', exact: true }).boundingBox()]);
  if (!a || !b) throw new Error('no se ven las paradas 2 y 3');
  return b.y - a.y;
};
const nombresEnOrden = (page: Page) => page.getByRole('listitem', { name: /^Parada \d+$/ }).evaluateAll((filas) => filas.map((f) => f.querySelector('strong')?.textContent ?? ''));

/** Un dedo de verdad (eventos táctiles del navegador): se apoya en (x, y), se desliza hasta `hasta` y espera `esperaMs` antes de soltar. */
const arrastrarConElDedo = async (page: Page, desde: { x: number; y: number }, hasta: { x: number; y: number }, esperaMs = 0): Promise<void> => {
  const cdp = await page.context().newCDPSession(page);
  const toque = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: { x: number; y: number }) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });
  await toque('touchStart', desde);
  const pasos = 14;
  for (let i = 1; i <= pasos; i += 1) {
    await toque('touchMove', { x: desde.x + ((hasta.x - desde.x) * i) / pasos, y: desde.y + ((hasta.y - desde.y) * i) / pasos });
    await page.waitForTimeout(16);
  }
  if (esperaMs > 0) {
    // Quieto cerca del borde: la pantalla se desplaza sola mientras el dedo sigue apoyado.
    for (let t = 0; t < esperaMs; t += 100) {
      await toque('touchMove', { x: hasta.x, y: hasta.y + (t % 200 === 0 ? 0 : 1) });
      await page.waitForTimeout(100);
    }
  }
  await toque('touchEnd');
};

test.describe('arrastrar una parada para cambiarla de lugar', () => {
  test('con el dedo: se agarra MOVER, se desliza y al soltar la parada queda en ese lugar (una sola operación)', async ({ page }) => {
    const ruta = await montarRuta(page);
    const asa = await centro(page, 'MOVER Local 2');
    const fila = await alturaDeFila(page);
    // Una fila más abajo y un poco más: el centro de la fila arrastrada pasa el de la siguiente y queda en su lugar.
    const pedido = page.waitForRequest((r) => r.url().endsWith('/v1/rutas/operaciones'));
    await arrastrarConElDedo(page, asa, { x: asa.x, y: asa.y + fila + 30 });
    const enviado = (await pedido).postDataJSON() as { version: number; operacion: { tipo: string; facturaId: string; posicion: number } };
    expect(enviado).toMatchObject({ version: 1, operacion: { tipo: 'mover', facturaId: idDe('2'), posicion: 2 } });
    await expect.poll(() => ruta.operaciones.length).toBe(1);
    await expect(page.getByText('ACOMODADA A MANO')).toBeVisible();
    // La lista quedó como el servidor la dejó: Local 2 en el lugar 3.
    await expect.poll(async () => (await nombresEnOrden(page)).slice(0, 4)).toEqual(['Local 1', 'Local 3', 'Local 2', 'Local 4']);
    expect(ruta.orden().slice(0, 4)).toEqual(['1', '3', '2', '4']);
  });

  test('con el mouse funciona igual (hacia arriba)', async ({ page }) => {
    const ruta = await montarRuta(page);
    const asa = await centro(page, 'MOVER Local 3');
    const fila = await alturaDeFila(page);
    await page.mouse.move(asa.x, asa.y);
    await page.mouse.down();
    await page.mouse.move(asa.x, asa.y - fila - 30, { steps: 12 });
    await page.mouse.up();
    await expect.poll(() => ruta.operaciones.length).toBe(1);
    expect(ruta.operaciones[0]?.operacion).toMatchObject({ tipo: 'mover', facturaId: idDe('3'), posicion: 1 });
    await expect.poll(async () => (await nombresEnOrden(page)).slice(0, 3)).toEqual(['Local 1', 'Local 3', 'Local 2']);
  });

  test('un toque sin arrastrar no cambia nada, y Escape cancela un arrastre', async ({ page }) => {
    const ruta = await montarRuta(page);
    const asa = await centro(page, 'MOVER Local 2');
    await page.mouse.move(asa.x, asa.y);
    await page.mouse.down();
    await page.mouse.up();
    await page.mouse.move(asa.x, asa.y);
    await page.mouse.down();
    await page.mouse.move(asa.x, asa.y + 300, { steps: 8 });
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await page.waitForTimeout(300);
    expect(ruta.operaciones).toHaveLength(0);
    expect((await nombresEnOrden(page)).slice(0, 3)).toEqual(['Local 1', 'Local 2', 'Local 3']);
  });

  test('cerca del borde de abajo la pantalla se desplaza sola y se puede llevar la parada hasta el final de una lista larga', async ({ page }) => {
    const ruta = await montarRuta(page);
    const asa = await centro(page, 'MOVER Local 1');
    const altoPantalla = page.viewportSize()?.height ?? 740;
    const pedido = page.waitForRequest((r) => r.url().endsWith('/v1/rutas/operaciones'));
    await arrastrarConElDedo(page, asa, { x: asa.x, y: altoPantalla - 20 }, 4500);
    const enviado = (await pedido).postDataJSON() as { operacion: { posicion: number } };
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
    expect(enviado.operacion.posicion).toBeGreaterThanOrEqual(4);
    await expect.poll(() => ruta.operaciones.length).toBe(1);
  });

  test('las flechas del asa también lo mueven (teclado) y la lista con el asa es accesible', async ({ page }) => {
    const ruta = await montarRuta(page);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21aa']).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    await page.getByRole('button', { name: 'MOVER Local 2', exact: true }).focus();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => ruta.operaciones.length).toBe(1);
    expect(ruta.operaciones[0]?.operacion).toMatchObject({ tipo: 'mover', facturaId: idDe('2'), posicion: 2 });
  });
});
