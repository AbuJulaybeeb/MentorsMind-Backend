import { Router } from "express";
import { SessionTranscriptionController } from "../controllers/session-transcription.controller";

const router = Router();

router.get(
  "/sessions/:sessionId/transcript",
  SessionTranscriptionController.getTranscript,
);
router.post(
  "/sessions/:sessionId/transcript",
  SessionTranscriptionController.saveTranscript,
);
router.patch(
  "/sessions/:sessionId/transcript",
  SessionTranscriptionController.updateTranscript,
);
router.get(
  "/transcripts/search",
  SessionTranscriptionController.searchTranscripts,
);
router.post(
  "/sessions/:sessionId/transcript/translations/:language",
  SessionTranscriptionController.saveTranslation,
);
router.get(
  "/sessions/:sessionId/transcript/translations/:language",
  SessionTranscriptionController.getTranslation,
);

export default router;
