import { Search } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Buscar relatórios...' }: Props) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-orbi-muted" />
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 bg-orbi-card border border-slate-700 rounded-lg text-sm text-orbi-text placeholder-orbi-muted focus:outline-none focus:border-orbi-accent transition-colors"
      />
    </div>
  );
}
