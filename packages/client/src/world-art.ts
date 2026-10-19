/**
 * El pixelart del mundo (el autor, 2026-10-19; guia de arte, directriz 7): a
 * 24 pixeles por cara de bloque y 12 por voxel, sin contorno, la luz del
 * noroeste, cuatro tonos por material (luz, base, sombra, hondo).
 *
 * **Lo genero `tools/pixel-mundo.ts` y se retoca aqui a mano**, pixel a pixel.
 * Volver a correr el generador pisa los retoques.
 *
 * Ronda 1, la muestra de estilo: hierba y roca con dos variantes, el roble, la
 * mata de la pradera y la roca de voxeles. Los colores son los que se VEN hoy
 * en el juego (*deduccion*): el suelo, su hexadecimal; los objetos, el de
 * `palette.ts` aclarado como lo aclara three.js al pintar.
 */

/** Una rejilla: filas de caracteres, `.` transparente, cada letra un color de `WORLD_PALETTE`. */
export interface WorldArt {
  readonly rows: readonly string[];
}

/** Pixeles de arte por cara de bloque (el autor). */
export const WORLD_PX = 24;

/** La paleta del mundo, por material, de luz a hondo. */
export const WORLD_PALETTE: Readonly<Record<string, string>> = {
  A: '#7da570', // hierba: luz
  B: '#588c48', // hierba: base
  C: '#456d38', // hierba: sombra
  D: '#35542b', // hierba: hondo
  E: '#939399', // roca del suelo: luz
  F: '#74747c', // roca del suelo: base
  G: '#5a5a61', // roca del suelo: sombra
  H: '#46464a', // roca del suelo: hondo
  I: '#a0d48d', // hoja del roble: luz
  J: '#8cc27c', // hoja del roble: base
  K: '#77ad6e', // hoja del roble: sombra
  L: '#5d8756', // hoja del roble: hondo
  M: '#bfaa92', // corteza del roble: luz
  N: '#ad9373', // corteza del roble: base
  O: '#87725a', // corteza del roble: sombra
  P: '#685845', // corteza del roble: hondo
  Q: '#9ec893', // hoja de la mata: luz
  R: '#88b47d', // hoja de la mata: base
  S: '#77a06e', // hoja de la mata: sombra
  T: '#5d7d56', // hoja de la mata: hondo
  U: '#e58193', // baya: base
  V: '#f1bac3', // baya: brillo
  W: '#93ad73', // tallo de la mata
  a: '#d0d0d6', // piedra: luz
  b: '#bebec5', // piedra: base
  c: '#a2a2a9', // piedra: sombra
  d: '#828287', // piedra: hondo
};

/** Hierba, variante 1. */
export const GRASS_A: WorldArt = {
  rows: [
    'BABBDCBBBBBBCCCCCCBBBBAB',
    'BBCBCCBBBBBBCCCCCCBBBBAB',
    'BBBBBBBBBBBBACCCCCBBBBBB',
    'CBBBBBBBBBBBACCCCACCBBCC',
    'CCBBBBBAABBBACDACACCCCCC',
    'CCBBBBBAABBBCCAABBCBBBCC',
    'BBBBBBBBCBBCCAABCBBBBBBB',
    'BBBBBABCCCCCCABCBBBBBBBB',
    'BBBBBACCCCCCCCBBBBABBBBB',
    'BBBBBBCBCCCCABBBBBABBBBB',
    'BBBBBABBBABBABBBBABCBBBB',
    'BBBBBABBAABBBCBBCABBBBBB',
    'BBBBBBBBABCBBBBCCCCBBABB',
    'BBBBBBBBBCBBBBACCBBBBABB',
    'BBBBBBABBBBBBBACCBBBBACB',
    'ABBBBAABBBBBBBBCCBBBBABB',
    'ABBBBABABBBBBBBACBABBBCB',
    'BBBBBBBABBBBBBBBBBABBBBB',
    'BBBBBBBBCBBBBBBBBBBCBBBB',
    'BBBBBBBBBBBBBBBBBBBBBBBB',
    'BBBBBABBBBBBBBBBBBBBBBAB',
    'BABBBABBBBBBABBBBBABBBAB',
    'BABBCBCBBBBBABBBBBABBBBC',
    'BABBCCBBBBBBBCBCCBBBBBBB',
  ],
};

