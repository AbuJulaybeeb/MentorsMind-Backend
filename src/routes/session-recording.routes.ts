import { Router } from 'express';
import { SessionRecordingController } from '../controllers/session-recording.controller';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler.utils';
import { validate } from '../middleware/validation.middleware';
import {
  startRecordingSchema,
  recordingIdParamSchema,
  uploadRecordingSchema,
  completeRecordingSchema,
  updateConsentSchema,
  generatePlaybackUrlSchema,
  startTranscriptionSchema,
  searchTranscriptionsSchema,
  createBookmarkSchema,
  bookmarkIdParamSchema,
  updateBookmarkSchema,
} from '../validators/schemas/session-recording.schemas';

const router = Router();

// All recording routes require authentication
router.use(authenticate);

// Start recording for a session
router.post(
  '/sessions/:sessionId/recordings/start',
  validate(startRecordingSchema),
  asyncHandler(SessionRecordingController.startRecording),
);

// Upload recording data (typically for streaming or multipart uploads)
router.post(
  '/recordings/:recordingId/upload',
  validate(uploadRecordingSchema),
  asyncHandler(SessionRecordingController.uploadRecording),
);

// Mark recording as complete after processing
router.post(
  '/recordings/:recordingId/complete',
  validate(completeRecordingSchema),
  asyncHandler(SessionRecordingController.completeRecording),
);

// Update consent for a recording
router.post(
  '/recordings/:recordingId/consent',
  validate(updateConsentSchema),
  asyncHandler(SessionRecordingController.updateConsent),
);

// Generate playback URL for a recording
router.get(
  '/recordings/:recordingId/playback-url',
  validate(generatePlaybackUrlSchema),
  asyncHandler(SessionRecordingController.generatePlaybackUrl),
);

// Get recording details
router.get(
  '/recordings/:recordingId',
  validate(recordingIdParamSchema),
  asyncHandler(SessionRecordingController.getRecording),
);

// Get all recordings for the current user
router.get(
  '/recordings',
  asyncHandler(SessionRecordingController.getUserRecordings),
);

// Delete a recording
router.delete(
  '/recordings/:recordingId',
  validate(recordingIdParamSchema),
  asyncHandler(SessionRecordingController.deleteRecording),
);

// Transcription endpoints
router.post(
  '/recordings/:recordingId/transcription',
  validate(startTranscriptionSchema),
  asyncHandler(SessionRecordingController.startTranscription),
);

router.get(
  '/recordings/:recordingId/transcription',
  validate(recordingIdParamSchema),
  asyncHandler(SessionRecordingController.getTranscription),
);

router.get(
  '/transcriptions/search',
  validate(searchTranscriptionsSchema),
  asyncHandler(SessionRecordingController.searchTranscriptions),
);

// Bookmark endpoints
router.post(
  '/recordings/:recordingId/bookmarks',
  validate(createBookmarkSchema),
  asyncHandler(SessionRecordingController.createBookmark),
);

router.get(
  '/recordings/:recordingId/bookmarks',
  validate(recordingIdParamSchema),
  asyncHandler(SessionRecordingController.getBookmarks),
);

router.get(
  '/bookmarks',
  asyncHandler(SessionRecordingController.getUserBookmarks),
);

router.put(
  '/bookmarks/:bookmarkId',
  validate(updateBookmarkSchema),
  asyncHandler(SessionRecordingController.updateBookmark),
);

router.delete(
  '/bookmarks/:bookmarkId',
  validate(bookmarkIdParamSchema),
  asyncHandler(SessionRecordingController.deleteBookmark),
);

router.get(
  '/recordings/:recordingId/bookmarks/export',
  validate(recordingIdParamSchema),
  asyncHandler(SessionRecordingController.exportBookmarks),
);

export default router;
