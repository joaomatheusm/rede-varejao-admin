import "./FilterBar.css";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterBarProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  statusOptions: FilterOption[];
}

export default function FilterBar({
  statusFilter,
  onStatusFilterChange,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  statusOptions,
}: FilterBarProps) {
  const sortOptions = [
    { value: "date_desc", label: "Mais recentes" },
    { value: "date_asc", label: "Mais antigos" },
    { value: "value_desc", label: "Maior valor" },
    { value: "value_asc", label: "Menor valor" },
  ];

  return (
    <div className="filter-bar">
      <div className="filter-section">
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar por ID"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => onSearchChange("")}>
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="filter-section">
        <label className="filter-label">
          Status:
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos os status</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}{" "}
                {option.count !== undefined && `(${option.count})`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="filter-section">
        <label className="filter-label">
          Ordenar por:
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="filter-select"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="filter-actions">
        <button
          className="refresh-btn"
          onClick={() => window.location.reload()}
          title="Atualizar pedidos"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}
