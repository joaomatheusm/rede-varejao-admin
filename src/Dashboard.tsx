import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import React from 'react';

type PedidoItem = {
  quantidade: number;
  preco_unitario: number;
  produto: {
    nome: string;
  };
};

type StatusDesc = {
  descricao: string;
};

type Pedido = {
  id: number;
  status_id: number;
  valor_total: number;
  metodo_pagamento: string;
  usuario_id: number;
  data_criacao: string;
  descricao_status?: StatusDesc; 
  pedido_item?: PedidoItem[]; 
};

type StatusOption = {
  status_id: number;
  descricao: string;
};

export default function Dashboard() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

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
        .select(`
          *,
          descricao_status (descricao),
          pedido_item (
            quantidade,
            preco_unitario,
            produto (nome)
          )
        `)
        .order('data_criacao', { ascending: false });

      if (pedidosError) throw pedidosError;
      setPedidos(pedidosData as any);

      const { data: statusData, error: statusError } = await supabase
        .from('descricao_status')
        .select('status_id, descricao')
        .in('categoria', [1, 2]);

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
    // Carregamento inicial
    fetchPedidos();

    // Configuração do Realtime
    const channel = supabase
      .channel('realtime-pedidos')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Escuta apenas novos pedidos
          schema: 'public',
          table: 'pedido',
        },
        (payload) => {
          console.log('Novo pedido detectado:', payload);
          // Recarrega a lista para trazer os dados completos
          fetchPedidos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  const toggleRow = (pedidoId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(pedidoId)) {
      newExpanded.delete(pedidoId);
    } else {
      newExpanded.add(pedidoId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusColor = (statusId: number) => {
    if (statusId === 200) return '#FF9800'; 
    if (statusId === 201) return '#2196F3'; 
    if (statusId === 202) return '#4CAF50'; 
    if (statusId === 203) return '#F44336'; 
    return '#777';
  };

  if (loading) return <div style={{padding: 20, color: '#fff'}}>Carregando painel...</div>;
  if (error) return <div style={{padding: 20, color: '#FF4757'}}>Erro: {error}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Painel de Pedidos</h1>
        <button onClick={() => supabase.auth.signOut()} style={styles.button}>
          Sair
        </button>
      </div>
      
      <div style={{overflowX: 'auto'}}>
        <table width="100%" style={styles.table}>
          <thead>
            <tr style={styles.tr}>
              <th style={{...styles.th, width: '40px'}}></th>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Data</th>
              <th style={styles.th}>Cliente</th>
              <th style={styles.th}>Total</th>
              <th style={styles.th}>Pagamento</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map(pedido => {
              const isExpanded = expandedRows.has(pedido.id);
              return (
                <React.Fragment key={pedido.id}>
                  <tr style={styles.tr} onClick={() => toggleRow(pedido.id)}>
                    <td style={{...styles.td, cursor: 'pointer', textAlign: 'center'}}>
                      <span style={{
                        display: 'inline-block',
                        transition: 'transform 0.2s',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        fontSize: '12px'
                      }}>
                        ▶
                      </span>
                    </td>
                    <td style={styles.td}>#{pedido.id}</td>
                    <td style={styles.td}>
                      {new Date(pedido.data_criacao).toLocaleString('pt-BR')}
                    </td>
                    <td style={styles.td}>ID: {pedido.usuario_id}</td>
                    <td style={styles.td}>
                      <strong style={{color: '#4CAF50'}}>R$ {pedido.valor_total.toFixed(2)}</strong>
                    </td>
                    <td style={styles.td}>{pedido.metodo_pagamento}</td>
                    <td style={styles.td} onClick={(e) => e.stopPropagation()}> 
                      <select 
                        value={pedido.status_id}
                        onChange={(e) => handleStatusChange(pedido.id, e.target.value)}
                        style={{
                          ...styles.select,
                          borderLeft: `5px solid ${getStatusColor(pedido.status_id)}`
                        }}
                      >
                        {statusOptions.map(status => (
                          <option key={status.status_id} value={status.status_id}>
                            {status.descricao}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr style={{backgroundColor: '#252525'}}>
                      <td colSpan={7} style={{padding: '0'}}>
                        <div style={styles.detailsContainer}>
                          <h4 style={{marginTop: 0, marginBottom: '10px', color: '#aaa'}}>Itens do Pedido:</h4>
                          <div style={styles.itemsGrid}>
                            {pedido.pedido_item?.map((item, idx) => (
                              <div key={idx} style={styles.itemCard}>
                                <div style={{fontWeight: 'bold', color: '#fff'}}>
                                  {item.quantidade}x {item.produto?.nome}
                                </div>
                                <div style={{color: '#4CAF50'}}>
                                  R$ {item.preco_unitario.toFixed(2)} un.
                                </div>
                                <div style={{fontSize: '0.9em', color: '#888', borderTop: '1px solid #444', marginTop: '4px', paddingTop: '4px'}}>
                                  Subtotal: R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#121212',
    color: '#f4f4f4',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  button: {
    backgroundColor: '#333',
    color: 'white',
    border: '1px solid #555',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  table: {
    borderCollapse: 'collapse' as 'collapse',
    fontSize: '14px',
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  th: {
    borderBottom: '2px solid #333',
    padding: '12px 15px',
    textAlign: 'left' as 'left',
    backgroundColor: '#252525',
    color: '#aaa',
    textTransform: 'uppercase' as 'uppercase',
    fontSize: '0.85em',
    letterSpacing: '1px'
  },
  td: {
    borderBottom: '1px solid #333',
    padding: '12px 15px',
    verticalAlign: 'middle'
  },
  tr: {
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#2a2a2a'
    }
  },
  select: {
    padding: '8px',
    fontSize: '14px',
    backgroundColor: '#2C2C2C',
    color: 'white',
    border: '1px solid #444',
    borderRadius: '4px',
    width: '100%',
    cursor: 'pointer'
  },
  detailsContainer: {
    padding: '20px',
    borderLeft: '4px solid #4CAF50',
    backgroundColor: '#1a1a1a'
  },
  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '15px'
  },
  itemCard: {
    backgroundColor: '#2C2C2C',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #444'
  }
};