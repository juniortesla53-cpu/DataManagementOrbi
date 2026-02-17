# Changelog - Indicadores Personalizados e Tipos de Retorno

**Data:** 16/02/2026  
**Commit:** b99213d

## 🎯 Objetivo
Expandir o sistema de regras e faixas RV com:
1. **Indicadores personalizados** (expressões matemáticas combinando indicadores existentes)
2. **Tipos de retorno variados** nas faixas (payout R$, string/texto, indicador)
3. **Operadores lógicos compostos** nas condições (AND/OR, com escalabilidade ilimitada)

---

## ✅ Backend - Implementado

### 1. Indicadores Personalizados

**Nova Tabela:**
```sql
CREATE TABLE IF NOT EXISTS rv_indicadores_personalizados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  expressao TEXT NOT NULL,  -- ex: "{VENDAS} * {CSAT} / 100"
  unidade TEXT DEFAULT '%',
  id_cliente INTEGER REFERENCES rv_clientes(id),
  ativo INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Parser de Expressões:**
- Arquivo: `backend/src/utils/expressionParser.ts`
- Implementação segura (sem `eval()`)
- Suporta: `+`, `-`, `*`, `/`, `()`, números literais, `{CODIGO_INDICADOR}`
- Retorna `null` se algum indicador não tiver valor

**Endpoints CRUD:**
- `GET /rv/indicadores-personalizados` — listar (com extração de indicadores referenciados)
- `GET /rv/indicadores-personalizados/:id` — detalhe
- `POST /rv/indicadores-personalizados` — criar (com validação de expressão)
- `PUT /rv/indicadores-personalizados/:id` — atualizar
- `DELETE /rv/indicadores-personalizados/:id` — soft delete (ativo=0)
- `POST /rv/indicadores-personalizados/testar-expressao` — testar sem persistir

**Integração no Motor:**
- Indicadores personalizados são calculados em `executarSimulacaoGrupo` após indicadores normais
- Usam IDs no formato `custom_{id}` para diferenciar de indicadores dim
- Podem ser usados em elegibilidade e remuneração como qualquer outro indicador

---

### 2. Tipos de Retorno nas Faixas

**Migrations (ALTER TABLE):**
```sql
ALTER TABLE rv_plano_remuneracao_faixas ADD COLUMN tipo_retorno TEXT DEFAULT 'payout';
ALTER TABLE rv_plano_remuneracao_faixas ADD COLUMN retorno_texto TEXT;
ALTER TABLE rv_plano_remuneracao_faixas ADD COLUMN retorno_id_indicador INTEGER;
```

**Tipos de Retorno:**
- `'payout'` (padrão): valor R$ fixo (`valor_payout`)
- `'texto'`: string customizada (`retorno_texto`)
- `'indicador'`: referência a outro indicador (`retorno_id_indicador`)
  - Se `< 0`: indicador personalizado (id = abs(valor))
  - Se `> 0`: indicador normal (rv_indicadores_dim.id)

**No Motor de Cálculo:**
- `executarSimulacaoGrupo` processa cada tipo de retorno apropriadamente
- Resultado inclui `tipo_retorno`, `retorno_texto`, `retorno_indicador_valor`

---

### 3. Operadores Lógicos Compostos

**Migrations (ALTER TABLE):**
```sql
ALTER TABLE rv_plano_elegibilidade ADD COLUMN grupo_logico INTEGER DEFAULT 0;
ALTER TABLE rv_plano_elegibilidade ADD COLUMN operador_logico TEXT DEFAULT 'AND';
```

**Semântica:**
- Condições com mesmo `grupo_logico` → avaliadas com AND
- Grupos diferentes → combinados com o `operador_logico` do grupo (AND ou OR)
- Exemplo: `(VENDAS >= 80 AND CSAT >= 90) OR (QUALIDADE >= 95)`

**Operadores Expandidos:**
- Numéricos: `>=`, `<=`, `>`, `<`, `==`, `!=`, `<>`
- Campo texto: `=`, `!=`, `<>`, `LIKE`, `IN`, `NOT_LIKE`

**No Motor de Cálculo:**
- Agrupa condições por `grupo_logico`
- Avalia cada grupo como AND interno
- Combina grupos com `operador_logico` (OR se algum grupo tiver, senão AND)

---

## ✅ Frontend - Implementado

### 1. Página de Indicadores Personalizados

**Arquivo:** `frontend/src/pages/RV/RVIndicadoresPersonalizados.tsx`

**Features:**
- CRUD completo de indicadores personalizados
- Validação de expressão em tempo real (botão "Testar Expressão")
- Preview de indicadores referenciados
- Info box com exemplos de expressões
- Design consistente com o resto do sistema

**Navegação:**
- Rota: `/rv/indicadores-personalizados`
- Link adicionado em `Sidebar.tsx` (seção Nexus RV)
- Ícone: `Combine` (Lucide React)

---

### 2. StepRegras.tsx - Updates Pendentes

⚠️ **IMPORTANTE:** Conforme especificação, **NÃO modificamos** a lógica dos steps existentes para evitar quebrar o wizard complexo.

**Backend já suporta (backward compatible):**
- ✅ Tipos de retorno nas faixas
- ✅ Grupos lógicos na elegibilidade
- ✅ Operadores expandidos

**Updates futuros necessários no StepRegras.tsx:**

#### A. Faixas de Remuneração (linha ~505-520)
```typescript
// Adicionar ao formulário de faixa:
{
  tipo_retorno: 'payout',  // dropdown: Payout R$ | Texto | Indicador
  retorno_texto: '',        // input text (quando tipo_retorno = 'texto')
  retorno_id_indicador: null // select indicadores (quando tipo_retorno = 'indicador')
}
```

#### B. Elegibilidade (linha ~490-505)
```typescript
// Adicionar ao formulário de elegibilidade:
{
  grupo_logico: 0,          // número do grupo (0, 1, 2...)
  operador_logico: 'AND'    // toggle AND/OR entre grupos
}

