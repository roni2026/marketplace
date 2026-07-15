import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDownUp } from "lucide-react";

export type SortOption =
  | "newest"
  | "oldest"
  | "price_asc"
  | "price_desc"
  | "most_popular"
  | "most_viewed"
  | "most_favorited"
  | "recently_updated"
  | "ending_soon"
  | "best_match";

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest First",
  oldest: "Oldest First",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  most_popular: "Most Popular",
  most_viewed: "Most Viewed",
  most_favorited: "Most Favorited",
  recently_updated: "Recently Updated",
  ending_soon: "Ending Soon",
  best_match: "Best Match",
};

export function SortSelect({ value, onChange, className }: SortSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortOption)}>
      <SelectTrigger className={className || "w-[180px] gap-2"}>
        <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
          <SelectItem key={opt} value={opt}>
            {SORT_LABELS[opt]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
