import { describe, expect, it } from 'vitest';
import { recopie, texteDeLaPage } from './resume-sonaa.ts';

describe('le texte de la page', () => {
  it('garde les paragraphes de l article et jette menus, scripts et pieds', () => {
    const corps = 'Novation brings the Launchpad grid to FL Studio with a dedicated mode and new performance tricks. '.repeat(10);
    const html = `<html><body><nav><p>Menu menu menu menu menu menu menu menu menu menu</p></nav>
      <script>var x = "Not a paragraph at all, not at all, not at all, not at all";</script>
      <article><h1>Titre</h1><p>${corps}</p><p>Subscribe to our newsletter for more news every single week!</p></article>
      <footer><p>All rights reserved, copyright everything forever and ever.</p></footer></body></html>`;
    const t = texteDeLaPage(html);
    expect(t).toContain('Launchpad grid');
    expect(t).not.toContain('Menu menu');
    expect(t).not.toContain('newsletter');
    expect(t).not.toContain('Not a paragraph');
  });

  it('reprend la page entiere quand <article> n entoure que le titre', () => {
    const corps = 'AlphaTheta replaces the XDJ-RR with a standalone two channel unit that reads USB-C drives only. '.repeat(10);
    const html = `<article><h2>AlphaTheta XDJ-AN</h2></article><div class="corps"><p>${corps}</p></div>`;
    expect(texteDeLaPage(html)).toContain('standalone two channel unit');
  });
});

describe('la copie', () => {
  const source = 'The new Volt interfaces bring a refreshed preamp design, a built-in compressor and USB-C power to every model in the range.';
  it('repere dix mots recopies a la suite', () => {
    expect(recopie(['Universal Audio says the new Volt interfaces bring a refreshed preamp design, a built-in compressor and more.'], source)).toBe(true);
  });
  it('laisse passer une reformulation', () => {
    expect(recopie(['Universal Audio refreshes its Volt range: new preamps, an onboard compressor, and power over USB-C on all models.'], source)).toBe(false);
  });
});
