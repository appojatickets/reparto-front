import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { CHOFER, conSesionGuardada, simularApi } from './ayudas';

for (const tema of ['claro', 'oscuro', 'suave']) {
  for (const vista of ['normal', 'grande']) {
    test(`carga simple accesible sin desbordamiento: ${tema}, ${vista}`, async ({ page }) => {
      const cajas = { registrada: true, cargadasCamion: 100.5, cargadasUsuario: 100.5, porCerrado: 0, rebajes: 0, rebajesCamion: null, revision: 2, cerrada: false };
      let enviada: unknown;
      await page.addInitScript(({ tema, vista }) => {
        localStorage.setItem('reparto.tema.v1', tema);
        localStorage.setItem('reparto.vista.v1', vista);
      }, { tema, vista });
      await conSesionGuardada(page);
      await simularApi(page, {
        'GET /v1/me': () => ({ status: 200, json: { ...CHOFER, empresaId: 'e1' } }),
        'GET /v1/jornada': () => ({ status: 200, json: { jornada: { id: 'j1', fecha: '2026-10-05', desde: '2026-10-05T11:00:00Z', camion: { id: 'c1', patente: 'AB1234', alias: 'Camión 3' } } } }),
        'GET /v1/facturas': () => ({ status: 200, json: { facturas: [] } }),
        'GET /v1/cajas': () => ({ status: 200, json: cajas }),
        'PUT /v1/cajas': req => { enviada = req.postDataJSON(); return { status: 200, json: cajas }; },
      });
      await page.goto('/cargar');
      await page.getByText('CAJAS DE MI JORNADA', { exact: true }).click();
      const panel = page.getByRole('region', { name: 'Cajas de mi jornada' });
      await expect(panel.getByLabel('Cajas cargadas')).toHaveValue('100.5');
      await expect(panel.getByRole('textbox')).toHaveCount(1);
      await panel.getByLabel('Cajas cargadas').fill('100,5');
      await panel.getByRole('button', { name: 'GUARDAR CAJAS CARGADAS' }).click();
      expect(enviada).toEqual({ cargadasCamion: 100.5, cargadasUsuario: 100.5, revision: 2 });
      await expect(panel.getByText(/1\.507,5/)).toBeVisible();
      const accesibilidad = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21aa']).analyze();
      expect(accesibilidad.violations.map(v => v.id)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (vista === 'normal') await page.screenshot({ path: `/tmp/reparto-${tema}.png`, fullPage: true });
    });
  }
}
