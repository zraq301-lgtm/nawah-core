import React, { useState, useCallback } from 'react';
import { Download, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

const DataGrid = ({ columns, data, onCellEdit, onBulkDelete, exportFileName, editable = true }) => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleRowSelect = (id) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === data.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(data.map(row => row.id));
    }
  };

  const startEdit = (rowId, colKey, currentValue) => {
    if (!editable) return;
    setEditingCell({ rowId, colKey });
    setEditValue(currentValue != null ? String(currentValue) : '');
  };

  const commitEdit = () => {
    if (editingCell && onCellEdit) {
      onCellEdit(editingCell.rowId, editingCell.colKey, editValue);
    }
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedRows.length} صف؟`)) return;
    onBulkDelete(selectedRows);
    setSelectedRows([]);
  };

  const handleExportCSV = () => {
    if (data.length === 0) return;
    const exportData = data.map(row => {
      const obj = {};
      columns.forEach(col => {
        obj[col.header] = row[col.key] ?? '';
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, exportFileName || 'Sheet1');
    XLSX.writeFile(wb, `${exportFileName || 'data'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {selectedRows.length > 0 && onBulkDelete && (
            <button
              onClick={handleBulkDelete}
              style={{
                padding: '8px 14px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(254, 242, 242, 0.9)', color: '#ef4444', fontWeight: 'bold',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem',
                fontFamily: "'Tajawal', sans-serif"
              }}
            >
              <Trash2 size={14} /> حذف ({selectedRows.length})
            </button>
          )}
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{data.length} صف</span>
        </div>
        <button
          onClick={handleExportCSV}
          style={{
            padding: '8px 14px', borderRadius: '12px', border: 'none',
            background: '#1e5631', color: 'white', fontWeight: 'bold',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem',
            fontFamily: "'Tajawal', sans-serif", boxShadow: '0 4px 12px rgba(30, 86, 49, 0.2)'
          }}
        >
          <Download size={14} /> تصدير Excel
        </button>
      </div>

      <div className="data-grid-container" style={{ maxHeight: '60vh', overflow: 'auto' }}>
        <table className="data-grid">
          <thead>
            <tr>
              {onBulkDelete && (
                <th className="checkbox-cell">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map(col => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onBulkDelete ? 1 : 0)} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  لا توجد بيانات
                </td>
              </tr>
            ) : (
              data.map(row => (
                <tr key={row.id} className={selectedRows.includes(row.id) ? 'row-selected' : ''}>
                  {onBulkDelete && (
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row.id)}
                        onChange={() => handleRowSelect(row.id)}
                      />
                    </td>
                  )}
                  {columns.map(col => {
                    const isEditing = editingCell?.rowId === row.id && editingCell?.colKey === col.key;
                    const isEditable = editable && col.editable !== false;
                    return (
                      <td
                        key={col.key}
                        className={isEditable ? 'cell-editable' : ''}
                        onDoubleClick={() => isEditable && startEdit(row.id, col.key, row[col.key])}
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={commitEdit}
                            type={col.type === 'number' ? 'number' : 'text'}
                            style={{ width: '100%' }}
                          />
                        ) : (
                          <span>{col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editable && (
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', marginTop: '8px' }}>
          انقر مرتين على أي خلية للتعديل | Enter للحفظ | Escape للإلغاء
        </p>
      )}
    </div>
  );
};

export default DataGrid;
