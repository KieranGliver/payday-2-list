// Our own judgements about each heist. HAND-MAINTAINED.
//
// The generator (npm run sync:steam) never writes this file, so these survive
// regeneration. Bootstrapped from the original tracking spreadsheet.
//
// Typed as Record<HeistId, Rating>, so adding a heist to Steam breaks the build
// until it is rated here, and a typo'd id or value is a compile error.

import type { Rating } from '../types.js';
import type { HeistId } from '../generated/steam.js';

export const RATINGS: Record<HeistId, Rating> = {
  // --- Bain ---
  axe_33:   { contractor: 'Bain', approach: 'STEALTH', perceivedDifficulty: 'EASY' }, // Art Gallery
  axe_19:   { contractor: 'Bain', approach: 'BOTH', perceivedDifficulty: 'EASY' }, // Bank Heist: Cash
  axe_20:   { contractor: 'Bain', approach: 'BOTH', perceivedDifficulty: 'EASY' }, // Bank Heist: Deposit
  axe_18:   { contractor: 'Bain', approach: 'BOTH', perceivedDifficulty: 'EASY' }, // Bank Heist: Gold
  axe_17:   { contractor: 'Bain', approach: 'BOTH', perceivedDifficulty: 'EASY' }, // Bank Heist: Random
  axe_41:   { contractor: 'Bain', approach: 'STEALTH', perceivedDifficulty: 'EASY' }, // Car Shop
  axe_40:   { contractor: 'Bain', approach: 'LOUD', perceivedDifficulty: 'HARD' }, // Cook Off
  axe_15:   { contractor: 'Bain', approach: 'BOTH', perceivedDifficulty: 'EASY' }, // Diamond Store
  axe_16:   { contractor: 'Bain', approach: 'BOTH', perceivedDifficulty: 'MEDIUM' }, // GO Bank
  axe_14:   { contractor: 'Bain', approach: 'BOTH', perceivedDifficulty: 'EASY' }, // Jewelry Store
  rvd_7:    { contractor: 'Bain', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Reservoir Dogs
  axe_29:   { contractor: 'Bain', approach: 'STEALTH', perceivedDifficulty: 'HARD' }, // Shadow Raid
  axe_43:   { contractor: 'Bain', approach: 'BOTH', perceivedDifficulty: 'HARD' }, // The Alesso Heist
  axe_21:   { contractor: 'Bain', approach: 'LOUD', perceivedDifficulty: 'HARD' }, // Transport: Crossroads
  axe_22:   { contractor: 'Bain', approach: 'LOUD', perceivedDifficulty: 'HARD' }, // Transport: Downtown
  axe_23:   { contractor: 'Bain', approach: 'LOUD', perceivedDifficulty: 'HARD' }, // Transport: Harbor
  axe_24:   { contractor: 'Bain', approach: 'LOUD', perceivedDifficulty: 'HARD' }, // Transport: Park
  axe_26:   { contractor: 'Bain', approach: 'LOUD', perceivedDifficulty: 'HARD' }, // Transport: Train Heist
  axe_25:   { contractor: 'Bain', approach: 'LOUD', perceivedDifficulty: 'HARD' }, // Transport: Underpass
  auc_8:    { contractor: 'Bain', approach: 'BOTH', perceivedDifficulty: 'HARD' }, // Under the Hammer

  // --- Blaine Keegan ---
  deep_8:   { contractor: 'Blaine Keegan', approach: 'LOUD', perceivedDifficulty: 'HARD' }, // Crude Awakening
  corp_8:   { contractor: 'Blaine Keegan', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Hostile Takeover

  // --- Classic ---
  axe_51:   { contractor: 'Classic', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Counterfeit
  dah_7:    { contractor: 'Classic', approach: 'STEALTH', perceivedDifficulty: 'EASY' }, // Diamond Heist
  axe_37:   { contractor: 'Classic', approach: 'BOTH', perceivedDifficulty: 'MEDIUM' }, // First World Bank
  glace_7:  { contractor: 'Classic', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Green Bridge
  run_7:    { contractor: 'Classic', approach: 'LOUD', perceivedDifficulty: 'HARD' }, // Heat Street
  nmh_8:    { contractor: 'Classic', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // No Mercy
  axe_55:   { contractor: 'Classic', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Panic Room
  axe_38:   { contractor: 'Classic', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Slaughterhouse
  axe_52:   { contractor: 'Classic', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Undercover

  // --- Events ---
  ckr_7:    { contractor: 'Events', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Cursed Kill Room
  axe_46:   { contractor: 'Events', approach: 'LOUD', perceivedDifficulty: 'HARD' }, // Lab Rats
  orange_3: { contractor: 'Events', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Prison Nightmare
  axe_666:  { contractor: 'Events', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Safe House Nightmare
  trk_sa_6: { contractor: 'Events', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Safe House Raid

  // --- Gemma McShay ---
  trai_8:   { contractor: 'Gemma McShay', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Lost In Transit
  ranc_8:   { contractor: 'Gemma McShay', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Midland Ranch

  // --- Hector ---
  axe_9:    { contractor: 'Hector', approach: 'LOUD', perceivedDifficulty: 'HARD' }, // Firestarter
  axe_7:    { contractor: 'Hector', approach: 'LOUD', perceivedDifficulty: 'HARD' }, // Rats
  axe_5:    { contractor: 'Hector', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Watchdogs

  // --- Jimmy ---
  axe_56:   { contractor: 'Jimmy', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Boiling Point
  axe_53:   { contractor: 'Jimmy', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Murky Station

  // --- Jiu Feng ---
  chas_8:   { contractor: 'Jiu Feng', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Dragon Heist
  sand_8:   { contractor: 'Jiu Feng', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Ukrainian Prisoner

  // --- Locke ---
  wwh_7:    { contractor: 'Locke', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Alaskan Deal
  axe_47:   { contractor: 'Locke', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Beneath the Mountain
  axe_48:   { contractor: 'Locke', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Birth of Sky
  mex_8:    { contractor: 'Locke', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Border Crossing
  mex2_8:   { contractor: 'Locke', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Border Crystals
  pex_8:    { contractor: 'Locke', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Breakfast in Tijuana
  tag_8:    { contractor: 'Locke', approach: 'STEALTH', perceivedDifficulty: 'HARD' }, // Breakin' Feds
  brb_7:    { contractor: 'Locke', approach: 'BOTH', perceivedDifficulty: 'MEDIUM' }, // Brooklyn Bank
  bph_8:    { contractor: 'Locke', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Hell's Island
  des_8:    { contractor: 'Locke', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Henry's Rock
  sah_8:    { contractor: 'Locke', approach: 'STEALTH', perceivedDifficulty: 'MEDIUM' }, // Shacklethorne Auction
  vit_8:    { contractor: 'Locke', approach: 'BOTH', perceivedDifficulty: 'MEDIUM' }, // The White House

  // --- Shayu ---
  pent_8:   { contractor: 'Shayu', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Mountain Master

  // --- The Butcher ---
  friend_3: { contractor: 'The Butcher', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Scarface Mansion
  axe_61:   { contractor: 'The Butcher', approach: 'LOUD', perceivedDifficulty: 'HARD' }, // The Bomb: Dockyard
  axe_60:   { contractor: 'The Butcher', approach: 'LOUD', perceivedDifficulty: 'HARD' }, // The Bomb: Forest

  // --- The Continental ---
  spa_3:    { contractor: 'The Continental', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Brooklyn 10-10
  fish_3:   { contractor: 'The Continental', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // The Yacht Heist

  // --- The Dentist ---
  axe_44:   { contractor: 'The Dentist', approach: 'BOTH', perceivedDifficulty: 'MEDIUM' }, // Golden Grin Casino
  axe_31:   { contractor: 'The Dentist', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Hotline Miami
  axe_34:   { contractor: 'The Dentist', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Hoxton Breakout
  axe_39:   { contractor: 'The Dentist', approach: 'STEALTH', perceivedDifficulty: 'MEDIUM' }, // Hoxton Revenge
  axe_30:   { contractor: 'The Dentist', approach: 'BOTH', perceivedDifficulty: 'HARD' }, // The Big Bank
  axe_36:   { contractor: 'The Dentist', approach: 'STEALTH', perceivedDifficulty: 'MEDIUM' }, // The Diamond

  // --- The Elephant ---
  axe_13:   { contractor: 'The Elephant', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Big Oil
  axe_27:   { contractor: 'The Elephant', approach: 'BOTH', perceivedDifficulty: 'HARD' }, // Election Day
  axe_11:   { contractor: 'The Elephant', approach: 'STEALTH', perceivedDifficulty: 'MEDIUM' }, // Framing Frame
  axe_57:   { contractor: 'The Elephant', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // The Biker Heist

  // --- Vlad ---
  axe_45:   { contractor: 'Vlad', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Aftershock
  chca_8:   { contractor: 'Vlad', approach: 'STEALTH', perceivedDifficulty: 'MEDIUM' }, // Black Cat
  fex_8:    { contractor: 'Vlad', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Buluc's Mansion
  axe_3:    { contractor: 'Vlad', approach: 'LOUD', perceivedDifficulty: 'HARD' }, // Four Stores
  axe_49:   { contractor: 'Vlad', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Goat Simulator
  axe_2:    { contractor: 'Vlad', approach: 'LOUD', perceivedDifficulty: 'EASY' }, // Mallcrasher
  axe_42:   { contractor: 'Vlad', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Meltdown
  axe_4:    { contractor: 'Vlad', approach: 'BOTH', perceivedDifficulty: 'MEDIUM' }, // Nightclub
  bex_8:    { contractor: 'Vlad', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // San Martín Bank
  axe_54:   { contractor: 'Vlad', approach: 'BOTH', perceivedDifficulty: 'MEDIUM' }, // Santa's Workshop
  moon_3:   { contractor: 'Vlad', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // Stealing Xmas
  axe_1:    { contractor: 'Vlad', approach: 'BOTH', perceivedDifficulty: 'MEDIUM' }, // Ukrainian Job
  axe_59:   { contractor: 'Vlad', approach: 'LOUD', perceivedDifficulty: 'MEDIUM' }, // White Xmas
};
