import { Router, Request, Response } from 'express';
import db from '../database';
import { authMiddleware, adminMiddleware } from '../auth';

const router = Router();
router.use(authMiddleware);

// ════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════
router.get('/dashboard', (req, res) => {
  const indicadores = db.prepare('SELECT COUNT(*) as c FROM rv_indicadores_dim WHERE ativo=1').get() as any;
  const regras = db.prepare('SELECT COUNT(*) as c FROM rv_regras WHERE ativo=1').get() as any;
  const ultimoCalculo = db.prepare('SELECT * FROM rv_calculos ORDER BY data_calculo DESC LIMIT 1').get() as any;
  const periodos = db.prepare('SELECT DISTINCT periodo FROM rv_calculos ORDER BY periodo DESC LIMIT 6').all();

  let totalRV = 0;
  let totalColaboradores = 0;
  if (ultimoCalculo) {
    const stats = db.prepare('SELECT COUNT(DISTINCT matricula) as cols, SUM(valor_rv) as total FROM rv_resultados WHERE id_calculo=?').get(ultimoCalculo.id) as any;
    totalRV = stats.total || 0;
    totalColaboradores = stats.cols || 0;
  }

  const ultimosResultados = ultimoCalculo
    ? db.prepare(`
        SELECT matricula, nome_colaborador, SUM(valor_rv) as total_rv
        FROM rv_resultados WHERE id_calculo=?
        GROUP BY matricula ORDER BY total_rv DESC LIMIT 10
      `).all(ultimoCalculo.id)
    : [];

  res.json({
    indicadores: indicadores.c,
    regras: regras.c,
    ultimoCalculo,
    totalRV,
    totalColaboradores,
    periodos,
    ultimosResultados,
  });
});

// ════════════════════════════════════════
// INDICADORES (dimensão)
// ════════════════════════════════════════
router.get('/indicadores', (req, res) => {
  const rows = db.prepare('SELECT * FROM rv_indicadores_dim ORDER BY codigo').all();
  res.json(rows);
});

router.post('/indicadores', adminMiddleware, (req: Request, res: Response) => {
  const { codigo, nome, descricao, unidade, tipo } = req.body;
  if (!codigo || !nome) return res.status(400).json({ error: 'Código e nome são obrigatórios' });
  try {
    const r = db.prepare('INSERT INTO rv_indicadores_dim (codigo, nome, descricao, unidade, tipo) VALUES (?,?,?,?,?)').run(codigo, nome, descricao || '', unidade || '%', tipo || 'percentual');
    res.json({ id: r.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: e.message.includes('UNIQUE') ? 'Código já existe' : e.message });
  }
});

router.put('/indicadores/:id', adminMiddleware, (req: Request, res: Response) => {
  const { codigo, nome, descricao, unidade, tipo, ativo } = req.body;
  db.prepare('UPDATE rv_indicadores_dim SET codigo=?, nome=?, descricao=?, unidade=?, tipo=?, ativo=? WHERE id=?')
    .run(codigo, nome, descricao, unidade, tipo, ativo ?? 1, req.params.id);
  res.json({ success: true });
});

