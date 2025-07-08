// src/components/ExcelPreview.jsx
import React, { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useTable } from 'react-table';

const ExcelPreview = ({ fileUrl }) => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fileUrl) return;
    setError(null);
    fetch(fileUrl)
      .then(res => res.arrayBuffer())
      .then(arrayBuffer => {
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (!json.length) {
          setData([]);
          setColumns([]);
          return;
        }
        // First row is header
        const header = json[0];
        const rows = json.slice(1).map(row => {
          const obj = {};
          header.forEach((col, i) => {
            obj[col || `Column ${i+1}`] = row[i] !== undefined ? row[i] : '';
          });
          return obj;
        });
        setColumns(header.map(col => ({ Header: col || '', accessor: col || '' })));
        setData(rows);
      })
      .catch(err => {
        setError('Failed to load Excel file.');
        setData([]);
        setColumns([]);
        console.error('Excel preview error:', err);
      });
  }, [fileUrl]);

  const tableInstance = useTable({ columns: useMemo(() => columns, [columns]), data: useMemo(() => data, [data]) });
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = tableInstance;

  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!columns.length) return <div style={{ color: '#888' }}>No data to display.</div>;

  return (
    <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
      <table {...getTableProps()} style={{ borderCollapse: 'collapse', width: '100%', background: '#f8fafc', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
          {headerGroups.map(headerGroup => {
            const { key: headerGroupKey, ...headerGroupRest } = headerGroup.getHeaderGroupProps();
            return (
              <tr key={headerGroupKey} {...headerGroupRest}>
                {headerGroup.headers.map(column => {
                  const { key: colKey, ...colRest } = column.getHeaderProps();
                  return (
                    <th key={colKey} {...colRest} style={{ border: '1px solid #cbd5e1', background: '#e0e7ef', fontWeight: 'bold', padding: '6px 12px', textAlign: 'left', color: '#1e293b' }}>{column.render('Header')}</th>
                  );
                })}
              </tr>
            );
          })}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(row => {
            prepareRow(row);
            const { key: rowKey, ...rowRest } = row.getRowProps();
            return (
              <tr key={rowKey} {...rowRest}>
                {row.cells.map(cell => {
                  const { key: cellKey, ...cellRest } = cell.getCellProps();
                  return (
                    <td key={cellKey} {...cellRest} style={{ border: '1px solid #cbd5e1', padding: '6px 12px', background: '#fff', color: '#1e293b' }}>{cell.render('Cell')}</td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ExcelPreview;