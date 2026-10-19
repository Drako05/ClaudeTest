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
  I: '#86b94a', // hoja del roble: luz
  J: '#4f8f38', // hoja del roble: base
  K: '#2f6630', // hoja del roble: sombra
  L: '#1c4026', // hoja del roble: hondo
  M: '#b5793f', // corteza del roble: luz
  N: '#8b552c', // corteza del roble: base
  O: '#5f3820', // corteza del roble: sombra
  P: '#3b2216', // corteza del roble: hondo
  Q: '#9bd25a', // hoja de la mata: luz
  R: '#58a63c', // hoja de la mata: base
  S: '#2f7a33', // hoja de la mata: sombra
  T: '#1d4a27', // hoja de la mata: hondo
  U: '#c8203a', // baya: base
  V: '#ff6b6b', // baya: brillo
  X: '#7d1028', // baya: sombra
  W: '#6b4024', // tallo de la mata
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

/** El roble: una sola masa de hojas en cupula, del tamano de su especie, sobre su tronco medio. */
export const OAK: WorldArt = {
  rows: [
    '..........................................................................................................',
    '..........................................JIJJJIJJ............I...........................................',
    '.........................................IJIIJIJJJJ....JIJJJJIII..........................................',
    '..................................I.....IIJIJJIJJJJJIIIJJJJJJIIIJJ........................................',
    '...............................JIJIJJJJIIIIIJJIKJJJJJIJJJIIJJIJIJJJJI.....................................',
    '.............................IJJIJJKJJJJIIIIIIJIJJJJIIIJIIIKJJIJJJJIJ.....................................',
    '..........................IIIJIJIIJIJJJJIIIIIIIIJJJIIIIIJIJKJJIKIJJJKK...JJJJJ............................',
    '..........................IIJIIIIIIIIIJJJIIIIIIJJJJIIIIIJIJJJJIKIKJJKKIJIIJJJJJ...........................',
    '.........................IIIIIIIIIIIIIIIJJIIIIIJJJIIIIIIIIIJJJIJJKJJJJIKIIJJJJKK..........................',
    '........................IIIIIIIIIIIIIIJJIJJIIIIJJJIIIIIIJIIJJJJJJJJJKJJKLIIJJJKKK.........................',
    '.......................IIIIIIIIIIIIIIIJJIKJIIIIIJIIIIIIIIIIJJJJJJJJJIKJJIJIJJJKKK.........................',
    '.......................IIIIIIIIIIIIIIIJJJIJIIIJIJIIIIIIIIIIJJJJJJJJIKKJKJIIIJJIIK.........................',
    '......................IIIIIIIIIIIIIIIIJIJJKIJJIIIIIIIIIIIIIJJJJJJJJIKKKKJIIJJJIKK.........................',
    '.................I....IIIIIIIIIIIIIIIIJJJIJIJJJIIIIIIIIIIIIIJJJJJIJJKKKKJIJJJIJKIKJ.......................',
    '.................IIIIJIIIIIIIIIIIIIIIIJJIJKIJJJIIIIIIIIIIIKIJJJJJIKKKKLKJIJJJJKIJJKKK.....................',
    '...............IIIIIIIIIIIIIIIIIIIIIIIJJIKJIKJKIIIIIIIIIIIIIJJJJJIKKJKKKIJJJJJJJKJJKKK....................',
    '.............JIIIIIIIIIIIIIIIIIIIIIIIIJJJJJIKJJIIIIIIIIJIJIKKJJJJJJJKLKJIJJJJJJJJJJKKKK...................',
    '............IIIIIIIIIIIIIIIIIIIIIIIIIJIJJJJIKKJIIIIIIIIJJJJJJJJJJKLJLLKIIIJJJJJJJJKKKKKJJJKK..............',
    '...........IIIIIIIIIIIIIIIIIIIIIIIIIJIJJJJJIKJIIIIIIIJJJJJJJJJJJJLKKLKJIIJJJJJJJJJKKKKKJJJJKKK............',
    '..........IIIIIIIIIIIIIIIIIIIIIIIIIJIIKJIJJKIIIIIIIIIJJJJJJJJJJKJKKKKKIIIIJJIJJJJKKKKKKKJKKKKKL...........',
    '.........JIJIIIIIIIIIIIIIIIJIJJIIIIJJJKJIJJJIIIIIJIJJJIJJJJJJKKKKLKLKKIIJIJIJJJJIIKKJKKKJJKKKLK...........',
    '........IIJIIIIIIIIIIIIIIIIIJJJIIJJJJJJJJKJIIIIIJJIJJJIJJJJJKKKKKLLLKIIIIIJJJJJIIKKKKKKJJKKKLJL...........',
    '.......IJIIIIIIIIIIIIIIIIIJIJJJJJJJJJJJJJKJIIIIIIJJKJJJJJJLKKKKLLLLKKIIIIJJJJJJIIKKKKKLKJLKKJLKL..........',
    '........IJIIIIIIIIIIIIIIIIIJIJJJJJJJJJJLJJIIIIIIJJJJJJJJJJLKKKLLLLLKKIJJJJJJJJIJIIIKLLLLKKKLKKKKK.........',
    '........JKJIIIIIIIIIIIIIIIIJJIJJJJJJJJJLJIIIIIIIJIJJJJJJJLLKLLLLLLKKIJJJJJJJJIIKIJLKLLLLKJJKLKKKKLK.......',
    '........JJJJIIIIIIIIIIIIJIJJJJIJJJJJKKJKILIIIIIIJIKJIJJJKKKKJLLLKKKKJJJJJJJJIKKKJKLLLLLKJKLLKKKKLKL.......',
    '........JJJJJJIIIIIIIIIIJJJJJJIKKKKKKKKLIIIIIIIJJJKIIIKKKKKKJKKKKKKKJJJJJJJJKKKKJLLLLLLKKLKKKKKLLLL.......',
    '.......IIIIJJJIJIIIIIIJIJJJJJJJKKKKKLLKIIJJJJJJKJJJIJIJKKKLKJKKKKKKKKJJJJJJJKKKJKLLLLLLKKKJKKKKLLLL.......',
    '........JIIKJJJJJIIIIJJJJJJJJKKKKKKLLKJJJJJJJJJJJJJIKKKKKKKKJJJKJJJJJJJJJKKKKKJLLLLLLLKKKJJLKKLLLLL.......',
    '........JJJIJJJIJJKIJIJJJJJKKKKKIIKKKKJIJJJJJJJJJJJJKKKKKKLKKJKJJJJJKJJLKKKKKKLKKLLLLLKKJKJLLLLLLLL.......',
    '........JJJJKJJIJIJJIJJJJJJKKJKKIIIJJKJJIJJJIJIJJJJJLKKLKKLLKKKJJJJKJJJKKKKKLLLKLLLLLKKKJJJKKLLLLLL.......',
    '.........JJJIJJJKIIJJIJJJJJKKJLIIIIJIJJJIIJIIJIKJJKJKKKLLLLJKKKIIKKKJLJLKKLLLLLLLLLLKKKJJJLLKLJLLL........',
    '.........JJJIIJJJJKIJJIJJKKLLKJIIIJJIIJJJIIJIJJJKJKKLKOOLLLJLKIIIKJKLLKLKKKKIILLLLKKJKKJLKLKKJLLL.........',
    '..........KJJKIJJJJJKJJKKLKJLKILIIIJJJIJJJKJJKJKKKKKKLOOLLKJIIIJJKJKKKKIIIJIIKJKLKKJKLKKKKKKLLLLLL........',
    '..........JJKKKKJJKKKKKKKKLLJJJJIKJJJJJJJKKJLIJKKKLLLOOOKKKJIKJKJJJKJIIIJJJIKJIKKKKKKKKJKKKLLLLLLL........',
    '.........JIIJIKKKKKKKKKKLLLKKJJJJIJJJJKIKJKJKKIKKLLLJOOOKKKJIJJJJJKKJIIIJJJJJIJLKKKKKJJKLLKLLLLLLL........',
    '........JJIKIJIKKKKKKKLLKLLKKJJJJJJJJKKIKKLILLLLLLLLJOOOKKKJJJJJJKKKIIIJJJJJJJKLJKKKJKLLLLLLLLLLLLL.......',
    '.......IJJJIIJJKKKKKLKKKIIKKJJJJJJJKKKKIIKKIKKLLJLLJLKKKKKKJJJJKKKKKJJJIJJJJJKKJKJKKKLKLLLKKLLLLLLL.......',
    '........IJJJKIJJJKLIKKKIIIIJJJJKKKIKKKKIIKJIKKKKJKIJLKKKKKKKJJKKKKKKJJJIKJKJKKKKJKKKKKLLLKLLLLLLLLL.......',
    '........KKJJJJJJJJJJIIIJJJJKJJKKJJJIJJJJJKJJJKKKJLIJJJJKKKKKKKKKKLKJJJIJKJKKKKKJLKLLKLLLLLLLLLLLJJ........',
    '........KKKKJJKJKKJJJKIIJJJJJJJJJJIJKJJJJJJJJJIJJLIJJJJJJJJKKKKKLLKJJJJKKKKKKLLLKLLLLLLLLLLLLLKJLL........',
    '.........KKKKKJKLJJJJJJKKJJJJJJJJJJJJJJJJJJKJIIJJJJKJJJJJKKKKKLLLLKJJJJKKKKKLLLLLLLLLLLLLLLLLKLLLL........',
    '.........KKKKKKLKJJJIIJJJJJIIJJJJJJJJJIJJJJKJIJJJJJJJJJJKKJJKKLLLLKJJKKKKKLLLLLLLLKLLLLLLLLLLLLLL.........',
    '..........KKKKKKKJJKJJIJKKJKKIJJJJJJJJIJJJJKJIJJJJJJJJJKKJJLKKLLLKKKKKKKKLLKLLLLLKLLLLLLLLLLLLLLL.........',
    '...........KKKLLKKKKKKKKKKKKKJKJJJJJJJJIJKKJJJIJJJJJJKKKKKKLKLLLJKKKKKKKLKKKLLLLLLLLLLLLLILLLLLL..........',
    '................KKKKKKKKKKKKKJJJJJKJJJKKKKJJJJJKJJJKKKKKKKLLLLJJLKKKKKKLKKLLLLLLLLLLLLLLIJLLLLL...........',
    '................KKKKKKKKKKKKKJJKJJKKKKKKKKKLJJJJJJKKKKKKKLLLLJLLLKLLKKLLLLLLLLLLLLLLLLJKIKLKLLL...........',
    '................JKKKKKKKKKKLKJJKKKLKKKKKKKLLKKKKKLLKKKKKPLLLLKLLLLKKKLLLLLLLLJLLLLLLKKJLJKJKKKKKJ.........',
    '................IIJKKKKKKLLLJJJJKKKKKKKKKLLLKKKKKKKKKKKOPKLLKLLLLKKLLLLLLLLLLJLLLLLKKKKJKLJKKIKKJK........',
    '..............IIIIIJIKKLLKLKKKJLKKKJKKKKLLLLLKJKKKKKKOOOKLLLKLLLLLLLLLLLOLLLLJLLLKKKKKKKKJJKIIKKKLK.......',
    '.......I......IIIIIJJJKIKKKKKKKLKKKKJKLLLLLLLKKJKKKKOOOOPLLLLLLLLLLLLLLOOLLLLJKKKKKKKKKKJJJJLIJJKKK.......',
    '.......IIIIJIIIIIIIJIJIIIIIIJIKKKKKKKOLLLLLLLLKJLKKOOOOOPLLLLLLLKLKJJLLOOLKKKKJKKKKKKKIJIJJJIKJJIKK.......',
    '......IIIIIIIIIIIIIJIIIIIJJIJJIKKKKLOOLKLLLLLLKKKLLOOOOOPLLLLLLKKLJLLLLOKKKKKKJLKKKKKIKKIKKIJJJIKJLL......',
    '.....IIIIIIIIIIIIIIIIIIIIIIIKJJJKJLKOKLLKLLLLLLKLKLOOOOOPLLLLLKLLLLKLLLKKKKKIIIJJJJJJIKJJIJJJJIJJJLK......',
    '.....IIIIIIIIIIIIIIIIIIIIIIIKJJJJJLLOOKLLLJLLLKLLKLOOOOOPLLLLLLLLKKLLLKKIIIIIIIIJIJJIJKIIJJIJJIKJKL.......',
    '.....IIIIIIIJJIIJIIIIIIIIIJJIJJJJJLLOOLLLLLJKLLKKLLOOOOOPLLLLLLKKLKLLKKIIIIIIIIJJIKJJIIIIIIIJJIJJLK.......',
    '.....JIIIIIIIIIIIIIIIIIIIIJJIKJJJJKKKOLLLLLLLKLLLKLOOOOOPLLLLLKKKKLLKKIIIIIIIIJIJIKJJIKIIJIKJJJKKLKK......',
    '.....JIIIIIIIIIJIIIIIIIIIIJJJKJJJJKKKOLLLLLLLLLLKLLOOOOOPLLLLKLKLLLLKKIIIIIIIJJIKJKJJIIIIIIKJJJJKKKLL.....',
    '.....IIIIIIIIIIJIIIIIIIIIJIJJJJJJJKKKKLLLLLLLLLLKKOOOOOOPLLLLLLLLLIJJKJJJIIIKJJIKJJJKJIIJJJKJJKKKKILL.....',
    '....IIIIIIIIIIIJIIIIIIIIIJIKJJJJJJJKKKKLLLLLLLLLLLKOOOOOOLLLLLLLKLJIIJJJJIJIKJJIKJJJKKIIJJJJJJKKKIKKLL....',
    '...IIIIIIIIIIIIJIIIIIIIIIIJIJJJJJKKKKKLLLLLKLLLLLLOOOOOOOLLLLLLKKKKLKIJJJJJJKJJJKJKKJJIIJJJJJKKKJJKLLL....',
    '...IIJIIIIIIIIJJJIIIIIIJJJIJKJJKKLKKOOLLLLLKKLL.LLKOOOOOOLLLLLKLJKKKKIJIJJJJJJJJJKKKJJJJJJJJJKKJKLLLLL....',
    '.IJIJIJIIIIIIIJJJIJIIKJJJJJJJJKKKKKKOOLLLLKLLLLJLLJKOOOOOLLLLLLKKJIIKJIJIJJJJJKKKKKLJJIJIJJJKKKKLLLLLLL...',
    '..IJIJJJJIJJJJJJJJJJJKJJJJJJJKKKKKLOOOLLLLLLLL.JLIKOKKKOOJLLLLKKKKKKIKJKJKJKKKKKKKLLKLJIJKKKKLLLLLLLLLL...',
    '..JJJKJJJJJJJJJJJJJJJJJJJJJKPKKKKOOOOOLLLLKKL.KKLIOKKKKKKJLLKKLKKKKJJKKKKKKKKKKKLLLLKJJJKKKKLKLLLLLLLLK...',
    '..JJJJIJJJJJJJJKJJJJJJJJJKJLKKOOOOOOOOLLLKLL..KKKJKKKJKKKPLLKL.KKKKIIKKKKKKKKKLLLKLLKKKLKKLLKLLLLLLLLKK...',
    '..JJJJJIJJJJJJJKKKKJJKKJKLKKKKLPOOOOOPOOLLL...KKKKOKKKJKKPLLKL.KKKKKKIKKKKKKKLLLLKLLKKLKKLLLKLLLLKKLKL....',
    '..KJKKKKKKKKKKKJKKKKLKKJLKKKLLLLPOOOOPOOOOJ..KJKKKJJKKJOOPLLLL.MKKKKIIKKKKKLLLLLLLKJKKKKLLLKLLLLKLKLLK....',
    '..KKKKKKKKKKKKKLLLKKKKKKKKLKKLLLLPOKOPOOOJMMKKJLKKJKKKKJKPLLLOOMMOKKKKIJKLLLLLLLLLKJKLLLLLLLLLLLLKLKK.....',
    '...KKKKKKKKKKKLLLLLKKKKKLLLKLLKLLLKKOPOOKKMKKKKLKKKKKKKJKPLOOOOOKNKKKJKKKKLLLLLLLKKLLLLLLLLLLLLLLLKLL.....',
    '...KKKKKKKKKKLLLLLLKKKKLLLKKKKLLLKOOOPOOKNNKKKKKKKKKKKKKKPOOOKOKKKOJKKJJKKKLLLLKKKKKLLLLLLLLLLLLLLLL......',
    '....JKKKKKKLLLLLLLLLKLLLLLLKLLLLLLOOOPOOONKKKKIKKKKKKKKOOPOOKOOKOOOKJKKKKKKLLLKKKLLKLLLLLLLLLLLLLLL.......',
    '....KJKKKLLLLLJJKLLLLLLLLLKKLLLLLLOOOPPOOOKKKKIKKKKKKKOOOPOKOOOOOOKKKKKKKLKLLKLKKLLLLLLLLKLLLLLLLL........',
    '.....LLLLLLLLLLLJKLLLLLLLKKLLKKLLLLOOLLPPOOKKKOJKKKKOOOOOPOKOOOOOPL.KKKKLLLLLLKKLKLLLLLKKLLLLLLL..........',
    '.......LLLLLLLLLKLKLLLLKLKLLKLLLLLLLKL..PPOOKOOOJKKKOOOOOPKOOOOOPLLK.KLKLLLLLLLLKLLLLLKLL.LLL.............',
    '........LLLKKLLLLLLKLLLKLLLKLLLLLKKKL.....POOOOKJOKKKOOOOPOOOOPPLLK...LLLLLL..LLLLLLLLLL..................',
    '.............KLLKKLLLLKLLLLLLLLLKLL........POOOKKJKKKKKKOPOOOPPLLL......LL....LLLLLLLLL...................',
    '..............LLLKKLLLKL.LLLLLLL............PPOKKJOKOOKKOPOOPLLLLL..............LLLLLL....................',
    '..............LLLLLLLLL......................PLKKLJLLLLLLLLLLLLLL.........................................',
    '................LLLLLL........................LLLLKLLLKLLLLLLLLL..........................................',
    '..............................................MLLLLKLLKLLLLLL.............................................',
    '..............................................MMLLLLLLKLKKLL..............................................',
    '..............................................MMMNLLNPLKLLPP..............................................',
    '..............................................MMMNNPNPOOOPPP..............................................',
    '..............................................MMMNNPNPMOOPPP..............................................',
    '..............................................MMMNNPNPOOOPPP..............................................',
    '..............................................MMMNPPNPMOOPPP..............................................',
    '..............................................MMMNPNNNPOOPPP..............................................',
    '..............................................MMNPNNNNPOOPPP..............................................',
    '..............................................MMNPMNNNPOOPPP..............................................',
    '..............................................MMNPMNNNPOOPPP..............................................',
    '..............................................MMNPMNNNPMPPPPM.............................................',
    '..............................................MMNPMNNNPMPMPP..............................................',
    '..............................................MMNPNNNNOPPMPP..............................................',
    '..............................................MMPMNNNNOPPOPPM.............................................',
    '..............................................MMPNNNNNOPPMPPM.............................................',
    '..............................................MMPNNNNNOPPMPPM.............................................',
    '..............................................MMPNNNNNOOPMPPM.............................................',
    '..............................................MMPMNNNNOOPNPP..............................................',
    '.............................................MMPPPPNNNNPPPPPP.............................................',
    '.............................................MMPMNNNNNNPPNPPP.............................................',
    '.............................................MMPMNNNNNNPPPPPP.............................................',
    '.............................................MMPMNNNNNNPMOPPP.............................................',
    '.............................................MMPMNNNNNNPMOPPP.............................................',
    '.............................................MMPMNNNNNNPMOPPP.............................................',
    '.............................................MMPMNNNNNNPOOPPP.............................................',
    '.............................................MMMPMNNNNPPPOPPP.............................................',
    '.............................................MMMPNNNNNPPMOPPP.............................................',
    '.............................................MMMPMNNNNPMOOPPP.............................................',
    '.............................................MMMPNNNNNPMOOOPP.............................................',
    '.............................................MMMPMNNNNPMOOOPP.............................................',
    '.............................................MMMPNNNNPPOOOOPP.............................................',
    '.............................................MMMPNNNNPPMOOOPP.............................................',
    '.............................................MMMPMNNNPPOOOOPP.............................................',
    '.............................................MMPPNNNNPPMOOPPP.............................................',
    '.............................................MMPMNNNNPPMOOPPP.............................................',
    '.............................................MMPMNNNNPPMOOPPP.............................................',
    '.............................................MMPMNNNNPMOOOPPP.............................................',
    '.............................................MMPMNNNNPNOOOPPP.............................................',
    '.............................................MMPMNNNNPPPOOOPP.............................................',
    '.............................................MMPMNNNNPPMOOOPP.............................................',
    '.............................................MMPMNNNNPPMOOOPP.............................................',
    '.............................................MMPMNNNPNPOOOOPP.............................................',
    '.............................................MMPMNNNPNPMOOOPP.............................................',
    '.............................................MMPMNNNPNPMOOOPP.............................................',
    '.............................................MMPMNNNPNPOOOOPP.............................................',
    '.............................................MMPMNNNPNPOOOOPP.............................................',
    '............................................MMMPMNNNPNNPPPPPPP............................................',
    '............................................MMMPMNNPMNNPMOOPPP............................................',
    '............................................MMMPMNNPMNNPOOOPPP............................................',
    '............................................MMPMMNNPNNNPMOOPPP............................................',
    '............................................MMPMMNNPMNNPOOOPPP............................................',
    '............................................MMMPNNNPMNNPMOOPPP............................................',
    '............................................MMMPMNNPNNNOPPOPPP............................................',
    '............................................MMMPMNNPNNNOPOOPPP............................................',
    '............................................MMMPNNPPPNNOPOOPPP............................................',
    '............................................MMMPMNPMNNNOPMOOPP............................................',
    '..........................................MMMMPMNPNNNNNOPMOOPPPP..........................................',
    '.........................................MMMMPMNNPNNNNNOOPMOOPPPP.........................................',
    '.......................................MMMMMPMNNPNNNNNNNOPMOOOOPPPP.......................................',
    '.....................................MMMMMMPMNNPMNNNNNNNOOPMOOOOPPPPP.....................................',
    '.................................NMMMMMMMMMNNNNNNNNNNNNNNOOOOOOOOOPPPPPP.O................................',
  ],
};

