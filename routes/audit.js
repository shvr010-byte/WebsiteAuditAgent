const express = require("express");
const router = express.Router();

// Batch Gemini Version
const auditController = require("../controllers/auditControllerV2");

router.post("/", auditController.auditWebsite);

module.exports = router;