const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const basicAuth = require('express-basic-auth'); // Nova dependência: npm install express-basic-auth

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conexão com PostgreSQL (já configurada via env vars)
const pool = new Pool();

const STATUS_POSSIVEIS = ['AGUARDANDO PREPARO', 'EM PREPARO', 'CONCLUIDO'];

// Autenticação básica para admin (mude para sua senha real)
const getUnauthorizedResponse = (req) => {
  return req.auth ? ('Credenciais inválidas para ' + req.auth.user) : 'Autenticação requerida';
};
const adminAuth = basicAuth({
  users: { 'admin': 'fastfood2026' }, // Adicione mais usuários se precisar
  challenge: true,                  // <--- ESSA LINHA É OBRIGATÓRIA
  realm: 'Painel Administrativo - Fast Food', // texto que aparece na janela de login
  unauthorizedResponse: getUnauthorizedResponse
});

// Rota para buscar pedidos (pública, usada por ambas as views)
app.get('/api/pedidos', async (req, res) => {
  // Força o Content-Type para JSON para evitar problemas de renderização
  res.setHeader('Content-Type', 'application/json');
  try {
    const result = await pool.query(`
      SELECT id, data, cliente, nome, endereco, total, status, step
      FROM fsf_pedido 
      WHERE status IN ('AGUARDANDO PREPARO', 'EM PREPARO', 'CONCLUIDO')
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar pedidos:',err);
    res.status(500).json({ error: 'Erro interno ao buscar pedidos' });
  }
});

// Itens de um pedido (protegida por auth - usado no admin.html para o accordion)
app.get('/api/pedidos/:id/itens', adminAuth, async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const pedidoId = Number(req.params.id);
  if (!Number.isFinite(pedidoId)) {
    return res.status(400).json({ error: 'ID de pedido inválido' });
  }

  try {
    // Observação: assumimos que a FK se chama "pedido_id" (mais comum).
    // Se no seu banco for outro nome (ex.: "id_pedido"), ajuste a query.
    const result = await pool.query(
      `SELECT id, data, produto, preco, quantidade, status, pedido_id
       FROM fsf_pedido_item
       WHERE pedido_id = $1
       ORDER BY id ASC`,
      [pedidoId]
    );

    // Retorna um array diretamente (mais simples para o frontend)
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar itens do pedido:', err);
    res.status(500).json({ error: 'Erro interno ao buscar itens do pedido' });
  }
});

// Rota para atualizar status (protegida por auth)
app.post('/api/update-status', adminAuth, async (req, res) => {
  const { id, novoStatus } = req.body;
  if (!STATUS_POSSIVEIS.includes(novoStatus)) {
    return res.status(400).json({ error: 'Status inválido' });
  }
  try {
    const result = await pool.query(
      `UPDATE fsf_pedido SET status = $1 WHERE id = $2 RETURNING id, status`,
      [novoStatus, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// Página admin (protegida por auth) - serve index.html com setas
app.get('/admin', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Página cliente (pública) - serve cliente.html sem setas
app.get('/cliente', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cliente.html'));
});

// Redireciona raiz para cliente (opcional)
app.get('/', (req, res) => {
  res.redirect('/cliente');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});