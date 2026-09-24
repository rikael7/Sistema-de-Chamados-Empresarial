const express = require('express');
const bcrypt = require('bcrypt');
// const { finduserbyname, findUserByEmail, createUser } = require('../models/userModel');

// feat: confirmar email
const { sendVerificationEmail } = require('../utils/email');
// ---------

const {
  registerValidationRules,
  loginValidationRules,
  handleValidationErrors
} = require('../middleware/validators');

const authtrue  = require('../middleware/authtrue')

const router = express.Router();
const SALT_ROUNDS = 10;


// feat: confirmar email
const crypto = require("crypto");

const {
    finduserbyname,
    findUserByEmail,
    createUser,
    findPendingUserByEmail,
    createPendingUser,
    findPendingUserByTokenHash,
    deletePendingUser
} = require('../models/userModel');

// -----




// feat: confirmar email

// POST /auth/register
router.post(
    '/register',
    registerValidationRules,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { name, email, password } = req.body;

            // 1. Verifica se o usuário já existe
            const existingUser = await findUserByEmail(email);

            if (existingUser) {
                return res.status(409).json({
                    error: 'Este email já está cadastrado.'
                });
            }

            // 2. Verifica se já existe cadastro pendente
            const existingPendingUser =
                await findPendingUserByEmail(email);

            if (existingPendingUser) {
                return res.status(409).json({
                    error: 'Já existe um cadastro pendente para este email. Verifique sua caixa de entrada.'
                });
            }

            // 3. Gera hash da senha
            const passwordHash = await bcrypt.hash(
                password,
                SALT_ROUNDS
            );

            // 4. Gera token aleatório
            const token = crypto
                .randomBytes(32)
                .toString('hex');

            // 5. NÃO salva o token original
            //    salva somente o SHA-256
            const tokenHash = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            // 6. Token expira em 30 minutos
            const expiresAt = new Date(
                Date.now() + 30 * 60 * 1000
            );

            // 7. Salva cadastro pendente
            await createPendingUser({
                name,
                email,
                passwordHash,
                tokenHash,
                expiresAt
            });

            // 8. Envia e-mail
            await sendVerificationEmail(
                email,
                name,
                token
            );

            // 9. NÃO cria usuário ainda
            return res.status(201).json({
                message:
                    'Cadastro iniciado. Verifique seu e-mail para confirmar a conta.'
            });

        } catch (err) {
            console.error(
                'Erro no registro:',
                err
            );

            return res.status(500).json({
                error:
                    'Erro interno ao iniciar cadastro.'
            });
        }
    }
);


// GET /auth/verify-email
router.get(
    '/verify-email',
    async (req, res) => {
        try {
            const { token } = req.query;

            // 1. Verifica se recebeu token
            if (!token) {
                return res.status(400).send(
                    'Token de verificação ausente.'
                );
            }

            // 2. Calcula o hash do token recebido
            const tokenHash = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            // 3. Procura o cadastro pendente
            const pendingUser =
                await findPendingUserByTokenHash(
                    tokenHash
                );

            // 4. Token não encontrado
            if (!pendingUser) {
                return res.status(400).send(
                    'Link de verificação inválido ou expirado.'
                );
            }

            // 5. Verifica expiração
            if (
                new Date(pendingUser.expires_at) < new Date()
            ) {
                await deletePendingUser(
                    pendingUser.id
                );

                return res.status(400).send(
                    'Este link de verificação expirou.'
                );
            }

            // 6. Verifica se o e-mail já possui uma conta
            const existingUser =
                await findUserByEmail(
                    pendingUser.email
                );

            if (existingUser) {
                await deletePendingUser(
                    pendingUser.id
                );

                return res.status(409).send(
                    'Este e-mail já possui uma conta.'
                );
            }

            // 7. Finalmente cria o usuário
            const user = await createUser({
                name: pendingUser.name,
                email: pendingUser.email,
                passwordHash: pendingUser.password_hash
            });

            // 8. Remove cadastro pendente
            await deletePendingUser(
                pendingUser.id
            );

            // 9. Redireciona para login
            return res.redirect('/email-verificado');

        } catch (err) {
            console.error(
                'Erro ao verificar e-mail:',
                err
            );

            return res.status(500).send(
                'Erro interno ao verificar e-mail.'
            );
        }
    }
);





// //////////////////////




// POST /auth/register
// router.post(
//   '/register',
//   registerValidationRules,
//   handleValidationErrors, 
//   async (req, res) => {
//     try {
//       const { name, email, password } = req.body;

//       const existingUser = await findUserByEmail(email);

//       if (existingUser) {
//         return res.status(409).json({
//           error: 'Este email já está cadastrado.'
//         });
//       }

//       const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

//       const user = await createUser({
//         name,
//         email,
//         passwordHash
//       });

//       return res.status(201).json({
//         message: 'Usuário registrado com sucesso.',
//         user: {
//           id: user.id,
//           name: user.name,
//           email: user.email
//         }
//       });

//     } catch (err) {
//       console.error('Erro no registro:', err);

//       return res.status(500).json({
//         error: 'Erro interno ao registrar usuário.'
//       });
//     }
//   }
// );


// POST /auth/login
router.post('/login',  loginValidationRules,
  handleValidationErrors,   async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Email ou senha inválidos.' });
    }

    // Regenera a sessão para evitar session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error('Erro ao regenerar sessão:', err);
        return res.status(500).json({ error: 'Erro interno ao fazer login.' });
      }

      req.session.userId = user.id;

      return res.status(200).json({
        message: 'Login realizado com sucesso.',
        user: { id: user.id, name: user.name, email: user.email }
      });
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro interno ao fazer login.' });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao encerrar sessão:', err);
      return res.status(500).json({ error: 'Erro ao encerrar sessão.' });
    }
    res.clearCookie('connect.sid');
     return res.redirect('/login');
  });
});

module.exports = router;