/** Hierba, variante 2. */
export const GRASS_B: WorldArt = {
  rows: [
    'BBAABABBABCCCCBBBBBBBBBB',
    'ABABCBBBABBCCABBBBBBBBBB',
    'AABBBBBBBBBBBABBBBBBBBBB',
    'BABBCCBBBBBABBBBBBBCCCBB',
    'ABBCCCBBBBBAABABBBCCCCBB',
    'ABBACBBBABBBCBABBBCACCBB',
    'BBBABBBBABBABCBABBBAABBB',
    'BBBBBBBBBCBABBBABBBBABBB',
    'BBBBBBBBBABBCBBBBBBBBBBB',
    'BBBBBBBACBBBBBBBBBBBBBBB',
    'BBBBBBBACCBBABBBBBBBBBBB',
    'DBBBBBBBCCBBABBBBBBBBBBB',
    'CBBBBABCCCBBBCBBBBBBBABB',
    'BBBBBABCCCBBBBBBBBBBBABB',
    'BBBBBBCCCCBBBBBBBBBBBBCB',
    'BBBBCCCCCCBBBABBBBBCCBBB',
    'BBBACCCCCCBBBABBBBCCCCBB',
    'BBBACCCCCCBBBBCBBBCCCCBB',
    'BBBACCBBBBBBBBBBCCCCCBBB',
    'BBBABBBBBBBBBBBCCCCBBBBB',
    'BABBBBBBBBBBBBBCCAABBBBB',
    'BABBBBBBBBBBBBACAAAABBBB',
    'BBBBBBBBBBBBBBABAACCABBB',
    'BBBABABBBBBCCCBCBCCBABBB',
  ],
};

/** Hierba, variante 3. */
export const GRASS_C: WorldArt = {
  rows: [
    'AAABBBBBBBBABABBBBBABABB',
    'AAABBBBBBBBBCABBBBBABABB',
    'BCBBBBBBBBBBBBCBBBBBBBCB',
    'BBBBBBBBBBBACCBBBBBBBBBB',
    'BBBBBBBABBBACCBBBBBBBBBB',
    'BBBBBBBABBBCCCBBBBBBBBBB',
    'BBBBBBBBBBBCCCBBBBABBBBA',
    'BBBBBBBABBBCCCBBBBABBBBA',
    'BBBBBBBABBBCCCBBBBBCBBBA',
    'ABBBBBBBBBBCCCBBBBBBBABA',
    'ACBBBBBBBABBCBBBBBBBBABC',
    'CCABBBABBABBBBBBABBBBBCC',
    'CCABBBABBBCBBBBBABBBBBAC',
    'CCBBBBBCBBBBBBBBBABBBBAC',
    'CCBBBBABBBBBBBBBBABBBBCC',
    'CCCCBCACCCBBBBBABBBCCCCA',
    'BBCCCCCCCCBBBBAABBBCCCCA',
    'BBBBBCCCCCBBABABBBBCCCCB',
    'BBBBABBCCCBBABBDBBBACCCB',
    'BBBBABABCABBBCBBBBBACCCB',
    'ABBBBCABBABBBBBBABBCCCCB',
    'ABBBBBBCBBBBBBBBABBCCCBB',
    'BABBBBBBBBBBBBBBBCBBBBBB',
    'BABBBBBBBBBABBBBBBBBBBBB',
  ],
};

/** Hierba, variante 4. */
export const GRASS_D: WorldArt = {
  rows: [
    'BBBBCCBBBBBBBBBBBBBCCCBB',
    'BBBBBABBBBBBBBBBBBBBBABB',
    'BABBBABBBBBBBBBBBBABBABA',
    'CABBBBCBCCCCDBBBABABBBBA',
    'CCCBBBCCCCCCCABBABBCBBBC',
    'CCCCBBCCCCCCCAABBBBBBBBC',
    'CCCCCCCCBBBBBAABBBBBBABC',
    'BACCCCCABBBBBBCBBBBBBABB',
    'BACCACCABBBABBABCCBABBCB',
    'BBCCACBBCBBABBABBBBABBBB',
    'BBBBBBBBBBBBCBBBBBBBCBBB',
    'BAABBBBBBABBBBABBBBBBBBB',
    'BAABBBBBBABBBBAABBBBBBBB',
    'BBCBBBBBBBCBBBBCBBBBBABB',
    'BBBBBBBBBBBBBBBACBBBBABB',
    'CCCCCCBBBBBBBBBABBBBBBBB',
    'CCCCCCBBBBBBBBBACBBBBBBC',
    'CCCCCDBBBBBBBBBACBBBBBBB',
    'BBBBBABBBBBBBBBBCBBBBBBB',
    'BBBBBABBABBBBBBBCCBABBBB',
    'BBBBBBCBABBBBBBBCCBABBBB',
    'BBBBBBBBBCABBABACBBBBBBB',
    'BBBAABBBBBABBABABBBBBBBB',
    'BBBAABBBBBBCBBCBCBBCCBBB',
  ],
};

