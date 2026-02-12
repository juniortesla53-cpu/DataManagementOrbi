import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { Database, Plus, Edit2, Trash2, TestTube, Download, X, Server, FileSpreadsheet, FileText, AlertCircle, CheckCircle, Loader2, Info } from 'lucide-react';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-nexus-text flex items-center gap-2">
            <Database className="text-nexus-purple" />
            Fontes de Dados
          </h1>
          <p className="text-nexus-muted text-sm mt-1">Configure as fontes externas para cálculo de RV</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="btn btn-outline-primary flex items-center gap-2"
          >
            <Download size={16} />
            Templates
          </button>
          <button onClick={() => openModal()} className="btn-gradient flex items-center gap-2">
            <Plus size={16} />
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

      {/* Modal de criação/edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-nexus-border p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-nexus-text">{editingFonte ? 'Editar Fonte' : 'Nova Fonte'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-nexus-bg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="font-semibold text-nexus-text border-b pb-2">Informações Básicas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">Nome da Fonte *</label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="input w-full"
                      placeholder="Ex: Base de Vendas SQL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">Tipo *</label>
                    <select
                      required
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value as FonteDados['tipo'] })}
                      className="input w-full"
                    >
                      {TIPOS_FONTE.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Configuração por tipo */}
              <div className="space-y-4">
                <h3 className="font-semibold text-nexus-text border-b pb-2">Configuração de Conexão</h3>

                {(formData.tipo === 'sqlserver' || formData.tipo === 'postgresql') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">Host</label>
                      <input type="text" value={formData.config.host} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, host: e.target.value } })} className="input w-full" placeholder="localhost" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">Porta</label>
                      <input type="text" value={formData.config.port} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, port: e.target.value } })} className="input w-full" placeholder="1433 / 5432" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">Banco de Dados</label>
                      <input type="text" value={formData.config.database} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, database: e.target.value } })} className="input w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">Usuário</label>
                      <input type="text" value={formData.config.username} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, username: e.target.value } })} className="input w-full" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-nexus-text mb-1">Senha</label>
                      <input type="password" value={formData.config.password} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, password: e.target.value } })} className="input w-full" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-nexus-text mb-1">Query SQL</label>
                      <textarea
                        value={formData.config.query}
                        onChange={(e) => setFormData({ ...formData, config: { ...formData.config, query: e.target.value } })}
                        className="input w-full font-mono text-xs"
                        rows={6}
                        placeholder="SELECT matricula, codigo_indicador, numerador, denominador, periodo FROM ..."
                      />
                      <p className="text-xs text-nexus-muted mt-1">A query deve retornar as colunas mapeadas abaixo</p>
                    </div>
                  </div>
                )}

                {formData.tipo === 'excel' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-nexus-text mb-1">Caminho da Pasta na Rede</label>
                      <input type="text" value={formData.config.caminho_rede} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, caminho_rede: e.target.value } })} className="input w-full" placeholder="\\servidor\pasta\relatorios" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">Nome do Arquivo</label>
                      <input type="text" value={formData.config.nome_arquivo} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, nome_arquivo: e.target.value } })} className="input w-full" placeholder="dados_rv.xlsx" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">Aba (Sheet)</label>
                      <input type="text" value={formData.config.sheet_name} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, sheet_name: e.target.value } })} className="input w-full" placeholder="Dados" />
                    </div>
                  </div>
                )}

                {(formData.tipo === 'csv' || formData.tipo === 'txt') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-nexus-text mb-1">Caminho do Arquivo</label>
                      <input type="text" value={formData.config.caminho_arquivo} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, caminho_arquivo: e.target.value } })} className="input w-full" placeholder="\\servidor\pasta\dados.csv" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">Delimitador</label>
                      <select value={formData.config.delimitador} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, delimitador: e.target.value } })} className="input w-full">
                        {DELIMITADORES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-nexus-text mb-1">Encoding</label>
                      <select value={formData.config.encoding} onChange={(e) => setFormData({ ...formData, config: { ...formData.config, encoding: e.target.value } })} className="input w-full">
                        {ENCODINGS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.config.tem_cabecalho}
                          onChange={(e) => setFormData({ ...formData, config: { ...formData.config, tem_cabecalho: e.target.checked } })}
                          className="rounded"
                        />
                        Arquivo possui cabeçalho (primeira linha com nomes das colunas)
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Mapeamento de Colunas */}
              <div className="space-y-4">
                <h3 className="font-semibold text-nexus-text border-b pb-2">Mapeamento de Colunas</h3>
                <p className="text-xs text-nexus-muted">Informe o nome exato das colunas conforme aparecem na fonte de dados</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">Coluna: Matrícula</label>
                    <input type="text" value={formData.mapeamento.coluna_matricula} onChange={(e) => setFormData({ ...formData, mapeamento: { ...formData.mapeamento, coluna_matricula: e.target.value } })} className="input w-full" placeholder="matricula" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">Coluna: Código Indicador</label>
                    <input type="text" value={formData.mapeamento.coluna_indicador} onChange={(e) => setFormData({ ...formData, mapeamento: { ...formData.mapeamento, coluna_indicador: e.target.value } })} className="input w-full" placeholder="codigo_indicador" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">Coluna: Numerador</label>
                    <input type="text" value={formData.mapeamento.coluna_numerador} onChange={(e) => setFormData({ ...formData, mapeamento: { ...formData.mapeamento, coluna_numerador: e.target.value } })} className="input w-full" placeholder="numerador" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">Coluna: Denominador</label>
                    <input type="text" value={formData.mapeamento.coluna_denominador} onChange={(e) => setFormData({ ...formData, mapeamento: { ...formData.mapeamento, coluna_denominador: e.target.value } })} className="input w-full" placeholder="denominador" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nexus-text mb-1">Coluna: Período</label>
                    <input type="text" value={formData.mapeamento.coluna_periodo} onChange={(e) => setFormData({ ...formData, mapeamento: { ...formData.mapeamento, coluna_periodo: e.target.value } })} className="input w-full" placeholder="periodo" />
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancelar
                </button>
                <button type="submit" className="btn-gradient">
                  {editingFonte ? 'Salvar Alterações' : 'Criar Fonte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