router.delete('/indicadores/:id', adminMiddleware, (req: Request, res: Response) => {
  db.prepare('UPDATE rv_indicadores_dim SET ativo=0 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ════════════════════════════════════════
// FATOS (dados históricos)
// ════════════════════════════════════════
router.get('/fatos', (req, res) => {
  const { periodo, matricula } = req.query;
  let sql = `SELECT f.*, d.codigo, d.nome as indicador_nome, d.unidade
             FROM rv_indicadores_fato f
             JOIN rv_indicadores_dim d ON d.id = f.id_indicador WHERE 1=1`;
  const params: any[] = [];
  if (periodo) { sql += ' AND f.data = ?'; params.push(periodo); }
  if (matricula) { sql += ' AND f.matricula = ?'; params.push(matricula); }
  sql += ' ORDER BY f.data DESC, f.matricula, d.codigo';
  res.json(db.prepare(sql).all(...params));
});

router.post('/fatos', adminMiddleware, (req: Request, res: Response) => {
  const { dados } = req.body; // array de { data, matricula, id_indicador, numerador, denominador }
  if (!Array.isArray(dados)) return res.status(400).json({ error: 'Envie { dados: [...] }' });
  const ins = db.prepare('INSERT OR REPLACE INTO rv_indicadores_fato (data, matricula, id_indicador, numerador, denominador) VALUES (?,?,?,?,?)');
  const tx = db.transaction(() => {
    for (const d of dados) {
      ins.run(d.data, d.matricula, d.id_indicador, d.numerador, d.denominador ?? 1);
    }
  });
  tx();
  res.json({ inseridos: dados.length });
});

// ════════════════════════════════════════
// REGRAS
// ════════════════════════════════════════
router.get('/regras', (req, res) => {
  const regras = db.prepare('SELECT * FROM rv_regras ORDER BY nome').all() as any[];
  for (const r of regras) {
    r.faixas = db.prepare('SELECT f.*, d.codigo as indicador_codigo, d.nome as indicador_nome FROM rv_regra_faixas f JOIN rv_indicadores_dim d ON d.id=f.id_indicador WHERE f.id_regra=? ORDER BY f.ordem').all(r.id);
    r.condicoes = db.prepare('SELECT c.*, d.codigo as indicador_codigo, d.nome as indicador_nome FROM rv_regra_condicoes c JOIN rv_indicadores_dim d ON d.id=c.id_indicador WHERE c.id_regra=?').all(r.id);
  }
  res.json(regras);
});

router.post('/regras', adminMiddleware, (req: Request, res: Response) => {
  const { nome, descricao, tipo, vigencia_inicio, vigencia_fim, faixas, condicoes } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const tx = db.transaction(() => {
    const r = db.prepare('INSERT INTO rv_regras (nome, descricao, tipo, vigencia_inicio, vigencia_fim) VALUES (?,?,?,?,?)')
      .run(nome, descricao || '', tipo || 'faixa', vigencia_inicio || null, vigencia_fim || null);
    const regraId = r.lastInsertRowid as number;

    if (Array.isArray(faixas)) {
      const insFaixa = db.prepare('INSERT INTO rv_regra_faixas (id_regra, id_indicador, faixa_min, faixa_max, valor_payout, tipo_payout, ordem) VALUES (?,?,?,?,?,?,?)');
      faixas.forEach((f: any, i: number) => {
        insFaixa.run(regraId, f.id_indicador, f.faixa_min, f.faixa_max ?? null, f.valor_payout, f.tipo_payout || 'valor_fixo', i + 1);
      });
    }

    if (Array.isArray(condicoes)) {
      const insCond = db.prepare('INSERT INTO rv_regra_condicoes (id_regra, id_indicador, operador, valor_referencia) VALUES (?,?,?,?)');
      condicoes.forEach((c: any) => {
        insCond.run(regraId, c.id_indicador, c.operador, c.valor_referencia);
      });
    }

    return regraId;
  });

  const regraId = tx();
  res.json({ id: regraId });
});

router.put('/regras/:id', adminMiddleware, (req: Request, res: Response) => {
  const { nome, descricao, tipo, vigencia_inicio, vigencia_fim, ativo, faixas, condicoes } = req.body;
  const id = parseInt(req.params.id);

  const tx = db.transaction(() => {
    db.prepare('UPDATE rv_regras SET nome=?, descricao=?, tipo=?, vigencia_inicio=?, vigencia_fim=?, ativo=? WHERE id=?')
      .run(nome, descricao, tipo, vigencia_inicio || null, vigencia_fim || null, ativo ?? 1, id);

    if (Array.isArray(faixas)) {
      db.prepare('DELETE FROM rv_regra_faixas WHERE id_regra=?').run(id);
      const insFaixa = db.prepare('INSERT INTO rv_regra_faixas (id_regra, id_indicador, faixa_min, faixa_max, valor_payout, tipo_payout, ordem) VALUES (?,?,?,?,?,?,?)');
      faixas.forEach((f: any, i: number) => {
        insFaixa.run(id, f.id_indicador, f.faixa_min, f.faixa_max ?? null, f.valor_payout, f.tipo_payout || 'valor_fixo', i + 1);
      });
    }

    if (Array.isArray(condicoes)) {
      db.prepare('DELETE FROM rv_regra_condicoes WHERE id_regra=?').run(id);
      const insCond = db.prepare('INSERT INTO rv_regra_condicoes (id_regra, id_indicador, operador, valor_referencia) VALUES (?,?,?,?)');
      condicoes.forEach((c: any) => {
        insCond.run(id, c.id_indicador, c.operador, c.valor_referencia);
      });
    }
  });

  tx();
  res.json({ success: true });
});

router.delete('/regras/:id', adminMiddleware, (req: Request, res: Response) => {
  db.prepare('UPDATE rv_regras SET ativo=0 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ════════════════════════════════════════
// MOTOR DE CÁLCULO
// ════════════════════════════════════════
function avaliarCondicao(operador: string, valor: number, referencia: number): boolean {
  switch (operador) {
    case '>=': return valor >= referencia;
    case '<=': return valor <= referencia;
    case '>':  return valor > referencia;
    case '<':  return valor < referencia;
    case '==': return valor === referencia;
    case '!=': return valor !== referencia;
    default: return false;
  }
}

function obterValorIndicador(periodo: string, matricula: string, idIndicador: number): number | null {
  const row = db.prepare('SELECT numerador, denominador FROM rv_indicadores_fato WHERE data=? AND matricula=? AND id_indicador=?')
    .get(periodo, matricula, idIndicador) as any;
  if (!row) return null;
  if (row.denominador === 0) return null;
  return (row.numerador / row.denominador) * 100;
}

function encontrarFaixa(faixas: any[], valor: number): any | null {
  for (const f of faixas) {
    const max = f.faixa_max ?? Infinity;
    if (valor >= f.faixa_min && valor <= max) return f;
  }
  return null;
}

router.post('/calcular', adminMiddleware, (req: Request, res: Response) => {
  const { periodo } = req.body;
  if (!periodo) return res.status(400).json({ error: 'Período é obrigatório (ex: 2025-12)' });

  const user = (req as any).user;

  // Matriculas com dados no período
  const matriculas = db.prepare('SELECT DISTINCT matricula FROM rv_indicadores_fato WHERE data=?').all(periodo) as any[];
  if (matriculas.length === 0) return res.status(400).json({ error: `Nenhum dado encontrado para o período ${periodo}` });

  // Regras ativas no período
  const regras = db.prepare(`
    SELECT * FROM rv_regras WHERE ativo=1
    AND (vigencia_inicio IS NULL OR vigencia_inicio <= ?)
    AND (vigencia_fim IS NULL OR vigencia_fim >= ?)
  `).all(periodo, periodo) as any[];

  if (regras.length === 0) return res.status(400).json({ error: 'Nenhuma regra ativa para este período' });

  // Criar rodada de cálculo
  const calculo = db.prepare('INSERT INTO rv_calculos (periodo, calculado_por) VALUES (?,?)')
    .run(periodo, user.nome || user.login);
  const calculoId = calculo.lastInsertRowid as number;

  const resultados: any[] = [];
  const insResult = db.prepare('INSERT INTO rv_resultados (id_calculo, matricula, nome_colaborador, id_regra, valor_indicador, valor_rv, detalhes_json) VALUES (?,?,?,?,?,?,?)');

  const tx = db.transaction(() => {
    for (const { matricula } of matriculas) {
      // Buscar nome do colaborador
      const userRow = db.prepare('SELECT nome_completo FROM users WHERE matricula=?').get(matricula) as any;
      const nomeColab = userRow?.nome_completo || matricula;

      for (const regra of regras) {
        // Buscar faixas e condições
        const faixas = db.prepare('SELECT * FROM rv_regra_faixas WHERE id_regra=? ORDER BY ordem').all(regra.id) as any[];
        const condicoes = db.prepare('SELECT * FROM rv_regra_condicoes WHERE id_regra=?').all(regra.id) as any[];

        if (faixas.length === 0) continue;

        // Verificar condições (pré-requisitos)
        let condicoesOk = true;
        const detalhesCondicoes: any[] = [];
        for (const cond of condicoes) {
          const val = obterValorIndicador(periodo, matricula, cond.id_indicador);
          const passou = val !== null && avaliarCondicao(cond.operador, val, cond.valor_referencia);
          detalhesCondicoes.push({
            indicador_id: cond.id_indicador,
            operador: cond.operador,
            referencia: cond.valor_referencia,
            valor_real: val,
            passou,
          });
          if (!passou) { condicoesOk = false; break; }
        }

        if (!condicoesOk) {
          // Registrar resultado zero com motivo
          insResult.run(calculoId, matricula, nomeColab, regra.id, null, 0,
            JSON.stringify({ motivo: 'Condição não atendida', condicoes: detalhesCondicoes }));
          resultados.push({ matricula, nomeColab, regra: regra.nome, valor_indicador: null, valor_rv: 0, status: 'condição não atendida' });
          continue;
        }

        // Calcular indicador principal (o indicador das faixas)
        const idIndicadorPrincipal = faixas[0].id_indicador;

        // Para regra de atingimento (VENDAS vs META_VENDAS), precisamos do par
        // O valor no fato já é o numerador, vamos ver se tem META correspondente
        const valorFato = db.prepare('SELECT numerador, denominador FROM rv_indicadores_fato WHERE data=? AND matricula=? AND id_indicador=?')
          .get(periodo, matricula, idIndicadorPrincipal) as any;

        if (!valorFato) {
          insResult.run(calculoId, matricula, nomeColab, regra.id, null, 0,
            JSON.stringify({ motivo: 'Sem dados do indicador no período' }));
          continue;
        }

        // Buscar indicador da dimensão para saber o tipo
        const dimInfo = db.prepare('SELECT * FROM rv_indicadores_dim WHERE id=?').get(idIndicadorPrincipal) as any;

        let valorCalc: number;
        if (dimInfo.tipo === 'quantidade') {
          // Para quantidade, verificar se tem META correspondente
          const codigoMeta = 'META_' + dimInfo.codigo;
          const metaDim = db.prepare('SELECT id FROM rv_indicadores_dim WHERE codigo=?').get(codigoMeta) as any;
          if (metaDim) {
            const metaFato = db.prepare('SELECT numerador FROM rv_indicadores_fato WHERE data=? AND matricula=? AND id_indicador=?')
              .get(periodo, matricula, metaDim.id) as any;
            if (metaFato && metaFato.numerador > 0) {
              valorCalc = (valorFato.numerador / metaFato.numerador) * 100; // atingimento %
            } else {
              valorCalc = valorFato.numerador;
            }
          } else {
            valorCalc = valorFato.numerador;
          }
        } else if (dimInfo.tipo === 'valor') {
          const codigoMeta = 'META_' + dimInfo.codigo;
          const metaDim = db.prepare('SELECT id FROM rv_indicadores_dim WHERE codigo=?').get(codigoMeta) as any;
          if (metaDim) {
            const metaFato = db.prepare('SELECT numerador FROM rv_indicadores_fato WHERE data=? AND matricula=? AND id_indicador=?')
              .get(periodo, matricula, metaDim.id) as any;
            if (metaFato && metaFato.numerador > 0) {
              valorCalc = (valorFato.numerador / metaFato.numerador) * 100;
            } else {
              valorCalc = valorFato.numerador;
            }
          } else {
            valorCalc = valorFato.numerador;
          }
        } else {
          // Percentual: numerador/denominador * 100
          valorCalc = valorFato.denominador !== 0 ? (valorFato.numerador / valorFato.denominador) * 100 : 0;
        }

        // Encontrar faixa
        const faixa = encontrarFaixa(faixas, valorCalc);
        const valorRV = faixa ? faixa.valor_payout : 0;

        const detalhes = {
          indicador: dimInfo.codigo,
          tipo: dimInfo.tipo,
          numerador: valorFato.numerador,
          denominador: valorFato.denominador,
          valor_calculado: Math.round(valorCalc * 100) / 100,
          faixa_encontrada: faixa ? { min: faixa.faixa_min, max: faixa.faixa_max, payout: faixa.valor_payout, tipo: faixa.tipo_payout } : null,
          condicoes: detalhesCondicoes,
        };

        insResult.run(calculoId, matricula, nomeColab, regra.id, Math.round(valorCalc * 100) / 100, valorRV, JSON.stringify(detalhes));
        resultados.push({ matricula, nomeColab, regra: regra.nome, valor_indicador: Math.round(valorCalc * 100) / 100, valor_rv: valorRV });
      }
    }
  });

  tx();

  const totalRV = resultados.reduce((s, r) => s + r.valor_rv, 0);
  res.json({ calculoId, periodo, totalColaboradores: matriculas.length, totalRegras: regras.length, totalRV, resultados });
});

// ════════════════════════════════════════
// CÁLCULOS (histórico)
// ════════════════════════════════════════
router.get('/calculos', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, COUNT(DISTINCT r.matricula) as total_colaboradores, SUM(r.valor_rv) as total_rv
    FROM rv_calculos c LEFT JOIN rv_resultados r ON r.id_calculo = c.id
    GROUP BY c.id ORDER BY c.data_calculo DESC
  `).all();
  res.json(rows);
});

router.get('/calculos/:id', (req, res) => {
  const calculo = db.prepare('SELECT * FROM rv_calculos WHERE id=?').get(req.params.id);
  if (!calculo) return res.status(404).json({ error: 'Cálculo não encontrado' });

  const resultados = db.prepare(`
    SELECT r.*, rg.nome as regra_nome
    FROM rv_resultados r JOIN rv_regras rg ON rg.id = r.id_regra
    WHERE r.id_calculo=? ORDER BY r.nome_colaborador, rg.nome
  `).all(req.params.id);

  res.json({ ...calculo as any, resultados });
});

router.put('/calculos/:id/status', adminMiddleware, (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['rascunho', 'aprovado', 'pago'].includes(status)) return res.status(400).json({ error: 'Status inválido' });
  db.prepare('UPDATE rv_calculos SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ success: true });
});

router.delete('/calculos/:id', adminMiddleware, (req: Request, res: Response) => {
  db.prepare('DELETE FROM rv_resultados WHERE id_calculo=?').run(req.params.id);
  db.prepare('DELETE FROM rv_calculos WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ════════════════════════════════════════
// RESULTADOS (consulta)
// ════════════════════════════════════════
router.get('/resultados', (req, res) => {
  const { periodo, matricula } = req.query;
  let sql = `SELECT r.*, rg.nome as regra_nome, c.periodo, c.status as calculo_status
             FROM rv_resultados r
             JOIN rv_regras rg ON rg.id = r.id_regra
             JOIN rv_calculos c ON c.id = r.id_calculo WHERE 1=1`;
  const params: any[] = [];
  if (periodo) { sql += ' AND c.periodo = ?'; params.push(periodo); }
  if (matricula) { sql += ' AND r.matricula = ?'; params.push(matricula); }
  sql += ' ORDER BY c.periodo DESC, r.nome_colaborador, rg.nome';
  res.json(db.prepare(sql).all(...params));
});

// Periodos disponíveis nos fatos
router.get('/periodos', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT data as periodo FROM rv_indicadores_fato ORDER BY data DESC').all();
  res.json(rows);
});

export default router;
