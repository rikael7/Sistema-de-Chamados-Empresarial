// middleware/validate.js

// Schema por campo:
// {
//   campo: {
//     required: true/false,
//     type: 'string' | 'number',
//     minLength: number,
//     maxLength: number,
//     min: number,        // para type: 'number'
//     max: number,        // para type: 'number'
//     enum: [ ... ]        // valores permitidos
//   }
// }

function chamadovalidator(schema) {
  return (req, res, next) => {
    const erros = [];

    for (const campo of Object.keys(schema)) {
      const regras = schema[campo];
      const valor = req.body[campo];

      const ausente = valor === undefined || valor === null || valor === '';

      if (ausente) {
        if (regras.required) {
          erros.push(`${campo} é obrigatório`);
        }
        continue; // se não é obrigatório e está ausente, não valida o resto
      }

      // tipo
      if (regras.type === 'number') {
        const num = Number(valor);
        if (Number.isNaN(num)) {
          erros.push(`${campo} deve ser um número`);
          continue;
        }
        if (regras.min !== undefined && num < regras.min) {
          erros.push(`${campo} deve ser maior ou igual a ${regras.min}`);
        }
        if (regras.max !== undefined && num > regras.max) {
          erros.push(`${campo} deve ser menor ou igual a ${regras.max}`);
        }
      } else {
        // default: string
        if (typeof valor !== 'string') {
          erros.push(`${campo} deve ser um texto`);
          continue;
        }
        if (regras.minLength !== undefined && valor.length < regras.minLength) {
          erros.push(`${campo} deve ter no mínimo ${regras.minLength} caracteres`);
        }
        if (regras.maxLength !== undefined && valor.length > regras.maxLength) {
          erros.push(`${campo} deve ter no máximo ${regras.maxLength} caracteres`);
        }
      }

      // enum (valores permitidos), funciona pra string ou number
      if (regras.enum && !regras.enum.includes(valor)) {
        erros.push(`${campo} deve ser um de: ${regras.enum.join(', ')}`);
      }
    }

    if (erros.length > 0) {
      return res.status(400).json({ erro: 'Dados inválidos', detalhes: erros });
    }

    next();
  };
}

module.exports = { chamadovalidator };