import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, File, X, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportButtonProps {
  data: any[];
  columns: { key: string; label: string }[];
  filename: string;
}

type ExportFormat = 'csv' | 'xlsx' | 'txt';
type Delimiter = ';' | ',' | '|' | '\t';
type Encoding = 'UTF-8' | 'Latin1';

export default function ExportButton({ data, columns, filename }: ExportButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [delimiter, setDelimiter] = useState<Delimiter>(';');
  const [encoding, setEncoding] = useState<Encoding>('UTF-8');
  const [includeHeader, setIncludeHeader] = useState(true);

  const openExportModal = (format: ExportFormat) => {
    setSelectedFormat(format);
    setShowDropdown(false);
    setShowModal(true);
  };

  const generateCSV = () => {
    let content = '';
    
    // Cabeçalho
    if (includeHeader) {
      content = columns.map(c => c.label).join(delimiter) + '\n';
    }
    
    // Dados
    data.forEach(row => {
      const values = columns.map(c => {
        const value = row[c.key] ?? '';
        // Escapar valores que contenham o delimitador
        const strValue = String(value);
        if (strValue.includes(delimiter) || strValue.includes('\n') || strValue.includes('"')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      });
      content += values.join(delimiter) + '\n';
    });
    
    return content;
  };

  const generateTXT = () => {
    let content = '';
    
    // Cabeçalho
    if (includeHeader) {
      content = columns.map(c => c.label).join(delimiter) + '\n';
    }
    
    // Dados
    data.forEach(row => {
      const values = columns.map(c => String(row[c.key] ?? ''));
      content += values.join(delimiter) + '\n';
    });
    
    return content;
  };

  const generateXLSX = () => {
    // Preparar dados para XLSX
    const wsData: any[][] = [];
    
    // Cabeçalho
    if (includeHeader) {
      wsData.push(columns.map(c => c.label));
    }
    
    // Dados
    data.forEach(row => {
      wsData.push(columns.map(c => row[c.key] ?? ''));
    });
    
    // Criar workbook e worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Ajustar largura das colunas
    const colWidths = columns.map(c => ({ wch: Math.max(c.label.length + 2, 15) }));
    ws['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    
    // Gerar arquivo
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const downloadFile = (content: string, extension: string, mimeType: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=${encoding === 'UTF-8' ? 'utf-8' : 'iso-8859-1'}` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (data.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    try {
      if (selectedFormat === 'xlsx') {
        generateXLSX();
      } else if (selectedFormat === 'csv') {
        const content = generateCSV();
        downloadFile(content, 'csv', 'text/csv');
      } else if (selectedFormat === 'txt') {
        const content = generateTXT();
        downloadFile(content, 'txt', 'text/plain');
      }
      
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao gerar arquivo de exportação');
    }
  };

  const formatIcons = {
    csv: FileText,
    xlsx: FileSpreadsheet,
    txt: File,
  };

  return (
    <div className="relative">
      {/* Botão principal */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 bg-nexus-bg border border-nexus-border rounded-lg text-xs font-semibold text-nexus-text hover:border-nexus-purple transition-colors"
      >
        <Download size={14} />
        Exportar
        <ChevronDown size={12} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-nexus-border z-50 overflow-hidden">
            <button
              onClick={() => openExportModal('csv')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-nexus-text hover:bg-nexus-bg transition-colors"
            >
              <FileText size={14} className="text-green-600" />
              Exportar CSV
            </button>
            <button
              onClick={() => openExportModal('xlsx')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-nexus-text hover:bg-nexus-bg transition-colors"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              Exportar XLSX
            </button>
            <button
              onClick={() => openExportModal('txt')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-nexus-text hover:bg-nexus-bg transition-colors"
            >
              <File size={14} className="text-blue-600" />
              Exportar TXT
            </button>
          </div>
        </>
      )}

      {/* Modal de configuração */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-modal animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = formatIcons[selectedFormat];
                  return <Icon size={20} className="text-nexus-purple" />;
                })()}
                <h2 className="font-bold text-nexus-text">Exportar {selectedFormat.toUpperCase()}</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-nexus-muted hover:text-nexus-text">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Formato selecionado */}
              <div className="bg-nexus-bg rounded-lg p-3">
                <p className="text-[10px] text-nexus-muted font-semibold mb-1">FORMATO SELECIONADO</p>
                <p className="text-sm font-semibold text-nexus-text">{selectedFormat.toUpperCase()}</p>
              </div>

              {/* Delimitador - apenas para CSV e TXT */}
              {(selectedFormat === 'csv' || selectedFormat === 'txt') && (
                <div>
                  <label className="block text-[10px] text-nexus-muted mb-2 font-semibold uppercase">Delimitador</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: ';', label: 'Ponto e vírgula (;)' },
                      { value: ',', label: 'Vírgula (,)' },
                      { value: '|', label: 'Pipe (|)' },
                      { value: '\t', label: 'Tab' },
                    ].map(d => (
                      <button
                        key={d.value}
                        onClick={() => setDelimiter(d.value as Delimiter)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          delimiter === d.value
                            ? 'bg-nexus-purple text-white'
                            : 'bg-nexus-bg text-nexus-text hover:bg-nexus-borderLight'
                        }`}
                      >
                        {d.value === '\t' ? 'Tab' : d.value}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Encoding - apenas para CSV e TXT */}
              {(selectedFormat === 'csv' || selectedFormat === 'txt') && (
                <div>
                  <label className="block text-[10px] text-nexus-muted mb-2 font-semibold uppercase">Encoding</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['UTF-8', 'Latin1'].map(enc => (
                      <button
                        key={enc}
                        onClick={() => setEncoding(enc as Encoding)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          encoding === enc
                            ? 'bg-nexus-purple text-white'
                            : 'bg-nexus-bg text-nexus-text hover:bg-nexus-borderLight'
                        }`}
                      >
                        {enc}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Incluir cabeçalho */}
              <div className="flex items-center gap-2 bg-nexus-bg rounded-lg p-3">
                <input
                  type="checkbox"
                  id="includeHeader"
                  checked={includeHeader}
                  onChange={e => setIncludeHeader(e.target.checked)}
                  className="w-4 h-4 text-nexus-purple rounded border-nexus-border focus:ring-nexus-purple"
                />
                <label htmlFor="includeHeader" className="text-xs text-nexus-text font-medium cursor-pointer">
                  Incluir cabeçalho
                </label>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-[10px] text-blue-700 font-medium">
                  📊 {data.length} {data.length === 1 ? 'registro' : 'registros'} · {columns.length} {columns.length === 1 ? 'coluna' : 'colunas'}
                </p>
              </div>
            </div>

            {/* Botão exportar */}
            <button
              onClick={handleExport}
              className="mt-5 w-full py-2.5 btn-gradient rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Exportar {selectedFormat.toUpperCase()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
