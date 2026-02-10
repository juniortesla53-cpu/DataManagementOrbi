import { Search } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Buscar relatórios...' }: Props) {
  return (
    <div className="relative group">
      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orbi-muted group-focus-within:text-orbi-purple transition-colors" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-4 py-2.5 bg-white border border-orbi-border rounded-xl text-sm placeholder:text-orbi-muted transition-all"
      />
    </div>
  );
}
