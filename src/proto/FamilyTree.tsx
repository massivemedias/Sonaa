/* Arbre 2D d'une famille. JETABLE.

   Remplace la descente en 3D. La raison est structurelle : en perspective, la
   taille apparente d'un noeud dépend de sa distance à la caméra, donc elle ne
   peut pas encoder la génération, et deux noeuds éloignés se touchent à
   l'écran. Ici la mise en page est CALCULÉE : aucun chevauchement n'est
   possible, aucun label n'est masqué, et la profondeur se lit sur l'axe
   vertical.

   Pan et zoom dans le plan, comme une carte. Aucune orbite. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FAMILIES, STRUCTURES, pathToGenre, type Genre } from './masses.ts';
import './family-tree.css';

interface Props {
  familyIndex: number;
  onTracks: (familyIndex: number, genreLocal: number) => void;
  onClose: () => void;
  onPath: (path: number[]) => void;
}

const ROW = 116;
const LEAF_GAP = 158;
const GRAFT_ROW = -132;

interface Node {
  local: number;
  genre: Genre;
  x: number;
  y: number;
  r: number;
  hasChildren: boolean;
  expanded: boolean;
}

export function FamilyTree({ familyIndex, onTracks, onClose, onPath }: Props) {
  const family = FAMILIES[familyIndex];
  const genres = useMemo(() => STRUCTURES[familyIndex]?.genres ?? [], [familyIndex]);

  // Le fondateur est déployé d'entrée : on voit toujours la première génération.
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]));
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setExpanded(new Set([0]));
    setSelected(0);
    setView({ x: 0, y: 0, k: 1 });
  }, [familyIndex]);

  /* Mise en page. Les feuilles visibles se rangent de gauche à droite, chaque
     parent se centre sur ses enfants. C'est déterministe, donc aucun
     chevauchement ne peut apparaître. */
  const { nodes, links, width, height } = useMemo(() => {
    const out = new Map<number, Node>();
    const edges: { from: number; to: number }[] = [];
    let cursor = 0;

    const walk = (local: number, depth: number): number => {
      const genre = genres[local];
      if (!genre) return 0;

      const isExpanded = expanded.has(local);
      const kids = isExpanded ? genre.children : [];
      let x: number;

      if (kids.length === 0) {
        x = cursor * LEAF_GAP;
        cursor += 1;
      } else {
        const xs: number[] = [];
        for (const kid of kids) {
          xs.push(walk(kid, depth + 1));
          edges.push({ from: local, to: kid });
        }
        const first = xs[0] ?? 0;
        const last = xs[xs.length - 1] ?? 0;
        x = (first + last) / 2;
      }

      out.set(local, {
        local,
        genre,
        x,
        y: depth * ROW,
        r: 13 + genre.importance * 15,
        hasChildren: genre.children.length > 0,
        expanded: isExpanded
      });
      return x;
    };

    walk(0, 0);

    const list = [...out.values()];
    const maxX = list.reduce((m, n) => Math.max(m, n.x), 0);
    const maxY = list.reduce((m, n) => Math.max(m, n.y), 0);
    return { nodes: out, links: edges, width: maxX, height: maxY };
  }, [genres, expanded]);

  // Greffes : ascendances venues d'une autre famille, hors de l'arbre.
  const grafts = useMemo(() => {
    const out: { key: string; x: number; targetX: number; targetY: number; label: string; hue: number }[] = [];
    let slot = 0;
    for (const node of nodes.values()) {
      for (const ext of node.genre.externalParents) {
        const donor = FAMILIES[ext.family];
        if (!donor) continue;
        out.push({
          key: `${node.local}-${ext.family}`,
          x: slot * 190,
          targetX: node.x,
          targetY: node.y,
          label: donor.label,
          hue: donor.hue
        });
        slot += 1;
      }
    }
    return out;
  }, [nodes]);

  useEffect(() => {
    onPath(pathToGenre(familyIndex, selected));
  }, [selected, familyIndex, onPath]);

  const activate = useCallback(
    (local: number) => {
      const genre = genres[local];
      if (!genre) return;
      setSelected(local);

      if (genre.children.length === 0) {
        onTracks(familyIndex, local);
        return;
      }
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(local)) next.delete(local);
        else next.add(local);
        return next;
      });
    },
    [genres, familyIndex, onTracks]
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onWheel = (event: React.WheelEvent): void => {
    event.preventDefault();
    setView((v) => ({ ...v, k: Math.min(2.4, Math.max(0.35, v.k * Math.exp(-event.deltaY * 0.0014))) }));
  };

  const onPointerDown = (event: React.PointerEvent): void => {
    dragRef.current = { x: event.clientX, y: event.clientY };
    (event.target as Element).setPointerCapture?.(event.pointerId);
  };

  /* Le déplacement se fait dans les unités du viewBox, pas en pixels : sinon un
     arbre large, dont le viewBox est plus grand que le canevas, défile plusieurs
     fois trop vite sous le doigt. */
  const userUnitsPerPixel = (): number => {
    const el = svgRef.current;
    if (!el) return 1;
    const rect = el.getBoundingClientRect();
    const box = el.viewBox.baseVal;
    if (box.width <= 0 || box.height <= 0 || rect.width <= 0 || rect.height <= 0) return 1;
    const scale = Math.min(rect.width / box.width, rect.height / box.height);
    return scale > 0 ? 1 / scale : 1;
  };

  const onPointerMove = (event: React.PointerEvent): void => {
    const start = dragRef.current;
    if (!start) return;
    const k = userUnitsPerPixel();
    const dx = (event.clientX - start.x) * k;
    const dy = (event.clientY - start.y) * k;
    dragRef.current = { x: event.clientX, y: event.clientY };
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const onPointerUp = (): void => {
    dragRef.current = null;
  };

  if (!family) return null;

  /* Cadrage initial par viewBox : le contenu tient toujours à l'écran quel que
     soit le nombre de noeuds déployés, sans calcul de caméra. Le pan et le zoom
     s'appliquent par-dessus. */
  const graftRight = grafts.reduce((m, g) => Math.max(m, g.x), 0);
  const boxLeft = -90;
  const boxRight = Math.max(width, graftRight) + 90;
  const boxTop = grafts.length > 0 ? GRAFT_ROW - 40 : -50;
  const boxBottom = height + 60;

  return (
    <section className="tree" aria-label={`Arbre de la famille ${family.label}`}>
      <header className="tree-head">
        <div>
          <p className="tree-kicker">Famille</p>
          <h2 style={{ color: `oklch(0.78 0.14 ${family.hue})` }}>{family.label}</h2>
          <p className="tree-meta">{genres.length} genres</p>
        </div>
        <button className="tree-close" onClick={onClose}>
          Retour à l&apos;atlas (Échap)
        </button>
      </header>

      <svg
        ref={svgRef}
        className="tree-canvas"
        viewBox={`${boxLeft} ${boxTop} ${boxRight - boxLeft} ${boxBottom - boxTop}`}
        preserveAspectRatio="xMidYMid meet"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="application"
        aria-label={`Filiation de la famille ${family.label}`}
      >
        <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
          <g>
            {/* Greffes : ascendance venue d'une autre famille, en pointillé. */}
            {grafts.map((graft) => (
              <g key={graft.key} className="graft">
                <path
                  d={`M ${graft.x} ${GRAFT_ROW + 18} C ${graft.x} ${GRAFT_ROW + 70}, ${graft.targetX} ${graft.targetY - 70}, ${graft.targetX} ${graft.targetY - 26}`}
                  fill="none"
                />
                <text x={graft.x} y={GRAFT_ROW} textAnchor="middle">
                  {graft.label}
                </text>
              </g>
            ))}

            {/* Liens de filiation, nets et visibles en permanence. */}
            {links.map((link) => {
              const a = nodes.get(link.from);
              const b = nodes.get(link.to);
              if (!a || !b) return null;
              return (
                <path
                  key={`${link.from}-${link.to}`}
                  className="tree-link"
                  d={`M ${a.x} ${a.y + a.r} C ${a.x} ${a.y + ROW * 0.55}, ${b.x} ${b.y - ROW * 0.55}, ${b.x} ${b.y - b.r}`}
                  fill="none"
                  stroke={`oklch(0.6 0.09 ${family.hue})`}
                />
              );
            })}

            {[...nodes.values()].map((node) => (
              <g
                key={node.local}
                className="tree-node"
                data-selected={node.local === selected}
                data-parent={node.hasChildren}
                data-expanded={node.expanded}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => activate(node.local)}
                tabIndex={0}
                role="button"
                aria-label={`${node.genre.label}, ${node.hasChildren ? `${node.genre.children.length} sous-genres` : 'morceaux'}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activate(node.local);
                  }
                }}
              >
                {/* Un parent porte un second cercle : il se distingue d'une feuille. */}
                {node.hasChildren && (
                  <circle className="tree-ring" r={node.r + 5} fill="none" stroke={`oklch(0.7 0.12 ${family.hue})`} />
                )}
                <circle
                  r={node.r}
                  fill={`oklch(${(0.6 + node.genre.importance * 0.16).toFixed(3)} ${node.genre.chroma} ${family.hue})`}
                />
                <text y={node.r + 20} textAnchor="middle">
                  {node.genre.label}
                </text>
                {node.hasChildren && (
                  <text className="tree-count" y={4} textAnchor="middle">
                    {node.expanded ? '−' : node.genre.children.length}
                  </text>
                )}
              </g>
            ))}
          </g>
        </g>
      </svg>

      <p className="tree-hint">
        Clic sur un nœud pour développer ses sous-genres, clic sur une feuille pour les morceaux.
        Glisser pour déplacer, molette pour zoomer. Hauteur {height / ROW + 1} générations.
      </p>
    </section>
  );
}
