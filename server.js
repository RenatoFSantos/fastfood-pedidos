const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conexão usando variáveis de ambiente (padrão no EasyPanel e node-postgres)
const pool = new Pool();  // Automaticamente usa PGHOST, PGUSER, etc.

const STATUS_POSSIVEIS = ['AGUARDANDO PREPARO', 'EM PREPARO', 'CONCLUÍDO'];

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});