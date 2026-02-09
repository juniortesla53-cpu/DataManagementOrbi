import Database from 'better-sqlite3';
import bcryptjs from 'bcryptjs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'orbi.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
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

  const count = db.prepare('SELECT COUNT(*) as c FROM users').get() as any;
  if (count.c === 0) {
    seed();
  }
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
    insertUser.run('USR002', 'maria.silva', 'Maria Silva', 'Analista', '111.111.111-11', 'São Paulo', hash('123456'), 'user');
    insertUser.run('USR003', 'joao.santos', 'João Santos', 'Supervisor', '222.222.222-22', 'Rio de Janeiro', hash('123456'), 'user');
    insertUser.run('USR004', 'ana.oliveira', 'Ana Oliveira', 'Coordenadora', '333.333.333-33', 'Fortaleza', hash('123456'), 'user');
    insertUser.run('USR005', 'carlos.lima', 'Carlos Lima', 'Analista Jr', '444.444.444-44', 'Recife', hash('123456'), 'user');
    insertUser.run('USR006', 'fernanda.costa', 'Fernanda Costa', 'Gerente', '555.555.555-55', 'Natal', hash('123456'), 'user');

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
  console.log('Database seeded successfully!');
}

export default db;
