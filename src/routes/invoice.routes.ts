import { Router } from "express";
import { InvoiceController } from "../controllers/invoice.controller";

const router = Router();

router.post("/invoices", InvoiceController.createInvoice);
router.get("/invoices", InvoiceController.listInvoices);
router.get("/invoices/export", InvoiceController.bulkExport);
router.get("/invoices/:invoiceId", InvoiceController.getInvoice);
router.patch("/invoices/:invoiceId/status", InvoiceController.updateStatus);

export default router;
