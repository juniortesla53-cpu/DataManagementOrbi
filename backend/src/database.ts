import Database from 'better-sqlite3';
import bcryptjs from 'bcryptjs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'nexus.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // ── Tabelas existentes ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matricula TEXT UNIQUE,
      login_rede TEXT UNIQUE NOT NULL,
      nome_completo TEXT NOT NULL,
      cargo TEXT,
      cpf TEXT,
      site TEXT,
      senha_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      categoria TEXT,
      link_powerbi TEXT NOT NULL,
      thumbnail_url TEXT,
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
      UNIQUE(user_id, report_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ── Nexus RV ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS rv_clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      logo_url TEXT,
      descricao TEXT,
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rv_indicadores_dim (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE NOT NULL,
      nome TEXT NOT NULL,
      descricao TEXT,
      unidade TEXT DEFAULT '%',
      tipo TEXT DEFAULT 'percentual' CHECK(tipo IN ('percentual','valor','quantidade')),
      ativo INTEGER DEFAULT 1,
      id_cliente INTEGER REFERENCES rv_clientes(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rv_indicadores_fato (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      matricula TEXT NOT NULL,
      id_indicador INTEGER NOT NULL REFERENCES rv_indicadores_dim(id),
      numerador REAL NOT NULL,
      denominador REAL NOT NULL DEFAULT 1,
      UNIQUE(data, matricula, id_indicador)
    );

    CREATE TABLE IF NOT EXISTS rv_regras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      tipo TEXT DEFAULT 'faixa' CHECK(tipo IN ('faixa','composta','formula')),
      ativo INTEGER DEFAULT 1,
      vigencia_inicio TEXT,
      vigencia_fim TEXT,
      formula_json TEXT,
      id_cliente INTEGER REFERENCES rv_clientes(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rv_regra_faixas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_regra INTEGER NOT NULL REFERENCES rv_regras(id) ON DELETE CASCADE,
      id_indicador INTEGER NOT NULL REFERENCES rv_indicadores_dim(id),
      faixa_min REAL NOT NULL,
      faixa_max REAL,
      valor_payout REAL NOT NULL,
      tipo_payout TEXT DEFAULT 'percentual_salario' CHECK(tipo_payout IN ('percentual_salario','valor_fixo','percentual_indicador')),
      ordem INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS rv_regra_condicoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_regra INTEGER NOT NULL REFERENCES rv_regras(id) ON DELETE CASCADE,
      id_indicador INTEGER NOT NULL REFERENCES rv_indicadores_dim(id),
      operador TEXT NOT NULL CHECK(operador IN ('>=','<=','>','<','==','!=')),
      valor_referencia REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rv_calculos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      periodo TEXT NOT NULL,
      data_calculo DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'rascunho' CHECK(status IN ('rascunho','aprovado','pago')),
      calculado_por TEXT,
      observacoes TEXT,
      id_cliente INTEGER REFERENCES rv_clientes(id)
    );

    CREATE TABLE IF NOT EXISTS rv_resultados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_calculo INTEGER NOT NULL REFERENCES rv_calculos(id) ON DELETE CASCADE,
      matricula TEXT NOT NULL,
      nome_colaborador TEXT,
      id_regra INTEGER NOT NULL REFERENCES rv_regras(id),
      valor_indicador REAL,
      valor_rv REAL NOT NULL,
      detalhes_json TEXT
    );

    CREATE TABLE IF NOT EXISTS rv_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tabela TEXT NOT NULL,
      registro_id INTEGER,
      acao TEXT NOT NULL,
      dados_anteriores TEXT,
      dados_novos TEXT,
      usuario TEXT,
      data DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rv_fontes_dados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL CHECK(tipo IN ('sqlserver','postgresql','excel','csv','txt')),
      config_json TEXT NOT NULL,
      mapeamento_json TEXT NOT NULL,
      id_cliente INTEGER REFERENCES rv_clientes(id),
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rv_envios_email (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_calculo INTEGER NOT NULL REFERENCES rv_calculos(id) ON DELETE CASCADE,
      emails_json TEXT NOT NULL,
      formato TEXT NOT NULL CHECK(formato IN ('csv','xlsx','txt')),
      delimitador TEXT,
      assunto TEXT NOT NULL,
      mensagem TEXT,
      data_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'enviado' CHECK(status IN ('enviado','pendente','erro'))
    );

    -- ══════════════════════════════════════
    -- NEW: RV Plano Architecture (Items 15-16)
    -- ══════════════════════════════════════

    CREATE TABLE IF NOT EXISTS rv_plano (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      valor_dsr REAL DEFAULT 0,
      teto_rv REAL,
      id_cliente INTEGER REFERENCES rv_clientes(id),
      ativo INTEGER DEFAULT 1,
      vigencia_inicio TEXT,
      vigencia_fim TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rv_plano_elegibilidade (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_plano INTEGER NOT NULL REFERENCES rv_plano(id) ON DELETE CASCADE,
      id_indicador INTEGER NOT NULL REFERENCES rv_indicadores_dim(id),
      operador TEXT NOT NULL DEFAULT '>=' CHECK(operador IN ('>=','<=','>','<','==','!=')),
      valor_minimo REAL NOT NULL,
      ordem INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS rv_plano_remuneracao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_plano INTEGER NOT NULL REFERENCES rv_plano(id) ON DELETE CASCADE,
      id_indicador INTEGER NOT NULL REFERENCES rv_indicadores_dim(id),
      tem_regra_propria INTEGER DEFAULT 1,
      ordem INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS rv_plano_remuneracao_faixas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_remuneracao INTEGER NOT NULL REFERENCES rv_plano_remuneracao(id) ON DELETE CASCADE,
      faixa_min REAL NOT NULL,
      faixa_max REAL,
      valor_payout REAL NOT NULL,
      tipo_payout TEXT DEFAULT 'valor_fixo' CHECK(tipo_payout IN ('percentual_salario','valor_fixo','percentual_indicador')),
      ordem INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS rv_plano_deflatores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_plano INTEGER NOT NULL REFERENCES rv_plano(id) ON DELETE CASCADE,
      id_indicador INTEGER NOT NULL REFERENCES rv_indicadores_dim(id),
      ordem INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS rv_plano_deflator_faixas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_deflator INTEGER NOT NULL REFERENCES rv_plano_deflatores(id) ON DELETE CASCADE,
      faixa_min REAL NOT NULL,
      faixa_max REAL,
      percentual_reducao REAL NOT NULL,
      ordem INTEGER DEFAULT 0
    );

    -- ══════════════════════════════════════
    -- RV Grupo (agrupa sub-RVs por cliente)
    -- ══════════════════════════════════════
    CREATE TABLE IF NOT EXISTS rv_grupo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_cliente INTEGER NOT NULL REFERENCES rv_clientes(id),
      nome TEXT NOT NULL,
      descricao TEXT,
      vigencia_inicio TEXT,
      vigencia_fim TEXT,
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- ══════════════════════════════════════
    -- Condições textuais em remuneração
    -- (ex: operacao = 'VIVO NEXT', segmento = 'G2')
    -- ══════════════════════════════════════
    CREATE TABLE IF NOT EXISTS rv_plano_remuneracao_condicoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_remuneracao INTEGER NOT NULL REFERENCES rv_plano_remuneracao(id) ON DELETE CASCADE,
      campo TEXT NOT NULL,
      operador TEXT NOT NULL DEFAULT '=',
      valor TEXT NOT NULL,
      tipo TEXT DEFAULT 'texto',
      ordem INTEGER DEFAULT 0
    );
  `);

  // ── Migrations: add columns to rv_plano (idempotent) ──
  const planoMigrations = [
    "ALTER TABLE rv_plano ADD COLUMN id_grupo INTEGER REFERENCES rv_grupo(id)",
    "ALTER TABLE rv_plano ADD COLUMN tipo_cargo TEXT DEFAULT 'operador'",
    "ALTER TABLE rv_plano ADD COLUMN tipo_calculo TEXT DEFAULT 'faixas'",
    "ALTER TABLE rv_plano ADD COLUMN id_plano_referencia INTEGER REFERENCES rv_plano(id)",
    "ALTER TABLE rv_plano ADD COLUMN percentual_referencia REAL",
  ];
  for (const sql of planoMigrations) {
    try { db.exec(sql); } catch (_) { /* column already exists */ }
  }

  // ── Migrations: add text condition columns to elegibilidade ──
  const elegMigrations = [
    "ALTER TABLE rv_plano_elegibilidade ADD COLUMN campo TEXT",
    "ALTER TABLE rv_plano_elegibilidade ADD COLUMN valor_texto TEXT",
    "ALTER TABLE rv_plano_elegibilidade ADD COLUMN tipo_comparacao TEXT DEFAULT 'indicador'",
  ];
  for (const sql of elegMigrations) {
    try { db.exec(sql); } catch (_) { /* column already exists */ }
  }

  const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as any;
  if (count.c === 0) {
    seed();
  }

  // Seed RV se tabela vazia
  const rvClientesCount = db.prepare('SELECT COUNT(*) as c FROM rv_clientes').get() as any;
  if (rvClientesCount.c === 0) {
    seedRVClientes();
  }

  const rvCount = db.prepare('SELECT COUNT(*) as c FROM rv_indicadores_dim').get() as any;
  if (rvCount.c === 0) {
    seedRV();
  }
}

function seedRVClientes() {
  const ins = db.prepare('INSERT INTO rv_clientes (nome, descricao, ativo) VALUES (?, ?, ?)');
  
  const tx = db.transaction(() => {
    ins.run('Tim Brasil', 'Operadora de telefonia móvel e fixa', 1);
    ins.run('Vivo', 'Operadora de telecomunicações', 1);
    ins.run('Claro', 'Operadora de telefonia e internet', 1);
    ins.run('MRV Engenharia', 'Construtora e incorporadora', 1);
    ins.run('Banco BV', 'Instituição financeira', 1);
    ins.run('Americanas', 'Varejo e e-commerce', 1);
    ins.run('Magazine Luiza', 'Varejo e marketplace', 1);
    ins.run('Localiza', 'Locação de veículos', 1);
  });

  tx();
  console.log('✅ RV Clientes seeded: 8 clientes');
}

function seed() {
  const hash = (pw: string) => bcryptjs.hashSync(pw, 10);

  const insertUser = db.prepare(
    'INSERT INTO users (matricula, login_rede, nome_completo, cargo, cpf, site, senha_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertReport = db.prepare(
    'INSERT INTO reports (nome, descricao, categoria, link_powerbi) VALUES (?, ?, ?, ?)'
  );
  const insertPerm = db.prepare(
    'INSERT INTO permissions (user_id, report_id) VALUES (?, ?)'
  );

  const seedTx = db.transaction(() => {
    insertUser.run('ADM001', 'alberto.junior', 'Alberto Junior', 'Analista de Dados Sr', '000.000.000-00', 'Mossoró', hash('332769'), 'admin');
    insertUser.run('USR002', 'maria.silva', 'Maria Silva', 'Operadora de Vendas', '111.111.111-11', 'São Paulo', hash('123456'), 'user');
    insertUser.run('USR003', 'joao.santos', 'João Santos', 'Supervisor Comercial', '222.222.222-22', 'Rio de Janeiro', hash('123456'), 'user');
    insertUser.run('USR004', 'ana.oliveira', 'Ana Oliveira', 'Operadora de Vendas', '333.333.333-33', 'Fortaleza', hash('123456'), 'user');
    insertUser.run('USR005', 'carlos.lima', 'Carlos Lima', 'Operador de Atendimento', '444.444.444-44', 'Recife', hash('123456'), 'user');
    insertUser.run('USR006', 'fernanda.costa', 'Fernanda Costa', 'Operadora de Vendas', '555.555.555-55', 'Natal', hash('123456'), 'user');

    insertReport.run('Dashboard Comercial', 'Indicadores de vendas e performance comercial', 'Comercial', 'https://app.powerbi.com/view?r=PLACEHOLDER_COMERCIAL');
    insertReport.run('Relatório RH', 'Métricas de recursos humanos e turnover', 'RH', 'https://app.powerbi.com/view?r=PLACEHOLDER_RH');
    insertReport.run('Financeiro Mensal', 'Resultado financeiro consolidado mensal', 'Financeiro', 'https://app.powerbi.com/view?r=PLACEHOLDER_FINANCEIRO');
    insertReport.run('Operações', 'KPIs operacionais e SLA de atendimento', 'Operações', 'https://app.powerbi.com/view?r=PLACEHOLDER_OPERACOES');

    insertPerm.run(2, 1); insertPerm.run(2, 2);
    insertPerm.run(3, 1); insertPerm.run(3, 3);
    insertPerm.run(4, 2); insertPerm.run(4, 3); insertPerm.run(4, 4);
    insertPerm.run(5, 1); insertPerm.run(5, 4);
    insertPerm.run(6, 1); insertPerm.run(6, 2); insertPerm.run(6, 3); insertPerm.run(6, 4);
  });

  seedTx();
  console.log('✅ Users & Reports seeded');
}

function seedRV() {
  const ins = {
    dim: db.prepare('INSERT INTO rv_indicadores_dim (codigo, nome, descricao, unidade, tipo) VALUES (?,?,?,?,?)'),
    fato: db.prepare('INSERT OR IGNORE INTO rv_indicadores_fato (data, matricula, id_indicador, numerador, denominador) VALUES (?,?,?,?,?)'),
    regra: db.prepare('INSERT INTO rv_regras (nome, descricao, tipo, vigencia_inicio, vigencia_fim) VALUES (?,?,?,?,?)'),
    faixa: db.prepare('INSERT INTO rv_regra_faixas (id_regra, id_indicador, faixa_min, faixa_max, valor_payout, tipo_payout, ordem) VALUES (?,?,?,?,?,?,?)'),
    cond: db.prepare('INSERT INTO rv_regra_condicoes (id_regra, id_indicador, operador, valor_referencia) VALUES (?,?,?,?)'),
  };

  const tx = db.transaction(() => {
    // ── Indicadores (dimensão) ──
    ins.dim.run('VENDAS',       'Vendas Realizadas',       'Total de vendas fechadas no período',          'un',  'quantidade');
    ins.dim.run('META_VENDAS',  'Meta de Vendas',          'Meta de vendas do período',                    'un',  'quantidade');
    ins.dim.run('TMA',          'Tempo Médio Atendimento', 'Duração média das chamadas em segundos',       's',   'valor');
    ins.dim.run('META_TMA',     'Meta TMA',                'Meta de TMA em segundos',                      's',   'valor');
    ins.dim.run('CSAT',         'Satisfação do Cliente',   'Nota de satisfação do cliente (0-100)',         '%',   'percentual');
    ins.dim.run('META_CSAT',    'Meta CSAT',               'Meta de satisfação do cliente',                 '%',   'percentual');
    ins.dim.run('ASSIDUIDADE',  'Assiduidade',             'Percentual de presença no período',             '%',   'percentual');
    ins.dim.run('QUALIDADE',    'Qualidade Monitoria',     'Nota de monitoria de qualidade (0-100)',        '%',   'percentual');

    // IDs dos indicadores (1-8 na ordem acima)
    const IND = { VENDAS: 1, META_VENDAS: 2, TMA: 3, META_TMA: 4, CSAT: 5, META_CSAT: 6, ASSIDUIDADE: 7, QUALIDADE: 8 };

    // ── Dados fictícios (fato) ── 5 colaboradores x 6 meses ──
    const matriculas = ['USR002', 'USR003', 'USR004', 'USR005', 'USR006'];
    const meses = ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];

    // Perfis de desempenho por colaborador (mais realista)
    const perfis: Record<string, { vendas: [number, number]; tma: [number, number]; csat: [number, number]; assid: [number, number]; qual: [number, number] }> = {
      'USR002': { vendas: [85, 130], tma: [180, 280], csat: [82, 97], assid: [88, 100], qual: [75, 98] },  // Maria - boa vendedora
      'USR003': { vendas: [60, 110], tma: [200, 350], csat: [70, 90], assid: [80, 96],  qual: [65, 88] },  // João - irregular
      'USR004': { vendas: [90, 140], tma: [170, 250], csat: [88, 99], assid: [92, 100], qual: [80, 96] },  // Ana - top performer
      'USR005': { vendas: [50, 95],  tma: [250, 400], csat: [65, 85], assid: [75, 95],  qual: [60, 82] },  // Carlos - em desenvolvimento
      'USR006': { vendas: [80, 125], tma: [190, 300], csat: [80, 95], assid: [90, 100], qual: [72, 94] },  // Fernanda - consistente
    };

    const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

    for (const mat of matriculas) {
      const p = perfis[mat];
      for (const mes of meses) {
        const metaVendas = 100;
        const metaTMA = 240;
        const metaCSAT = 90;

        ins.fato.run(mes, mat, IND.VENDAS,      rand(p.vendas[0], p.vendas[1]), 1);
        ins.fato.run(mes, mat, IND.META_VENDAS,  metaVendas, 1);
        ins.fato.run(mes, mat, IND.TMA,          rand(p.tma[0], p.tma[1]), 1);
        ins.fato.run(mes, mat, IND.META_TMA,     metaTMA, 1);
        ins.fato.run(mes, mat, IND.CSAT,         rand(p.csat[0], p.csat[1]), 1);
        ins.fato.run(mes, mat, IND.META_CSAT,    metaCSAT, 1);
        ins.fato.run(mes, mat, IND.ASSIDUIDADE,  rand(p.assid[0], p.assid[1]), 100);
        ins.fato.run(mes, mat, IND.QUALIDADE,    rand(p.qual[0], p.qual[1]), 100);
      }
    }

    // ── Regras ──

    // Regra 1: Comissão de Vendas (atingimento de meta)
    const r1 = ins.regra.run('Comissão de Vendas', 'Comissão baseada no atingimento da meta de vendas', 'faixa', '2025-01', '2026-12').lastInsertRowid as number;
    // Faixas: indicador = VENDAS (numerador=vendas, denominador será comparado com META_VENDAS)
    // O motor calcula: (VENDAS / META_VENDAS) * 100 = atingimento %
    ins.faixa.run(r1, IND.VENDAS,  0,    79.99,  0,    'valor_fixo', 1);
    ins.faixa.run(r1, IND.VENDAS,  80,   99.99,  150,  'valor_fixo', 2);
    ins.faixa.run(r1, IND.VENDAS,  100,  119.99, 350,  'valor_fixo', 3);
    ins.faixa.run(r1, IND.VENDAS,  120,  999,    600,  'valor_fixo', 4);
    // Condição: Assiduidade >= 90%
    ins.cond.run(r1, IND.ASSIDUIDADE, '>=', 90);

    // Regra 2: Bônus Qualidade
    const r2 = ins.regra.run('Bônus Qualidade', 'Bônus por nota de monitoria de qualidade', 'faixa', '2025-01', '2026-12').lastInsertRowid as number;
    ins.faixa.run(r2, IND.QUALIDADE, 0,    69.99,  0,    'valor_fixo', 1);
    ins.faixa.run(r2, IND.QUALIDADE, 70,   84.99,  100,  'valor_fixo', 2);
    ins.faixa.run(r2, IND.QUALIDADE, 85,   94.99,  200,  'valor_fixo', 3);
    ins.faixa.run(r2, IND.QUALIDADE, 95,   100,    350,  'valor_fixo', 4);

    // Regra 3: Incentivo CSAT
    const r3 = ins.regra.run('Incentivo CSAT', 'Incentivo por satisfação do cliente acima da meta', 'faixa', '2025-01', '2026-12').lastInsertRowid as number;
    ins.faixa.run(r3, IND.CSAT, 0,    89.99,  0,    'valor_fixo', 1);
    ins.faixa.run(r3, IND.CSAT, 90,   94.99,  150,  'valor_fixo', 2);
    ins.faixa.run(r3, IND.CSAT, 95,   100,    300,  'valor_fixo', 3);
    // Condição: Assiduidade >= 85%
    ins.cond.run(r3, IND.ASSIDUIDADE, '>=', 85);
  });

  tx();
  console.log('✅ Nexus RV seeded: 8 indicadores, 240 fatos, 3 regras');
}

export default db;
