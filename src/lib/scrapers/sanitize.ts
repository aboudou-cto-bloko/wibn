/**
 * Retire les surrogates UTF-16 isolés (un caractère haut sans son bas
 * associé, ou l'inverse) d'une chaîne. Ces demi-paires apparaissent
 * typiquement quand du texte contenant des emoji (2 unités UTF-16) est
 * tronqué avec `.slice()`/`.substring()` pile au milieu — le JSON produit
 * reste syntaxiquement valide mais son encodage est invalide, ce qui a
 * fait planter silencieusement un job Inngest (2026-09-13) : la
 * sérialisation canonique (JCS) d'un output de step échouait avec "Missing
 * surrogate", bloquant le job en "running" indéfiniment sans autre trace
 * d'erreur exploitable.
 *
 * À appliquer sur tout texte scrappé (avis, posts) avant de le stocker
 * dans un RawPainPoint, en particulier avant toute troncature.
 */
export function stripLoneSurrogates(str: string): string {
  return str.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    "",
  );
}
