/**
 * Las partes de `tools/slash.mjs`, cada una medible por separado: las cuatro
 * vistas, por el nombre corto con que se piden y en el orden en que se
 * recorren, y la estocada.
 *
 * Aparte para que lo lean sin lanzar un navegador la matriz de la CI (una
 * casilla `slash-<parte>` por cada una), `mutar-lib.mjs` (la prueba
 * `slash:<parte>`) y el escaner de la auditoria, que las cruza.
 */
export const SLASH_VIEWS = {
  normal: 'normal',
  baja: 'camara baja',
  cerca: 'de cerca, girando',
  primera: 'primera persona',
};

export const SLASH_PARTS = [...Object.keys(SLASH_VIEWS), 'estocada'];