/** Roca del suelo, variante 1. */
export const ROCK_GROUND_A: WorldArt = {
  rows: [
    'EEEEEEFHHEEEEEEEFGGGGFFE',
    'EEEEEFFEEHEEEEEEFGGGGFFE',
    'FFFFFFFEEEEEEEEFFGGGGFFF',
    'FFFFFFFFEEEEEEFFGGGGGGFF',
    'GGGGFFFFFFFFFFFFGGGGGGGG',
    'GGGGGFFFFFFFFFFGGGGGGGGG',
    'GGGGGFFFFFFFGGGGGGGGGGGG',
    'GGGGGFFFFFFFGFFFGGGGGGGG',
    'GGGGFFFFFGGFFFFFFGGGGGGG',
    'GGGGFFFFFGGFFFFFFFGFFFGG',
    'FGGGFFFFFFFFFFFEFFFFFFFF',
    'FFFFFFFFFFFFFFFFEEEEFFFF',
    'FFFFFFFFFFFFFFFFEEEEFFFF',
    'FFHHFFFFFFFFFFFFEHEEFFFF',
    'FHFFFFEFFFFFFFFEEHHHEFFE',
    'HFFFFEEEFFFFFFFEEFHFEEFF',
    'GGFFFEEEFFFFFFFFFFFFFFFF',
    'GGGFFEEEEFFFFFFFFFFFFFGG',
    'GGGFFEEEEFFFGGGFFFFFFFGG',
    'GGFFFEEEEFFFGGGFFFFFFFGG',
    'GFFEEEFEEEFFFFFFFFFFFFFG',
    'FFEEEEFFEEEFFFFFGGGGGFFF',
    'FEEEEEFEEEEEEEFFGGGGGFFF',
    'EEEEEEEEHEEEEEEFFGGGGFFE',
  ],
};

/** Roca del suelo, variante 2. */
export const ROCK_GROUND_B: WorldArt = {
  rows: [
    'FFFEEEHHEHFFFFFGGFFFGFFF',
    'FFFFEEEEHFFFFFFGFFFFFFFF',
    'FFFFFFFFFFFFFFFFFFFFFFFF',
    'FFGGGGGGGGFFFFFFFFFFFFFF',
    'GGGGGGGGGGFFFFFFFEEHEFFF',
    'GGGGGGGGGGFFFFFFFEEHEFFG',
    'GGGGGGGGGGFFEFFFFEEHEFFG',
    'GGGGGGGGGFFFEFFFEEEEEEFG',
    'FFGGGGGGGFFEEEEEEEEEEEFF',
    'FFFGGGGGGFFEEEEEEEEEEEEF',
    'FFFFGGGGFFFEEEEEEEEEEEEF',
    'FFFFFGGFFFEEEHEEEEEEEEFF',
    'FFFFFFGFFFEEEFHFHEEEEFFF',
    'EFFFFGGFFFFEEFFHHHEEEFFF',
    'EEEFFGGGFFFFFFFFFHEFFFFE',
    'EEEEFGGGGFFFFFFFFFFFFFFE',
    'EEEEFFGGFFFFFFFGGGGGGGFE',
    'EEEFFFFFFFFFFFFGGGGGGGFE',
    'EEEFFFFFFFFFFFFGGGGGGGFE',
    'EEEFFFFFFFFFFFFGGGGGGGFE',
    'EEFFFFFFFFFFFFGGGGGGGFFF',
    'FFFFFFFFFFFFFFGGGGGGGFFF',
    'FFFFFFFFFFFFFFFGGGGGGFFF',
    'FFFEEEHEFFFFFFFGGGFGGFFF',
  ],
};

