/* ESSENTIA.JS N'EMBARQUE PAS DE TYPES POUR SES SORTIES ESM.
 *
 * Le paquet publie bien un `core_api.d.ts`, mais il decrit le point d'entree
 * UMD, pas les deux fichiers de module que Vite doit charger a la demande.
 * Les declarer ici, minimalement, vaut mieux que de desactiver la
 * verification sur tout le fichier : ce qu'on appelle vraiment est decrit
 * dans `modele.ts`, sous les interfaces EssentiaLike et GraphModelLike. */

declare module 'essentia.js/dist/essentia.js-core.es.js' {
  const Essentia: new (wasm: unknown) => unknown;
  export default Essentia;
}

declare module 'essentia.js/dist/essentia-wasm.es.js' {
  export const EssentiaWASM: unknown;
}
