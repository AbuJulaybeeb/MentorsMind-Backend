import pool from "../config/database";

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
  taxRate: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  type: "session" | "subscription" | "refund";
  lineItems: LineItem[];
  subtotal: string;
  tax: string;
  total: string;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  dueDate: Date;
  pdfUrl: string;
}

export class InvoiceService {
  /**
   * Generate a sequential invoice number: INV-YYYYMM-NNNN
   */
  private static async generateInvoiceNumber(): Promise<string> {
    const result = await pool.query(
      `SELECT COUNT(*) AS count FROM invoices
       WHERE created_at >= date_trunc('month', NOW())`,
    );
    const seq = parseInt(result.rows[0].count) + 1;
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    return `INV-${ym}-${String(seq).padStart(4, "0")}`;
  }

  /**
   * Calculate subtotal, tax, and total from line items.
   */
  private static calculateTotals(lineItems: LineItem[]): {
    subtotal: string;
    tax: string;
    total: string;
  } {
    let subtotal = 0;
    let tax = 0;
    for (const item of lineItems) {
      const itemTotal = parseFloat(item.total);
      subtotal += itemTotal;
      tax += itemTotal * (item.taxRate / 100);
    }
    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: (subtotal + tax).toFixed(2),
    };
  }

  /**
   * Create a new invoice.
   */
  static async createInvoice(
    userId: string,
    type: Invoice["type"],
    lineItems: LineItem[],
    currency: string,
    dueDate: Date,
  ): Promise<Invoice> {
    const invoiceNumber = await this.generateInvoiceNumber();
    const { subtotal, tax, total } = this.calculateTotals(lineItems);

    const result = await pool.query(
      `INSERT INTO invoices
         (invoice_number, user_id, type, line_items, subtotal, tax, total, currency, status, due_date, pdf_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, '', NOW())
       RETURNING *`,
      [
        invoiceNumber,
        userId,
        type,
        JSON.stringify(lineItems),
        subtotal,
        tax,
        total,
        currency,
        dueDate,
      ],
    );

    return this.mapRow(result.rows[0]);
  }

  /**
   * Get invoice by ID.
   */
  static async getInvoice(invoiceId: string): Promise<Invoice | null> {
    const result = await pool.query(`SELECT * FROM invoices WHERE id = $1`, [
      invoiceId,
    ]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * List invoices for a user with optional status filter.
   */
  static async listInvoices(
    userId: string,
    status?: Invoice["status"],
  ): Promise<Invoice[]> {
    const params: any[] = [userId];
    let query = `SELECT * FROM invoices WHERE user_id = $1`;
    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }
    query += ` ORDER BY created_at DESC`;
    const result = await pool.query(query, params);
    return result.rows.map(this.mapRow);
  }

  /**
   * Update invoice status.
   */
  static async updateStatus(
    invoiceId: string,
    status: Invoice["status"],
  ): Promise<void> {
    await pool.query(
      `UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, invoiceId],
    );
  }

  /**
   * Attach a PDF URL to an invoice after generation.
   */
  static async attachPdf(invoiceId: string, pdfUrl: string): Promise<void> {
    await pool.query(
      `UPDATE invoices SET pdf_url = $1, updated_at = NOW() WHERE id = $2`,
      [pdfUrl, invoiceId],
    );
  }

  /**
   * Bulk export invoices for a user as an array (for CSV/PDF export).
   */
  static async bulkExport(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<Invoice[]> {
    const result = await pool.query(
      `SELECT * FROM invoices
       WHERE user_id = $1 AND created_at BETWEEN $2 AND $3
       ORDER BY created_at ASC`,
      [userId, from, to],
    );
    return result.rows.map(this.mapRow);
  }

  /**
   * Mark overdue invoices (due_date passed, status still 'sent').
   */
  static async markOverdue(): Promise<number> {
    const result = await pool.query(
      `UPDATE invoices SET status = 'overdue', updated_at = NOW()
       WHERE status = 'sent' AND due_date < NOW()
       RETURNING id`,
    );
    return result.rowCount ?? 0;
  }

  private static mapRow(row: any): Invoice {
    return {
      id: row.id,
      invoiceNumber: row.invoice_number,
      userId: row.user_id,
      type: row.type,
      lineItems:
        typeof row.line_items === "string"
          ? JSON.parse(row.line_items)
          : row.line_items,
      subtotal: row.subtotal,
      tax: row.tax,
      total: row.total,
      currency: row.currency,
      status: row.status,
      dueDate: row.due_date,
      pdfUrl: row.pdf_url,
    };
  }
}
