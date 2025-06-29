export interface CSVExportOptions {
  filename?: string;
  headers?: string[];
  delimiter?: string;
  includeHeaders?: boolean;
}

export class CSVExportService {
  static exportToCSV<T extends Record<string, any>>(
    data: T[],
    options: CSVExportOptions = {}
  ): void {
    const {
      filename = `export-${new Date().toISOString().split('T')[0]}.csv`,
      delimiter = ',',
      includeHeaders = true
    } = options;

    if (data.length === 0) {
      throw new Error('No data to export');
    }

    // Get headers from the first object if not provided
    const headers = options.headers || Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = this.generateCSVContent(data, headers, delimiter, includeHeaders);
    
    // Download the file
    this.downloadCSV(csvContent, filename);
  }

  private static generateCSVContent<T extends Record<string, any>>(
    data: T[],
    headers: string[],
    delimiter: string,
    includeHeaders: boolean
  ): string {
    const rows: string[] = [];

    // Add headers if requested
    if (includeHeaders) {
      rows.push(headers.map(header => this.escapeCSVField(header)).join(delimiter));
    }

    // Add data rows
    data.forEach(item => {
      const row = headers.map(header => {
        const value = item[header];
        return this.escapeCSVField(this.formatValue(value));
      });
      rows.push(row.join(delimiter));
    });

    return rows.join('\n');
  }

  private static escapeCSVField(field: string): string {
    if (field == null) return '';
    
    const stringField = String(field);
    
    // If field contains delimiter, newline, or quote, wrap in quotes and escape quotes
    if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    
    return stringField;
  }

  private static formatValue(value: any): string {
    if (value == null) return '';
    
    // Handle dates
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    
    // Handle booleans
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      return value.join('; ');
    }
    
    // Handle objects
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }

  private static downloadCSV(content: string, filename: string): void {
    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  // Predefined export templates for common data types
  static exportUsers(users: any[], filename?: string): void {
    const headers = [
      'ID',
      'First Name',
      'Last Name', 
      'Email',
      'Role',
      'Subscription Status',
      'Subscription Package',
      'Total Analyses',
      'Last Login',
      'Created At'
    ];

    const formattedData = users.map(user => ({
      'ID': user.id,
      'First Name': user.first_name,
      'Last Name': user.last_name,
      'Email': user.email,
      'Role': user.is_admin ? 'Admin' : 'User',
      'Subscription Status': user.subscription_status || 'inactive',
      'Subscription Package': user.subscription_package || 'Free',
      'Total Analyses': user.total_analyses || 0,
      'Last Login': user.last_login ? new Date(user.last_login) : '',
      'Created At': new Date(user.created_at)
    }));

    this.exportToCSV(formattedData, {
      filename: filename || `users-export-${new Date().toISOString().split('T')[0]}.csv`,
      headers
    });
  }

  static exportSubscriptions(subscriptions: any[], filename?: string): void {
    const headers = [
      'ID',
      'User Name',
      'User Email',
      'Package Name',
      'Status',
      'Start Date',
      'End Date',
      'Amount',
      'Auto Renew',
      'Created At'
    ];

    const formattedData = subscriptions.map(sub => ({
      'ID': sub.id,
      'User Name': `${sub.profiles?.first_name} ${sub.profiles?.last_name}`,
      'User Email': sub.profiles?.email,
      'Package Name': sub.package?.name,
      'Status': sub.status,
      'Start Date': sub.start_date ? new Date(sub.start_date) : '',
      'End Date': sub.end_date ? new Date(sub.end_date) : '',
      'Amount': sub.package?.price || 0,
      'Auto Renew': sub.auto_renew,
      'Created At': new Date(sub.created_at)
    }));

    this.exportToCSV(formattedData, {
      filename: filename || `subscriptions-export-${new Date().toISOString().split('T')[0]}.csv`,
      headers
    });
  }

  static exportAnalyses(analyses: any[], filename?: string): void {
    const headers = [
      'ID',
      'User Name',
      'Template Used',
      'ATS Score',
      'Word Count',
      'Created At'
    ];

    const formattedData = analyses.map(analysis => ({
      'ID': analysis.id,
      'User Name': `${analysis.profiles?.first_name} ${analysis.profiles?.last_name}`,
      'Template Used': analysis.resume_templates?.name || 'Unknown',
      'ATS Score': analysis.ats_score || 'N/A',
      'Word Count': analysis.analysis_data?.wordCount || 'N/A',
      'Created At': new Date(analysis.created_at)
    }));

    this.exportToCSV(formattedData, {
      filename: filename || `analyses-export-${new Date().toISOString().split('T')[0]}.csv`,
      headers
    });
  }
}