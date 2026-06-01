import { Request, Response } from "express";
import { InvoiceService } from "../services/invoice.service";

export class InvoiceController {
  static async createInvoice(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.id;
    const { type, lineItems, currency, dueDate } = req.body;
    const invoice = await InvoiceService.createInvoice(
      userId,
      type,
      lineItems,
      currency,
      new Date(dueDate),
    );
    res.status(201).json({ success: true, data: invoice });
  }

  static async getInvoice(req: Request, res: Response): Promise<void> {
    const invoice = await InvoiceService.getInvoice(req.params.invoiceId);
    if (!invoice) {
      res.status(404).json({ success: false, message: "Invoice not found" });
      return;
    }
    res.json({ success: true, data: invoice });
  }

  static async listInvoices(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.id;
    const status = req.query.status as any;
    const invoices = await InvoiceService.listInvoices(userId, status);
    res.json({ success: true, data: invoices });
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    await InvoiceService.updateStatus(req.params.invoiceId, req.body.status);
    res.json({ success: true, message: "Invoice status updated" });
  }

  static async bulkExport(req: Request, res: Response): Promise<void> {
    const userId = (req as any).user?.id;
    const { from, to } = req.query;
    const invoices = await InvoiceService.bulkExport(
      userId,
      new Date(from as string),
      new Date(to as string),
    );
    res.json({ success: true, data: invoices });
  }
}
