// How many in-game days each heist runs. HAND-RESEARCHED.
//
// The generator (npm run sync:steam) never writes this file. Steam's schema
// does not carry a day count, so there is nothing to generate it from.
//
// Sourced from the Payday 2 wiki, where a multi-day heist has top-level
// "== Day N (name) ==" sections and a single-day heist has "Objectives" /
// "Walkthrough" instead. Cross-checked against Steam's own day-specific
// achievement descriptions ("On day 2 of the Watchdogs job, ..."), which
// independently attest 11 heists - exactly the 11 the wiki calls multi-day,
// with matching numbers. Those 11 carry their source inline below.
//
// Two titles did not resolve by name and were checked by hand: the five
// Transport variants share one wiki page with no day sections, and Reservoir
// Dogs lives at "Reservoir Dogs Heist".
//
// "The Bomb: Dockyard" and "The Bomb: Forest" are one two-day contract in
// game, but Steam awards them separately and the catalog follows Steam, so
// each is one day here.
//
// Typed as Record<HeistId, HeistDays>, so a heist added to Steam breaks the
// build until its length is researched, and a typo is a compile error.

import type { HeistId } from '../generated/steam.js';
import type { HeistDays } from '../types.js';

export const DAYS: Record<HeistId, HeistDays> = {
	// Aftershock
	axe_45: 1,
	// Alaskan Deal
	wwh_7: 1,
	// Art Gallery
	axe_33: 1,
	// Bank Heist: Cash
	axe_19: 1,
	// Bank Heist: Deposit
	axe_20: 1,
	// Bank Heist: Gold
	axe_18: 1,
	// Bank Heist: Random
	axe_17: 1,
	// Beneath the Mountain
	axe_47: 1,
	// Big Oil - wiki Day 1-2; Steam "day 2 of the Big Oil job"
	axe_13: 2,
	// Birth of Sky
	axe_48: 1,
	// Black Cat
	chca_8: 1,
	// Boiling Point
	axe_56: 1,
	// Border Crossing
	mex_8: 1,
	// Border Crystals
	mex2_8: 1,
	// Breakfast in Tijuana
	pex_8: 1,
	// Breakin' Feds
	tag_8: 1,
	// Brooklyn 10-10
	spa_3: 1,
	// Brooklyn Bank
	brb_7: 1,
	// Buluc's Mansion
	fex_8: 1,
	// Car Shop
	axe_41: 1,
	// Cook Off
	axe_40: 1,
	// Counterfeit
	axe_51: 1,
	// Crude Awakening
	deep_8: 1,
	// Cursed Kill Room
	ckr_7: 1,
	// Diamond Heist
	dah_7: 1,
	// Diamond Store
	axe_15: 1,
	// Dragon Heist
	chas_8: 1,
	// Election Day - wiki Day 1-2; Steam "day 2 of the Election Day job"
	axe_27: 2,
	// Firestarter - wiki Day 1-3; Steam "day 3 of the Firestarter job"
	axe_9: 3,
	// First World Bank
	axe_37: 1,
	// Four Stores
	axe_3: 1,
	// Framing Frame - wiki Day 1-3; Steam "day 3 of the Framing Frame job"
	axe_11: 3,
	// GO Bank
	axe_16: 1,
	// Goat Simulator - wiki Day 1-2; Steam "day 2 of the Goat Simulator job"
	axe_49: 2,
	// Golden Grin Casino
	axe_44: 1,
	// Green Bridge
	glace_7: 1,
	// Heat Street
	run_7: 1,
	// Hell's Island
	bph_8: 1,
	// Henry's Rock
	des_8: 1,
	// Hostile Takeover
	corp_8: 1,
	// Hotline Miami - wiki Day 1-2; Steam "day 2 of the Hotline Miami job"
	axe_31: 2,
	// Hoxton Breakout - wiki Day 1-2; Steam "day 2" achievement
	axe_34: 2,
	// Hoxton Revenge
	axe_39: 1,
	// Jewelry Store
	axe_14: 1,
	// Lab Rats
	axe_46: 1,
	// Lost In Transit
	trai_8: 1,
	// Mallcrasher
	axe_2: 1,
	// Meltdown
	axe_42: 1,
	// Midland Ranch
	ranc_8: 1,
	// Mountain Master
	pent_8: 1,
	// Murky Station
	axe_53: 1,
	// Nightclub
	axe_4: 1,
	// No Mercy
	nmh_8: 1,
	// Panic Room
	axe_55: 1,
	// Prison Nightmare
	orange_3: 1,
	// Rats - wiki Day 1-3; Steam "day 3 of the Rats job"
	axe_7: 3,
	// Reservoir Dogs - wiki page "Reservoir Dogs Heist" Day 1-2; Steam "day 2"
	rvd_7: 2,
	// Safe House Nightmare
	axe_666: 1,
	// Safe House Raid
	trk_sa_6: 1,
	// San Martín Bank
	bex_8: 1,
	// Santa's Workshop
	axe_54: 1,
	// Scarface Mansion
	friend_3: 1,
	// Shacklethorne Auction
	sah_8: 1,
	// Shadow Raid
	axe_29: 1,
	// Slaughterhouse
	axe_38: 1,
	// Stealing Xmas
	moon_3: 1,
	// The Alesso Heist
	axe_43: 1,
	// The Big Bank
	axe_30: 1,
	// The Biker Heist - wiki Day 1-2; Steam "day 2 of the Biker Heist"
	axe_57: 2,
	// The Bomb: Dockyard
	axe_61: 1,
	// The Bomb: Forest
	axe_60: 1,
	// The Diamond
	axe_36: 1,
	// The White House
	vit_8: 1,
	// The Yacht Heist
	fish_3: 1,
	// Transport: Crossroads
	axe_21: 1,
	// Transport: Downtown
	axe_22: 1,
	// Transport: Harbor
	axe_23: 1,
	// Transport: Park
	axe_24: 1,
	// Transport: Train Heist
	axe_26: 1,
	// Transport: Underpass
	axe_25: 1,
	// Ukrainian Job
	axe_1: 1,
	// Ukrainian Prisoner
	sand_8: 1,
	// Under the Hammer
	auc_8: 1,
	// Undercover
	axe_52: 1,
	// Watchdogs - wiki Day 1-2; Steam "day 2 of the Watchdogs job"
	axe_5: 2,
	// White Xmas
	axe_59: 1,
};
