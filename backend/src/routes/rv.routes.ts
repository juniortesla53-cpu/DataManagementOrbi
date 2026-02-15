import { Router, Request, Response } from 'express';
import db from '../database';
import { authMiddleware, adminMiddleware } from '../auth';

const router = Router();
router.use(authMiddleware);

// ════════════════════════════════════════
// CLIENTES
// ════════════════════════════════════════
router.get('/clientes', (req, res) => {
  const rows = db.prepare('SELECT * FROM rv_clientes ORDER BY nome').all();
  res.json(rows);
});

router.post('/clientes', adminMiddleware, (req: Request, res: Response) => {
  const { nome, logo_url, descricao } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const r = db.prepare('INSERT INTO rv_clientes (nome, logo_url, descricao) VALUES (?,?,?)').run(nome, logo_url || null, descricao || '');
    res.json({ id: r.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/clientes/:id', adminMiddleware, (req: Request, res: Response) => {
  const { nome, logo_url, descricao, ativo } = req.body;
  db.prepare('UPDATE rv_clientes SET nome=?, logo_url=?, descricao=?, ativo=? WHERE id=?')
    .run(nome, logo_url || null, descricao || '', ativo ?? 1, req.params.id);
  res.json({ success: true });
});

router.delete('/clientes/:id', adminMiddleware, (req: Request, res: Response) => {
  db.prepare('UPDATE rv_clientes SET ativo=0 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

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
  const { id_cliente } = req.query;
  let sql = 'SELECT * FROM rv_indicadores_dim WHERE 1=1';
  const params: any[] = [];
  if (id_cliente) {
    sql += ' AND (id_cliente = ? OR id_cliente IS NULL)';
    params.push(id_cliente);
  }
  sql += ' ORDER BY codigo';
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.post('/indicadores', adminMiddleware, (req: Request, res: Response) => {
  const { codigo, nome, descricao, unidade, tipo, id_cliente } = req.body;
  if (!codigo || !nome) return res.status(400).json({ error: 'Código e nome são obrigatórios' });
  try {
    const r = db.prepare('INSERT INTO rv_indicadores_dim (codigo, nome, descricao, unidade, tipo, id_cliente) VALUES (?,?,?,?,?,?)').run(codigo, nome, descricao || '', unidade || '%', tipo || 'percentual', id_cliente || null);
    res.json({ id: r.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: e.message.includes('UNIQUE') ? 'Código já existe' : e.message });
  }
});

router.put('/indicadores/:id', adminMiddleware, (req: Request, res: Response) => {
  const { codigo, nome, descricao, unidade, tipo, ativo, id_cliente } = req.body;
  db.prepare('UPDATE rv_indicadores_dim SET codigo=?, nome=?, descricao=?, unidade=?, tipo=?, ativo=?, id_cliente=? WHERE id=?')
    .run(codigo, nome, descricao, unidade, tipo, ativo ?? 1, id_cliente || null, req.params.id);
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
  const { dados } = req.body;
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
  const { id_cliente } = req.query;
  let sql = 'SELECT * FROM rv_regras WHERE 1=1';
  const params: any[] = [];
  if (id_cliente) {
    sql += ' AND (id_cliente = ? OR id_cliente IS NULL)';
    params.push(id_cliente);
  }
  sql += ' ORDER BY nome';
  const regras = db.prepare(sql).all(...params) as any[];
  for (const r of regras) {
    r.faixas = db.prepare('SELECT f.*, d.codigo as indicador_codigo, d.nome as indicador_nome FROM rv_regra_faixas f JOIN rv_indicadores_dim d ON d.id=f.id_indicador WHERE f.id_regra=? ORDER BY f.ordem').all(r.id);
    r.condicoes = db.prepare('SELECT c.*, d.codigo as indicador_codigo, d.nome as indicador_nome FROM rv_regra_condicoes c JOIN rv_indicadores_dim d ON d.id=c.id_indicador WHERE c.id_regra=?').all(r.id);
  }
  res.json(regras);
});

router.post('/regras', adminMiddleware, (req: Request, res: Response) => {
  const { nome, descricao, tipo, vigencia_inicio, vigencia_fim, faixas, condicoes, id_cliente } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  const tx = db.transaction(() => {
    const r = db.prepare('INSERT INTO rv_regras (nome, descricao, tipo, vigencia_inicio, vigencia_fim, id_cliente) VALUES (?,?,?,?,?,?)')
      .run(nome, descricao || '', tipo || 'faixa', vigencia_inicio || null, vigencia_fim || null, id_cliente || null);
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
  const { nome, descricao, tipo, vigencia_inicio, vigencia_fim, ativo, faixas, condicoes, id_cliente } = req.body;
  const id = parseInt(req.params.id);

  const tx = db.transaction(() => {
    db.prepare('UPDATE rv_regras SET nome=?, descricao=?, tipo=?, vigencia_inicio=?, vigencia_fim=?, ativo=?, id_cliente=? WHERE id=?')
      .run(nome, descricao, tipo, vigencia_inicio || null, vigencia_fim || null, ativo ?? 1, id_cliente || null, id);

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
// MOTOR DE CÁLCULO (extraído como função reutilizável)
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

/**
 * Motor de cálculo RV reutilizável.
 * Executa o cálculo sem persistir (dry-run).
 * Pode receber um filtro de regras (regraIds) opcional.
 */
function executarCalculoRV(periodo: string, regraIds?: number[]) {
  // Matrículas com dados no período
  const matriculas = db.prepare('SELECT DISTINCT matricula FROM rv_indicadores_fato WHERE data=?').all(periodo) as any[];
  if (matriculas.length === 0) {
    return { error: `Nenhum dado encontrado para o período ${periodo}` };
  }

  // Regras ativas no período
  let regras: any[];
  if (regraIds && regraIds.length > 0) {
    const placeholders = regraIds.map(() => '?').join(',');
    regras = db.prepare(`
      SELECT * FROM rv_regras WHERE ativo=1
      AND id IN (${placeholders})
      AND (vigencia_inicio IS NULL OR vigencia_inicio <= ?)
      AND (vigencia_fim IS NULL OR vigencia_fim >= ?)
    `).all(...regraIds, periodo, periodo) as any[];
  } else {
    regras = db.prepare(`
      SELECT * FROM rv_regras WHERE ativo=1
      AND (vigencia_inicio IS NULL OR vigencia_inicio <= ?)
      AND (vigencia_fim IS NULL OR vigencia_fim >= ?)
    `).all(periodo, periodo) as any[];
  }

  if (regras.length === 0) {
    return { error: 'Nenhuma regra ativa para este período' };
  }

  // Buscar todos os indicadores para enriquecer os dados
  const todosIndicadores = db.prepare('SELECT * FROM rv_indicadores_dim WHERE ativo=1').all() as any[];

  const resultados: any[] = [];
  const colaboradores: any[] = [];

  for (const { matricula } of matriculas) {
    const userRow = db.prepare('SELECT nome_completo FROM users WHERE matricula=?').get(matricula) as any;
    const nomeColab = userRow?.nome_completo || matricula;

    // Buscar todos os indicadores deste colaborador no período
    const indicadoresColab: Record<string, any> = {};
    for (const ind of todosIndicadores) {
      const fato = db.prepare('SELECT numerador, denominador FROM rv_indicadores_fato WHERE data=? AND matricula=? AND id_indicador=?')
        .get(periodo, matricula, ind.id) as any;
      if (fato) {
        let valor: number;
        if (ind.tipo === 'percentual') {
          valor = fato.denominador !== 0 ? Math.round((fato.numerador / fato.denominador) * 100 * 100) / 100 : 0;
        } else {
          valor = fato.numerador;
        }
        indicadoresColab[ind.codigo] = {
          id: ind.id,
          codigo: ind.codigo,
          nome: ind.nome,
          unidade: ind.unidade,
          tipo: ind.tipo,
          valor,
          numerador: fato.numerador,
          denominador: fato.denominador,
        };
      }
    }

    const regrasColab: any[] = [];
    let totalColabRV = 0;

    for (const regra of regras) {
      const faixas = db.prepare('SELECT * FROM rv_regra_faixas WHERE id_regra=? ORDER BY ordem').all(regra.id) as any[];
      const condicoes = db.prepare('SELECT * FROM rv_regra_condicoes WHERE id_regra=?').all(regra.id) as any[];

      if (faixas.length === 0) continue;

      // Verificar condições
      let condicoesOk = true;
      const detalhesCondicoes: any[] = [];
      for (const cond of condicoes) {
        const val = obterValorIndicador(periodo, matricula, cond.id_indicador);
        const indDim = db.prepare('SELECT codigo, nome FROM rv_indicadores_dim WHERE id=?').get(cond.id_indicador) as any;
        const passou = val !== null && avaliarCondicao(cond.operador, val, cond.valor_referencia);
        detalhesCondicoes.push({
          indicador_id: cond.id_indicador,
          indicador_codigo: indDim?.codigo,
          indicador_nome: indDim?.nome,
          operador: cond.operador,
          referencia: cond.valor_referencia,
          valor_real: val,
          passou,
        });
        if (!passou) { condicoesOk = false; }
      }

      if (!condicoesOk) {
        const regraResult = {
          id_regra: regra.id,
          nome: regra.nome,
          indicador_valor: null,
          faixa: null,
          valor_rv: 0,
          condicoes_ok: false,
          condicoes: detalhesCondicoes,
          motivo: 'Condição não atendida',
        };
        regrasColab.push(regraResult);
        resultados.push({ matricula, nomeColab, regra: regra.nome, regra_nome: regra.nome, valor_indicador: null, valor_rv: 0, nome_colaborador: nomeColab, id_regra: regra.id, detalhes: regraResult });
        continue;
      }

      // Calcular indicador principal
      const idIndicadorPrincipal = faixas[0].id_indicador;
      const valorFato = db.prepare('SELECT numerador, denominador FROM rv_indicadores_fato WHERE data=? AND matricula=? AND id_indicador=?')
        .get(periodo, matricula, idIndicadorPrincipal) as any;

      if (!valorFato) {
        regrasColab.push({
          id_regra: regra.id,
          nome: regra.nome,
          indicador_valor: null,
          faixa: null,
          valor_rv: 0,
          condicoes_ok: true,
          condicoes: detalhesCondicoes,
          motivo: 'Sem dados do indicador',
        });
        continue;
      }

      const dimInfo = db.prepare('SELECT * FROM rv_indicadores_dim WHERE id=?').get(idIndicadorPrincipal) as any;

      let valorCalc: number;
      if (dimInfo.tipo === 'quantidade' || dimInfo.tipo === 'valor') {
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
        valorCalc = valorFato.denominador !== 0 ? (valorFato.numerador / valorFato.denominador) * 100 : 0;
      }

      valorCalc = Math.round(valorCalc * 100) / 100;

      const faixa = encontrarFaixa(faixas, valorCalc);
      const valorRV = faixa ? faixa.valor_payout : 0;

      const regraResult = {
        id_regra: regra.id,
        nome: regra.nome,
        indicador_codigo: dimInfo.codigo,
        indicador_nome: dimInfo.nome,
        indicador_valor: valorCalc,
        faixa: faixa ? { min: faixa.faixa_min, max: faixa.faixa_max, payout: faixa.valor_payout, tipo: faixa.tipo_payout } : null,
        valor_rv: valorRV,
        condicoes_ok: true,
        condicoes: detalhesCondicoes,
      };

      regrasColab.push(regraResult);
      totalColabRV += valorRV;
      resultados.push({
        matricula,
        nomeColab,
        nome_colaborador: nomeColab,
        regra: regra.nome,
        regra_nome: regra.nome,
        id_regra: regra.id,
        valor_indicador: valorCalc,
        valor_rv: valorRV,
        detalhes: regraResult,
      });
    }

    colaboradores.push({
      matricula,
      nome: nomeColab,
      indicadores: indicadoresColab,
      regras: regrasColab,
      total_rv: totalColabRV,
    });
  }

  const totalRV = colaboradores.reduce((s, c) => s + c.total_rv, 0);

  return {
    periodo,
    colaboradores,
    resultados,
    totalRV,
    totalColaboradores: matriculas.length,
    totalRegras: regras.length,
    regrasUsadas: regras.map(r => ({ id: r.id, nome: r.nome })),
  };
}

// ════════════════════════════════════════
// POST /simular — Dry-run (sem persistir)
// ════════════════════════════════════════
router.post('/simular', adminMiddleware, (req: Request, res: Response) => {
  const { periodo, regraIds } = req.body;
  if (!periodo) return res.status(400).json({ error: 'Período é obrigatório' });

  const resultado = executarCalculoRV(periodo, regraIds);
  if ('error' in resultado && typeof resultado.error === 'string' && !resultado.colaboradores) {
    return res.status(400).json({ error: resultado.error });
  }
  res.json(resultado);
});

// ════════════════════════════════════════
// GET /colaboradores-periodo — Dados dos colaboradores no período
// ════════════════════════════════════════
router.get('/colaboradores-periodo', (req, res) => {
  const { periodo } = req.query;
  if (!periodo) return res.status(400).json({ error: 'Parâmetro periodo é obrigatório' });

  const matriculas = db.prepare('SELECT DISTINCT matricula FROM rv_indicadores_fato WHERE data=?').all(periodo as string) as any[];
  const indicadores = db.prepare('SELECT * FROM rv_indicadores_dim WHERE ativo=1 ORDER BY codigo').all() as any[];

  const colaboradores = matriculas.map(({ matricula }) => {
    const userRow = db.prepare('SELECT nome_completo FROM users WHERE matricula=?').get(matricula) as any;
    const nome = userRow?.nome_completo || matricula;

    const indicadoresData = indicadores.map(ind => {
      const fato = db.prepare('SELECT numerador, denominador FROM rv_indicadores_fato WHERE data=? AND matricula=? AND id_indicador=?')
        .get(periodo as string, matricula, ind.id) as any;

      if (!fato) return { id: ind.id, codigo: ind.codigo, nome: ind.nome, unidade: ind.unidade, tipo: ind.tipo, valor: null, meta: null };

      let valor: number;
      if (ind.tipo === 'percentual') {
        valor = fato.denominador !== 0 ? Math.round((fato.numerador / fato.denominador) * 100 * 100) / 100 : 0;
      } else {
        valor = fato.numerador;
      }

      // Buscar meta se existir
      let meta: number | null = null;
      const codigoMeta = 'META_' + ind.codigo;
      const metaDim = db.prepare('SELECT id FROM rv_indicadores_dim WHERE codigo=?').get(codigoMeta) as any;
      if (metaDim) {
        const metaFato = db.prepare('SELECT numerador FROM rv_indicadores_fato WHERE data=? AND matricula=? AND id_indicador=?')
          .get(periodo as string, matricula, metaDim.id) as any;
        if (metaFato) meta = metaFato.numerador;
      }

      return { id: ind.id, codigo: ind.codigo, nome: ind.nome, unidade: ind.unidade, tipo: ind.tipo, valor, meta };
    }).filter(i => i.valor !== null); // Só indicadores com dados

    return { matricula, nome, indicadores: indicadoresData };
  });

  res.json({ colaboradores, indicadores, periodo });
});

// ════════════════════════════════════════
// POST /calcular — Persiste o cálculo (usa motor extraído)
// ════════════════════════════════════════
router.post('/calcular', adminMiddleware, (req: Request, res: Response) => {
  const { periodo, regraIds, observacoes, id_cliente } = req.body;
  if (!periodo) return res.status(400).json({ error: 'Período é obrigatório (ex: 2025-12)' });

  const user = (req as any).user;
  const resultado = executarCalculoRV(periodo, regraIds);

  if ('error' in resultado && typeof resultado.error === 'string' && !resultado.colaboradores) {
    return res.status(400).json({ error: resultado.error });
  }

  // Persistir
  const calculo = db.prepare('INSERT INTO rv_calculos (periodo, calculado_por, observacoes, id_cliente) VALUES (?,?,?,?)')
    .run(periodo, user.nome || user.login, observacoes || null, id_cliente || null);
  const calculoId = calculo.lastInsertRowid as number;

  const insResult = db.prepare('INSERT INTO rv_resultados (id_calculo, matricula, nome_colaborador, id_regra, valor_indicador, valor_rv, detalhes_json) VALUES (?,?,?,?,?,?,?)');

  const tx = db.transaction(() => {
    for (const r of resultado.resultados) {
      insResult.run(
        calculoId,
        r.matricula,
        r.nome_colaborador || r.nomeColab,
        r.id_regra,
        r.valor_indicador,
        r.valor_rv,
        JSON.stringify(r.detalhes || {})
      );
    }
  });
  tx();

  res.json({
    calculoId,
    periodo: resultado.periodo,
    totalColaboradores: resultado.totalColaboradores,
    totalRegras: resultado.totalRegras,
    totalRV: resultado.totalRV,
    resultados: resultado.resultados,
  });
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

// ════════════════════════════════════════
// FONTES DE DADOS
// ════════════════════════════════════════

// Listar todas as fontes
router.get('/fontes-dados', (req, res) => {
  const rows = db.prepare(`
    SELECT f.*, c.nome as cliente_nome
    FROM rv_fontes_dados f
    LEFT JOIN rv_clientes c ON c.id = f.id_cliente
    ORDER BY f.nome
  `).all();
  res.json(rows);
});

// Buscar uma fonte específica
router.get('/fontes-dados/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM rv_fontes_dados WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Fonte não encontrada' });
  res.json(row);
});

// Criar nova fonte
router.post('/fontes-dados', adminMiddleware, (req: Request, res: Response) => {
  const { nome, tipo, config_json, mapeamento_json, id_cliente } = req.body;
  
  if (!nome || !tipo) {
    return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
  }

  if (!['sqlserver', 'postgresql', 'excel', 'csv', 'txt'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo inválido' });
  }

  try {
    const configStr = typeof config_json === 'string' ? config_json : JSON.stringify(config_json || {});
    const mapeamentoStr = typeof mapeamento_json === 'string' ? mapeamento_json : JSON.stringify(mapeamento_json || {});

    const r = db.prepare(
      'INSERT INTO rv_fontes_dados (nome, tipo, config_json, mapeamento_json, id_cliente) VALUES (?,?,?,?,?)'
    ).run(nome, tipo, configStr, mapeamentoStr, id_cliente || null);

    res.json({ id: r.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Atualizar fonte
router.put('/fontes-dados/:id', adminMiddleware, (req: Request, res: Response) => {
  const { nome, tipo, config_json, mapeamento_json, id_cliente, ativo } = req.body;
  
  try {
    const configStr = typeof config_json === 'string' ? config_json : JSON.stringify(config_json || {});
    const mapeamentoStr = typeof mapeamento_json === 'string' ? mapeamento_json : JSON.stringify(mapeamento_json || {});

    db.prepare(`
      UPDATE rv_fontes_dados 
      SET nome=?, tipo=?, config_json=?, mapeamento_json=?, id_cliente=?, ativo=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(nome, tipo, configStr, mapeamentoStr, id_cliente || null, ativo ?? 1, req.params.id);

    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Deletar (desativar) fonte
router.delete('/fontes-dados/:id', adminMiddleware, (req: Request, res: Response) => {
  db.prepare('UPDATE rv_fontes_dados SET ativo=0, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Testar conexão/path de uma fonte
router.post('/fontes-dados/:id/testar', adminMiddleware, (req: Request, res: Response) => {
  const fonte = db.prepare('SELECT * FROM rv_fontes_dados WHERE id=?').get(req.params.id) as any;
  
  if (!fonte) {
    return res.status(404).json({ error: 'Fonte não encontrada' });
  }

  const config = JSON.parse(fonte.config_json);

  // Mock para SQL (por enquanto)
  if (fonte.tipo === 'sqlserver' || fonte.tipo === 'postgresql') {
    if (!config.host || !config.database) {
      return res.status(400).json({ error: 'Configuração incompleta (host, database)' });
    }
    return res.json({ 
      success: true, 
      message: 'Configuração válida (conexão real será implementada em breve)' 
    });
  }

  // Para arquivos, verificar se o caminho está preenchido
  if (fonte.tipo === 'excel' || fonte.tipo === 'csv' || fonte.tipo === 'txt') {
    if (!config.caminho_rede && !config.caminho_arquivo) {
      return res.status(400).json({ error: 'Caminho do arquivo não configurado' });
    }
    // Mock: validação de path
    const path = config.caminho_rede || config.caminho_arquivo;
    if (path && path.length > 3) {
      return res.json({ 
        success: true, 
        message: 'Caminho configurado (validação real de arquivo será implementada em breve)' 
      });
    }
    return res.status(400).json({ error: 'Caminho inválido' });
  }

  res.status(400).json({ error: 'Tipo de fonte não suportado' });
});

// Endpoint para download de templates
router.get('/fontes-dados/template/:formato', (req, res) => {
  const { formato } = req.params;
  
  if (!['csv', 'xlsx', 'txt'].includes(formato)) {
    return res.status(400).json({ error: 'Formato inválido. Use csv, xlsx ou txt' });
  }

  const colunas = ['matricula', 'nome_colaborador', 'codigo_indicador', 'numerador', 'denominador', 'periodo'];
  const exemplo = ['USR002', 'Maria Silva', 'VENDAS', '120', '100', '2025-12'];

  let content = '';
  let contentType = 'text/plain';
  let filename = `template_rv.${formato}`;

  if (formato === 'csv' || formato === 'xlsx') {
    // CSV (para xlsx também, por enquanto)
    content = colunas.join(';') + '\n';
    content += exemplo.join(';') + '\n';
    contentType = formato === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else if (formato === 'txt') {
    // TXT (pipe-delimited)
    content = colunas.join('|') + '\n';
    content += exemplo.join('|') + '\n';
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
});

// ════════════════════════════════════════
// DASHBOARD - HISTÓRICO MENSAL (para gráfico)
// ════════════════════════════════════════
router.get('/dashboard/historico-mensal', (req, res) => {
  const rows = db.prepare(`
    SELECT 
      c.periodo,
      SUM(r.valor_rv) as total_rv,
      COUNT(DISTINCT r.matricula) as total_colaboradores,
      COUNT(DISTINCT c.id) as total_calculos
    FROM rv_calculos c
    LEFT JOIN rv_resultados r ON r.id_calculo = c.id
    WHERE c.status != 'rascunho'
    GROUP BY c.periodo
    ORDER BY c.periodo ASC
  `).all();

  res.json(rows);
});

// ════════════════════════════════════════
// ENVIO DE EMAIL
// ════════════════════════════════════════
router.post('/calculos/:id/enviar-email', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { emails, formato, delimitador, assunto, mensagem } = req.body;

  // Validações
  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: 'Lista de emails é obrigatória' });
  }

  if (!formato || !['csv', 'xlsx', 'txt'].includes(formato)) {
    return res.status(400).json({ error: 'Formato inválido. Use csv, xlsx ou txt' });
  }

  if (!assunto || assunto.trim() === '') {
    return res.status(400).json({ error: 'Assunto é obrigatório' });
  }

  // Verificar se o cálculo existe
  const calculo = db.prepare('SELECT * FROM rv_calculos WHERE id=?').get(id);
  if (!calculo) {
    return res.status(404).json({ error: 'Cálculo não encontrado' });
  }

  try {
    // Salvar registro de envio
    const ins = db.prepare(`
      INSERT INTO rv_envios_email (id_calculo, emails_json, formato, delimitador, assunto, mensagem, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    ins.run(
      id,
      JSON.stringify(emails),
      formato,
      delimitador || null,
      assunto.trim(),
      mensagem?.trim() || null,
      'enviado' // Por enquanto, simular sucesso. SMTP real virá depois
    );

    res.json({
      success: true,
      message: `Email enviado com sucesso para ${emails.length} destinatário(s)`,
      formato,
      destinatarios: emails.length
    });
  } catch (err: any) {
    console.error('Erro ao salvar registro de envio:', err);
    res.status(500).json({ error: 'Erro ao processar envio de email' });
  }
});

// ════════════════════════════════════════
// PLANOS RV (NEW ARCHITECTURE)
// ════════════════════════════════════════

// GET /rv/planos - List all plans (with client filter)
router.get('/planos', (req, res) => {
  const { id_cliente } = req.query;
  let sql = 'SELECT * FROM rv_plano WHERE 1=1';
  const params: any[] = [];
  
  if (id_cliente) {
    sql += ' AND (id_cliente = ? OR id_cliente IS NULL)';
    params.push(id_cliente);
  }
  
  sql += ' ORDER BY nome';
  const planos = db.prepare(sql).all(...params) as any[];
  
  res.json(planos);
});

// GET /rv/planos/:id - Get plan with all nested data
router.get('/planos/:id', (req, res) => {
  const plano = db.prepare('SELECT * FROM rv_plano WHERE id=?').get(req.params.id) as any;
  
  if (!plano) {
    return res.status(404).json({ error: 'Plano não encontrado' });
  }
  
  // Buscar elegibilidade
  const elegibilidade = db.prepare(`
    SELECT e.*, i.codigo as indicador_codigo, i.nome as indicador_nome
    FROM rv_plano_elegibilidade e
    JOIN rv_indicadores_dim i ON i.id = e.id_indicador
    WHERE e.id_plano = ?
    ORDER BY e.ordem
  `).all(req.params.id);
  
  // Buscar remuneração
  const remuneracao = db.prepare(`
    SELECT r.*, i.codigo as indicador_codigo, i.nome as indicador_nome
    FROM rv_plano_remuneracao r
    JOIN rv_indicadores_dim i ON i.id = r.id_indicador
    WHERE r.id_plano = ?
    ORDER BY r.ordem
  `).all(req.params.id) as any[];
  
  // Para cada indicador de remuneração, buscar suas faixas
  for (const rem of remuneracao) {
    rem.faixas = db.prepare(`
      SELECT * FROM rv_plano_remuneracao_faixas
      WHERE id_remuneracao = ?
      ORDER BY ordem
    `).all(rem.id);
  }
  
  // Buscar deflatores
  const deflatores = db.prepare(`
    SELECT d.*, i.codigo as indicador_codigo, i.nome as indicador_nome
    FROM rv_plano_deflatores d
    JOIN rv_indicadores_dim i ON i.id = d.id_indicador
    WHERE d.id_plano = ?
    ORDER BY d.ordem
  `).all(req.params.id) as any[];
  
  // Para cada deflator, buscar suas faixas
  for (const def of deflatores) {
    def.faixas = db.prepare(`
      SELECT * FROM rv_plano_deflator_faixas
      WHERE id_deflator = ?
      ORDER BY ordem
    `).all(def.id);
  }
  
  res.json({
    ...plano,
    elegibilidade,
    remuneracao,
    deflatores
  });
});

// POST /rv/planos - Create plan with all nested data in a single transaction
router.post('/planos', adminMiddleware, (req: Request, res: Response) => {
  const { nome, descricao, valor_dsr, teto_rv, vigencia_inicio, vigencia_fim, id_cliente, elegibilidade, remuneracao, deflatores } = req.body;
  
  if (!nome) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }
  
  const tx = db.transaction(() => {
    // Insert plano
    const planoResult = db.prepare(`
      INSERT INTO rv_plano (nome, descricao, valor_dsr, teto_rv, vigencia_inicio, vigencia_fim, id_cliente)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      nome,
      descricao || null,
      valor_dsr || 0,
      teto_rv || null,
      vigencia_inicio || null,
      vigencia_fim || null,
      id_cliente || null
    );
    
    const planoId = planoResult.lastInsertRowid as number;
    
    // Insert elegibilidade
    if (Array.isArray(elegibilidade)) {
      const insEleg = db.prepare(`
        INSERT INTO rv_plano_elegibilidade (id_plano, id_indicador, operador, valor_minimo, ordem)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      elegibilidade.forEach((e: any, idx: number) => {
        insEleg.run(planoId, e.id_indicador, e.operador || '>=', e.valor_minimo, idx);
      });
    }
    
    // Insert remuneracao
    if (Array.isArray(remuneracao)) {
      const insRem = db.prepare(`
        INSERT INTO rv_plano_remuneracao (id_plano, id_indicador, tem_regra_propria, ordem)
        VALUES (?, ?, ?, ?)
      `);
      
      const insFaixa = db.prepare(`
        INSERT INTO rv_plano_remuneracao_faixas (id_remuneracao, faixa_min, faixa_max, valor_payout, tipo_payout, ordem)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      remuneracao.forEach((r: any, idx: number) => {
        const remResult = insRem.run(planoId, r.id_indicador, r.tem_regra_propria ? 1 : 0, idx);
        const remId = remResult.lastInsertRowid as number;
        
        // Insert faixas for this remuneracao
        if (Array.isArray(r.faixas)) {
          r.faixas.forEach((f: any, fIdx: number) => {
            insFaixa.run(
              remId,
              f.faixa_min,
              f.faixa_max || null,
              f.valor_payout,
              f.tipo_payout || 'valor_fixo',
              fIdx
            );
          });
        }
      });
    }
    
    // Insert deflatores
    if (Array.isArray(deflatores)) {
      const insDef = db.prepare(`
        INSERT INTO rv_plano_deflatores (id_plano, id_indicador, ordem)
        VALUES (?, ?, ?)
      `);
      
      const insDefFaixa = db.prepare(`
        INSERT INTO rv_plano_deflator_faixas (id_deflator, faixa_min, faixa_max, percentual_reducao, ordem)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      deflatores.forEach((d: any, idx: number) => {
        const defResult = insDef.run(planoId, d.id_indicador, idx);
        const defId = defResult.lastInsertRowid as number;
        
        // Insert faixas for this deflator
        if (Array.isArray(d.faixas)) {
          d.faixas.forEach((f: any, fIdx: number) => {
            insDefFaixa.run(
              defId,
              f.faixa_min,
              f.faixa_max || null,
              f.percentual_reducao,
              fIdx
            );
          });
        }
      });
    }
    
    return planoId;
  });
  
  try {
    const planoId = tx();
    res.json({ id: planoId });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /rv/planos/:id - Update plan (replace all nested data in transaction)
router.put('/planos/:id', adminMiddleware, (req: Request, res: Response) => {
  const { nome, descricao, valor_dsr, teto_rv, vigencia_inicio, vigencia_fim, id_cliente, ativo, elegibilidade, remuneracao, deflatores } = req.body;
  const planoId = parseInt(req.params.id);
  
  const tx = db.transaction(() => {
    // Update plano
    db.prepare(`
      UPDATE rv_plano
      SET nome=?, descricao=?, valor_dsr=?, teto_rv=?, vigencia_inicio=?, vigencia_fim=?, id_cliente=?, ativo=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      nome,
      descricao || null,
      valor_dsr || 0,
      teto_rv || null,
      vigencia_inicio || null,
      vigencia_fim || null,
      id_cliente || null,
      ativo ?? 1,
      planoId
    );
    
    // Delete existing nested data
    db.prepare('DELETE FROM rv_plano_elegibilidade WHERE id_plano=?').run(planoId);
    
    // Delete remuneracao (cascade will delete faixas)
    db.prepare('DELETE FROM rv_plano_remuneracao WHERE id_plano=?').run(planoId);
    
    // Delete deflatores (cascade will delete faixas)
    db.prepare('DELETE FROM rv_plano_deflatores WHERE id_plano=?').run(planoId);
    
    // Re-insert elegibilidade
    if (Array.isArray(elegibilidade)) {
      const insEleg = db.prepare(`
        INSERT INTO rv_plano_elegibilidade (id_plano, id_indicador, operador, valor_minimo, ordem)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      elegibilidade.forEach((e: any, idx: number) => {
        insEleg.run(planoId, e.id_indicador, e.operador || '>=', e.valor_minimo, idx);
      });
    }
    
    // Re-insert remuneracao
    if (Array.isArray(remuneracao)) {
      const insRem = db.prepare(`
        INSERT INTO rv_plano_remuneracao (id_plano, id_indicador, tem_regra_propria, ordem)
        VALUES (?, ?, ?, ?)
      `);
      
      const insFaixa = db.prepare(`
        INSERT INTO rv_plano_remuneracao_faixas (id_remuneracao, faixa_min, faixa_max, valor_payout, tipo_payout, ordem)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      remuneracao.forEach((r: any, idx: number) => {
        const remResult = insRem.run(planoId, r.id_indicador, r.tem_regra_propria ? 1 : 0, idx);
        const remId = remResult.lastInsertRowid as number;
        
        if (Array.isArray(r.faixas)) {
          r.faixas.forEach((f: any, fIdx: number) => {
            insFaixa.run(
              remId,
              f.faixa_min,
              f.faixa_max || null,
              f.valor_payout,
              f.tipo_payout || 'valor_fixo',
              fIdx
            );
          });
        }
      });
    }
    
    // Re-insert deflatores
    if (Array.isArray(deflatores)) {
      const insDef = db.prepare(`
        INSERT INTO rv_plano_deflatores (id_plano, id_indicador, ordem)
        VALUES (?, ?, ?)
      `);
      
      const insDefFaixa = db.prepare(`
        INSERT INTO rv_plano_deflator_faixas (id_deflator, faixa_min, faixa_max, percentual_reducao, ordem)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      deflatores.forEach((d: any, idx: number) => {
        const defResult = insDef.run(planoId, d.id_indicador, idx);
        const defId = defResult.lastInsertRowid as number;
        
        if (Array.isArray(d.faixas)) {
          d.faixas.forEach((f: any, fIdx: number) => {
            insDefFaixa.run(
              defId,
              f.faixa_min,
              f.faixa_max || null,
              f.percentual_reducao,
              fIdx
            );
          });
        }
      });
    }
  });
  
  try {
    tx();
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /rv/planos/:id - Soft delete (set ativo=0)
router.delete('/planos/:id', adminMiddleware, (req: Request, res: Response) => {
  db.prepare('UPDATE rv_plano SET ativo=0, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ════════════════════════════════════════
// GRUPOS RV (hierarquia: Cliente → Grupo → Sub-RVs por Cargo)
// ════════════════════════════════════════

// GET /rv/grupos - List all groups with nested planos summary
router.get('/grupos', (req, res) => {
  const { id_cliente } = req.query;
  let sql = `
    SELECT g.*, c.nome as cliente_nome
    FROM rv_grupo g
    LEFT JOIN rv_clientes c ON c.id = g.id_cliente
    WHERE 1=1
  `;
  const params: any[] = [];
  if (id_cliente) { sql += ' AND g.id_cliente = ?'; params.push(id_cliente); }
  sql += ' ORDER BY g.nome';
  const grupos = db.prepare(sql).all(...params) as any[];

  for (const g of grupos) {
    g.planos = db.prepare(`
      SELECT id, nome, tipo_cargo, tipo_calculo, id_plano_referencia, percentual_referencia, ativo
      FROM rv_plano WHERE id_grupo = ? ORDER BY tipo_cargo
    `).all(g.id);
  }

  res.json(grupos);
});

// GET /rv/grupos/:id - Full detail
router.get('/grupos/:id', (req, res) => {
  const grupo = db.prepare(`
    SELECT g.*, c.nome as cliente_nome
    FROM rv_grupo g LEFT JOIN rv_clientes c ON c.id = g.id_cliente
    WHERE g.id = ?
  `).get(req.params.id) as any;
  if (!grupo) return res.status(404).json({ error: 'Grupo não encontrado' });

  // Get all planos (sub-RVs) in this group with full detail
  const planos = db.prepare('SELECT * FROM rv_plano WHERE id_grupo = ? ORDER BY tipo_cargo').all(grupo.id) as any[];

  for (const plano of planos) {
    plano.elegibilidade = db.prepare(`
      SELECT e.*, i.codigo as indicador_codigo, i.nome as indicador_nome, i.unidade as indicador_unidade
      FROM rv_plano_elegibilidade e
      LEFT JOIN rv_indicadores_dim i ON i.id = e.id_indicador
      WHERE e.id_plano = ? ORDER BY e.ordem
    `).all(plano.id);

    const remuneracao = db.prepare(`
      SELECT r.*, i.codigo as indicador_codigo, i.nome as indicador_nome, i.unidade as indicador_unidade
      FROM rv_plano_remuneracao r
      JOIN rv_indicadores_dim i ON i.id = r.id_indicador
      WHERE r.id_plano = ? ORDER BY r.ordem
    `).all(plano.id) as any[];

    for (const rem of remuneracao) {
      rem.faixas = db.prepare('SELECT * FROM rv_plano_remuneracao_faixas WHERE id_remuneracao = ? ORDER BY ordem').all(rem.id);
      rem.condicoes = db.prepare('SELECT * FROM rv_plano_remuneracao_condicoes WHERE id_remuneracao = ? ORDER BY ordem').all(rem.id);
    }
    plano.remuneracao = remuneracao;

    const deflatores = db.prepare(`
      SELECT d.*, i.codigo as indicador_codigo, i.nome as indicador_nome, i.unidade as indicador_unidade
      FROM rv_plano_deflatores d
      JOIN rv_indicadores_dim i ON i.id = d.id_indicador
      WHERE d.id_plano = ? ORDER BY d.ordem
    `).all(plano.id) as any[];
    for (const def of deflatores) {
      def.faixas = db.prepare('SELECT * FROM rv_plano_deflator_faixas WHERE id_deflator = ? ORDER BY ordem').all(def.id);
    }
    plano.deflatores = deflatores;
  }

  grupo.planos = planos;
  res.json(grupo);
});

// POST /rv/grupos - Create group with nested planos
router.post('/grupos', adminMiddleware, (req: Request, res: Response) => {
  const { id_cliente, nome, descricao, vigencia_inicio, vigencia_fim, planos } = req.body;
  if (!nome || !id_cliente) return res.status(400).json({ error: 'Nome e cliente são obrigatórios' });

  const tx = db.transaction(() => {
    const grupoResult = db.prepare(`
      INSERT INTO rv_grupo (id_cliente, nome, descricao, vigencia_inicio, vigencia_fim) VALUES (?,?,?,?,?)
    `).run(id_cliente, nome, descricao || null, vigencia_inicio || null, vigencia_fim || null);
    const grupoId = grupoResult.lastInsertRowid as number;

    if (Array.isArray(planos)) {
      for (const p of planos) {
        insertPlanoInGrupo(grupoId, p);
      }
    }
    return grupoId;
  });

  try {
    const grupoId = tx();
    res.json({ id: grupoId });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /rv/grupos/:id - Update group + replace nested planos
router.put('/grupos/:id', adminMiddleware, (req: Request, res: Response) => {
  const grupoId = parseInt(req.params.id);
  const { id_cliente, nome, descricao, vigencia_inicio, vigencia_fim, ativo, planos } = req.body;

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE rv_grupo SET id_cliente=?, nome=?, descricao=?, vigencia_inicio=?, vigencia_fim=?, ativo=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(id_cliente, nome, descricao || null, vigencia_inicio || null, vigencia_fim || null, ativo ?? 1, grupoId);

    if (Array.isArray(planos)) {
      // Get existing plano ids to delete
      const existing = db.prepare('SELECT id FROM rv_plano WHERE id_grupo=?').all(grupoId) as any[];
      for (const ex of existing) {
        db.prepare('DELETE FROM rv_plano_elegibilidade WHERE id_plano=?').run(ex.id);
        db.prepare('DELETE FROM rv_plano_remuneracao WHERE id_plano=?').run(ex.id);
        db.prepare('DELETE FROM rv_plano_deflatores WHERE id_plano=?').run(ex.id);
        db.prepare('DELETE FROM rv_plano WHERE id=?').run(ex.id);
      }
      for (const p of planos) {
        insertPlanoInGrupo(grupoId, p);
      }
    }
  });

  try {
    tx();
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /rv/grupos/:id
router.delete('/grupos/:id', adminMiddleware, (req: Request, res: Response) => {
  db.prepare('UPDATE rv_grupo SET ativo=0, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(req.params.id);
  db.prepare('UPDATE rv_plano SET ativo=0, updated_at=CURRENT_TIMESTAMP WHERE id_grupo=?').run(req.params.id);
  res.json({ success: true });
});

// ── Helper: insert a plano (sub-RV) into a grupo ──
function insertPlanoInGrupo(grupoId: number, p: any) {
  const planoResult = db.prepare(`
    INSERT INTO rv_plano (id_grupo, nome, descricao, tipo_cargo, tipo_calculo, id_plano_referencia, percentual_referencia, valor_dsr, teto_rv, vigencia_inicio, vigencia_fim, id_cliente)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    grupoId, p.nome || `RV ${p.tipo_cargo}`, p.descricao || null,
    p.tipo_cargo || 'operador', p.tipo_calculo || 'faixas',
    p.id_plano_referencia || null, p.percentual_referencia || null,
    p.valor_dsr || 0, p.teto_rv || null,
    p.vigencia_inicio || null, p.vigencia_fim || null,
    p.id_cliente || null
  );
  const planoId = planoResult.lastInsertRowid as number;

  // Elegibilidade
  if (Array.isArray(p.elegibilidade)) {
    const insEleg = db.prepare(`
      INSERT INTO rv_plano_elegibilidade (id_plano, id_indicador, operador, valor_minimo, campo, valor_texto, tipo_comparacao, ordem)
      VALUES (?,?,?,?,?,?,?,?)
    `);
    p.elegibilidade.forEach((e: any, idx: number) => {
      insEleg.run(planoId, e.id_indicador || null, e.operador || '>=', e.valor_minimo || 0,
        e.campo || null, e.valor_texto || null, e.tipo_comparacao || 'indicador', idx);
    });
  }

  // Remuneração + faixas + condições texto
  if (Array.isArray(p.remuneracao)) {
    const insRem = db.prepare('INSERT INTO rv_plano_remuneracao (id_plano, id_indicador, tem_regra_propria, ordem) VALUES (?,?,?,?)');
    const insFaixa = db.prepare('INSERT INTO rv_plano_remuneracao_faixas (id_remuneracao, faixa_min, faixa_max, valor_payout, tipo_payout, ordem) VALUES (?,?,?,?,?,?)');
    const insCond = db.prepare('INSERT INTO rv_plano_remuneracao_condicoes (id_remuneracao, campo, operador, valor, tipo, ordem) VALUES (?,?,?,?,?,?)');

    p.remuneracao.forEach((r: any, idx: number) => {
      const remResult = insRem.run(planoId, r.id_indicador, r.tem_regra_propria ? 1 : 0, idx);
      const remId = remResult.lastInsertRowid as number;
      if (Array.isArray(r.faixas)) {
        r.faixas.forEach((f: any, fIdx: number) => {
          insFaixa.run(remId, f.faixa_min, f.faixa_max || null, f.valor_payout, f.tipo_payout || 'valor_fixo', fIdx);
        });
      }
      if (Array.isArray(r.condicoes)) {
        r.condicoes.forEach((c: any, cIdx: number) => {
          insCond.run(remId, c.campo, c.operador || '=', c.valor, c.tipo || 'texto', cIdx);
        });
      }
    });
  }

  // Deflatores + faixas
  if (Array.isArray(p.deflatores)) {
    const insDef = db.prepare('INSERT INTO rv_plano_deflatores (id_plano, id_indicador, ordem) VALUES (?,?,?)');
    const insDefFaixa = db.prepare('INSERT INTO rv_plano_deflator_faixas (id_deflator, faixa_min, faixa_max, percentual_reducao, ordem) VALUES (?,?,?,?,?)');

    p.deflatores.forEach((d: any, idx: number) => {
      const defResult = insDef.run(planoId, d.id_indicador, idx);
      const defId = defResult.lastInsertRowid as number;
      if (Array.isArray(d.faixas)) {
        d.faixas.forEach((f: any, fIdx: number) => {
          insDefFaixa.run(defId, f.faixa_min, f.faixa_max || null, f.percentual_reducao, fIdx);
        });
      }
    });
  }

  return planoId;
}

export default router;
