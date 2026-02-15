import { useState, useEffect, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import { Database, Plus, Edit2, Trash2, TestTube, Download, X, Server, FileSpreadsheet, FileText, AlertCircle, CheckCircle, Loader2, Info, FolderOpen, Upload } from 'lucide-react';
import api from '../../api';

interface FonteDados {
  id: number;
  nome: string;
  tipo: 'sqlserver' | 'postgresql' | 'excel' | 'csv' | 'txt';
  config_json: string;
  mapeamento_json: string;
  id_cliente?: number;
  cliente_nome?: string;
  ativo: number;
  created_at: string;
  updated_at: string;
}

const TIPOS_FONTE = [
  { value: 'sqlserver', label: 'SQL Server', icon: Server },
  { value: 'postgresql', label: 'PostgreSQL', icon: Server },
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', icon: FileText },
  { value: 'txt', label: 'TXT', icon: FileText },
];

const DELIMITADORES = [
  { value: ';', label: 'Ponto e vírgula (;)' },
  { value: ',', label: 'Vírgula (,)' },
  { value: '|', label: 'Pipe (|)' },
  { value: '\t', label: 'Tab' },
];

const ENCODINGS = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'latin1', label: 'Latin1 (ISO-8859-1)' },
  { value: 'windows-1252', label: 'Windows-1252' },
];