/** El roble: copa en cupula de su especie sobre su tronco medio. */
export const OAK: WorldArt = {
  rows: [
    '..........................................................................................................',
    '..........................................................................................................',
    '..............................JJJ.........................................................................',
    '.............................II.JJI.......................................................................',
    '............................JJJJIIIIJJKK.............................IJJ..................................',
    '............................JJIJIIIIJJKKKL...........................IJJJ.................................',
    '..........................IIJIIIJJJKIIJKKK...........................IIIJJ................................',
    '..........................IIIJIIJJJKIIJJ.K......................IIJJIIIIJJII..............................',
    '.........................JIIIIIIIIJKIIKKJJ......................IIJJJJIJIIKKIJLL..........................',
    '.........................JIIIIIIIJJKIJKKJJ......................IIJJIJIJJJKKIJLL..........................',
    '......................IIIIJJIIJJJJKKKKJJKL.......................JIIJJJJJJJJKKKL..........................',
    '......................JJIIJJIIJJJKJJKKJJKL......................JJIIJJJJJKKKKKLL..........................',
    '........................IIJJJJIJJJJJJJKKKLKKL...................JIIIJJJJJKJKKLLL..........................',
    '........................IJJJJJJJJJJJJJKKLLK.L..................JJJIIJJJJKKJJLLLLLL........................',
    '........................JIIIKKKKKKKKLLKKKKLLL.................JJKJIIKKKKJJKKKLL.KL........................',
    '...................JII..JJIIKKKKKKKKLLKKKKL.L.............IIIIIJKKIIKKKKJJKKLLLLL.........................',
    '.............IJ...II.J..KKIIJJJIKKJJLKKKKKKLL...........JJI.I...IIKKKKKKJKKKLLL...........................',
    '.............IJJIIIIIIIIJKJJJJJJKKJJLLKKKLLIJJ..........JIIIIJIIIIKKKKKKKKKLLLLLLI........................',
    '.............IIIIIIIIIJJJJKKKKKKKKJKKKLLI...JJ..........IIIIIIJJJJKKKKKKLLKKKL.I.JII......................',
    '..........IIIIIIIIIIIJJJJJKKKKKKKLKKKKIII..II...........IIIIIIJJJJKKKKKKLLKLLIII..II......................',
    '..........J.JJIIJJIIJJJJJJKKKKKKKKLLLJI.IIIJIIII.KK....IIIIIIIIIJJKKIJKKKLLLII.IIIJJKKJJ..................',
    '.........JJJJJIIJJIIJJJJJJKKKKLKKKLLJIJIIIJJIIIIJKK...IIIIIIIIIIJJKKJJK.......IIIJJJKKKJJ.................',
    '.........IIIJJJJJJIIJJJJJJKKKKLLLLKIIIIIIJJJJIJJJJKK.IIIJJJJIIKKJKJJJJKK.KII.IIIIIIIIJIJJJ................',
    '.........IIIJJJJJJIJJJJJJJKKKKL.LLIIIIIIIIJJJIJJJJJKKIIIJJJJIIKKKKJJJJKK.KIIIIIIIIIIJJIIJJK...............',
    '..........IJIIIIIIIIJJKKKKKKKKLLLJIIJJIIJIIIJJJJJJKKKJIJIIJJJJJKJJJKJJKKLLIIJJJJIIJJIIJJKKK...............',
    '..........JJIIIIIIIIJJKKKKKKKLLL.JIIJJIIJJIJJJJJIJKKKJJJIIJJIJJKJJJKJJKKLL.IJJJJIIJJIIJJKLKLKL............',
    '..........JJJJJJJJJJKKJJKKKKKKL....IJJIIJJJJKKKKJKKKLJJJIIJJJJJKIJKKKKKKKKJJIIIIIIKKJJKKKKLL.L............',
    '..........JJJJJKJJKKKKJJKKKKKKL..IIIJJIIJJJJKKKKKKKKLJJJJJJJJJJKJJKKJKKKK.JJIIIIIIKKJJKKKKLLLL............',
    '..........KKIIJJKKJJKKKKKKKKKKL..IIIIIJJJJJJKKJKKKKKKIJJJJJJKKKKJJLLKKLLKLJJJJJJIJKKKKKKKKKL..............',
    '..........JKIIJJKKKKKKKKKKKLKKLL...IIIJJJJJJKKJKKKKKKIJJJJJJKKKKJJLLKKLLLLKJJJJJIJKKKKKKKLLL..............',
    '..........JJIIIIJKJJJJLLJKKKKKLL...JJKJJJJJKKKKKKKLLLLJJJJJJKKJJKKLLLLII..JJJJJJJJKKKKLLKIJ...............',
    '........KKJJJIJJKKJJJJLLJKKKKLLL...JKKJJJJKKKKKLKKJJJJJJIJJJKKJJKKLLJJI..JI.JJJKJJKKKKLJIIJJ..............',
    '........KKKKJJJJKKKKKKKKKKKLLLL....KJJJJKKKKKKKJIJIIJJJJIJKKKKKKKLIIIIIIIIJJJJKKKKKKKIIIIIIIJJJJI.........',
    '.........JIIIJJJJJKKJKKLKKLLL.I...JJJJJJKLKKKKIIIJIIIJJJIJJKJKKKIIIIIIIIIIJJJJKKKKKKIIIIIIIIJKJJIJI.......',
    '........II..IJIIIIIIIIJJLLLIJJIIJ.I.JJKKJJLLKIIIIIIIIJIIIIKKJKKIJJIIIIIIJJJJJJKKKKIIIIIIIIIIJJIIJJJJKKK...',
    '.......II.IIJJIIIIIIIIJJKKI..JIIJJIIJJKKJJLLJIIIIIIIIIIIIIKKJKKIJJIIIIIJJJJJJJKKKKIIIIIIIIIIJJIIJJJJKKKL..',
    '......II.JIJIIIJIIIIKKKKKIIIIIIIJJIIJJJJKLJIIIIIJJIIIIJJIJJKIJKJJJJJJJIIIIIIIIJJKKJJJIIIIIIIJJJJKKKKKKJKK.',
    '......I.JJIIIIIIIIIIKKKKKIIIIIIIJJJJJJJ.LLJIIIIIJJIIIIJJIJKKIJKJJJJJJJIIIIIIJJJJKKJJIIIJIIIIJJJJKKKKKKJJK.',
    '......IIIIJJIIJJIIJJIIKKJIIIIIJIJJJJIIJJJKIIJJIIIIIIJJJJIIJJKKKJIIIIJJIIKKJJJJKKKKJJJJJJIIJJJJJJKKKKJJK...',
    '......IIIIJJIIJJIIJJIJKKJIIIIIIJJKJKIIJJKKIIJJIIJJIIJJJJIIJJKKLJIIIIJJIJKKJKJJKKLLJJJJJJIIJJJKJJKKKKJJKK..',
    '....JIJJJJIJIIKKJJIIKKKKLJIIJJJJIIKKJJJJKKJJIIIJIJIIJJJJJJJJKKKIIIIJIIJJIJKKJJKLKKIIIJIIJJJJIIJJJJJJJJLLL.',
    '....J.JJIJJJIIJJJJIIKKKKLJIIJJJJIIKKJJJJKLIJIIIIJJIIJKKKJJJJKKJKIIIJIJJJJJKKJJKLKKIIIJIIJKJJIIJJJJJJJJLLL.',
    '....IIIIIIIIKKIIIJJJJJKKKJIIJIJJIIJJKKJJJKIIIIIIJJIIJJKKJJKKKKKKIIJJIIJJJJIJKKKLLLJJIIIIIIKKJJKKJJJJJKKKK.',
    '....IIIIIIIJKKIIJJJJJJKKKIIIIJJJIIJJKKJKJKIIIIIIJJIIJJKKJJKKJKKKIIKKIIJJJJJJKLLLLLJJIIIIJIKKJJKKJJJJKKKKK.',
    '.....IIIJJJJIIJJJJJJJKJKLJIIIIJJJJJJKLLLKKIIJJJJIJJJKKJJJJJKJKLLJKJJIIJJKKJJKKLLLLJKIIIJKKJJJJJJKKKLLLKLL.',
    '......IIJJJJIJJJJJJJKKKKLJIIIIKKJJJJKLLLKKIIJJJJJJJJKKJJJJKKJKLLKKJJJJJJKKJJKKLLLLKKIIJIKKJJJJJJKKLLLLLL..',
    '....IIJJJJKKKKKKKKKKKKKLKIIIIJIIKKKKLLKKLLJJIIIIKKIJKKJJKKKKKLLLIIJKJJJJKKKKKKLLLLJJJJJJKKKKJJKJKKKKKKKKK.',
    '....IIJJJJKKKKKKKKKKKKLLKIIIJJJJKKKKLLKKLLJJIIIIKKJJKKJJKKKKLLKLIIKKJJJJKKKKKLLLLLJJJJJJKKKKJJKKLLLLKKKLL.',
    '......JKJKKKJJKKJJKLLLKKKIJJJJIJKJKLKKKKLLKKKKJJJJKKKKKKKKKKKLKLJJJJKKJJJJKKKKKKLLJJKKJJJJKKKKLLLLKLLLLLL.',
    '.......KKKKKJJKKJKLLLLKKKIJJKKJJKKLLKKKKLLKKKKJJJJKKKKLLKKLLLLLLJJJJLLJJJJKIIIIIJJJJKKJJJJKKKKLLLLLLLLLLL.',
    '.......IIIJJKKKKKKLLLLLLLKKJIIJKKKKKKLKLKL.JJJKKKKJJKKKKKLIIJJJ.KKJJKKKJIIIIIIIIJJKKKKKKKKKKKJKKLLLLLLL.L.',
    '.......IIIJJJJIJKKLLLLLLJJIJIIJJJJIJLLLLII.IIIJKKKJJKKKIIIIIIJJ..KJJKKIIIIIIIIIIJJKKKKKKKKIJIIIJJJJJLLLLL.',
    '....II.IIJJJIIJJKKKKLLIII.IIJIIIIIIIJJLI....IJIIIJKKKIIIIJJJIIJJI..KIIIIJJJJIIIIJJJJ.JKIIIIJIIJJIJIIJJLL..',
    '...IIIIIIJJJIIJKJKJKLI.IIIIIJJJIIIIIJKK.IIJJJJIIIIJIIIIIIIIJIIIJIJK.IIIIJJJJIIIIJJJJJJKIIIJJIIJJIIII......',
    '...JIIJJIIIJJKJJKKJ...IIIIIIIIIIJJJJJK.IIJIIIIKJKKJIIIIIJJJJJJJJJKJJKIIIIIJJJJKKKJKKJJKIIIIIIIJJIJKKK.....',
    '....IIJJIIJJKKJKKKKJ..IIIIIIIIIIJJJJJJJIIJIIIIKKKKJIIIIIJJJJJJJJJKJJKIIIIIJJJJKKJJKKJJKIIIIIIIJIJJJKKKKK..',
    '...JIIIIIIIIIJIJJJJJ.IIIIIIIJJJJIJJJJKJIIIJJIIIJJJJIIIJJIIJJJKIJKKKKJIIIIIJJKKIIKKKKJKIIJJJJJJJJJJKKKKJJL.',
    '...JJJIIIIIJIJIIJJJK.IIJIIIIJJJJIJJKJKJIIIJJIIIIJJJIIIJJIIJJKJJJKKKKJIIIIIJJJJIIKKKKKKIIJJJJJJJJJJKKKKJJLL',
    'IIJJJJIIIIJKKKJKJJKKIIIIIIIIJJIIJJJJKKKJJJIIJJKKJJKJIIJJIIIIJJJJIJJJKJJJJJJJJJIJJJKKJKIIIIJJJJJJKKJJJKKKLL',
    'I.JJJJIIIIJKKKKKJJKKIIIIIIIJJJJJJJJJKKLJJJIJKKKKJJLJIIJJIIIIJJJJJJJJKJJJJJKKJJIJJJKKKKIIIIJJJJJJKKJJJJLL..',
    'JJJJIIJJJJIJIJJJJJKKIIIIJJJJJJKKJJJJJJKJIJIIJJJJKKKJJJIIIJJKIJJJKKKKLJJJJJJJIJJJKKKKKKJJJJJJIJIIIJKKJJKL..',
    'J.JJIIJKJJIJJJJJJJKKJIIIIJJJJJKKJJJJJJLJIIIIJJJKKLKJJJIIJJKKJJJJKKKKLJJJJJJJJJJJKKKKKKJJJJIJIJIIIJLLJJLLL.',
    'IIIIJJJJKKJJJJJKKLLLJJIIIIIJJJJKKKKKJJLKKKIIKKJJKKKIIIIIJJKKJJKKKKJKKIJJKJKKKKJJKKKKKKIIJJKJJJIJJJKKKKLLLL',
    '..IIJJJJKKJJJJKKKLLLJJJIIIJJJJKKKKKLKKLLKKIIKKJKKKKJIIIIJJKKIJKKKKKKKIJJKKKKJKKKKKKKLLIIKJKKJJJJJJKKKKLLLL',
    '.JJJIJKKJJJJKKKKLLKLKKIIKKIIKJJJKKJJLLLLJJKKJJKKLLLKIJKKKKJJJJKLKKLLLJIIJJJJKKKKKKKKLLIIJJIIJJKJJJJJKKLLLL',
    '.KJJIIKKJJJJLLLLLLKLKKIIKKIIJKJJKKJKLLLLJJKLJJLLLLLKJJKKKKJJJKLLKKLLLKJJJJJKKKJKKKKLLLIJJKJIJJKKJKJKKKLLLL',
    '.JKKKKKKKKKKKJKLLLKKJJJJIJJJJKJJLLKKKLLLJJJJLLLLKKLKJJKKJJKLLLKKLLKKLJIJJJKKKKKKLLKKLLIJJJKKJJKLJJKKLLLL.L',
    '...KKKKKKKKKKKLLLLKLJJJJJJJJKKJJLLKKLLLLJJJKLLLLKKLKJJKKJJLLLLKKLLKLLKJJJJKKKKLLLLKKLLJIJJKKJJLLKKKKLLLLLL',
    '.....KKKKKKKLLLLLLLL.KKKJJKKJKKKLKKLKKLLKKLKKKLLLLLKJKKKLLKKKKKKLLLLL.KKKKKKKKKLKKLLLLKKJJJJKKLLKKKLKKLLL.',
    '.....KKKKKKKLLLLLL...KKKJJKKJKKKLLLLLKL.KKLLKKLLLLNKKKKKLLLLKKKKLLLLL.KKKKKKKKKLKKLLL..KJJJJKKLLKKKLKLLL..',
    '.....LLLLLKKLLLLLLLLKK.LJJKKKKKKKKLLLL....LLLLK.M..NKLKLLLKKLLLLLLLLLLL.KKKKLLLLLLLLLLKKJKKKLKKKLLLLLLLL..',
    '......LLL.KLLLLLLL.....LKJLLKKKKKKLLLL....L.LLLLMMNNO.OLLLKLLLLLL.......KKLKLLLLL.......KKKLLLKLLLL.LL....',
    '..........L..LLL..........KKLLKLLLLLL.....LLL.LLMMNN.P.OLLLLKLL.LL......LLL.KK..L........K.KLLLLLLLLL.....',
    '..........L..............KKL.LLLLLL.............MMNNOPOO.P.LL.LLLL........LLLL...........LKKL....LLL......',
    '.........................KLLKKLLLL..............MMNNNPOOO.................................................',
    '............................LLLLL...............MMNNNPOOOP................................................',
    '................................................MMNNNPOOOP................................................',
    '................................................MMMNNNNOOPP...............................................',
    '................................................MMMNNNNOOPP...............................................',
    '................................................MMMNNNNOOPP...............................................',
    '................................................MMMNNNNOOPP...............................................',
    '................................................MMMNNNNOOPP...............................................',
    '................................................MMMNNNNOOPP...............................................',
    '................................................MMMNNNNOOPP...............................................',
    '................................................MMMNNNNOOPP...............................................',
    '................................................MMMNNNPOOPP...............................................',
    '...............................................MMMNNNPOOOPP...............................................',
    '...............................................MMMNNNPOOOPP...............................................',
    '...............................................MMONNNPOPOPP...............................................',
    '...............................................MMONNNPOPOPP...............................................',
    '...............................................MMMNNNNOPOPP...............................................',
    '...............................................MMMNNNNOOOPP...............................................',
    '...............................................MMMNNONOOOPP...............................................',
    '...............................................MMMNNONOOOPP...............................................',
    '...............................................MMMNNOPNOOOPP..............................................',
    '...............................................MMMNOOPNOOOPP..............................................',
    '...............................................MMMNOOPNOOOPP..............................................',
    '...............................................MMMNONPNOOOPP..............................................',
    '...............................................MMMNNNNNOOOPP..............................................',
    '...............................................MMMNNONNOOOPP..............................................',
    '...............................................MMMNNONNOPOPP..............................................',
    '...............................................MMONNNNNOPOPP..............................................',
    '...............................................MMONNONNOPOPP..............................................',
    '..............................................MMONNONNNPOOPP..............................................',
    '..............................................MMMNNONNNPOOPP..............................................',
    '..............................................MMMNNONNNOOOPP..............................................',
    '..............................................MMMNNNNPNOOOPP..............................................',
    '..............................................MMMNNNNPNOOOPP..............................................',
    '..............................................MMMNNNNPNOOOPP..............................................',
    '..............................................MMMNNNONNOOOPP..............................................',
    '..............................................MMMNNNONNOOOPP..............................................',
    '..............................................MMMMNNNNNOOOOPP.............................................',
    '..............................................MMMMNNNNPOOOOPP.............................................',
    '..............................................MMMMNNNNPOOOOPP.............................................',
    '..............................................MMMMNNNNPOOOOPP.............................................',
    '..............................................MMMMNNNNPOOOOPP.............................................',
    '..............................................MMMMNNNNPOOPOPP.............................................',
    '..............................................MMOMNNONNOOPOPP.............................................',
    '..............................................MMOMONONNOOPOPP.............................................',
    '..............................................MMMMONONNOOPOPP.............................................',
    '.............................................MMMMONNNNNOPOOPP.............................................',
    '.............................................MMMMONNNNNOOOOPP.............................................',
    '.............................................MMMMONOONNOOOOPP.............................................',
    '.............................................MMMONNOONNPOOOPP.............................................',
    '.............................................MMMONNONNNPOOOPP.............................................',
    '.............................................MMMONNONNNPOOOPP.............................................',
    '.............................................MMMMNNNNNNPOOOPP.............................................',
    '.............................................MMMMNNNNNPPOOOPP.............................................',
    '.............................................MMMMNNNNNPOOOOPP.............................................',
    '.............................................MMMMNNNNNPNOOOOPP............................................',
    '.............................................MMMMOONNNPNOPOOPP............................................',
    '.............................................MMMMOONNNNNPPOOPP............................................',
    '.............................................MMMMOONNNNNPPOOPP............................................',
    '.............................................MMMMOONNNNNPPOOPP............................................',
    '.............................................MMMMOONNNNNPOOOPP............................................',
    '.............................................MMMMNNNNNNNPPOOPP............................................',
    '.............................................MMMMNNNNNNNOPOOPP............................................',
    '............................................MMMMNNNNNNNOOOPPPP............................................',
    '............................................MMMMNNNNNNNOOOPPPP............................................',
    '............................................MMMMNNNNNNNOOOPPPP............................................',
    '...........................................MMMMMNNNNNNNOOPOOPPP...........................................',
    '...........................................MMMMMNNNNNNNOOOOOPPP...........................................',
  ],
};

