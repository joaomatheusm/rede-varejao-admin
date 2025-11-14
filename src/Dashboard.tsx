import { useEffect, useState, useMemo } from "react";
import { supabase } from "./supabaseClient";
import OrderCard from "./components/OrderCard";
import StatsCard from "./components/StatsCard";
import FilterBar from "./components/FilterBar";
import "./Dashboard.css";

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

  // Novos estados para filtros e busca
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");

  // Estados para animações
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());

  const fetchPedidos = async () => {
    try {
      const { data: isAdmin, error: adminError } = await supabase.rpc(
        "is_admin"
      );
      if (adminError || !isAdmin) {
        setError("Acesso negado. Você não é um administrador.");
        supabase.auth.signOut();
        return;
      }

      const { data: pedidosData, error: pedidosError } = await supabase
        .from("pedido")
        .select(
          `
          *,
          descricao_status (descricao),
          pedido_item (
            quantidade,
            preco_unitario,
            produto (nome)
          )
        `
        )
        .order("data_criacao", { ascending: false });

      if (pedidosError) throw pedidosError;
      setPedidos(pedidosData as any);

      const { data: statusData, error: statusError } = await supabase
        .from("descricao_status")
        .select("status_id, descricao")
        .in("categoria", [1, 2]);

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
      .channel("realtime-pedidos")
      .on(
        "postgres_changes",
        {
          event: "INSERT", // Escuta apenas novos pedidos
          schema: "public",
          table: "pedido",
        },
        (payload) => {
          console.log("Novo pedido detectado:", payload);

          // Marca como novo pedido para animação
          if (payload.new?.id) {
            setNewOrderIds((prev) => new Set([...prev, payload.new.id]));

            // Remove a marcação após a animação
            setTimeout(() => {
              setNewOrderIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(payload.new.id);
                return newSet;
              });
            }, 2000);
          }

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
      const { error } = await supabase.rpc("update_pedido_status", {
        p_pedido_id: pedidoId,
        p_status_id: parseInt(novoStatusId, 10),
      });
      if (error) throw error;

      setPedidos(
        pedidos.map((p) =>
          p.id === pedidoId
            ? { ...p, status_id: parseInt(novoStatusId, 10) }
            : p
        )
      );
    } catch (err: any) {
      alert(`Erro ao atualizar status: ${err.message}`);
    }
  };

  // Lógica de filtros e ordenação
  const filteredAndSortedPedidos = useMemo(() => {
    let filtered = [...pedidos];

    // Filtro por status
    if (statusFilter) {
      filtered = filtered.filter(
        (p) => p.status_id.toString() === statusFilter
      );
    }

    // Filtro por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.id.toString().includes(term) ||
          p.usuario_id.toString().includes(term) ||
          p.metodo_pagamento.toLowerCase().includes(term) ||
          p.pedido_item?.some((item) =>
            item.produto.nome.toLowerCase().includes(term)
          )
      );
    }

    // Ordenação
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return (
            new Date(a.data_criacao).getTime() -
            new Date(b.data_criacao).getTime()
          );
        case "date_desc":
          return (
            new Date(b.data_criacao).getTime() -
            new Date(a.data_criacao).getTime()
          );
        case "value_asc":
          return a.valor_total - b.valor_total;
        case "value_desc":
          return b.valor_total - a.valor_total;
        default:
          return 0;
      }
    });

    return filtered;
  }, [pedidos, statusFilter, searchTerm, sortBy]);

  // Estatísticas para o StatsCard
  const stats = useMemo(() => {
    const total = pedidos.length;
    const pendentes = pedidos.filter((p) => p.status_id === 200).length;
    const concluidos = pedidos.filter((p) => p.status_id === 202).length;
    const valorTotal = pedidos.reduce((sum, p) => sum + p.valor_total, 0);

    return [
      {
        label: "Total de Pedidos",
        value: total.toString(),
        color: "#4CAF50",
      },
      {
        label: "Pendentes",
        value: pendentes.toString(),
        color: "#FF9800",
      },
      {
        label: "Concluídos",
        value: concluidos.toString(),
        color: "#4CAF50",
      },
      {
        label: "Faturamento Total",
        value: `R$ ${valorTotal.toFixed(2)}`,
        color: "#2196F3",
      },
    ];
  }, [pedidos]);

  // Opções do filtro de status
  const filterStatusOptions = useMemo(() => {
    return statusOptions.map((status) => ({
      value: status.status_id.toString(),
      label: status.descricao,
      count: pedidos.filter((p) => p.status_id === status.status_id).length,
    }));
  }, [statusOptions, pedidos]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h2>Carregando painel...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-container">
          <h2>❌ Erro no sistema</h2>
          <p>{error}</p>
          <button onClick={fetchPedidos} className="retry-btn">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Painel de Pedidos</h1>
            <p>Gerencie todos os pedidos da sua loja</p>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="logout-btn"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <StatsCard stats={stats} />

        <FilterBar
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortChange={setSortBy}
          statusOptions={filterStatusOptions}
        />

        <section className="orders-section">
          <div className="section-header">
            <h2>
              Pedidos
              <span className="orders-count">
                ({filteredAndSortedPedidos.length})
              </span>
            </h2>
            {searchTerm && (
              <p className="search-info">
                Resultados para: <strong>"{searchTerm}"</strong>
              </p>
            )}
          </div>

          <div className="orders-grid">
            {filteredAndSortedPedidos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">-</div>
                <h3>Nenhum pedido encontrado</h3>
                <p>
                  Tente ajustar os filtros ou aguarde novos pedidos chegarem.
                </p>
              </div>
            ) : (
              filteredAndSortedPedidos.map((pedido) => (
                <OrderCard
                  key={pedido.id}
                  pedido={pedido}
                  statusOptions={statusOptions}
                  onStatusChange={handleStatusChange}
                />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
