import type { ToolResponse } from '@/contracts/common';

/**
 * Parameters for the internal extract_prescription_text tool (Tool 15).
 */
export interface ExtractPrescriptionTextParams {
  image_uri: string;
}

/**
 * Data payload returned on successful OCR extraction.
 * requires_manual_review is strictly locked to true to enforce patient safety.
 */
export interface ExtractedPrescriptionData {
  raw_text: string;
  blocks?: string[];
  requires_manual_review: true;
}

export type ExtractPrescriptionTextResponse = ToolResponse<ExtractedPrescriptionData>;

/**
 * Handoff contract from Dev 4 OCR to Dev 2 Medication flow.
 * Dev 4 -> Dev 2 medication: {raw_text, requires_manual_review: true}; editable review before create_medication.
 */
export interface OcrHandoffPayload {
  raw_text: string;
  requires_manual_review: true;
  source: 'ocr_verified';
  parsedHints?: {
    suggestedName?: string;
    suggestedStrength?: string;
    suggestedInstructions?: string;
  };
}

/**
 * Route parameter contract passed via Expo Router to Dev 2's medication creation screen.
 */
export interface OcrHandoffRouteParams {
  ocr_raw_text: string;
  ocr_name?: string;
  ocr_strength?: string;
  ocr_instructions?: string;
  source: 'ocr_verified';
  requires_manual_review: 'true';
}
