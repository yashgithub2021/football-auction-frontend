// GENERATED from backend/src/domain/players/players.ts by scripts/sync-shared.mjs. Do not edit: change the backend, then run `npm run sync:shared`.
/**
 * Predefined all-time player pool.
 *
 * RATINGS ARE EDITABLE GAME METADATA. They are subjective values chosen to
 * make post-auction team analysis interesting. They are NOT authoritative,
 * NOT scientifically derived, and NOT a claim about who is objectively better.
 * Edit any value freely; every rating must be an integer from 1 to 5.
 *
 * Rating categories:
 *   attacking   – goal threat and final-third output
 *   creativity  – chance creation, vision, passing range
 *   defending   – tackling, positioning, defensive work
 *   physical    – pace, strength, stamina
 *   technical   – ball control, dribbling, first touch
 *   sixAsideFit – how well the player's style suits small-sided football
 *   goalkeeping – shot-stopping and handling (outfield players are 1)
 *
 * To add a player: append an entry with a unique kebab-case id. Names use
 * plain ASCII spelling so they copy cleanly into chat apps.
 */

import type { Player } from "../types";

export const PLAYERS: readonly Player[] = [
  // -------------------------------------------------------------------------
  // Goalkeepers
  // -------------------------------------------------------------------------
  {
    id: "lev-yashin", name: "Lev Yashin", primaryPosition: "GK", secondaryPositions: [],
    nationality: "Soviet Union", era: "1950s–1970s",
    ratings: { attacking: 1, creativity: 1, defending: 3, physical: 4, technical: 3, sixAsideFit: 4, goalkeeping: 5 },
  },
  {
    id: "gianluigi-buffon", name: "Gianluigi Buffon", primaryPosition: "GK", secondaryPositions: [],
    nationality: "Italy", era: "1990s–2020s",
    ratings: { attacking: 1, creativity: 1, defending: 3, physical: 4, technical: 3, sixAsideFit: 4, goalkeeping: 5 },
  },
  {
    id: "manuel-neuer", name: "Manuel Neuer", primaryPosition: "GK", secondaryPositions: [],
    nationality: "Germany", era: "2000s–2020s",
    ratings: { attacking: 1, creativity: 3, defending: 3, physical: 4, technical: 4, sixAsideFit: 5, goalkeeping: 5 },
  },
  {
    id: "iker-casillas", name: "Iker Casillas", primaryPosition: "GK", secondaryPositions: [],
    nationality: "Spain", era: "1990s–2010s",
    ratings: { attacking: 1, creativity: 1, defending: 3, physical: 3, technical: 3, sixAsideFit: 5, goalkeeping: 5 },
  },
  {
    id: "peter-schmeichel", name: "Peter Schmeichel", primaryPosition: "GK", secondaryPositions: [],
    nationality: "Denmark", era: "1980s–2000s",
    ratings: { attacking: 1, creativity: 2, defending: 3, physical: 5, technical: 2, sixAsideFit: 4, goalkeeping: 5 },
  },
  {
    id: "oliver-kahn", name: "Oliver Kahn", primaryPosition: "GK", secondaryPositions: [],
    nationality: "Germany", era: "1980s–2000s",
    ratings: { attacking: 1, creativity: 1, defending: 3, physical: 5, technical: 2, sixAsideFit: 4, goalkeeping: 5 },
  },
  {
    id: "dino-zoff", name: "Dino Zoff", primaryPosition: "GK", secondaryPositions: [],
    nationality: "Italy", era: "1960s–1980s",
    ratings: { attacking: 1, creativity: 1, defending: 3, physical: 3, technical: 2, sixAsideFit: 3, goalkeeping: 5 },
  },
  {
    id: "gordon-banks", name: "Gordon Banks", primaryPosition: "GK", secondaryPositions: [],
    nationality: "England", era: "1950s–1970s",
    ratings: { attacking: 1, creativity: 1, defending: 3, physical: 4, technical: 2, sixAsideFit: 4, goalkeeping: 5 },
  },
  {
    id: "petr-cech", name: "Petr Cech", primaryPosition: "GK", secondaryPositions: [],
    nationality: "Czech Republic", era: "2000s–2010s",
    ratings: { attacking: 1, creativity: 1, defending: 3, physical: 4, technical: 2, sixAsideFit: 3, goalkeeping: 5 },
  },
  {
    id: "edwin-van-der-sar", name: "Edwin van der Sar", primaryPosition: "GK", secondaryPositions: [],
    nationality: "Netherlands", era: "1990s–2010s",
    ratings: { attacking: 1, creativity: 3, defending: 3, physical: 3, technical: 4, sixAsideFit: 4, goalkeeping: 5 },
  },
  {
    id: "sepp-maier", name: "Sepp Maier", primaryPosition: "GK", secondaryPositions: [],
    nationality: "West Germany", era: "1960s–1970s",
    ratings: { attacking: 1, creativity: 1, defending: 3, physical: 3, technical: 2, sixAsideFit: 4, goalkeeping: 5 },
  },
  {
    id: "thibaut-courtois", name: "Thibaut Courtois", primaryPosition: "GK", secondaryPositions: [],
    nationality: "Belgium", era: "2010s–2020s",
    ratings: { attacking: 1, creativity: 2, defending: 3, physical: 4, technical: 3, sixAsideFit: 3, goalkeeping: 5 },
  },
  {
    id: "alisson-becker", name: "Alisson Becker", primaryPosition: "GK", secondaryPositions: [],
    nationality: "Brazil", era: "2010s–2020s",
    ratings: { attacking: 1, creativity: 3, defending: 3, physical: 4, technical: 4, sixAsideFit: 5, goalkeeping: 5 },
  },
  {
    id: "jan-oblak", name: "Jan Oblak", primaryPosition: "GK", secondaryPositions: [],
    nationality: "Slovenia", era: "2010s–2020s",
    ratings: { attacking: 1, creativity: 1, defending: 3, physical: 4, technical: 2, sixAsideFit: 3, goalkeeping: 5 },
  },
  {
    id: "rene-higuita", name: "Rene Higuita", primaryPosition: "GK", secondaryPositions: [],
    nationality: "Colombia", era: "1980s–2000s",
    ratings: { attacking: 2, creativity: 3, defending: 2, physical: 3, technical: 4, sixAsideFit: 5, goalkeeping: 3 },
  },

  // -------------------------------------------------------------------------
  // Centre-backs
  // -------------------------------------------------------------------------
  {
    id: "franz-beckenbauer", name: "Franz Beckenbauer", primaryPosition: "CB", secondaryPositions: ["CDM", "CM"],
    nationality: "West Germany", era: "1960s–1980s",
    ratings: { attacking: 3, creativity: 5, defending: 5, physical: 4, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "paolo-maldini", name: "Paolo Maldini", primaryPosition: "CB", secondaryPositions: ["LB"],
    nationality: "Italy", era: "1980s–2000s",
    ratings: { attacking: 2, creativity: 3, defending: 5, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "franco-baresi", name: "Franco Baresi", primaryPosition: "CB", secondaryPositions: ["CDM"],
    nationality: "Italy", era: "1970s–1990s",
    ratings: { attacking: 1, creativity: 3, defending: 5, physical: 3, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "fabio-cannavaro", name: "Fabio Cannavaro", primaryPosition: "CB", secondaryPositions: [],
    nationality: "Italy", era: "1990s–2010s",
    ratings: { attacking: 1, creativity: 2, defending: 5, physical: 4, technical: 3, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "sergio-ramos", name: "Sergio Ramos", primaryPosition: "CB", secondaryPositions: ["RB"],
    nationality: "Spain", era: "2000s–2020s",
    ratings: { attacking: 3, creativity: 3, defending: 5, physical: 5, technical: 3, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "virgil-van-dijk", name: "Virgil van Dijk", primaryPosition: "CB", secondaryPositions: [],
    nationality: "Netherlands", era: "2010s–2020s",
    ratings: { attacking: 2, creativity: 3, defending: 5, physical: 5, technical: 3, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "alessandro-nesta", name: "Alessandro Nesta", primaryPosition: "CB", secondaryPositions: [],
    nationality: "Italy", era: "1990s–2010s",
    ratings: { attacking: 1, creativity: 2, defending: 5, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "bobby-moore", name: "Bobby Moore", primaryPosition: "CB", secondaryPositions: [],
    nationality: "England", era: "1950s–1970s",
    ratings: { attacking: 1, creativity: 3, defending: 5, physical: 3, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "carles-puyol", name: "Carles Puyol", primaryPosition: "CB", secondaryPositions: ["RB"],
    nationality: "Spain", era: "1990s–2010s",
    ratings: { attacking: 1, creativity: 2, defending: 5, physical: 5, technical: 3, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "rio-ferdinand", name: "Rio Ferdinand", primaryPosition: "CB", secondaryPositions: [],
    nationality: "England", era: "1990s–2010s",
    ratings: { attacking: 1, creativity: 3, defending: 5, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "john-terry", name: "John Terry", primaryPosition: "CB", secondaryPositions: [],
    nationality: "England", era: "1990s–2010s",
    ratings: { attacking: 2, creativity: 2, defending: 5, physical: 4, technical: 3, sixAsideFit: 3, goalkeeping: 1 },
  },
  {
    id: "nemanja-vidic", name: "Nemanja Vidic", primaryPosition: "CB", secondaryPositions: [],
    nationality: "Serbia", era: "2000s–2010s",
    ratings: { attacking: 2, creativity: 1, defending: 5, physical: 5, technical: 2, sixAsideFit: 3, goalkeeping: 1 },
  },
  {
    id: "daniel-passarella", name: "Daniel Passarella", primaryPosition: "CB", secondaryPositions: [],
    nationality: "Argentina", era: "1970s–1980s",
    ratings: { attacking: 3, creativity: 3, defending: 5, physical: 4, technical: 3, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "gaetano-scirea", name: "Gaetano Scirea", primaryPosition: "CB", secondaryPositions: [],
    nationality: "Italy", era: "1970s–1980s",
    ratings: { attacking: 1, creativity: 3, defending: 5, physical: 3, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "marcel-desailly", name: "Marcel Desailly", primaryPosition: "CB", secondaryPositions: ["CDM"],
    nationality: "France", era: "1980s–2000s",
    ratings: { attacking: 1, creativity: 2, defending: 5, physical: 5, technical: 3, sixAsideFit: 3, goalkeeping: 1 },
  },
  {
    id: "lilian-thuram", name: "Lilian Thuram", primaryPosition: "CB", secondaryPositions: ["RB"],
    nationality: "France", era: "1990s–2000s",
    ratings: { attacking: 2, creativity: 2, defending: 5, physical: 5, technical: 3, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "fernando-hierro", name: "Fernando Hierro", primaryPosition: "CB", secondaryPositions: ["CDM"],
    nationality: "Spain", era: "1980s–2000s",
    ratings: { attacking: 3, creativity: 3, defending: 4, physical: 4, technical: 3, sixAsideFit: 3, goalkeeping: 1 },
  },
  {
    id: "ronald-koeman", name: "Ronald Koeman", primaryPosition: "CB", secondaryPositions: ["CDM"],
    nationality: "Netherlands", era: "1980s–1990s",
    ratings: { attacking: 4, creativity: 4, defending: 4, physical: 3, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "thiago-silva", name: "Thiago Silva", primaryPosition: "CB", secondaryPositions: [],
    nationality: "Brazil", era: "2000s–2020s",
    ratings: { attacking: 1, creativity: 3, defending: 5, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "jaap-stam", name: "Jaap Stam", primaryPosition: "CB", secondaryPositions: [],
    nationality: "Netherlands", era: "1990s–2000s",
    ratings: { attacking: 1, creativity: 2, defending: 5, physical: 5, technical: 2, sixAsideFit: 3, goalkeeping: 1 },
  },
  {
    id: "giorgio-chiellini", name: "Giorgio Chiellini", primaryPosition: "CB", secondaryPositions: ["LB"],
    nationality: "Italy", era: "2000s–2020s",
    ratings: { attacking: 1, creativity: 1, defending: 5, physical: 5, technical: 2, sixAsideFit: 3, goalkeeping: 1 },
  },
  {
    id: "gerard-pique", name: "Gerard Pique", primaryPosition: "CB", secondaryPositions: [],
    nationality: "Spain", era: "2000s–2020s",
    ratings: { attacking: 2, creativity: 3, defending: 4, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },

  // -------------------------------------------------------------------------
  // Full-backs
  // -------------------------------------------------------------------------
  {
    id: "roberto-carlos", name: "Roberto Carlos", primaryPosition: "LB", secondaryPositions: ["LWB", "LM"],
    nationality: "Brazil", era: "1990s–2010s",
    ratings: { attacking: 4, creativity: 3, defending: 3, physical: 5, technical: 4, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "cafu", name: "Cafu", primaryPosition: "RB", secondaryPositions: ["RWB", "RM"],
    nationality: "Brazil", era: "1990s–2000s",
    ratings: { attacking: 3, creativity: 3, defending: 4, physical: 5, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "philipp-lahm", name: "Philipp Lahm", primaryPosition: "RB", secondaryPositions: ["LB", "CDM"],
    nationality: "Germany", era: "2000s–2010s",
    ratings: { attacking: 2, creativity: 4, defending: 5, physical: 3, technical: 4, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "marcelo", name: "Marcelo", primaryPosition: "LB", secondaryPositions: ["LWB", "LM"],
    nationality: "Brazil", era: "2000s–2020s",
    ratings: { attacking: 4, creativity: 4, defending: 3, physical: 3, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "dani-alves", name: "Dani Alves", primaryPosition: "RB", secondaryPositions: ["RWB", "RM"],
    nationality: "Brazil", era: "2000s–2020s",
    ratings: { attacking: 3, creativity: 4, defending: 3, physical: 4, technical: 4, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "ashley-cole", name: "Ashley Cole", primaryPosition: "LB", secondaryPositions: ["LWB"],
    nationality: "England", era: "1990s–2010s",
    ratings: { attacking: 2, creativity: 2, defending: 5, physical: 4, technical: 3, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "javier-zanetti", name: "Javier Zanetti", primaryPosition: "RB", secondaryPositions: ["CM", "LB"],
    nationality: "Argentina", era: "1990s–2010s",
    ratings: { attacking: 2, creativity: 3, defending: 4, physical: 5, technical: 3, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "giacinto-facchetti", name: "Giacinto Facchetti", primaryPosition: "LB", secondaryPositions: ["CB"],
    nationality: "Italy", era: "1960s–1970s",
    ratings: { attacking: 3, creativity: 2, defending: 4, physical: 4, technical: 3, sixAsideFit: 3, goalkeeping: 1 },
  },
  {
    id: "nilton-santos", name: "Nilton Santos", primaryPosition: "LB", secondaryPositions: ["CB"],
    nationality: "Brazil", era: "1940s–1960s",
    ratings: { attacking: 3, creativity: 3, defending: 4, physical: 3, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "djalma-santos", name: "Djalma Santos", primaryPosition: "RB", secondaryPositions: [],
    nationality: "Brazil", era: "1940s–1960s",
    ratings: { attacking: 2, creativity: 2, defending: 4, physical: 4, technical: 3, sixAsideFit: 3, goalkeeping: 1 },
  },
  {
    id: "carlos-alberto-torres", name: "Carlos Alberto Torres", primaryPosition: "RB", secondaryPositions: ["CB"],
    nationality: "Brazil", era: "1960s–1980s",
    ratings: { attacking: 3, creativity: 3, defending: 4, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "paul-breitner", name: "Paul Breitner", primaryPosition: "LB", secondaryPositions: ["CM"],
    nationality: "West Germany", era: "1970s–1980s",
    ratings: { attacking: 3, creativity: 4, defending: 4, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "gianluca-zambrotta", name: "Gianluca Zambrotta", primaryPosition: "RB", secondaryPositions: ["LB", "RM"],
    nationality: "Italy", era: "1990s–2010s",
    ratings: { attacking: 2, creativity: 3, defending: 4, physical: 4, technical: 3, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "andreas-brehme", name: "Andreas Brehme", primaryPosition: "LB", secondaryPositions: ["LM"],
    nationality: "West Germany", era: "1980s–1990s",
    ratings: { attacking: 3, creativity: 3, defending: 4, physical: 3, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "trent-alexander-arnold", name: "Trent Alexander-Arnold", primaryPosition: "RB", secondaryPositions: ["CM"],
    nationality: "England", era: "2010s–2020s",
    ratings: { attacking: 3, creativity: 5, defending: 3, physical: 3, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "patrice-evra", name: "Patrice Evra", primaryPosition: "LB", secondaryPositions: ["LWB"],
    nationality: "France", era: "2000s–2010s",
    ratings: { attacking: 2, creativity: 2, defending: 4, physical: 4, technical: 3, sixAsideFit: 4, goalkeeping: 1 },
  },

  // -------------------------------------------------------------------------
  // Defensive midfielders
  // -------------------------------------------------------------------------
  {
    id: "claude-makelele", name: "Claude Makelele", primaryPosition: "CDM", secondaryPositions: [],
    nationality: "France", era: "1990s–2000s",
    ratings: { attacking: 1, creativity: 2, defending: 5, physical: 4, technical: 3, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "patrick-vieira", name: "Patrick Vieira", primaryPosition: "CDM", secondaryPositions: ["CM"],
    nationality: "France", era: "1990s–2010s",
    ratings: { attacking: 3, creativity: 3, defending: 4, physical: 5, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "frank-rijkaard", name: "Frank Rijkaard", primaryPosition: "CDM", secondaryPositions: ["CB", "CM"],
    nationality: "Netherlands", era: "1980s–1990s",
    ratings: { attacking: 3, creativity: 3, defending: 5, physical: 5, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "sergio-busquets", name: "Sergio Busquets", primaryPosition: "CDM", secondaryPositions: ["CM"],
    nationality: "Spain", era: "2000s–2020s",
    ratings: { attacking: 1, creativity: 4, defending: 4, physical: 3, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "ngolo-kante", name: "N'Golo Kante", primaryPosition: "CDM", secondaryPositions: ["CM"],
    nationality: "France", era: "2010s–2020s",
    ratings: { attacking: 2, creativity: 3, defending: 5, physical: 5, technical: 3, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "roy-keane", name: "Roy Keane", primaryPosition: "CDM", secondaryPositions: ["CM"],
    nationality: "Republic of Ireland", era: "1990s–2000s",
    ratings: { attacking: 3, creativity: 3, defending: 4, physical: 5, technical: 3, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "lothar-matthaus", name: "Lothar Matthaus", primaryPosition: "CDM", secondaryPositions: ["CM", "CB"],
    nationality: "West Germany", era: "1980s–2000s",
    ratings: { attacking: 4, creativity: 4, defending: 4, physical: 5, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "didier-deschamps", name: "Didier Deschamps", primaryPosition: "CDM", secondaryPositions: ["CM"],
    nationality: "France", era: "1980s–2000s",
    ratings: { attacking: 1, creativity: 3, defending: 4, physical: 4, technical: 3, sixAsideFit: 3, goalkeeping: 1 },
  },
  {
    id: "xabi-alonso", name: "Xabi Alonso", primaryPosition: "CDM", secondaryPositions: ["CM"],
    nationality: "Spain", era: "2000s–2010s",
    ratings: { attacking: 2, creativity: 5, defending: 4, physical: 3, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "rodri", name: "Rodri", primaryPosition: "CDM", secondaryPositions: ["CM", "CB"],
    nationality: "Spain", era: "2010s–2020s",
    ratings: { attacking: 3, creativity: 4, defending: 4, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "casemiro", name: "Casemiro", primaryPosition: "CDM", secondaryPositions: ["CM"],
    nationality: "Brazil", era: "2010s–2020s",
    ratings: { attacking: 2, creativity: 2, defending: 5, physical: 5, technical: 3, sixAsideFit: 3, goalkeeping: 1 },
  },
  {
    id: "edgar-davids", name: "Edgar Davids", primaryPosition: "CDM", secondaryPositions: ["CM"],
    nationality: "Netherlands", era: "1990s–2000s",
    ratings: { attacking: 2, creativity: 3, defending: 4, physical: 5, technical: 4, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "gennaro-gattuso", name: "Gennaro Gattuso", primaryPosition: "CDM", secondaryPositions: ["CM"],
    nationality: "Italy", era: "1990s–2010s",
    ratings: { attacking: 1, creativity: 2, defending: 4, physical: 5, technical: 2, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "fernando-redondo", name: "Fernando Redondo", primaryPosition: "CDM", secondaryPositions: ["CM"],
    nationality: "Argentina", era: "1980s–2000s",
    ratings: { attacking: 2, creativity: 4, defending: 4, physical: 3, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "javier-mascherano", name: "Javier Mascherano", primaryPosition: "CDM", secondaryPositions: ["CB"],
    nationality: "Argentina", era: "2000s–2010s",
    ratings: { attacking: 1, creativity: 2, defending: 5, physical: 4, technical: 3, sixAsideFit: 4, goalkeeping: 1 },
  },

  // -------------------------------------------------------------------------
  // Central midfielders
  // -------------------------------------------------------------------------
  {
    id: "xavi-hernandez", name: "Xavi Hernandez", primaryPosition: "CM", secondaryPositions: ["CAM", "CDM"],
    nationality: "Spain", era: "1990s–2010s",
    ratings: { attacking: 3, creativity: 5, defending: 3, physical: 2, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "andres-iniesta", name: "Andres Iniesta", primaryPosition: "CM", secondaryPositions: ["CAM", "LW"],
    nationality: "Spain", era: "2000s–2020s",
    ratings: { attacking: 4, creativity: 5, defending: 2, physical: 2, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "andrea-pirlo", name: "Andrea Pirlo", primaryPosition: "CM", secondaryPositions: ["CDM", "CAM"],
    nationality: "Italy", era: "1990s–2010s",
    ratings: { attacking: 3, creativity: 5, defending: 2, physical: 2, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "steven-gerrard", name: "Steven Gerrard", primaryPosition: "CM", secondaryPositions: ["CAM", "CDM"],
    nationality: "England", era: "1990s–2010s",
    ratings: { attacking: 4, creativity: 4, defending: 3, physical: 5, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "frank-lampard", name: "Frank Lampard", primaryPosition: "CM", secondaryPositions: ["CAM"],
    nationality: "England", era: "1990s–2010s",
    ratings: { attacking: 5, creativity: 4, defending: 3, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "paul-scholes", name: "Paul Scholes", primaryPosition: "CM", secondaryPositions: ["CAM"],
    nationality: "England", era: "1990s–2010s",
    ratings: { attacking: 4, creativity: 5, defending: 2, physical: 2, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "luka-modric", name: "Luka Modric", primaryPosition: "CM", secondaryPositions: ["CAM", "CDM"],
    nationality: "Croatia", era: "2000s–2020s",
    ratings: { attacking: 3, creativity: 5, defending: 3, physical: 3, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "toni-kroos", name: "Toni Kroos", primaryPosition: "CM", secondaryPositions: ["CDM", "CAM"],
    nationality: "Germany", era: "2000s–2020s",
    ratings: { attacking: 3, creativity: 5, defending: 3, physical: 2, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "clarence-seedorf", name: "Clarence Seedorf", primaryPosition: "CM", secondaryPositions: ["CAM", "CDM"],
    nationality: "Netherlands", era: "1990s–2010s",
    ratings: { attacking: 3, creativity: 4, defending: 3, physical: 5, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "bobby-charlton", name: "Bobby Charlton", primaryPosition: "CM", secondaryPositions: ["CAM", "CF"],
    nationality: "England", era: "1950s–1970s",
    ratings: { attacking: 5, creativity: 4, defending: 2, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "johan-neeskens", name: "Johan Neeskens", primaryPosition: "CM", secondaryPositions: ["CDM"],
    nationality: "Netherlands", era: "1970s–1980s",
    ratings: { attacking: 3, creativity: 4, defending: 4, physical: 5, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "yaya-toure", name: "Yaya Toure", primaryPosition: "CM", secondaryPositions: ["CDM", "CAM"],
    nationality: "Ivory Coast", era: "2000s–2010s",
    ratings: { attacking: 4, creativity: 4, defending: 3, physical: 5, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "bastian-schweinsteiger", name: "Bastian Schweinsteiger", primaryPosition: "CM", secondaryPositions: ["CDM"],
    nationality: "Germany", era: "2000s–2010s",
    ratings: { attacking: 3, creativity: 4, defending: 4, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "michael-ballack", name: "Michael Ballack", primaryPosition: "CM", secondaryPositions: ["CAM"],
    nationality: "Germany", era: "1990s–2010s",
    ratings: { attacking: 4, creativity: 4, defending: 3, physical: 5, technical: 4, sixAsideFit: 3, goalkeeping: 1 },
  },
  {
    id: "ruud-gullit", name: "Ruud Gullit", primaryPosition: "CM", secondaryPositions: ["CF", "CB"],
    nationality: "Netherlands", era: "1980s–1990s",
    ratings: { attacking: 4, creativity: 4, defending: 3, physical: 5, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "paul-pogba", name: "Paul Pogba", primaryPosition: "CM", secondaryPositions: ["CAM"],
    nationality: "France", era: "2010s–2020s",
    ratings: { attacking: 4, creativity: 4, defending: 2, physical: 5, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "jude-bellingham", name: "Jude Bellingham", primaryPosition: "CM", secondaryPositions: ["CAM"],
    nationality: "England", era: "2020s",
    ratings: { attacking: 4, creativity: 4, defending: 3, physical: 5, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "michael-essien", name: "Michael Essien", primaryPosition: "CM", secondaryPositions: ["CDM", "RB"],
    nationality: "Ghana", era: "2000s–2010s",
    ratings: { attacking: 3, creativity: 3, defending: 4, physical: 5, technical: 3, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "pep-guardiola", name: "Pep Guardiola", primaryPosition: "CM", secondaryPositions: ["CDM"],
    nationality: "Spain", era: "1990s–2000s",
    ratings: { attacking: 2, creativity: 5, defending: 3, physical: 2, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "frenkie-de-jong", name: "Frenkie de Jong", primaryPosition: "CM", secondaryPositions: ["CDM"],
    nationality: "Netherlands", era: "2010s–2020s",
    ratings: { attacking: 3, creativity: 4, defending: 3, physical: 4, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },

  // -------------------------------------------------------------------------
  // Attacking midfielders
  // -------------------------------------------------------------------------
  {
    id: "diego-maradona", name: "Diego Maradona", primaryPosition: "CAM", secondaryPositions: ["CF"],
    nationality: "Argentina", era: "1970s–1990s",
    ratings: { attacking: 5, creativity: 5, defending: 1, physical: 4, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "zinedine-zidane", name: "Zinedine Zidane", primaryPosition: "CAM", secondaryPositions: ["CM"],
    nationality: "France", era: "1980s–2000s",
    ratings: { attacking: 4, creativity: 5, defending: 2, physical: 4, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "ronaldinho", name: "Ronaldinho", primaryPosition: "CAM", secondaryPositions: ["LW", "CF"],
    nationality: "Brazil", era: "1990s–2010s",
    ratings: { attacking: 5, creativity: 5, defending: 1, physical: 4, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "kaka", name: "Kaka", primaryPosition: "CAM", secondaryPositions: ["CF", "CM"],
    nationality: "Brazil", era: "2000s–2010s",
    ratings: { attacking: 5, creativity: 4, defending: 1, physical: 5, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "michel-platini", name: "Michel Platini", primaryPosition: "CAM", secondaryPositions: ["CM", "CF"],
    nationality: "France", era: "1970s–1980s",
    ratings: { attacking: 5, creativity: 5, defending: 1, physical: 3, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "zico", name: "Zico", primaryPosition: "CAM", secondaryPositions: ["CF"],
    nationality: "Brazil", era: "1970s–1990s",
    ratings: { attacking: 5, creativity: 5, defending: 1, physical: 3, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "kevin-de-bruyne", name: "Kevin De Bruyne", primaryPosition: "CAM", secondaryPositions: ["CM", "RW"],
    nationality: "Belgium", era: "2010s–2020s",
    ratings: { attacking: 4, creativity: 5, defending: 2, physical: 4, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "mesut-ozil", name: "Mesut Ozil", primaryPosition: "CAM", secondaryPositions: ["RW"],
    nationality: "Germany", era: "2000s–2020s",
    ratings: { attacking: 3, creativity: 5, defending: 1, physical: 2, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "juan-roman-riquelme", name: "Juan Roman Riquelme", primaryPosition: "CAM", secondaryPositions: ["CM"],
    nationality: "Argentina", era: "1990s–2010s",
    ratings: { attacking: 3, creativity: 5, defending: 1, physical: 2, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "francesco-totti", name: "Francesco Totti", primaryPosition: "CAM", secondaryPositions: ["CF", "ST"],
    nationality: "Italy", era: "1990s–2010s",
    ratings: { attacking: 5, creativity: 5, defending: 1, physical: 4, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "roberto-baggio", name: "Roberto Baggio", primaryPosition: "CAM", secondaryPositions: ["CF"],
    nationality: "Italy", era: "1980s–2000s",
    ratings: { attacking: 5, creativity: 5, defending: 1, physical: 3, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "rui-costa", name: "Rui Costa", primaryPosition: "CAM", secondaryPositions: ["CM"],
    nationality: "Portugal", era: "1990s–2000s",
    ratings: { attacking: 3, creativity: 5, defending: 1, physical: 3, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "bruno-fernandes", name: "Bruno Fernandes", primaryPosition: "CAM", secondaryPositions: ["CM"],
    nationality: "Portugal", era: "2010s–2020s",
    ratings: { attacking: 4, creativity: 5, defending: 2, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "pavel-nedved", name: "Pavel Nedved", primaryPosition: "CAM", secondaryPositions: ["LM", "CM"],
    nationality: "Czech Republic", era: "1990s–2000s",
    ratings: { attacking: 4, creativity: 4, defending: 2, physical: 5, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "socrates", name: "Socrates", primaryPosition: "CAM", secondaryPositions: ["CM"],
    nationality: "Brazil", era: "1970s–1980s",
    ratings: { attacking: 4, creativity: 5, defending: 1, physical: 3, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "rivaldo", name: "Rivaldo", primaryPosition: "CAM", secondaryPositions: ["LW", "ST"],
    nationality: "Brazil", era: "1990s–2000s",
    ratings: { attacking: 5, creativity: 4, defending: 1, physical: 4, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "wesley-sneijder", name: "Wesley Sneijder", primaryPosition: "CAM", secondaryPositions: ["CM"],
    nationality: "Netherlands", era: "2000s–2010s",
    ratings: { attacking: 4, creativity: 5, defending: 1, physical: 3, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "david-silva", name: "David Silva", primaryPosition: "CAM", secondaryPositions: ["LW", "CM"],
    nationality: "Spain", era: "2000s–2020s",
    ratings: { attacking: 3, creativity: 5, defending: 2, physical: 2, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },

  // -------------------------------------------------------------------------
  // Wingers and wide midfielders
  // -------------------------------------------------------------------------
  {
    id: "lionel-messi", name: "Lionel Messi", primaryPosition: "RW", secondaryPositions: ["CF", "CAM"],
    nationality: "Argentina", era: "2000s–2020s",
    ratings: { attacking: 5, creativity: 5, defending: 1, physical: 3, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "cristiano-ronaldo", name: "Cristiano Ronaldo", primaryPosition: "LW", secondaryPositions: ["ST", "RW"],
    nationality: "Portugal", era: "2000s–2020s",
    ratings: { attacking: 5, creativity: 4, defending: 1, physical: 5, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "neymar", name: "Neymar", primaryPosition: "LW", secondaryPositions: ["CAM", "CF"],
    nationality: "Brazil", era: "2010s–2020s",
    ratings: { attacking: 5, creativity: 5, defending: 1, physical: 3, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "garrincha", name: "Garrincha", primaryPosition: "RW", secondaryPositions: [],
    nationality: "Brazil", era: "1950s–1960s",
    ratings: { attacking: 5, creativity: 4, defending: 1, physical: 3, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "george-best", name: "George Best", primaryPosition: "RW", secondaryPositions: ["LW", "CF"],
    nationality: "Northern Ireland", era: "1960s–1980s",
    ratings: { attacking: 5, creativity: 4, defending: 1, physical: 3, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "luis-figo", name: "Luis Figo", primaryPosition: "RW", secondaryPositions: ["CAM", "RM"],
    nationality: "Portugal", era: "1990s–2000s",
    ratings: { attacking: 4, creativity: 5, defending: 2, physical: 4, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "arjen-robben", name: "Arjen Robben", primaryPosition: "RW", secondaryPositions: ["LW"],
    nationality: "Netherlands", era: "2000s–2010s",
    ratings: { attacking: 5, creativity: 4, defending: 1, physical: 4, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "franck-ribery", name: "Franck Ribery", primaryPosition: "LW", secondaryPositions: ["RW", "CAM"],
    nationality: "France", era: "2000s–2020s",
    ratings: { attacking: 4, creativity: 4, defending: 2, physical: 4, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "ryan-giggs", name: "Ryan Giggs", primaryPosition: "LW", secondaryPositions: ["LM", "CM"],
    nationality: "Wales", era: "1990s–2010s",
    ratings: { attacking: 4, creativity: 4, defending: 2, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "mohamed-salah", name: "Mohamed Salah", primaryPosition: "RW", secondaryPositions: ["ST"],
    nationality: "Egypt", era: "2010s–2020s",
    ratings: { attacking: 5, creativity: 4, defending: 2, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "kylian-mbappe", name: "Kylian Mbappe", primaryPosition: "LW", secondaryPositions: ["ST"],
    nationality: "France", era: "2010s–2020s",
    ratings: { attacking: 5, creativity: 4, defending: 1, physical: 5, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "eden-hazard", name: "Eden Hazard", primaryPosition: "LW", secondaryPositions: ["CAM"],
    nationality: "Belgium", era: "2000s–2020s",
    ratings: { attacking: 4, creativity: 5, defending: 1, physical: 3, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "stanley-matthews", name: "Stanley Matthews", primaryPosition: "RW", secondaryPositions: ["RM"],
    nationality: "England", era: "1930s–1960s",
    ratings: { attacking: 3, creativity: 5, defending: 1, physical: 3, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "hristo-stoichkov", name: "Hristo Stoichkov", primaryPosition: "LW", secondaryPositions: ["ST"],
    nationality: "Bulgaria", era: "1980s–2000s",
    ratings: { attacking: 5, creativity: 4, defending: 1, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "marc-overmars", name: "Marc Overmars", primaryPosition: "LW", secondaryPositions: ["RW"],
    nationality: "Netherlands", era: "1990s–2000s",
    ratings: { attacking: 4, creativity: 3, defending: 1, physical: 5, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "gareth-bale", name: "Gareth Bale", primaryPosition: "RW", secondaryPositions: ["LW", "LB"],
    nationality: "Wales", era: "2000s–2020s",
    ratings: { attacking: 5, creativity: 3, defending: 2, physical: 5, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "angel-di-maria", name: "Angel Di Maria", primaryPosition: "RW", secondaryPositions: ["LW", "CM"],
    nationality: "Argentina", era: "2000s–2020s",
    ratings: { attacking: 4, creativity: 5, defending: 2, physical: 3, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "vinicius-junior", name: "Vinicius Junior", primaryPosition: "LW", secondaryPositions: ["ST"],
    nationality: "Brazil", era: "2010s–2020s",
    ratings: { attacking: 5, creativity: 4, defending: 1, physical: 4, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "francisco-gento", name: "Francisco Gento", primaryPosition: "LW", secondaryPositions: ["LM"],
    nationality: "Spain", era: "1950s–1970s",
    ratings: { attacking: 4, creativity: 3, defending: 1, physical: 5, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "jairzinho", name: "Jairzinho", primaryPosition: "RW", secondaryPositions: ["ST"],
    nationality: "Brazil", era: "1960s–1980s",
    ratings: { attacking: 5, creativity: 3, defending: 1, physical: 5, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "marco-reus", name: "Marco Reus", primaryPosition: "LW", secondaryPositions: ["CAM", "CF"],
    nationality: "Germany", era: "2000s–2020s",
    ratings: { attacking: 4, creativity: 4, defending: 1, physical: 3, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "david-beckham", name: "David Beckham", primaryPosition: "RM", secondaryPositions: ["CM", "RW"],
    nationality: "England", era: "1990s–2010s",
    ratings: { attacking: 3, creativity: 5, defending: 3, physical: 4, technical: 4, sixAsideFit: 3, goalkeeping: 1 },
  },

  // -------------------------------------------------------------------------
  // Strikers and centre-forwards
  // -------------------------------------------------------------------------
  {
    id: "pele", name: "Pele", primaryPosition: "CF", secondaryPositions: ["ST", "CAM"],
    nationality: "Brazil", era: "1950s–1970s",
    ratings: { attacking: 5, creativity: 5, defending: 1, physical: 4, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "johan-cruyff", name: "Johan Cruyff", primaryPosition: "CF", secondaryPositions: ["CAM", "LW"],
    nationality: "Netherlands", era: "1960s–1980s",
    ratings: { attacking: 5, creativity: 5, defending: 2, physical: 3, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "ronaldo-nazario", name: "Ronaldo Nazario", primaryPosition: "ST", secondaryPositions: ["CF"],
    nationality: "Brazil", era: "1990s–2010s",
    ratings: { attacking: 5, creativity: 4, defending: 1, physical: 5, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "alfredo-di-stefano", name: "Alfredo Di Stefano", primaryPosition: "CF", secondaryPositions: ["CAM", "CM"],
    nationality: "Argentina", era: "1940s–1960s",
    ratings: { attacking: 5, creativity: 5, defending: 3, physical: 4, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "ferenc-puskas", name: "Ferenc Puskas", primaryPosition: "ST", secondaryPositions: ["CF", "CAM"],
    nationality: "Hungary", era: "1940s–1960s",
    ratings: { attacking: 5, creativity: 4, defending: 1, physical: 3, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "gerd-muller", name: "Gerd Muller", primaryPosition: "ST", secondaryPositions: [],
    nationality: "West Germany", era: "1960s–1980s",
    ratings: { attacking: 5, creativity: 2, defending: 1, physical: 4, technical: 4, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "eusebio", name: "Eusebio", primaryPosition: "ST", secondaryPositions: ["CF"],
    nationality: "Portugal", era: "1960s–1970s",
    ratings: { attacking: 5, creativity: 3, defending: 1, physical: 5, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "marco-van-basten", name: "Marco van Basten", primaryPosition: "ST", secondaryPositions: ["CF"],
    nationality: "Netherlands", era: "1980s–1990s",
    ratings: { attacking: 5, creativity: 3, defending: 1, physical: 4, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "thierry-henry", name: "Thierry Henry", primaryPosition: "ST", secondaryPositions: ["LW", "CF"],
    nationality: "France", era: "1990s–2010s",
    ratings: { attacking: 5, creativity: 4, defending: 1, physical: 5, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "romario", name: "Romario", primaryPosition: "ST", secondaryPositions: [],
    nationality: "Brazil", era: "1980s–2000s",
    ratings: { attacking: 5, creativity: 3, defending: 1, physical: 3, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "zlatan-ibrahimovic", name: "Zlatan Ibrahimovic", primaryPosition: "ST", secondaryPositions: ["CF"],
    nationality: "Sweden", era: "1990s–2020s",
    ratings: { attacking: 5, creativity: 4, defending: 1, physical: 5, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "robert-lewandowski", name: "Robert Lewandowski", primaryPosition: "ST", secondaryPositions: [],
    nationality: "Poland", era: "2000s–2020s",
    ratings: { attacking: 5, creativity: 3, defending: 1, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "karim-benzema", name: "Karim Benzema", primaryPosition: "ST", secondaryPositions: ["CF"],
    nationality: "France", era: "2000s–2020s",
    ratings: { attacking: 5, creativity: 4, defending: 1, physical: 4, technical: 5, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "didier-drogba", name: "Didier Drogba", primaryPosition: "ST", secondaryPositions: [],
    nationality: "Ivory Coast", era: "1990s–2010s",
    ratings: { attacking: 5, creativity: 3, defending: 2, physical: 5, technical: 4, sixAsideFit: 3, goalkeeping: 1 },
  },
  {
    id: "andriy-shevchenko", name: "Andriy Shevchenko", primaryPosition: "ST", secondaryPositions: [],
    nationality: "Ukraine", era: "1990s–2010s",
    ratings: { attacking: 5, creativity: 3, defending: 1, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "gabriel-batistuta", name: "Gabriel Batistuta", primaryPosition: "ST", secondaryPositions: [],
    nationality: "Argentina", era: "1990s–2000s",
    ratings: { attacking: 5, creativity: 2, defending: 1, physical: 5, technical: 4, sixAsideFit: 3, goalkeeping: 1 },
  },
  {
    id: "raul-gonzalez", name: "Raul Gonzalez", primaryPosition: "ST", secondaryPositions: ["CF"],
    nationality: "Spain", era: "1990s–2010s",
    ratings: { attacking: 5, creativity: 4, defending: 1, physical: 3, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "luis-suarez", name: "Luis Suarez", primaryPosition: "ST", secondaryPositions: ["CF"],
    nationality: "Uruguay", era: "2000s–2020s",
    ratings: { attacking: 5, creativity: 4, defending: 2, physical: 4, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "dennis-bergkamp", name: "Dennis Bergkamp", primaryPosition: "CF", secondaryPositions: ["CAM", "ST"],
    nationality: "Netherlands", era: "1980s–2000s",
    ratings: { attacking: 5, creativity: 5, defending: 1, physical: 3, technical: 5, sixAsideFit: 5, goalkeeping: 1 },
  },
  {
    id: "erling-haaland", name: "Erling Haaland", primaryPosition: "ST", secondaryPositions: [],
    nationality: "Norway", era: "2010s–2020s",
    ratings: { attacking: 5, creativity: 2, defending: 1, physical: 5, technical: 3, sixAsideFit: 3, goalkeeping: 1 },
  },
  {
    id: "wayne-rooney", name: "Wayne Rooney", primaryPosition: "ST", secondaryPositions: ["CF", "CAM"],
    nationality: "England", era: "2000s–2020s",
    ratings: { attacking: 5, creativity: 4, defending: 2, physical: 4, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
  {
    id: "samuel-etoo", name: "Samuel Eto'o", primaryPosition: "ST", secondaryPositions: ["RW"],
    nationality: "Cameroon", era: "1990s–2010s",
    ratings: { attacking: 5, creativity: 3, defending: 2, physical: 5, technical: 4, sixAsideFit: 4, goalkeeping: 1 },
  },
];

export const PLAYERS_BY_ID: ReadonlyMap<string, Player> = new Map(
  PLAYERS.map((player) => [player.id, player]),
);

export const ALL_PLAYER_IDS: readonly string[] = PLAYERS.map((player) => player.id);

export function getPlayerById(id: string): Player | undefined {
  return PLAYERS_BY_ID.get(id);
}
