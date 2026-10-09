import { createErrorResponse, createSuccessResponse } from '@/contracts/common';
import type {
  ExtractPrescriptionTextParams,
  ExtractPrescriptionTextResponse,
  ExtractedPrescriptionData,
  OcrHandoffPayload,
} from '../types';

/**
 * On-device ML Kit OCR Service for typed prescriptions (Tool 15).
 * 
 * Safety Rules:
 * 1. Bundled, on-device ML Kit recognition; offline capable.
 * 2. OCR text is transient by default; prescription images are never persisted.
 * 3. Never send prescription text or image URIs to remote telemetry or cloud services.
 * 4. OCR output requires explicit user verification before handing off to medication creation.
 */
export async function extractPrescriptionText(
  params: ExtractPrescriptionTextParams
): Promise<ExtractPrescriptionTextResponse> {
  if (!params || !params.image_uri || typeof params.image_uri !== 'string') {
    return createErrorResponse(
      'VALIDATION_ERROR',
      'image_uri is required and must be a valid local file URI.'
    );
  }

  try {
    // Dynamic import to support graceful fallback if running in environments without native binary linked
    let ocrResult: { text: string; blocks?: { text: string }[] };

    try {
      const mlkit = await import('rn-mlkit-ocr');
      const recognize = mlkit.recognizeText ?? mlkit.default?.recognizeText;

      if (typeof recognize === 'function') {
        ocrResult = await recognize(params.image_uri, 'latin');
      } else {
        throw new Error('ML Kit recognizeText function is not available.');
      }
    } catch (nativeError) {
      console.warn(
        '[OCR Service] Native ML Kit OCR not available or threw an error:',
        nativeError
      );

      // In development / testing environments where native module isn't loaded, return informative fallback text
      return createErrorResponse(
        'INTERNAL_ERROR',
        `OCR recognition failed: ${nativeError instanceof Error ? nativeError.message : 'Unknown native error'}`
      );
    }

    const rawText = (ocrResult.text ?? '').trim();
    const blocks = (ocrResult.blocks ?? []).map((b) => b.text.trim()).filter(Boolean);

    if (!rawText) {
      return createErrorResponse(
        'NOT_FOUND',
        'No readable text could be recognized from the prescription image. Please ensure the image is clear and well-lit.'
      );
    }

    const data: ExtractedPrescriptionData = {
      raw_text: rawText,
      blocks,
      requires_manual_review: true,
    };

    return createSuccessResponse(data);
  } catch (error) {
    return createErrorResponse(
      'INTERNAL_ERROR',
      `Unexpected error while recognizing text: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Parses common clinical patterns from OCR text to assist (never replace) user review.
 */
export function parsePrescriptionHints(rawText: string): {
  suggestedName?: string;
  suggestedStrength?: string;
  suggestedInstructions?: string;
} {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let suggestedStrength: string | undefined;
  let suggestedInstructions: string | undefined;
  let suggestedName: string | undefined;

  // Detect common strength patterns (e.g. 500mg, 10 mg, 5mcg, 250 mg/5ml)
  const strengthRegex = /(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|IU|iu|tablets?|capsules?))/i;
  // Detect common frequency/instruction cues
  const instructionRegex = /(take|drink|apply|once daily|twice daily|thrice daily|every \d+ hours?|q\d+h|prn|with meals|after meals|before bedtime|tid|bid|od|qid)/i;

  for (const line of lines) {
    if (!suggestedStrength) {
      const match = line.match(strengthRegex);
      if (match) {
        suggestedStrength = match[1];
      }
    }

    if (!suggestedInstructions && instructionRegex.test(line)) {
      suggestedInstructions = line;
    }

    // Likely drug line if contains strength or starts after 'Rx'
    if (!suggestedName && (line.includes('Rx') || strengthRegex.test(line))) {
      suggestedName = line
        .replace(/^Rx[:\s]*/i, '')
        .replace(strengthRegex, '')
        .trim();
    }
  }

  return {
    suggestedName: suggestedName || lines[0] || undefined,
    suggestedStrength,
    suggestedInstructions,
  };
}

/**
 * Builds the handoff payload for Dev 2's medication creation workflow.
 */
export function buildMedicationHandoff(rawText: string): OcrHandoffPayload {
  const hints = parsePrescriptionHints(rawText);

  return {
    raw_text: rawText,
    requires_manual_review: true,
    source: 'ocr_verified',
    parsedHints: hints,
  };
}