/** La mata de la pradera, con sus bayas. */
export const MEADOW_BUSH: WorldArt = {
  rows: [
    '........................',
    '........................',
    '.........QRRQQ..........',
    '.........Q...Q..........',
    '........QQQRRRRR........',
    '......RRQQQRVURSR.......',
    '......QQRRQRUURQR.......',
    '......RRRRRRRRQRRR......',
    '....QQQQQQQQQQSSSS......',
    '....Q.QRQQQQRRSVUQQQ....',
    '...QQQQQRSRRRSQUURR.....',
    '..QQ.QQQRRRSQQQQRRSS....',
    '.RQQQQRRRRRRQQQQRRRRRS..',
    '.RQQQQVURRRRQQQQRRRRRS..',
    'RRQQRRUURRSSQQSSSSQRSSTT',
    'R.QQRRRRRRSSQQSSRSRRSTTT',
    'QRQQRRRRQRRRQRQRSSRSSSTT',
    'RRQQRSSRRRRRRQRRSSRSSS..',
    '.QRRRRSSRSRSTSSSRVUTST..',
    '..RRSSSSSSVUTSSSSUUTT...',
    '...SSSSSSSUUTSSSSTSST...',
    '....SSSSSSTTTSSSTTSST...',
    '.....TSSSSTTTTS.TTTT....',
    '.....TSS.TTTTT....TT....',
    '..........TTW...........',
    '...........WW...........',
    '...........WW...........',
  ],
};

