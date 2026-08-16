/**
 * Provenance tags: they record how a recipe got here. Lower-case like every
 * other tag in the app (both the tag input and the server normalize), so one
 * of these and a hand-typed one are the same tag, not two that differ in case.
 *
 * The editor adds MANUAL_CAPTURE_TAG when a recipe is saved with edits;
 * AI_CAPTURE_TAG is put on by the server wherever the AI parsed or wrote one.
 */
export const MANUAL_CAPTURE_TAG = 'manually captured';
export const AI_CAPTURE_TAG = 'captured by ai';
