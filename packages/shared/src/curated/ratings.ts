// Our own judgements about each heist. HAND-MAINTAINED.
//
// `approach` is the exception: it is a FACT about the heist, not a preference.
// LOUD means stealth is impossible, STEALTH means the alarm fails the heist,
// BOTH means either works - including a multi-day heist with a stealth day and
// a loud day. It was checked against the Payday 2 wiki's "Loud-Only Heists"
// and "Stealth Heists" categories; 27 of 86 were wrong, mostly heists marked
// LOUD that can in fact be stealthed.
//
// The five stealth-only heists (Shadow Raid, Car Shop, Murky Station, The
// Yacht Heist, Breakin' Feds) have no category of their own - that list comes
// from the explicit wording on those pages and the cross-reference on Murky
// Station's. Nine heists carry no usable signal on the wiki at all and were
// left as they were: Counterfeit, Diamond Heist, First World Bank, Green
// Bridge, Heat Street, No Mercy, Panic Room, Slaughterhouse, Undercover.
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
	// Art Gallery
	axe_33: {
		contractor: 'Bain',
		approach: 'BOTH',
		perceivedDifficulty: 'EASY',
	},
	// Bank Heist: Cash
	axe_19: {
		contractor: 'Bain',
		approach: 'BOTH',
		perceivedDifficulty: 'EASY',
	},
	// Bank Heist: Deposit
	axe_20: {
		contractor: 'Bain',
		approach: 'BOTH',
		perceivedDifficulty: 'EASY',
	},
	// Bank Heist: Gold
	axe_18: {
		contractor: 'Bain',
		approach: 'BOTH',
		perceivedDifficulty: 'EASY',
	},
	// Bank Heist: Random
	axe_17: {
		contractor: 'Bain',
		approach: 'BOTH',
		perceivedDifficulty: 'EASY',
	},
	// Car Shop
	axe_41: {
		contractor: 'Bain',
		approach: 'STEALTH',
		perceivedDifficulty: 'EASY',
	},
	// Cook Off
	axe_40: {
		contractor: 'Bain',
		approach: 'LOUD',
		perceivedDifficulty: 'HARD',
	},
	// Diamond Store
	axe_15: {
		contractor: 'Bain',
		approach: 'BOTH',
		perceivedDifficulty: 'EASY',
	},
	// GO Bank
	axe_16: {
		contractor: 'Bain',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// Jewelry Store
	axe_14: {
		contractor: 'Bain',
		approach: 'BOTH',
		perceivedDifficulty: 'EASY',
	},
	// Reservoir Dogs
	rvd_7: {
		contractor: 'Bain',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Shadow Raid
	axe_29: {
		contractor: 'Bain',
		approach: 'STEALTH',
		perceivedDifficulty: 'HARD',
	},
	// The Alesso Heist
	axe_43: {
		contractor: 'Bain',
		approach: 'BOTH',
		perceivedDifficulty: 'HARD',
	},
	// Transport: Crossroads
	axe_21: {
		contractor: 'Bain',
		approach: 'LOUD',
		perceivedDifficulty: 'HARD',
	},
	// Transport: Downtown
	axe_22: {
		contractor: 'Bain',
		approach: 'LOUD',
		perceivedDifficulty: 'HARD',
	},
	// Transport: Harbor
	axe_23: {
		contractor: 'Bain',
		approach: 'LOUD',
		perceivedDifficulty: 'HARD',
	},
	// Transport: Park
	axe_24: {
		contractor: 'Bain',
		approach: 'LOUD',
		perceivedDifficulty: 'HARD',
	},
	// Transport: Train Heist
	axe_26: {
		contractor: 'Bain',
		approach: 'BOTH',
		perceivedDifficulty: 'HARD',
	},
	// Transport: Underpass
	axe_25: {
		contractor: 'Bain',
		approach: 'LOUD',
		perceivedDifficulty: 'HARD',
	},
	// Under the Hammer
	auc_8: {
		contractor: 'Bain',
		approach: 'BOTH',
		perceivedDifficulty: 'HARD',
	},

	// --- Blaine Keegan ---
	// Crude Awakening
	deep_8: {
		contractor: 'Blaine Keegan',
		approach: 'BOTH',
		perceivedDifficulty: 'HARD',
	},
	// Hostile Takeover
	corp_8: {
		contractor: 'Blaine Keegan',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},

	// --- Classic ---
	// Counterfeit
	axe_51: {
		contractor: 'Classic',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Diamond Heist
	dah_7: {
		contractor: 'Classic',
		approach: 'STEALTH',
		perceivedDifficulty: 'EASY',
	},
	// First World Bank
	axe_37: {
		contractor: 'Classic',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// Green Bridge
	glace_7: {
		contractor: 'Classic',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Heat Street
	run_7: {
		contractor: 'Classic',
		approach: 'LOUD',
		perceivedDifficulty: 'HARD',
	},
	// No Mercy
	nmh_8: {
		contractor: 'Classic',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Panic Room
	axe_55: {
		contractor: 'Classic',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Slaughterhouse
	axe_38: {
		contractor: 'Classic',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Undercover
	axe_52: {
		contractor: 'Classic',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},

	// --- Events ---
	// Cursed Kill Room
	ckr_7: {
		contractor: 'Events',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Lab Rats
	axe_46: {
		contractor: 'Events',
		approach: 'LOUD',
		perceivedDifficulty: 'HARD',
	},
	// Prison Nightmare
	orange_3: {
		contractor: 'Events',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Safe House Nightmare
	axe_666: {
		contractor: 'Events',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Safe House Raid
	trk_sa_6: {
		contractor: 'Events',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},

	// --- Gemma McShay ---
	// Lost In Transit
	trai_8: {
		contractor: 'Gemma McShay',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// Midland Ranch
	ranc_8: {
		contractor: 'Gemma McShay',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},

	// --- Hector ---
	// Firestarter
	axe_9: {
		contractor: 'Hector',
		approach: 'BOTH',
		perceivedDifficulty: 'HARD',
	},
	// Rats
	axe_7: {
		contractor: 'Hector',
		approach: 'LOUD',
		perceivedDifficulty: 'HARD',
	},
	// Watchdogs
	axe_5: {
		contractor: 'Hector',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},

	// --- Jimmy ---
	// Boiling Point
	axe_56: {
		contractor: 'Jimmy',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Murky Station
	axe_53: {
		contractor: 'Jimmy',
		approach: 'STEALTH',
		perceivedDifficulty: 'MEDIUM',
	},

	// --- Jiu Feng ---
	// Dragon Heist
	chas_8: {
		contractor: 'Jiu Feng',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// Ukrainian Prisoner
	sand_8: {
		contractor: 'Jiu Feng',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},

	// --- Locke ---
	// Alaskan Deal
	wwh_7: {
		contractor: 'Locke',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Beneath the Mountain
	axe_47: {
		contractor: 'Locke',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Birth of Sky
	axe_48: {
		contractor: 'Locke',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Border Crossing
	mex_8: {
		contractor: 'Locke',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// Border Crystals
	mex2_8: {
		contractor: 'Locke',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Breakfast in Tijuana
	pex_8: {
		contractor: 'Locke',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// Breakin' Feds
	tag_8: {
		contractor: 'Locke',
		approach: 'STEALTH',
		perceivedDifficulty: 'HARD',
	},
	// Brooklyn Bank
	brb_7: {
		contractor: 'Locke',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Hell's Island
	bph_8: {
		contractor: 'Locke',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Henry's Rock
	des_8: {
		contractor: 'Locke',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Shacklethorne Auction
	sah_8: {
		contractor: 'Locke',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// The White House
	vit_8: {
		contractor: 'Locke',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},

	// --- Shayu ---
	// Mountain Master
	pent_8: {
		contractor: 'Shayu',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},

	// --- The Butcher ---
	// Scarface Mansion
	friend_3: {
		contractor: 'The Butcher',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// The Bomb: Dockyard
	axe_61: {
		contractor: 'The Butcher',
		approach: 'BOTH',
		perceivedDifficulty: 'HARD',
	},
	// The Bomb: Forest
	axe_60: {
		contractor: 'The Butcher',
		approach: 'LOUD',
		perceivedDifficulty: 'HARD',
	},

	// --- The Continental ---
	// Brooklyn 10-10
	spa_3: {
		contractor: 'The Continental',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// The Yacht Heist
	fish_3: {
		contractor: 'The Continental',
		approach: 'STEALTH',
		perceivedDifficulty: 'MEDIUM',
	},

	// --- The Dentist ---
	// Golden Grin Casino
	axe_44: {
		contractor: 'The Dentist',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// Hotline Miami
	axe_31: {
		contractor: 'The Dentist',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Hoxton Breakout
	axe_34: {
		contractor: 'The Dentist',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Hoxton Revenge
	axe_39: {
		contractor: 'The Dentist',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// The Big Bank
	axe_30: {
		contractor: 'The Dentist',
		approach: 'BOTH',
		perceivedDifficulty: 'HARD',
	},
	// The Diamond
	axe_36: {
		contractor: 'The Dentist',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},

	// --- The Elephant ---
	// Big Oil
	axe_13: {
		contractor: 'The Elephant',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// Election Day
	axe_27: {
		contractor: 'The Elephant',
		approach: 'BOTH',
		perceivedDifficulty: 'HARD',
	},
	// Framing Frame
	axe_11: {
		contractor: 'The Elephant',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// The Biker Heist
	axe_57: {
		contractor: 'The Elephant',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},

	// --- Vlad ---
	// Aftershock
	axe_45: {
		contractor: 'Vlad',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Black Cat
	chca_8: {
		contractor: 'Vlad',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// Buluc's Mansion
	fex_8: {
		contractor: 'Vlad',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// Four Stores
	axe_3: {
		contractor: 'Vlad',
		approach: 'BOTH',
		perceivedDifficulty: 'HARD',
	},
	// Goat Simulator
	axe_49: {
		contractor: 'Vlad',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Mallcrasher
	axe_2: {
		contractor: 'Vlad',
		approach: 'LOUD',
		perceivedDifficulty: 'EASY',
	},
	// Meltdown
	axe_42: {
		contractor: 'Vlad',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Nightclub
	axe_4: {
		contractor: 'Vlad',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// San Martín Bank
	bex_8: {
		contractor: 'Vlad',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// Santa's Workshop
	axe_54: {
		contractor: 'Vlad',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Stealing Xmas
	moon_3: {
		contractor: 'Vlad',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
	// Ukrainian Job
	axe_1: {
		contractor: 'Vlad',
		approach: 'BOTH',
		perceivedDifficulty: 'MEDIUM',
	},
	// White Xmas
	axe_59: {
		contractor: 'Vlad',
		approach: 'LOUD',
		perceivedDifficulty: 'MEDIUM',
	},
};
