const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // para servir o HTML

// Configuração da conexão com PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'painel.midilabs.com.br',
  database: 'fastfood', // altere para o nome do seu banco
  password: '76abb9fc75c8845923a6',
  port: 55432,
});

const STATUS_POSSIVEIS = ['AGUARDANDO PREPARO', 'EM PREPARO', 'CONCLUÍDO'];

// Rota para buscar todos os pedidos relevantes (os que estão em um dos 3 status)
app.get('/api/pedidos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, status 
      FROM fsf_pedido 
      WHERE status IN ('AGUARDANDO PREPARO', 'EM PREPARO', 'CONCLUÍDO')
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
});

// Rota para atualizar o status do pedido
app.post('/api/update-status', async (req, res) => {
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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});