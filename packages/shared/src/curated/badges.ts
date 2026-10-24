/**
 * Display labels for the whole-contractor achievements, and which contractor
 * in OUR catalog each one corresponds to.
 *
 * Hand-maintained: Steam's description phrases ("all of the Elephants
 * contracts") do not match our contractor names ("The Elephant"), and nothing
 * in the API relates the two.
 *
 * `contractor: null` means the achievement spans everything rather than one
 * contractor.
 *
 * Typed as Record<MetaId, ...>, so a meta achievement added to Steam breaks
 * the build until it is labelled here.
 *
 * Note there is no meta achievement for Jiu Feng, Gemma McShay, Blaine Keegan
 * or Shayu - Overkill never shipped one for those contractors.
 */
import type { MetaId } from '../generated/steam.js';
import type { Contractor } from '../types.js';

export interface BadgeLabel {
	readonly label: string;
	readonly contractor: Contractor | null;
}

export const BADGE_LABELS: Record<MetaId, BadgeLabel> = {
	trk_cc_6: { label: 'Classic', contractor: 'Classic' },
	ggez_1: { label: 'Everything', contractor: null },
	trk_ev_6: { label: 'Events', contractor: 'Events' },
	axe_65: { label: 'Bain', contractor: 'Bain' },
	trk_d_6: { label: 'The Dentist', contractor: 'The Dentist' },
	axe_63: { label: 'Hector', contractor: 'Hector' },
	trk_j_6: { label: 'Jimmy', contractor: 'Jimmy' },
	trk_l_6: { label: 'Locke', contractor: 'Locke' },
	trk_cb_6: { label: 'The Butcher', contractor: 'The Butcher' },
	trk_c_6: { label: 'The Continental', contractor: 'The Continental' },
	axe_64: { label: 'The Elephant', contractor: 'The Elephant' },
	axe_62: { label: 'Vlad', contractor: 'Vlad' },
};
