import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchFilterType, FilterLabels } from "@shared/schema";
import { X, Hash, User, Mail, MapPin, Smartphone, CreditCard, Shield, Globe, Lock, Key } from "lucide-react";
import { motion } from "framer-motion";

interface SearchCriterionRowProps {
  id: string;
  type: SearchFilterType;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  index: number;
}

const getIconForType = (type: SearchFilterType) => {
  switch (type) {
    case "username":
    case "displayName":
    case "firstName":
    case "lastName":
      return <User className="w-4 h-4" />;
    case "email":
      return <Mail className="w-4 h-4" />;
    case "address":
      return <MapPin className="w-4 h-4" />;
    case "phone":
      return <Smartphone className="w-4 h-4" />;
    case "ipAddress":
    case "macAddress":
      return <Globe className="w-4 h-4" />;
    case "iban":
    case "bic":
      return <CreditCard className="w-4 h-4" />;
    case "ssn":
      return <Shield className="w-4 h-4" />;
    case "password":
    case "hashedPassword":
      return <Lock className="w-4 h-4" />;
    case "vin":
      return <Key className="w-4 h-4" />;
    default:
      return <Hash className="w-4 h-4" />;
  }
};

export function SearchCriterionRow({ type, value, onChange, onRemove, index }: SearchCriterionRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="group flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200"
    >
      <div className="flex items-center gap-3 min-w-[200px] text-muted-foreground group-hover:text-primary transition-colors">
        <div className="p-2 rounded-lg bg-secondary text-foreground/70 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          {getIconForType(type)}
        </div>
        <span className="font-medium text-sm">
          {FilterLabels[type]}
        </span>
      </div>

      <div className="flex-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Entrez ${FilterLabels[type].toLowerCase()}...`}
          className="h-10 bg-background border-border/50 focus:border-primary/50 focus:ring-primary/20"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
      >
        <X className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}