/** La mata de la pradera, con sus bayas. */
export const MEADOW_BUSH: WorldArt = {
  rows: [
    '..........................',
    '..........................',
    '...............Q..........',
    '........Q.....RQ..........',
    '........QQQ.RQRVURS.......',
    '.......QQQRQQRQUXRTR......',
    '.....QQQQVUQQQQRRRSR......',
    '....QQQQQUXQQQRSQRSRT.....',
    '...QQQQQQRQQQRRQRRSVU.....',
    '...QRQQQQRQQQRQQSRSUXSR...',
    '...RRQQVURRRRQVUSRTRSRTT..',
    '...RRRQUXSRRRQUXRTTRSSTT..',
    '...QRRQSQRRRRSSRTRSSRTT...',
    '..RRRRRRQQRRSSTRRSTRSTTS..',
    '.RRRVURRRSQRSSTRRVUTTTS...',
    '..RSUXRRSSSSSTSSSUXTTTT...',
    '...TSTSRSSSSTTSSSTSSTSS...',
    '....SSSSSSVUTSSTTSTTSTT...',
    '.....SSSTTUXTTTTTTTTTT....',
    '......TSTTTTTTTTTTTT......',
    '........TSTTTTTTTT........',
    '........WTSTTTTTTW........',
    '.........WW.WW.WW.........',
    '..........WWWWWW..........',
    '...........WWWW...........',
    '............WW............',
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
