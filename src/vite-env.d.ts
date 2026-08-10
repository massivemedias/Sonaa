/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/* Les deux seules variables du projet. Déclarées facultatives à dessein :
   SONAA doit se construire et fonctionner sans elles, la contribution étant
   un ajout et non une dépendance (voir lib/supabase.ts). Un type
   obligatoire mentirait sur ce contrat. */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  /** Clé « publishable », publique par conception. Jamais de clé de service. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