// UI sugerida: agrupar visualmente condições do mesmo grupo
// Adicionar botão "Novo Grupo OR" para criar grupo com operador_logico='OR'
```

#### C. Select de Indicadores
Incluir indicadores personalizados nos dropdowns:
```typescript
const todosIndicadores = [
  ...indicadoresNormais,
  ...indicadoresPersonalizados.map(ip => ({
    id: -ip.id, // negativo para diferenciar
    codigo: ip.codigo,
    nome: `${ip.nome} (personalizado)`,
    unidade: ip.unidade
  }))
];
```

---

## 🧪 Testes Recomendados

### Backend
1. Criar indicador personalizado: `{VENDAS} * {CSAT} / 100`
2. Testar expressão via endpoint `/testar-expressao`
3. Usar indicador personalizado em elegibilidade
4. Criar faixa com `tipo_retorno = 'texto'`
5. Criar faixa com `tipo_retorno = 'indicador'` (referenciando personalizado)
6. Criar elegibilidade com 2 grupos lógicos (um AND, outro OR)

### Frontend
1. Acessar `/rv/indicadores-personalizados`
2. Criar novo indicador com expressão válida
3. Testar expressão (deve mostrar indicadores referenciados)
4. Verificar listagem com filtros
5. Editar e desativar indicador

---

## 📚 Documentação Técnica

### Parser de Expressões

**Arquitetura:**
- Tokenização → Parsing (recursivo descendente) → Avaliação lazy
- Retorna função `(values) => number | null`
- Seguro contra injection (não usa `eval()`)

**Gramática:**
```
expr   -> term (('+' | '-') term)*
term   -> factor (('*' | '/') factor)*
factor -> NUMBER | REF | '(' expr ')'
```

**Exemplo de uso:**
```typescript
import { avaliarExpressao } from '../utils/expressionParser';

const resultado = avaliarExpressao(
  "{VENDAS} * {CSAT} / 100",
  { VENDAS: 120, CSAT: 95 }
);
// resultado = 114
```

### Indicadores Personalizados no Motor

**Fluxo:**
1. Carregar indicadores normais (rv_indicadores_dim)
2. Carregar indicadores personalizados (rv_indicadores_personalizados)
3. Calcular valores de indicadores normais para o colaborador
4. Calcular indicadores personalizados usando `avaliarExpressao`
5. Armazenar com prefixo `custom_{id}` em `indicadoresColab`
6. Usar em elegibilidade/remuneração normalmente

**Convenções:**
- ID positivo: indicador normal (rv_indicadores_dim)
- ID negativo / prefixo `custom_`: indicador personalizado

---

## 🔄 Backward Compatibility

✅ **Todos os dados existentes continuam funcionando:**
- Faixas sem `tipo_retorno` → default `'payout'`
- Elegibilidade sem `grupo_logico` → default `0` (grupo único, AND)
- Motor de cálculo trata ausência de campos novos gracefully

---

## 📝 Notas de Implementação

1. **PowerShell vs Bash**: Comandos usam `;` (PowerShell) e não `&&` (Bash)
2. **Migrations Idempotentes**: Todas usam `ALTER TABLE ADD COLUMN` com try/catch
3. **Tipo Payout**: Apenas `'valor_fixo'` é usado (conforme spec)
4. **Frontend Build**: Warnings sobre chunk size são esperados (sistema grande)
5. **Git Line Endings**: Warnings LF→CRLF são normais no Windows

---

## 🚀 Próximos Passos

1. **Frontend StepRegras.tsx:**
   - Adicionar UI para tipos de retorno nas faixas
   - Adicionar UI para grupos lógicos na elegibilidade
   - Incluir indicadores personalizados nos selects

2. **Testes End-to-End:**
   - Criar plano completo usando indicadores personalizados
   - Testar todas as combinações de tipo_retorno
   - Validar lógica AND/OR complexa

3. **Performance:**
   - Considerar cache de expressões compiladas
   - Otimizar queries do motor se volume de dados crescer

4. **UX:**
   - Adicionar preview visual de grupos lógicos na elegibilidade
   - Mostrar cálculo de indicador personalizado em tempo real no wizard

---

## 📦 Arquivos Modificados

**Backend:**
- `backend/src/database.ts` — tabelas e migrations
- `backend/src/routes/rv.routes.ts` — endpoints e motor
- `backend/src/utils/expressionParser.ts` — parser seguro (novo)

**Frontend:**
- `frontend/src/App.tsx` — nova rota
- `frontend/src/components/Sidebar.tsx` — link navegação
- `frontend/src/pages/RV/RVIndicadoresPersonalizados.tsx` — página CRUD (novo)

---

## ✨ Conclusão

Todas as funcionalidades especificadas foram implementadas com sucesso:

✅ Indicadores personalizados (expressões matemáticas)  
✅ Tipos de retorno variados (payout, texto, indicador)  
✅ Operadores lógicos compostos (AND/OR ilimitado)  
✅ Parser seguro sem eval()  
✅ Backward compatibility mantida  
✅ Frontend CRUD completo para indicadores personalizados  
✅ Backend compilado sem erros  
✅ Frontend compilado sem erros  
✅ Commit e push realizados  

**Próximos updates:** Integrar campos novos no wizard StepRegras.tsx (updates mínimos, sem quebrar lógica existente).