/** La piedra de la roca de voxeles: una tesela que casa consigo misma. */
export const STONE: WorldArt = {
  rows: [
    'aaaaaaaaaabbbbbbaaaaaaaa',
    'baaaaaaaabbbbbbbaaaaaaaa',
    'bbbbaaabbbbccbbaaaaaaaab',
    'bbbbbbbbbbccccbaaaaaaaab',
    'bbbbbaabbccccabbaaaaaaab',
    'bbbbaaaabcccccdbaaaaaaab',
    'bbbbaaaabcccccdbaaaaaaab',
    'bbbbaaaabbcccccddadaaabb',
    'bbbbbbabbbcccccbbdaaabbb',
    'cccbbbbbbbcccccbbaaabbbc',
    'cccbbbbbbbccccccbbbbbbcc',
    'cccbbbbbbbcccccccbbbbbcc',
    'ccbbbbbbbbcccccccbbbbbcc',
    'ccbbbbbbbbccccccccbbbbcc',
    'ccbbbbbbbbcccccccccacccc',
    'ccbbbbccbbbbbbbbbcccdccd',
    'dbbbbbccbbbbbbbbcccccdbd',
    'bbbbbbbbbbbbbbbbcccccbdb',
    'bbbbbbbbbbbbbbbbcccccbbb',
    'bbbbbbbbbbbbbbbaccccbbbb',
    'bbbbbbbbbbbbbbbbdccdbbbb',
    'bbbbbbbbbbbbbbbbdbddbabb',
    'bbbbbbabbbbbbbbbadaaaaab',
    'bbaaaaaaaabbbbbbaaaaaaaa',
  ],
};

/**
 * La forma de la roca de voxeles: [este, sur, arriba], en medios bloques. Abajo,
 * los cuatro; arriba, tres: le falta la esquina de delante a la derecha
 * (*deduccion*: el autor pidio «forma irregular, no un cubo perfecto»).
 */
export const ROCK_SHAPE: readonly (readonly [number, number, number])[] = [[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1]];
