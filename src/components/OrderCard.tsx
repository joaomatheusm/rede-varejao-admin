import React, { useState } from "react";
import "./OrderCard.css";

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

interface OrderCardProps {
  pedido: Pedido;
  statusOptions: StatusOption[];
  onStatusChange: (pedidoId: number, novoStatusId: string) => void;
}

export default function OrderCard({
  pedido,
  statusOptions,
  onStatusChange,
}: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getStatusInfo = (statusId: number) => {
    switch (statusId) {
      case 200:
        return {
          color: "#FF9800",
          bg: "#FFF3E0",
          icon: "🕐",
          label: "Pendente",
        };
      case 201:
        return {
          color: "#2196F3",
          bg: "#E3F2FD",
          icon: "🔄",
          label: "Em Processamento",
        };
      case 202:
        return {
          color: "#4CAF50",
          bg: "#E8F5E8",
          icon: "✅",
          label: "Concluído",
        };
      case 203:
        return {
          color: "#F44336",
          bg: "#FFEBEE",
          icon: "❌",
          label: "Cancelado",
        };
      default:
        return {
          color: "#777",
          bg: "#f5f5f5",
          icon: "❓",
          label: "Desconhecido",
        };
    }
  };

  const statusInfo = getStatusInfo(pedido.status_id);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`order-card ${isExpanded ? "expanded" : ""} ${
        isHovered ? "hovered" : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="order-card-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="order-info-left">
          <div className="order-id">
            <span className="order-hash">#</span>
            <span className="order-number">{pedido.id}</span>
          </div>
          <div className="order-date">{formatDate(pedido.data_criacao)}</div>
        </div>

        <div className="order-info-center">
          <div className="order-value">
            <span className="currency-symbol">R$</span>
            <span className="amount">{pedido.valor_total.toFixed(2)}</span>
          </div>
          <div className="payment-method">
            <span>{pedido.metodo_pagamento}</span>
          </div>
        </div>

        <div className="order-info-right">
          <div className="customer-info">
            <span>Cliente {pedido.usuario_id}</span>
          </div>

          <div className="status-container">
            <select
              value={pedido.status_id}
              onChange={(e) => onStatusChange(pedido.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="status-select"
              style={{ borderColor: statusInfo.color }}
            >
              {statusOptions.map((status) => (
                <option key={status.status_id} value={status.status_id}>
                  {status.descricao}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="expand-arrow">
          <span className={`arrow ${isExpanded ? "rotated" : ""}`}>▼</span>
        </div>
      </div>

      <div className={`order-details ${isExpanded ? "show" : ""}`}>
        <div className="details-header">
          <h4>Itens do Pedido</h4>
          <div className="items-count">
            {pedido.pedido_item?.length || 0}{" "}
            {(pedido.pedido_item?.length || 0) === 1 ? "item" : "itens"}
          </div>
        </div>

        <div className="items-grid">
          {pedido.pedido_item?.map((item, idx) => (
            <div key={idx} className="item-card">
              <div className="item-header">
                <div className="item-name">{item.produto?.nome}</div>
                <div className="item-quantity">×{item.quantidade}</div>
              </div>
              <div className="item-pricing">
                <div className="unit-price">
                  {formatCurrency(item.preco_unitario)} /un
                </div>
                <div className="subtotal">
                  Total:{" "}
                  <strong>
                    {formatCurrency(item.quantidade * item.preco_unitario)}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="order-summary">
          <div className="summary-row">
            <span>Subtotal:</span>
            <span>{formatCurrency(pedido.valor_total)}</span>
          </div>
          <div className="summary-row total">
            <span>Total:</span>
            <span>{formatCurrency(pedido.valor_total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
