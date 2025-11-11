import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

type Pedido = {
  id: number;
  status_id: number;
  valor_total: number;
  metodo_pagamento: string;
  data_criacao: string;
};

type Status = {
  status_id: number;
  descricao: string;
};

export default function Dashboard() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [statusOptions, setStatusOptions] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPedidos = async () => {
    try {
      const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
      if (adminError || !isAdmin) {
        setError('Acesso negado. Você não é um administrador.');
        supabase.auth.signOut();
        return;
      }

      const { data: pedidosData, error: pedidosError } = await supabase
        .from('pedido')
        .select('*')
        .order('data_criacao', { ascending: false });

      if (pedidosError) throw pedidosError;
      setPedidos(pedidosData || []);

      const { data: statusData, error: statusError } = await supabase
        .from('descricao_status')
        .select('status_id, descricao')
        .eq('categoria', 1);

      if (statusError) throw statusError;
      setStatusOptions(statusData || []);

    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  const handleStatusChange = async (pedidoId: number, novoStatusId: string) => {
    try {
      const { error } = await supabase.rpc('update_pedido_status', {
        p_pedido_id: pedidoId,
        p_status_id: parseInt(novoStatusId, 10)
      });
      if (error) throw error;
      
      setPedidos(pedidos.map(p => 
        p.id === pedidoId ? { ...p, status_id: parseInt(novoStatusId, 10) } : p
      ));
    } catch (err: any) {
      alert(`Erro ao atualizar status: ${err.message}`);
    }
  };

  if (loading) return <p>Carregando...</p>;
  if (error) return <p style={{ color: '#FF4757' }}>{error}</p>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Painel de Pedidos</h1>
        <button onClick={() => supabase.auth.signOut()} style={styles.button}>
          Sair
        </button>
      </div>
      
      <table width="100%" style={styles.table}>
        <thead>
          <tr style={styles.tr}>
            <th style={styles.th}>Pedido ID</th>
            <th style={styles.th}>Data</th>
            <th style={styles.th}>Total</th>
            <th style={styles.th}>Pagamento</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map(pedido => (
            <tr key={pedido.id} style={styles.tr}>
              <td style={styles.td}>{pedido.id}</td>
              <td style={styles.td}>{new Date(pedido.data_criacao).toLocaleString('pt-BR')}</td>
              <td style={styles.td}>R$ {pedido.valor_total.toFixed(2)}</td>
              <td style={styles.td}>{pedido.metodo_pagamento}</td>
              <td style={styles.td}>
                <select 
                  value={pedido.status_id}
                  onChange={(e) => handleStatusChange(pedido.id, e.target.value)}
                  style={styles.select}
                >
                  {statusOptions.map(status => (
                    <option key={status.status_id} value={status.status_id}>
                      {status.descricao}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#121212',
    color: '#f4f4f4'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  button: {
    backgroundColor: '#333',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  table: {
    borderCollapse: 'collapse' as 'collapse',
    fontSize: '14px',
    color: '#f4f4f4'
  },
  th: {
    border: '1px solid #444',
    padding: '10px',
    textAlign: 'left' as 'left',
    backgroundColor: '#222'
  },
  td: {
    border: '1px solid #444',
    padding: '10px',
  },
  tr: {
    borderBottom: '1px solid #444'
  },
  select: {
    padding: '8px',
    fontSize: '14px',
    backgroundColor: '#333',
    color: 'white',
    border: '1px solid #555',
    borderRadius: '5px'
  }
};