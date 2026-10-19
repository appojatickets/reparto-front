import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { CHOFER, conSesionGuardada, simularApi } from './ayudas';
const CAMION = { id: '223e4567-e89b-42d3-a456-426614174000', patente: 'AB1234', alias: 'Camión 3', activo: true };
const parada = (n: number, posicion: number) => ({ facturaId: `${String(n).padStart(2, '0')}3e4567-e89b-42d3-a456-426614174000`, localId: `${String(n).padStart(2, '0')}4e4567-e89b-42d3-a456-426614174000`, cliente: `Local ${n}`, direccion: `Calle ${n} 100`, comuna: 'Maipú', urgente: false, posicion, llegada: 600, inicioServicio: 600, salida: 605, espera: 0, atraso: 0, motivos: [], fijada: false });

test('el editor despliega sus herramientas y una pulsación mantenida guarda un solo movimiento', async ({ page }) => {
  let version = 1;
  let paradas = Array.from({ length: 8 }, (_, i) => parada(i + 1, i));
  const operaciones: { operacion: { facturaId: string; posicion: number } }[] = [];
  const vista = () => ({ camionId: CAMION.id, fecha: '2026-10-19', planificada: true, modo: 'carga', version, salidaMin: 480, horaLimiteRegresoMin: 1260, paradas, hechas: [], nuevas: [], sinPin: [], noAtendidas: [], enRiesgo: [] });
  await simularApi(page, {
    'GET /v1/me': () => ({ status: 200, json: { ...CHOFER, editor: true, empresaId: 'e1' } }),
    'GET /v1/jornada': () => ({ status: 200, json: { jornada: { id: '323e4567-e89b-42d3-a456-426614174000', fecha: '2026-10-19', desde: '2026-10-19T11:00:00Z', camion: CAMION } } }),
    'GET /v1/rutas': () => ({ status: 200, json: vista() }),
    'POST /v1/rutas/operaciones': (req) => {
      const cuerpo = req.postDataJSON() as (typeof operaciones)[number];
      operaciones.push(cuerpo);
      const elegida = paradas.find((p) => p.facturaId === cuerpo.operacion.facturaId);
      if (elegida) {
        const otras = paradas.filter((p) => p.facturaId !== elegida.facturaId);
        otras.splice(cuerpo.operacion.posicion, 0, elegida);
        paradas = otras.map((p, i) => ({ ...p, posicion: i }));
        version += 1;
      }
      return { status: 200, json: vista() };
    },
  });
  await conSesionGuardada(page);
  await page.goto('/mi-ruta');
  const fila = page.getByRole('listitem', { name: 'Parada 1', exact: true });
  await expect(fila).toBeVisible();
  await fila.getByRole('button', { name: /TOCA PARA VER FOTO/ }).click();
  const corregir = page.getByRole('link', { name: 'CORREGIR ESTA DIRECCIÓN Local 1', includeHidden: true });
  await expect(corregir).not.toBeVisible();
  await page.getByText('EDITAR LOCAL Y MÁS OPCIONES', { exact: true }).click();
  await expect(corregir).toBeVisible();
  await expect(page.getByRole('button', { name: 'UBICACIÓN DEL VENDEDOR Local 1' })).toBeVisible();
  await page.getByText('EDITAR LOCAL Y MÁS OPCIONES', { exact: true }).click();
  await page.getByRole('button', { name: /TOCA PARA VER FOTO/ }).first().click();
  await page.getByRole('button', { name: 'ORDENAR RUTA' }).click();
  const boton = page.getByRole('button', { name: 'BAJAR Local 1', exact: true });
  await boton.scrollIntoViewIfNeeded();
  const caja = await boton.boundingBox();
  if (!caja) throw new Error('No se ve el botón para bajar');
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(900);
  expect(operaciones).toHaveLength(0);
  await page.mouse.up();
  await expect.poll(() => operaciones.length).toBe(1);
  expect(operaciones[0]?.operacion.posicion).toBeGreaterThan(2);
  await expect(page.getByRole('button', { name: 'BAJAR Local 1', exact: true })).toBeAttached();
  const accesibilidad = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accesibilidad.violations.map((v) => v.id)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
