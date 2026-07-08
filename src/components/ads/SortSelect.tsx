import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownUp } from "lucide-react";

export type SortOption = "newest" | "price_asc" | "price_desc";

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortOption)}>
      <SelectTrigger className="w-[170px] gap-2">
        <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">Newest first</SelectItem>
        <SelectItem value="price_asc">Price: Low to High</SelectItem>
        <SelectItem value="price_desc">Price: High to Low</SelectItem>
      </SelectContent>
    </Select>
  );
}
