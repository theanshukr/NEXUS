import { Transform } from 'stream';
import ExcelJS from 'exceljs';

/**
 * Streams MongoDB cursor results as a CSV directly to the Express response.
 * Keeps memory usage flat regardless of result set size.
 */
export async function streamCsv(cursor, res, filename = 'export.csv') {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const csvTransform = new Transform({
    objectMode: true,
    transform(doc, encoding, callback) {
      if (!this.headersWritten) {
        this.push('Date,Employee Code,Employee Name,Status,Workflow Status,Working Hours,Overtime Hours\n');
        this.headersWritten = true;
      }
      const row = [
        doc.date || '',
        doc.employee?.employeeCode || '',
        `${doc.employee?.firstName || ''} ${doc.employee?.lastName || ''}`.trim(),
        doc.attendanceStatus || '',
        doc.workflowStatus || '',
        doc.workingHours || 0,
        doc.overtimeHours || 0
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      
      this.push(row + '\n');
      callback();
    }
  });

  cursor.pipe(csvTransform).pipe(res);
  
  return new Promise((resolve, reject) => {
    res.on('finish', resolve);
    res.on('error', reject);
    cursor.on('error', reject);
    csvTransform.on('error', reject);
  });
}

/**
 * Streams MongoDB cursor results as an Excel workbook directly to the Express response.
 */
export async function streamExcel(cursor, res, filename = 'export.xlsx') {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const options = {
    stream: res,
    useStyles: true,
    useSharedStrings: true
  };
  
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter(options);
  const worksheet = workbook.addWorksheet('Attendance Data');

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Employee Code', key: 'empCode', width: 15 },
    { header: 'Employee Name', key: 'empName', width: 30 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Workflow Status', key: 'workflowStatus', width: 15 },
    { header: 'Working Hours', key: 'workingHours', width: 12 },
    { header: 'Overtime Hours', key: 'overtimeHours', width: 12 }
  ];

  // Formatting headers
  worksheet.getRow(1).font = { bold: true };

  cursor.on('data', (doc) => {
    worksheet.addRow({
      date: doc.date,
      empCode: doc.employee?.employeeCode || '',
      empName: `${doc.employee?.firstName || ''} ${doc.employee?.lastName || ''}`.trim(),
      status: doc.attendanceStatus,
      workflowStatus: doc.workflowStatus,
      workingHours: doc.workingHours || 0,
      overtimeHours: doc.overtimeHours || 0
    }).commit();
  });

  return new Promise((resolve, reject) => {
    cursor.on('end', async () => {
      worksheet.commit();
      await workbook.commit();
      resolve();
    });
    cursor.on('error', reject);
    res.on('error', reject);
  });
}