export default function RVFontesConfig() {
  const { data: fontes, loading, error, refetch } = useApi<FonteDados[]>('/rv/fontes-dados');
  const [showModal, setShowModal] = useState(false);
  const [editingFonte, setEditingFonte] = useState<FonteDados | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'sqlserver' as FonteDados['tipo'],
    config: {
      // SQL
      host: '',
      port: '',
      database: '',
      username: '',
      password: '',
      query: '',
      // Excel
      caminho_rede: '',
      nome_arquivo: '',
      sheet_name: '',
      // CSV/TXT
      caminho_arquivo: '',
      delimitador: ';',
      encoding: 'utf-8',
      tem_cabecalho: true,
    },
    mapeamento: {
      coluna_matricula: '',
      coluna_indicador: '',
      coluna_valor: '',
      coluna_numerador: '',
      coluna_denominador: '',
      coluna_periodo: '',
    },
    id_cliente: null as number | null,
    ativo: 1,
  });

  const openModal = (fonte?: FonteDados) => {
    if (fonte) {
      setEditingFonte(fonte);
      const config = JSON.parse(fonte.config_json);
      const mapeamento = JSON.parse(fonte.mapeamento_json);
      setFormData({
        nome: fonte.nome,
        tipo: fonte.tipo,
        config: { ...formData.config, ...config },
        mapeamento: { ...formData.mapeamento, ...mapeamento },
        id_cliente: fonte.id_cliente || null,
        ativo: fonte.ativo,
      });
    } else {
      setEditingFonte(null);
      setFormData({
        nome: '',
        tipo: 'sqlserver',
        config: {
          host: '',
          port: '',
          database: '',
          username: '',
          password: '',
          query: '',
          caminho_rede: '',
          nome_arquivo: '',
          sheet_name: '',
          caminho_arquivo: '',
          delimitador: ';',
          encoding: 'utf-8',
          tem_cabecalho: true,
        },
        mapeamento: {
          coluna_matricula: '',
          coluna_indicador: '',
          coluna_valor: '',
          coluna_numerador: '',
          coluna_denominador: '',
          coluna_periodo: '',
        },
        id_cliente: null,
        ativo: 1,
      });
    }
    setTestResult(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        nome: formData.nome,
        tipo: formData.tipo,
        config_json: JSON.stringify(formData.config),
        mapeamento_json: JSON.stringify(formData.mapeamento),
        id_cliente: formData.id_cliente,
        ativo: formData.ativo,
      };

      if (editingFonte) {
        await api.put(`/rv/fontes-dados/${editingFonte.id}`, payload);
      } else {
        await api.post('/rv/fontes-dados', payload);
      }

      setShowModal(false);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao salvar fonte');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente desativar esta fonte?')) return;
    try {
      await api.delete(`/rv/fontes-dados/${id}`);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao deletar fonte');
    }
  };

  const handleTest = async (id: number) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await api.post(`/rv/fontes-dados/${id}/testar`);
      setTestResult({ success: true, message: res.data.message });
    } catch (err: any) {
      setTestResult({ success: false, message: err.response?.data?.error || 'Erro ao testar conexão' });
    } finally {
      setTestingId(null);
    }
  };

  const downloadTemplate = (formato: string) => {
    window.open(`/api/rv/fontes-dados/template/${formato}`, '_blank');
  };

  const getTipoIcon = (tipo: string) => {
    const found = TIPOS_FONTE.find(t => t.value === tipo);
    return found ? found.icon : Database;
  };

  if (loading) return <div className="flex items-center justify-center min-h-[500px]"><Loader2 className="w-10 h-10 animate-spin text-nexus-purple" /></div>;
  if (error) return <div className="flex items-center justify-center min-h-[500px]"><div className="card p-10 text-center"><AlertCircle className="w-10 h-10 text-nexus-danger mx-auto mb-2" /><p className="text-nexus-muted text-sm">{error}</p></div></div>;

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-nexus-text flex items-center gap-2">
            <Database className="text-nexus-purple flex-shrink-0" />
            <span className="truncate">Fontes de Dados</span>
          </h1>
          <p className="text-nexus-muted text-sm mt-1">Configure as fontes externas para cálculo de RV</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="btn btn-outline-primary flex items-center gap-2 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium"
          >
            <Download size={16} className="flex-shrink-0" />
            <span className="hidden sm:inline">Templates</span>
          </button>
          <button onClick={() => openModal()} className="btn-gradient flex items-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-semibold">
            <Plus size={16} className="flex-shrink-0" />
            Nova Fonte
          </button>
        </div>
      </div>

      {/* Templates Section */}
      {showTemplates && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-nexus-text">📋 Modelo de Dados</h3>
            <button onClick={() => setShowTemplates(false)} className="text-nexus-muted hover:text-nexus-text">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-nexus-border">
                    <th className="text-left p-2 font-semibold text-nexus-text">Coluna</th>
                    <th className="text-left p-2 font-semibold text-nexus-text">Tipo</th>
                    <th className="text-left p-2 font-semibold text-nexus-text">Exemplo</th>
                    <th className="text-left p-2 font-semibold text-nexus-text">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-nexus-border"><td className="p-2 font-mono text-xs">matricula</td><td className="p-2 text-nexus-muted">Texto</td><td className="p-2 font-mono text-xs">USR002</td><td className="p-2 text-nexus-muted">Matrícula única do colaborador</td></tr>
                  <tr className="border-b border-nexus-border"><td className="p-2 font-mono text-xs">nome_colaborador</td><td className="p-2 text-nexus-muted">Texto</td><td className="p-2 font-mono text-xs">Maria Silva</td><td className="p-2 text-nexus-muted">Nome completo (opcional)</td></tr>
                  <tr className="border-b border-nexus-border"><td className="p-2 font-mono text-xs">codigo_indicador</td><td className="p-2 text-nexus-muted">Texto</td><td className="p-2 font-mono text-xs">VENDAS</td><td className="p-2 text-nexus-muted">Código do indicador cadastrado</td></tr>
                  <tr className="border-b border-nexus-border"><td className="p-2 font-mono text-xs">numerador</td><td className="p-2 text-nexus-muted">Número</td><td className="p-2 font-mono text-xs">120</td><td className="p-2 text-nexus-muted">Valor alcançado</td></tr>
                  <tr className="border-b border-nexus-border"><td className="p-2 font-mono text-xs">denominador</td><td className="p-2 text-nexus-muted">Número</td><td className="p-2 font-mono text-xs">100</td><td className="p-2 text-nexus-muted">Meta ou base de cálculo</td></tr>
                  <tr><td className="p-2 font-mono text-xs">periodo</td><td className="p-2 text-nexus-muted">Texto</td><td className="p-2 font-mono text-xs">2025-12</td><td className="p-2 text-nexus-muted">Formato YYYY-MM</td></tr>
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button onClick={() => downloadTemplate('csv')} className="btn btn-outline flex items-center gap-2 text-sm">
                <FileText size={14} />
                Baixar CSV
              </button>
              <button onClick={() => downloadTemplate('xlsx')} className="btn btn-outline flex items-center gap-2 text-sm">
                <FileSpreadsheet size={14} />
                Baixar Excel
              </button>
              <button onClick={() => downloadTemplate('txt')} className="btn btn-outline flex items-center gap-2 text-sm">
                <FileText size={14} />
                Baixar TXT
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-2">
              <p className="font-semibold text-blue-900 flex items-center gap-2"><Info size={16} /> Query SQL Modelo:</p>
              <pre className="bg-white p-3 rounded border border-blue-200 overflow-x-auto text-xs">
{`SELECT 
  matricula,
  nome_colaborador,
  codigo_indicador,
  numerador,
  denominador,
  periodo
FROM sua_tabela
WHERE periodo = '2025-12'`}
              </pre>
              <div className="space-y-1 text-nexus-muted">
                <p>✓ Utilize encoding UTF-8 para evitar problemas com caracteres especiais</p>
                <p>✓ Formato de período: YYYY-MM (ano-mês)</p>
                <p>✓ Denominador não pode ser zero</p>
                <p>✓ Códigos de indicadores devem existir no sistema</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Fontes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fontes?.map(fonte => {
          const Icon = getTipoIcon(fonte.tipo);
          return (
            <div key={fonte.id} className={`card p-4 space-y-3 ${fonte.ativo === 0 ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    fonte.tipo.includes('sql') ? 'bg-blue-100' : 
                    fonte.tipo === 'excel' ? 'bg-green-100' : 'bg-amber-100'
                  }`}>
                    <Icon size={20} className={
                      fonte.tipo.includes('sql') ? 'text-blue-600' : 
                      fonte.tipo === 'excel' ? 'text-green-600' : 'text-amber-600'
                    } />
                  </div>
                  <div>
                    <h3 className="font-semibold text-nexus-text">{fonte.nome}</h3>
                    <p className="text-xs text-nexus-muted">{TIPOS_FONTE.find(t => t.value === fonte.tipo)?.label}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleTest(fonte.id)} className="p-1.5 rounded hover:bg-nexus-bg transition" title="Testar">
                    {testingId === fonte.id ? <Loader2 size={14} className="animate-spin text-nexus-purple" /> : <TestTube size={14} className="text-nexus-muted" />}
                  </button>
                  <button onClick={() => openModal(fonte)} className="p-1.5 rounded hover:bg-nexus-bg transition" title="Editar">
                    <Edit2 size={14} className="text-nexus-muted" />
                  </button>
                  <button onClick={() => handleDelete(fonte.id)} className="p-1.5 rounded hover:bg-red-50 transition" title="Excluir">
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              </div>

              {fonte.cliente_nome && (
                <div className="flex items-center gap-2 text-xs text-nexus-muted">
                  <span>Cliente:</span>
                  <span className="font-medium">{fonte.cliente_nome}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className={`px-2 py-0.5 rounded-full font-semibold ${fonte.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {fonte.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <span className="text-nexus-muted">Criado: {new Date(fonte.created_at).toLocaleDateString('pt-BR')}</span>
              </div>

              {testResult && testingId === null && (
                <div className={`text-xs p-2 rounded ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {testResult.success ? <CheckCircle size={14} className="inline mr-1" /> : <AlertCircle size={14} className="inline mr-1" />}
                  {testResult.message}
                </div>
              )}
            </div>
          );
        })}

        {fontes?.length === 0 && (
          <div className="col-span-full text-center py-16 text-nexus-muted">
            <Database size={48} className="mx-auto mb-3 opacity-30" />
            <p>Nenhuma fonte configurada ainda</p>
            <button onClick={() => openModal()} className="mt-4 btn-gradient text-sm">
              Criar primeira fonte
            </button>
          </div>
        )}
      </div>

      {/* Modal de criação/edição — Rebrand */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header com gradiente */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-purple-600 p-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Database size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{editingFonte ? 'Editar Fonte de Dados' : 'Nova Fonte de Dados'}</h2>
                  <p className="text-xs text-white/70">Configure a conexão com sua fonte de dados externa</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-white/10 text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Step 1 — Informações Básicas */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">1</div>
                  <h3 className="text-base font-bold text-nexus-text">Informações Básicas</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Nome da Fonte *</label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full px-4 py-2.5 bg-nexus-bg border border-nexus-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-nexus-purple/30"
                      placeholder="Ex: Base de Vendas SQL"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Tipo da Fonte *</label>
                    <div className="grid grid-cols-5 gap-2">
                      {TIPOS_FONTE.map(t => {
                        const Icon = t.icon;
                        const isSelected = formData.tipo === t.value;
                        return (
                          <button
                            key={t.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, tipo: t.value as FonteDados['tipo'] })}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-semibold ${
                              isSelected
                                ? 'border-nexus-purple bg-purple-50 text-nexus-purple shadow-md'
                                : 'border-nexus-border bg-white text-nexus-muted hover:border-nexus-purple/30'
                            }`}
                          >
                            <Icon size={20} />
                            <span>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 — Configuração de Conexão */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">2</div>
                  <h3 className="text-base font-bold text-nexus-text">Configuração de Conexão</h3>
                </div>

                {(formData.tipo === 'sqlserver' || formData.tipo === 'postgresql') && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 space-y-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Server size={18} className="text-blue-600" />
                      <span className="text-sm font-bold text-blue-800">{formData.tipo === 'sqlserver' ? 'SQL Server' : 'PostgreSQL'}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Host / Servidor</label>
                        <input type="text" value={formData.config.host} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, host: e.target.value } })} className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="192.168.1.100 ou servidor.empresa.com" />
                      </div>
                      <div>
                        <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Porta</label>
                        <input type="text" value={formData.config.port} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, port: e.target.value } })} className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder={formData.tipo === 'sqlserver' ? '1433' : '5432'} />
                      </div>
                      <div>
                        <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Banco de Dados</label>
                        <input type="text" value={formData.config.database} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, database: e.target.value } })} className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="nome_do_banco" />
                      </div>
                      <div>
                        <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Usuário</label>
                        <input type="text" value={formData.config.username} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, username: e.target.value } })} className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="sa" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Senha</label>
                        <input type="password" value={formData.config.password} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, password: e.target.value } })} className="w-full px-4 py-2.5 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Query SQL</label>
                        <textarea
                          value={formData.config.query}
                          onChange={(e) => setFormData({ ...formData, config: { ...formData.config, query: e.target.value } })}
                          className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
                          rows={5}
                          placeholder={'SELECT matricula, nome_colaborador,\n       codigo_indicador, numerador,\n       denominador, periodo\nFROM sua_tabela\nWHERE periodo = @periodo'}
                        />
                        <p className="text-[10px] text-blue-600 mt-1.5 flex items-center gap-1"><Info size={12} /> A query deve retornar as colunas mapeadas na seção abaixo</p>
                      </div>
                    </div>
                  </div>
                )}

                {formData.tipo === 'excel' && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 space-y-4 border border-green-100">
                    <div className="flex items-center gap-2 mb-2">
                      <FileSpreadsheet size={18} className="text-green-600" />
                      <span className="text-sm font-bold text-green-800">Arquivo Excel</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Arquivo Excel</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.config.caminho_rede}
                            onChange={(e) => {
                              const val = e.target.value;
                              const fileName = val.includes('\\') ? val.split('\\').pop() || '' : val.includes('/') ? val.split('/').pop() || '' : '';
                              setFormData({ ...formData, config: { ...formData.config, caminho_rede: val, nome_arquivo: fileName || formData.config.nome_arquivo } });
                            }}
                            className="flex-1 px-4 py-2.5 bg-white border border-green-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                            placeholder="\\servidor\pasta\relatorios\dados_rv.xlsx"
                          />
                          <label className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold cursor-pointer hover:bg-green-700 transition-colors">
                            <FolderOpen size={16} />
                            Procurar
                            <input
                              type="file"
                              accept=".xlsx,.xls"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setFormData({ ...formData, config: { ...formData.config, caminho_rede: file.name, nome_arquivo: file.name } });
                                }
                              }}
                            />
                          </label>
                        </div>
                        <p className="text-[10px] text-green-600 mt-1.5 flex items-center gap-1"><Info size={12} /> Digite o caminho da rede ou clique em Procurar para selecionar o arquivo</p>
                      </div>
                      <div>
                        <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Nome do Arquivo (auto)</label>
                        <input type="text" value={formData.config.nome_arquivo} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, nome_arquivo: e.target.value } })} className="w-full px-4 py-2.5 bg-white border border-green-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300" placeholder="dados_rv.xlsx" readOnly={!!formData.config.caminho_rede} />
                      </div>
                      <div>
                        <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Aba (Sheet)</label>
                        <input type="text" value={formData.config.sheet_name} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, sheet_name: e.target.value } })} className="w-full px-4 py-2.5 bg-white border border-green-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300" placeholder="Plan1" />
                      </div>
                    </div>
                  </div>
                )}

                {(formData.tipo === 'csv' || formData.tipo === 'txt') && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 space-y-4 border border-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={18} className="text-amber-600" />
                      <span className="text-sm font-bold text-amber-800">Arquivo {formData.tipo.toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Caminho do Arquivo</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.config.caminho_arquivo}
                            onChange={(e) => setFormData({ ...formData, config: { ...formData.config, caminho_arquivo: e.target.value } })}
                            className="flex-1 px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                            placeholder={`\\\\servidor\\pasta\\dados.${formData.tipo}`}
                          />
                          <label className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold cursor-pointer hover:bg-amber-700 transition-colors">
                            <FolderOpen size={16} />
                            Procurar
                            <input
                              type="file"
                              accept={formData.tipo === 'csv' ? '.csv' : '.txt'}
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setFormData({ ...formData, config: { ...formData.config, caminho_arquivo: file.name } });
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Delimitador</label>
                        <div className="grid grid-cols-4 gap-2">
                          {DELIMITADORES.map(d => (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, config: { ...formData.config, delimitador: d.value } })}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                                formData.config.delimitador === d.value
                                  ? 'border-amber-500 bg-amber-100 text-amber-800'
                                  : 'border-amber-200 text-nexus-muted hover:border-amber-300'
                              }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Encoding</label>
                        <select value={formData.config.encoding} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, encoding: e.target.value } })} className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300">
                          {ENCODINGS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-3 px-4 py-3 bg-white border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.config.tem_cabecalho}
                            onChange={(e) => setFormData({ ...formData, config: { ...formData.config, tem_cabecalho: e.target.checked } })}
                            className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                          />
                          <div>
                            <p className="text-sm font-semibold text-nexus-text">Arquivo possui cabeçalho</p>
                            <p className="text-[10px] text-nexus-muted">Primeira linha contém nomes das colunas</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3 — Mapeamento de Colunas */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">3</div>
                  <h3 className="text-base font-bold text-nexus-text">Mapeamento de Colunas</h3>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                  <p className="text-xs text-purple-700 mb-4 flex items-center gap-1.5"><Info size={14} /> Informe o nome exato das colunas conforme aparecem na fonte de dados</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Matrícula</label>
                      <input type="text" value={formData.mapeamento.coluna_matricula} onChange={(e) => setFormData({ ...formData, mapeamento: { ...formData.mapeamento, coluna_matricula: e.target.value } })} className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="matricula" />
                    </div>
                    <div>
                      <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Código Indicador</label>
                      <input type="text" value={formData.mapeamento.coluna_indicador} onChange={(e) => setFormData({ ...formData, mapeamento: { ...formData.mapeamento, coluna_indicador: e.target.value } })} className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="codigo_indicador" />
                    </div>
                    <div>
                      <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Numerador</label>
                      <input type="text" value={formData.mapeamento.coluna_numerador} onChange={(e) => setFormData({ ...formData, mapeamento: { ...formData.mapeamento, coluna_numerador: e.target.value } })} className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="numerador" />
                    </div>
                    <div>
                      <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Denominador</label>
                      <input type="text" value={formData.mapeamento.coluna_denominador} onChange={(e) => setFormData({ ...formData, mapeamento: { ...formData.mapeamento, coluna_denominador: e.target.value } })} className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="denominador" />
                    </div>
                    <div>
                      <label className="block text-xs text-nexus-muted mb-1.5 font-semibold uppercase tracking-wide">Período</label>
                      <input type="text" value={formData.mapeamento.coluna_periodo} onChange={(e) => setFormData({ ...formData, mapeamento: { ...formData.mapeamento, coluna_periodo: e.target.value } })} className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" placeholder="periodo" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex justify-between items-center pt-5 border-t border-nexus-border">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-medium text-nexus-muted hover:text-nexus-text border border-nexus-border rounded-xl hover:bg-nexus-bg transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-8 py-2.5 btn-gradient rounded-xl text-sm font-bold flex items-center gap-2">
                  <CheckCircle size={16} />
                  {editingFonte ? 'Salvar Alterações' : 'Criar Fonte de Dados'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
