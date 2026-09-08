import { describe, expect, it } from 'vitest';
import { lireFlux, resumer, texteNu } from './lib/flux-rss.ts';

const RSS = `<?xml version="1.0"?><rss><channel><title>Attack</title>
<item><title><![CDATA[Roland SH-101 &amp; the acid line]]></title>
<link>https://www.attackmagazine.com/a/1</link>
<pubDate>Mon, 07 Sep 2026 10:00:00 +0000</pubDate>
<media:content url="https://img.example/1.jpg" />
<description><![CDATA[<p>Un <b>tutoriel</b> sur la basse acide &rsquo; en trois &eacute;tapes.</p>]]></description>
</item>
<item><title>Sans lien</title><pubDate>Mon, 07 Sep 2026 10:00:00 +0000</pubDate></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><title>Live 13 arrive</title>
<link rel="self" href="https://www.ableton.com/feed/x"/>
<link rel="alternate" href="https://www.ableton.com/en/blog/live-13/"/>
<updated>2026-09-06T08:30:00Z</updated>
<summary type="html">&lt;img src="https://img.example/live.png"&gt; Ce que Live 13 change.</summary>
</entry></feed>`;

describe('lireFlux', () => {
  it('lit un flux RSS : titre, lien, date, image, resume nettoye', () => {
    const [a] = lireFlux(RSS, 'attack');
    expect(a).toMatchObject({
      source: 'attack',
      titre: 'Roland SH-101 & the acid line',
      lien: 'https://www.attackmagazine.com/a/1',
      date: '2026-09-07T10:00:00.000Z',
      image: 'https://img.example/1.jpg',
      resume: 'Un tutoriel sur la basse acide ’ en trois étapes.',
    });
  });
  it('ecarte un article sans lien', () => {
    expect(lireFlux(RSS, 'attack')).toHaveLength(1);
  });
  it('lit un flux Atom et prend le lien alternate, pas le self', () => {
    const [a] = lireFlux(ATOM, 'ableton');
    expect(a?.lien).toBe('https://www.ableton.com/en/blog/live-13/');
    expect(a?.date).toBe('2026-09-06T08:30:00.000Z');
    expect(a?.image).toBe('https://img.example/live.png');
  });
  it('rend vide sur un texte qui n est pas un flux, sans lever', () => {
    expect(lireFlux('<html><body>404</body></html>', 'x')).toEqual([]);
  });
});

describe('texte', () => {
  it('nettoie balises, CDATA et entites', () => {
    expect(texteNu('<![CDATA[<p>a &amp; b</p>]]>')).toBe('a & b');
  });
  it('coupe un resume sur un mot', () => {
    const long = 'mot '.repeat(100).trim();
    const r = resumer(long, 50);
    expect(r.length).toBeLessThanOrEqual(51);
    expect(r.endsWith('…')).toBe(true);
  });
});
