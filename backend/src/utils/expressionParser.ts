/**
 * Parser seguro de expressões aritméticas
 * Suporta: +, -, *, /, (), números literais e referências {CODIGO_INDICADOR}
 * NÃO usa eval() - implementação manual via tokenização e parsing
 */

type Token = 
  | { type: 'NUMBER'; value: number }
  | { type: 'OPERATOR'; value: '+' | '-' | '*' | '/' }
  | { type: 'LPAREN' }
  | { type: 'RPAREN' }
  | { type: 'REF'; value: string };

/**
 * Tokeniza a expressão
 */
function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < expr.length) {
    const char = expr[i];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    // Números
    if (/\d/.test(char) || char === '.') {
      let num = '';
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(num) });
      continue;
    }
    
    // Operadores
    if (['+', '-', '*', '/'].includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char as '+' | '-' | '*' | '/' });
      i++;
      continue;
    }
    
    // Parênteses
    if (char === '(') {
      tokens.push({ type: 'LPAREN' });
      i++;
      continue;
    }
    
    if (char === ')') {
      tokens.push({ type: 'RPAREN' });
      i++;
      continue;
    }
    
    // Referência a indicador {CODIGO}
    if (char === '{') {
      let ref = '';
      i++; // skip {
      while (i < expr.length && expr[i] !== '}') {
        ref += expr[i];
        i++;
      }
      if (i < expr.length && expr[i] === '}') {
        i++; // skip }
        tokens.push({ type: 'REF', value: ref.trim() });
        continue;
      }
      throw new Error(`Referência não fechada: {${ref}`);
    }
    
    throw new Error(`Caractere inválido: ${char}`);
  }
  
  return tokens;
}

/**
 * Parser recursivo descendente
 * Gramática:
 *   expr   -> term (('+' | '-') term)*
 *   term   -> factor (('*' | '/') factor)*
 *   factor -> NUMBER | REF | '(' expr ')'
 */
class Parser {
  private tokens: Token[];
  private pos: number;
  
  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }
  
  private current(): Token | undefined {
    return this.tokens[this.pos];
  }
  
  private consume(): Token | undefined {
    return this.tokens[this.pos++];
  }
  
  private expect(type: Token['type']): Token {
    const token = this.current();
    if (!token || token.type !== type) {
      throw new Error(`Esperado ${type}, recebeu ${token?.type || 'EOF'}`);
    }
    return this.consume()!;
  }
  
  parse(): (values: Record<string, number>) => number | null {
    const result = this.expr();
    if (this.pos < this.tokens.length) {
      throw new Error(`Tokens não consumidos após parsing`);
    }
    return result;
  }
  
  private expr(): (values: Record<string, number>) => number | null {
    let left = this.term();
    
    while (this.current()?.type === 'OPERATOR' && 
           ((this.current() as any).value === '+' || (this.current() as any).value === '-')) {
      const op = (this.consume() as any).value;
      const right = this.term();
      
      const prevLeft = left;
      left = (values: Record<string, number>) => {
        const l = prevLeft(values);
        const r = right(values);
        if (l === null || r === null) return null;
        return op === '+' ? l + r : l - r;
      };
    }
    
    return left;
  }
  
  private term(): (values: Record<string, number>) => number | null {
    let left = this.factor();
    
    while (this.current()?.type === 'OPERATOR' && 
           ((this.current() as any).value === '*' || (this.current() as any).value === '/')) {
      const op = (this.consume() as any).value;
      const right = this.factor();
      
      const prevLeft = left;
      left = (values: Record<string, number>) => {
        const l = prevLeft(values);
        const r = right(values);
        if (l === null || r === null) return null;
        if (op === '/' && r === 0) return null; // Divisão por zero
        return op === '*' ? l * r : l / r;
      };
    }
    
    return left;
  }
  
  private factor(): (values: Record<string, number>) => number | null {
    const token = this.current();
    
    if (!token) {
      throw new Error('Esperado fator, recebeu EOF');
    }
    
    if (token.type === 'NUMBER') {
      const num = (token as any).value;
      this.consume();
      return () => num;
    }
    
    if (token.type === 'REF') {
      const ref = (token as any).value;
      this.consume();
      return (values: Record<string, number>) => {
        if (!(ref in values)) return null;
        return values[ref];
      };
    }
    
    if (token.type === 'LPAREN') {
      this.consume();
      const inner = this.expr();
      this.expect('RPAREN');
      return inner;
    }
    
    throw new Error(`Token inesperado: ${token.type}`);
  }
}

/**
 * Avalia uma expressão matemática com substituição de indicadores
 * @param expressao - Ex: "{VENDAS} * {CSAT} / 100"
 * @param valoresIndicadores - Ex: { "VENDAS": 120, "CSAT": 95 }
 * @returns número calculado ou null se algum indicador não tem valor
 */
export function avaliarExpressao(expressao: string, valoresIndicadores: Record<string, number>): number | null {
  try {
    const tokens = tokenize(expressao);
    const parser = new Parser(tokens);
    const evaluator = parser.parse();
    return evaluator(valoresIndicadores);
  } catch (error: any) {
    console.error(`Erro ao avaliar expressão "${expressao}":`, error.message);
    return null;
  }
}

/**
 * Extrai os códigos de indicadores referenciados em uma expressão
 * @param expressao - Ex: "{VENDAS} * {CSAT} / 100"
 * @returns Array de códigos - Ex: ["VENDAS", "CSAT"]
 */
export function extrairIndicadoresReferenciados(expressao: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const matches = expressao.matchAll(regex);
  const codigos: string[] = [];
  for (const match of matches) {
    codigos.push(match[1].trim());
  }
  return [...new Set(codigos)]; // Unique
}
